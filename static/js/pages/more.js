function showMoreSection(name) {
    document.getElementById("moreMenu").hidden = true;
    document.querySelectorAll(".more-subview").forEach((el) => { el.hidden = true; });
    document.getElementById(`moreView-${name}`).hidden = false;
}

function showMoreMenu() {
    document.getElementById("moreMenu").hidden = false;
    document.querySelectorAll(".more-subview").forEach((el) => { el.hidden = true; });
}

function goToMoreSection(name) {
    showPage("more");
    document.querySelectorAll(".navitem").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.page === "more");
    });
    showMoreSection(name);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatNoteTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " +
        d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function renderNotesList() {
    const list = document.getElementById("notesList");
    const currentNotes = getNotes();
    if (currentNotes.length === 0) {
        list.innerHTML = '<p class="empty-state-text">Заметок пока нет</p>';
        return;
    }
    list.innerHTML = currentNotes.map((n) => `
        <div class="card note-card">
            <div>
                <p class="note-card-text">${escapeHtml(n.text)}</p>
                <p class="note-card-time">${formatNoteTime(n.createdAt)}</p>
            </div>
            <button class="icon-btn-delete" data-delete-note="${n.id}" aria-label="Удалить">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
        </div>
    `).join("");
}

function renderRemindersList() {
    const list = document.getElementById("remindersList");
    const currentReminders = getReminders();
    if (currentReminders.length === 0) {
        list.innerHTML = '<p class="empty-state-text">Напоминаний пока нет</p>';
        return;
    }
    list.innerHTML = currentReminders.map((r) => `
        <div class="card reminder-row">
            <div class="reminder-row-main">
                <p class="reminder-label">${escapeHtml(r.label)}</p>
                <p class="reminder-datetime">${r.date || ""} ${r.time || ""}</p>
            </div>
            <label class="switch">
                <input type="checkbox" data-toggle-reminder="${r.id}" ${r.enabled ? "checked" : ""}>
                <span class="switch-track"></span>
            </label>
            <button class="icon-btn-delete" data-delete-reminder="${r.id}" aria-label="Удалить">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
        </div>
    `).join("");
}

function renderMonthlyRatesList() {
    const settings = getSettings();
    const list = document.getElementById("monthlyRatesList");
    const months = Object.keys(settings.monthlyRates).sort();

    if (months.length === 0) {
        list.innerHTML = '<p class="card-sub">Ставки ещё не заданы</p>';
        return;
    }

    list.innerHTML = months
        .map((m) => `<div class="listrow"><span class="lname">${m}</span><span class="lamount">${settings.monthlyRates[m]} ₽/ч</span></div>`)
        .join("");
}

function updateSettingsVisibility() {
    const accrualType = document.getElementById("accrualType").value;
    document.getElementById("hourlyRateField").hidden = accrualType !== "hourly_static";
    document.getElementById("monthlyRateField").hidden = accrualType !== "hourly_monthly";
    document.getElementById("okladField").hidden = accrualType === "hourly_static" || accrualType === "hourly_monthly";
    document.getElementById("okladPercentField").hidden = accrualType !== "oklad_percent";

    document.getElementById("breakHoursField").hidden =
        !document.getElementById("breaksEnabled").checked;

    document.getElementById("scheduleAnchorField").hidden =
        document.getElementById("schedulePattern").value === "5x2";

    document.getElementById("paydayFields").hidden =
        document.getElementById("salaryPeriodMode").value !== "custom_period";
}

function fillSettingsForm() {
    const s = getSettings();
    document.getElementById("accrualType").value = s.accrualType;
    document.getElementById("hourlyRate").value = s.hourlyRate;
    document.getElementById("oklad").value = s.oklad;
    document.getElementById("okladPercent").value = s.okladPercent;
    document.getElementById("weekendCoefficient").value = s.weekendCoefficient;
    document.getElementById("overtimeCoefficient").value = s.overtimeCoefficient;
    document.getElementById("normHoursPerShift").value = s.normHoursPerShift;
    document.getElementById("breaksEnabled").checked = s.breaksEnabled;
    document.getElementById("breakHours").value = s.breakHours;
    document.getElementById("schedulePattern").value = s.schedulePattern;
    document.getElementById("scheduleAnchor").value = s.scheduleAnchor;
    document.getElementById("rateMonth").value = getCurrentMonthStr();
    document.getElementById("salaryPeriodMode").value = s.salaryPeriodMode;
    document.getElementById("payday1").value = s.payday1;
    document.getElementById("payday2").value = s.payday2;
    renderMonthlyRatesList();
    updateSettingsVisibility();
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".more-menu-item").forEach((btn) => {
        btn.addEventListener("click", () => showMoreSection(btn.dataset.target));
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
        btn.addEventListener("click", showMoreMenu);
    });

    onStoreReady(() => {
        fillSettingsForm();
        renderNotesList();
        renderRemindersList();
    });

    document.getElementById("accrualType").addEventListener("change", updateSettingsVisibility);
    document.getElementById("breaksEnabled").addEventListener("change", updateSettingsVisibility);
    document.getElementById("schedulePattern").addEventListener("change", updateSettingsVisibility);
    document.getElementById("salaryPeriodMode").addEventListener("change", updateSettingsVisibility);

    document.getElementById("saveMonthlyRateBtn").addEventListener("click", () => {
        const month = document.getElementById("rateMonth").value;
        const rate = parseFloat(document.getElementById("rateMonthValue").value);
        if (!month || isNaN(rate)) return;
        setMonthlyRate(month, rate);
        renderMonthlyRatesList();
        refreshAllScreens();
    });

    document.getElementById("saveSettingsBtn").addEventListener("click", () => {
        saveSettings({
            accrualType: document.getElementById("accrualType").value,
            hourlyRate: parseFloat(document.getElementById("hourlyRate").value) || 0,
            oklad: parseFloat(document.getElementById("oklad").value) || 0,
            okladPercent: parseFloat(document.getElementById("okladPercent").value) || 0,
            weekendCoefficient: parseFloat(document.getElementById("weekendCoefficient").value) || 1,
            overtimeCoefficient: parseFloat(document.getElementById("overtimeCoefficient").value) || 1,
            normHoursPerShift: parseFloat(document.getElementById("normHoursPerShift").value) || 8,
            breaksEnabled: document.getElementById("breaksEnabled").checked,
            breakHours: parseFloat(document.getElementById("breakHours").value) || 0,
            schedulePattern: document.getElementById("schedulePattern").value,
            scheduleAnchor: document.getElementById("scheduleAnchor").value || "2026-07-25",
            salaryPeriodMode: document.getElementById("salaryPeriodMode").value,
            payday1: parseInt(document.getElementById("payday1").value, 10) || 10,
            payday2: parseInt(document.getElementById("payday2").value, 10) || 25,
        });

        renderCalendarGrid();
        refreshAllScreens();

        const savedMsg = document.getElementById("settingsSaved");
        savedMsg.hidden = false;
        setTimeout(() => { savedMsg.hidden = true; }, 1500);
    });

    document.getElementById("noteAddBtn").addEventListener("click", async () => {
        const input = document.getElementById("noteInput");
        const text = input.value.trim();
        if (!text) return;
        await addNote(text);
        input.value = "";
        renderNotesList();
        renderDashboard();
    });

    document.getElementById("notesList").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-delete-note]");
        if (!btn) return;
        deleteNoteLocal(parseInt(btn.dataset.deleteNote, 10));
        renderNotesList();
        renderDashboard();
    });

    document.getElementById("reminderAddBtn").addEventListener("click", async () => {
        const label = document.getElementById("reminderLabel").value.trim();
        const date = document.getElementById("reminderDate").value;
        const time = document.getElementById("reminderTime").value;
        if (!label) return;
        await addReminder(label, date, time);
        document.getElementById("reminderLabel").value = "";
        renderRemindersList();
    });

    document.getElementById("remindersList").addEventListener("click", (e) => {
        const delBtn = e.target.closest("[data-delete-reminder]");
        if (delBtn) {
            deleteReminderLocal(parseInt(delBtn.dataset.deleteReminder, 10));
            renderRemindersList();
        }
    });

    document.getElementById("remindersList").addEventListener("change", (e) => {
        const toggle = e.target.closest("[data-toggle-reminder]");
        if (toggle) {
            toggleReminderLocal(parseInt(toggle.dataset.toggleReminder, 10), toggle.checked);
        }
    });
});