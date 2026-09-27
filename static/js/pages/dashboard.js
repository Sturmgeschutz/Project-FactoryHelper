function formatShortDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function renderDashboard() {
    const settings = getSettings();
    const todayIso = getTodayIso();
    const range = getActiveRange(settings, todayIso);
    const summary = getRangeSummary(range.start, range.end);

    document.getElementById("hoursLabel").textContent =
        settings.salaryPeriodMode === "custom_period" ? "Часы за период" : "Часы за месяц";
    document.getElementById("hoursValue").textContent = `${Math.round(summary.totalHours)} ч`;

    const salary = Math.round(summary.salary);
    document.getElementById("salaryValue").textContent = `${salary.toLocaleString("ru-RU")} ₽`;
    document.getElementById("salarySub").textContent = getAccrualLabelForRange(settings, summary.shiftDays);

    const startDate = new Date(`${range.start}T00:00:00`);
    const endDate = new Date(`${range.end}T00:00:00`);
    const todayDate = new Date(`${todayIso}T00:00:00`);
    const totalDays = Math.round((endDate - startDate) / 86400000) + 1;
    let elapsedDays = Math.round((todayDate - startDate) / 86400000) + 1;
    elapsedDays = Math.max(1, Math.min(elapsedDays, totalDays));
    const percent = Math.round((elapsedDays / totalDays) * 100);

    document.getElementById("progressLabel").textContent =
        settings.salaryPeriodMode === "custom_period" ? "Прогресс периода" : "Прогресс месяца";
    document.getElementById("progressFill").style.width = `${percent}%`;
    document.getElementById("progressSub").textContent = `День ${elapsedDays} из ${totalDays} · ${percent}%`;

    const allData = getAllDayData();
    const upcomingIso = Object.keys(allData)
        .filter((iso) => allData[iso].type === "shift" && iso >= todayIso)
        .sort()[0];

    const heroTitle = document.getElementById("heroTitle");
    const heroChip = document.getElementById("heroChip");

    if (!upcomingIso) {
        heroTitle.textContent = "Нет ближайшей смены";
        heroChip.textContent = "Добавьте смену в календаре";
    } else {
        const s = allData[upcomingIso];
        heroTitle.textContent = `${s.start}–${s.end}`;
        const diffDays = Math.round(
            (new Date(`${upcomingIso}T00:00:00`) - new Date(`${todayIso}T00:00:00`)) / 86400000
        );
        heroChip.textContent = diffDays === 0 ? "сегодня" : `через ${diffDays} дн.`;
    }

    const currentNotes = getNotes();
    if (currentNotes.length > 0) {
        document.getElementById("lastNoteText").textContent = currentNotes[0].text;
        document.getElementById("lastNoteTime").textContent = formatShortDate(currentNotes[0].createdAt);
    } else {
        document.getElementById("lastNoteText").textContent = "Заметок пока нет";
        document.getElementById("lastNoteTime").textContent = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    onStoreReady(renderDashboard);
    document.getElementById("quickShiftBtn").addEventListener("click", goToTodayAndAddShift);
    document.getElementById("quickNoteBtn").addEventListener("click", () => goToMoreSection("notes"));
    document.getElementById("quickReminderBtn").addEventListener("click", () => goToMoreSection("reminders"));
    document.getElementById("quickCalcBtn").addEventListener("click", openCalculator);
});