function parseHours(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours < 0) hours += 24;
    return hours;
}

function isScheduledOff(isoDate) {
    const s = getSettings();
    const date = new Date(`${isoDate}T00:00:00`);

    if (s.schedulePattern === "5x2") {
        const dow = date.getDay();
        return dow === 0 || dow === 6;
    }

    const [workDays, offDays] = s.schedulePattern.split("x").map(Number);
    const cycleLen = workDays + offDays;
    const anchor = new Date(`${s.scheduleAnchor}T00:00:00`);
    const diffDays = Math.round((date - anchor) / 86400000);
    const pos = ((diffDays % cycleLen) + cycleLen) % cycleLen;
    return pos >= workDays;
}

function getHourlyRateForMonth(settings, monthStr) {
    if (settings.accrualType === "hourly_monthly") {
        const rate = settings.monthlyRates[monthStr];
        return rate === undefined ? null : rate;
    }
    return settings.hourlyRate;
}

function computeShiftHoursAndPay(rawHours, offByPattern, settings, rate) {
    let hours = rawHours;
    if (settings.breaksEnabled) {
        hours = Math.max(0, hours - settings.breakHours);
    }

    const overtimeHours = Math.max(0, hours - settings.normHoursPerShift);
    const regularHours = hours - overtimeHours;
    const weekendMult = offByPattern ? settings.weekendCoefficient : 1;
    const effectiveRate = rate === null ? 0 : rate;

    const pay =
        regularHours * effectiveRate * weekendMult +
        overtimeHours * effectiveRate * settings.overtimeCoefficient * weekendMult;

    return { hours, pay };
}

function isoFromDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPaydaysAsDates(year, month, settings) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const d1 = Math.min(settings.payday1, daysInMonth);
    const d2 = Math.min(settings.payday2, daysInMonth);
    return [d1, d2].sort((a, b) => a - b).map((d) => new Date(year, month - 1, d));
}

function getCurrentPeriodRange(settings, referenceIso) {
    const ref = new Date(`${referenceIso}T00:00:00`);
    const candidates = [];
    for (let offset = -1; offset <= 1; offset++) {
        const d = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
        candidates.push(...getPaydaysAsDates(d.getFullYear(), d.getMonth() + 1, settings));
    }
    candidates.sort((a, b) => a - b);

    let endIdx = candidates.findIndex((d) => d >= ref);
    if (endIdx === -1) endIdx = candidates.length - 1;

    const end = candidates[endIdx];
    const prevPayday = endIdx > 0 ? candidates[endIdx - 1] : null;
    const start = prevPayday
        ? new Date(prevPayday.getTime() + 86400000)
        : new Date(end.getFullYear(), end.getMonth(), 1);

    return { start: isoFromDate(start), end: isoFromDate(end) };
}

function getActiveRange(settings, referenceIso) {
    if (settings.salaryPeriodMode === "custom_period") {
        return getCurrentPeriodRange(settings, referenceIso);
    }
    const monthStr = referenceIso.slice(0, 7);
    const [y, m] = monthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { start: `${monthStr}-01`, end: `${monthStr}-${String(lastDay).padStart(2, "0")}` };
}

function getRangeSummary(startIso, endIso) {
    const settings = getSettings();
    const allData = getAllDayData();
    const isoDates = Object.keys(allData).filter((iso) => iso >= startIso && iso <= endIso);

    const shiftDays = isoDates.filter((d) => allData[d].type === "shift");
    const vacationDays = isoDates.filter((d) => allData[d].type === "vacation");
    const sickDays = isoDates.filter((d) => allData[d].type === "sick");

    let totalHours = 0;
    let totalPay = 0;
    const missingRateDays = [];

    shiftDays.forEach((iso) => {
        const raw = parseHours(allData[iso].start, allData[iso].end);
        const offByPattern = isScheduledOff(iso);
        const rate = getHourlyRateForMonth(settings, iso.slice(0, 7));
        if (settings.accrualType === "hourly_monthly" && rate === null) {
            missingRateDays.push(iso);
        }
        const { hours, pay } = computeShiftHoursAndPay(raw, offByPattern, settings, rate);
        totalHours += hours;
        totalPay += pay;
    });

    let salary;
    if (settings.accrualType === "oklad") {
        salary = settings.oklad;
    } else if (settings.accrualType === "oklad_percent") {
        salary = settings.oklad * (1 + settings.okladPercent / 100);
    } else {
        salary = totalPay;
    }

    const avgShiftHours = shiftDays.length ? totalHours / shiftDays.length : 0;

    return { shiftDays, vacationDays, sickDays, totalHours, avgShiftHours, salary, missingRateDays };
}

function getAccrualLabelForRange(settings, shiftDaysInRange) {
    if (settings.accrualType === "oklad") return "оклад";
    if (settings.accrualType === "oklad_percent") return `оклад + ${settings.okladPercent}% премии`;
    if (settings.accrualType === "hourly_static") return `по ставке ${settings.hourlyRate} ₽/ч`;

    const months = new Set(shiftDaysInRange.map((iso) => iso.slice(0, 7)));
    if (months.size === 0) return "ставка за месяц";
    if (months.size > 1) return "по ставкам за месяц (период на стыке месяцев)";
    const monthStr = [...months][0];
    const rate = getHourlyRateForMonth(settings, monthStr);
    return rate === null ? "ставка за месяц не задана" : `по ставке ${rate} ₽/ч`;
}

function getRangeLabel(settings, range) {
    const startDate = new Date(`${range.start}T00:00:00`);
    const endDate = new Date(`${range.end}T00:00:00`);
    const endMonthName = endDate.toLocaleDateString("ru-RU", { month: "long" });

    if (settings.salaryPeriodMode === "custom_period") {
        if (startDate.getMonth() === endDate.getMonth()) {
            return `за период ${startDate.getDate()}–${endDate.getDate()} ${endMonthName}`;
        }
        const startMonthName = startDate.toLocaleDateString("ru-RU", { month: "long" });
        return `за период ${startDate.getDate()} ${startMonthName} – ${endDate.getDate()} ${endMonthName}`;
    }
    return `за ${endMonthName}`;
}

function getTodayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentMonthStr() {
    return getTodayIso().slice(0, 7);
}

function refreshAllScreens() {
    renderDashboard();
    renderSalary();
}