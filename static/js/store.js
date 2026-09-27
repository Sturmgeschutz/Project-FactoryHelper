const OLD_DAY_DATA_KEY = "factoryHelper:dayData";
const OLD_SETTINGS_KEY = "factoryHelper:settings";
const MIGRATED_KEY = "factoryHelper:migratedToBackend";

const DEFAULT_SETTINGS = {
    accrualType: "hourly_static",
    hourlyRate: 480,
    oklad: 60000,
    okladPercent: 10,
    weekendCoefficient: 1,
    overtimeCoefficient: 1,
    normHoursPerShift: 8,
    breaksEnabled: true,
    breakHours: 1,
    schedulePattern: "5x2",
    scheduleAnchor: "2026-07-25",
    customShiftStart: null,
    customShiftEnd: null,
    salaryPeriodMode: "calendar_month",
    payday1: 10,
    payday2: 25,
};

let dayData = {};
let settings = { ...DEFAULT_SETTINGS, monthlyRates: {} };
let notes = [];
let reminders = [];
let storeIsReady = false;
const readyCallbacks = [];

function onStoreReady(callback) {
    if (storeIsReady) callback();
    else readyCallbacks.push(callback);
}

function markReady() {
    storeIsReady = true;
    readyCallbacks.forEach((cb) => {
        try {
            cb();
        } catch (e) {
            console.error("Ошибка при инициализации экрана:", e);
        }
    });
    readyCallbacks.length = 0;
}

async function migrateOldLocalDataIfNeeded() {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    try {
        const oldDays = JSON.parse(localStorage.getItem(OLD_DAY_DATA_KEY) || "{}");
        const oldSettings = JSON.parse(localStorage.getItem(OLD_SETTINGS_KEY) || "null");

        for (const day of Object.keys(oldDays)) {
            const legacyIso = `2026-07-${String(day).padStart(2, "0")}`;
            await fetch(`/api/days/${legacyIso}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oldDays[day]),
            });
        }
        if (oldSettings) {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oldSettings),
            });
        }
        localStorage.setItem(MIGRATED_KEY, "true");
    } catch (e) {
        // бэкенд недоступен при первом запуске — миграция пропускается, попробуем в следующий раз
    }
}

async function initStore() {
    await migrateOldLocalDataIfNeeded();

    try {
        const [daysRes, settingsRes, ratesRes, notesRes, remindersRes] = await Promise.all([
            fetch("/api/days"),
            fetch("/api/settings"),
            fetch("/api/monthly-rates"),
            fetch("/api/notes"),
            fetch("/api/reminders"),
        ]);

        if (daysRes.status === 401 || settingsRes.status === 401) {
            window.location.href = "/login";
            return;
        }

        dayData = await daysRes.json();
        settings = { ...DEFAULT_SETTINGS, ...(await settingsRes.json()) };
        settings.monthlyRates = await ratesRes.json();
        notes = await notesRes.json();
        reminders = await remindersRes.json();
    } catch (e) {
        // бэкенд недоступен — приложение продолжает работать с пустым состоянием, а не падает
    }

    markReady();
}

initStore();

function setDayData(iso, data) {
    dayData[iso] = data;
    fetch(`/api/days/${iso}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    }).catch(() => {});
}

function clearDayData(iso) {
    delete dayData[iso];
    fetch(`/api/days/${iso}`, { method: "DELETE" }).catch(() => {});
}

function getDayData(iso) {
    return dayData[iso] || null;
}

function getAllDayData() {
    return dayData;
}

function hasStoredData() {
    return Object.keys(dayData).length > 0;
}

function getSettings() {
    return settings;
}

function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings, monthlyRates: settings.monthlyRates };
    fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    }).catch(() => {});
}

function setMonthlyRate(month, rate) {
    settings.monthlyRates[month] = rate;
    fetch(`/api/monthly-rates/${month}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
    }).catch(() => {});
}

function getNotes() {
    return notes;
}

async function addNote(text) {
    const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });
    const note = await res.json();
    notes.unshift(note);
    return note;
}

function deleteNoteLocal(id) {
    notes = notes.filter((n) => n.id !== id);
    fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
}

function getReminders() {
    return reminders;
}

async function addReminder(label, date, time) {
    const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, date, time }),
    });
    const reminder = await res.json();
    reminders.push(reminder);
    return reminder;
}

function toggleReminderLocal(id, enabled) {
    const r = reminders.find((x) => x.id === id);
    if (r) r.enabled = enabled;
    fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
    }).catch(() => {});
}

function deleteReminderLocal(id) {
    reminders = reminders.filter((r) => r.id !== id);
    fetch(`/api/reminders/${id}`, { method: "DELETE" }).catch(() => {});
}