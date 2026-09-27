function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function getFirstWeekdayMonFirst(year, month) {
    const jsDay = new Date(year, month - 1, 1).getDay();
    return (jsDay + 6) % 7;
}

function isoOf(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

const todayForView = new Date();
let viewYear = todayForView.getFullYear();
let viewMonth = todayForView.getMonth() + 1;
let selectedDate = null;
let lastShiftTimes = { start: "08:00", end: "20:00" };

function applyDayVisual(iso, btnArg) {
    const btn = btnArg || document.querySelector(`.day[data-iso="${iso}"]`);
    if (!btn) return;

    btn.classList.remove("off", "vac", "sick", "shift");
    btn.title = "";

    const data = getDayData(iso);
    if (data && data.type === "shift") {
        btn.classList.add("shift");
        btn.title = `Смена ${data.start}–${data.end}`;
    } else if (data && data.type === "vacation") {
        btn.classList.add("vac");
    } else if (data && data.type === "sick") {
        btn.classList.add("sick");
    } else if (isScheduledOff(iso)) {
        btn.classList.add("off");
    }
}

function getStatusLabel(iso) {
    const data = getDayData(iso);
    if (data && data.type === "shift") return `Смена ${data.start}–${data.end}`;
    if (data && data.type === "vacation") return "Отпуск";
    if (data && data.type === "sick") return "Больничный";
    if (isScheduledOff(iso)) return "Выходной";
    return "Без смены";
}

function renderCalendarGrid() {
    const grid = document.getElementById("dayGrid");
    grid.innerHTML = "";

    const label = `${MONTH_NAMES[viewMonth - 1].charAt(0).toUpperCase()}${MONTH_NAMES[viewMonth - 1].slice(1)} ${viewYear}`;
    document.getElementById("monthLabel").textContent = label;

    const leadingBlanks = getFirstWeekdayMonFirst(viewYear, viewMonth);
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const todayIso = getTodayIso();

    for (let i = 0; i < leadingBlanks; i++) {
        const blank = document.createElement("span");
        blank.className = "day blank";
        grid.appendChild(blank);
    }

    for (let day = 1; day <= totalDays; day++) {
        const iso = isoOf(viewYear, viewMonth, day);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day";
        btn.textContent = day;
        btn.dataset.iso = iso;
        if (iso === todayIso) btn.classList.add("today");
        if (iso === selectedDate) btn.classList.add("selected");

        btn.addEventListener("click", () => selectDay(iso));

        grid.appendChild(btn);
        applyDayVisual(iso, btn);
    }
}

function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
    if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
    renderCalendarGrid();
}

function selectDay(iso) {
    selectedDate = iso;

    document.querySelectorAll(".day-grid .day").forEach((btn) => btn.classList.remove("selected"));
    const btn = document.querySelector(`.day[data-iso="${iso}"]`);
    if (btn) btn.classList.add("selected");

    const date = new Date(`${iso}T00:00:00`);
    let weekday = date.toLocaleDateString("ru-RU", { weekday: "long" });
    weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const dayMonth = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

    document.getElementById("dayCardTitle").textContent = `${weekday}, ${dayMonth}`;
    document.getElementById("dayCardSub").textContent = `${getStatusLabel(iso)} · заметок нет`;
}

function openDaySheet() {
    if (!selectedDate) return;
    document.getElementById("sheetTitle").textContent = "Добавить";
    document.getElementById("sheetActions").hidden = false;
    document.getElementById("shiftForm").hidden = true;
    document.getElementById("clearAction").hidden = !getDayData(selectedDate);
    openSheet();
}

function openShiftFormView() {
    renderCustomChip();
    document.getElementById("shiftDate").value = selectedDate;

    const existing = getDayData(selectedDate);
    if (existing && existing.type === "shift") {
        document.getElementById("shiftStart").value = existing.start;
        document.getElementById("shiftEnd").value = existing.end;
    } else {
        document.getElementById("shiftStart").value = lastShiftTimes.start;
        document.getElementById("shiftEnd").value = lastShiftTimes.end;
    }

    document.getElementById("shiftError").hidden = true;
    document.getElementById("sheetTitle").textContent = "Добавить смену";
    document.getElementById("sheetActions").hidden = true;
    document.getElementById("shiftForm").hidden = false;
}

function renderCustomChip() {
    const settings = getSettings();
    const label = document.getElementById("customChipLabel");
    if (!label) return;
    if (settings.customShiftStart && settings.customShiftEnd) {
        label.textContent = `Своя ${settings.customShiftStart}–${settings.customShiftEnd}`;
    } else {
        label.textContent = "Своя — не задана";
    }
}

function applyQuickStatus(type) {
    setDayData(selectedDate, { type });
    applyDayVisual(selectedDate);
    closeSheet();
    selectDay(selectedDate);
    refreshAllScreens();
}

function goToTodayAndAddShift() {
    const nowForNav = new Date();
    viewYear = nowForNav.getFullYear();
    viewMonth = nowForNav.getMonth() + 1;
    renderCalendarGrid();
    selectDay(getTodayIso());
    openShiftFormView();
    openSheet();
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("shiftForm");
    const errorEl = document.getElementById("shiftError");
    const fab = document.querySelector(".fab");
    const dayAddBtn = document.getElementById("dayAddBtn");

    document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth(1));

    onStoreReady(() => {
        renderCalendarGrid();
        selectDay(getTodayIso());
    });

    fab.addEventListener("click", openDaySheet);
    dayAddBtn.addEventListener("click", openDaySheet);

    document.querySelectorAll(".template-chip[data-start]").forEach((chip) => {
        chip.addEventListener("click", () => {
            document.getElementById("shiftStart").value = chip.dataset.start;
            document.getElementById("shiftEnd").value = chip.dataset.end;
        });
    });

    document.getElementById("customChipLabel").addEventListener("click", () => {
        const s = getSettings();
        if (s.customShiftStart && s.customShiftEnd) {
            document.getElementById("shiftStart").value = s.customShiftStart;
            document.getElementById("shiftEnd").value = s.customShiftEnd;
        }
    });

    document.getElementById("customChipEdit").addEventListener("click", () => {
        const start = document.getElementById("shiftStart").value;
        const end = document.getElementById("shiftEnd").value;
        saveSettings({ customShiftStart: start, customShiftEnd: end });
        renderCustomChip();
    });

    document.querySelectorAll(".sheet-action").forEach((btn) => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            if (action === "shift") openShiftFormView();
            else if (action === "vacation") applyQuickStatus("vacation");
            else if (action === "sick") applyQuickStatus("sick");
            else if (action === "clear") {
                clearDayData(selectedDate);
                applyDayVisual(selectedDate);
                closeSheet();
                selectDay(selectedDate);
                refreshAllScreens();
            }
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const iso = document.getElementById("shiftDate").value;
        const start = document.getElementById("shiftStart").value;
        const end = document.getElementById("shiftEnd").value;

        if (!iso) {
            errorEl.textContent = "Укажите дату.";
            errorEl.hidden = false;
            return;
        }

        setDayData(iso, { type: "shift", start, end });
        lastShiftTimes = { start, end };

        const [y, m] = iso.split("-").map(Number);
        if (y !== viewYear || m !== viewMonth) {
            viewYear = y;
            viewMonth = m;
        }
        renderCalendarGrid();

        errorEl.hidden = true;
        form.reset();
        closeSheet();
        selectDay(iso);
        refreshAllScreens();
    });
});