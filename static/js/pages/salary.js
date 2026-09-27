function renderSalary() {
    const settings = getSettings();
    const todayIso = getTodayIso();
    const range = getActiveRange(settings, todayIso);
    const summary = getRangeSummary(range.start, range.end);

    document.getElementById("salaryHeroValue").textContent =
        `${Math.round(summary.salary).toLocaleString("ru-RU")} ₽`;
    document.getElementById("salaryHeroSub").textContent =
        `${Math.round(summary.totalHours)} ч · ${getAccrualLabelForRange(settings, summary.shiftDays)}`;

    const isHourly = settings.accrualType !== "oklad" && settings.accrualType !== "oklad_percent";
    document.getElementById("salaryRateLabel").textContent = isHourly ? "Ставка" : "Оклад";

    if (settings.accrualType === "hourly_monthly") {
        const rate = getHourlyRateForMonth(settings, todayIso.slice(0, 7));
        document.getElementById("salaryRateValue").textContent = rate === null ? "—" : `${rate} ₽`;
    } else if (isHourly) {
        document.getElementById("salaryRateValue").textContent = `${settings.hourlyRate} ₽`;
    } else {
        document.getElementById("salaryRateValue").textContent = `${settings.oklad.toLocaleString("ru-RU")} ₽`;
    }
    document.getElementById("salaryRateSub").textContent = isHourly ? "за час" : "в месяц";

    document.getElementById("salaryShiftCount").textContent = summary.shiftDays.length;
    document.getElementById("salaryMonthSub").textContent = getRangeLabel(settings, range);

    document.getElementById("statHours").textContent = `${Math.round(summary.totalHours)} ч`;
    document.getElementById("statAvgShift").textContent = `${summary.avgShiftHours.toFixed(1)} ч`;
    document.getElementById("statVacation").textContent = `${summary.vacationDays.length} дн.`;
    document.getElementById("statSick").textContent = `${summary.sickDays.length} дн.`;

    const warningEl = document.getElementById("salaryRateWarning");
    if (summary.missingRateDays.length > 0) {
        warningEl.hidden = false;
        warningEl.textContent = `Без указанной ставки: ${summary.missingRateDays.length} смен(ы) — часы учтены, но не вошли в сумму.`;
    } else {
        warningEl.hidden = true;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    onStoreReady(renderSalary);
});