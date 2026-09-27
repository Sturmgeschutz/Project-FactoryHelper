let calcCurrent = "0";
let calcPrevious = null;
let calcOperator = null;
let calcResetOnNextDigit = false;

function calcUpdateDisplay() {
    document.getElementById("calcDisplay").textContent = calcCurrent;
}

function calcInputDigit(d) {
    if (calcResetOnNextDigit) {
        calcCurrent = "0";
        calcResetOnNextDigit = false;
    }
    if (d === "." && calcCurrent.includes(".")) return;
    calcCurrent = calcCurrent === "0" && d !== "." ? d : calcCurrent + d;
    calcUpdateDisplay();
}

function calcCompute(a, b, op) {
    switch (op) {
        case "+": return a + b;
        case "−": return a - b;
        case "×": return a * b;
        case "÷": return b === 0 ? 0 : a / b;
        default: return b;
    }
}

function calcRound(n) {
    return Math.round(n * 100000) / 100000;
}

function calcSetOperator(op) {
    if (calcOperator && !calcResetOnNextDigit) {
        calcPrevious = calcCompute(calcPrevious, parseFloat(calcCurrent), calcOperator);
        calcCurrent = String(calcRound(calcPrevious));
        calcUpdateDisplay();
    } else {
        calcPrevious = parseFloat(calcCurrent);
    }
    calcOperator = op;
    calcResetOnNextDigit = true;
}

function calcEquals() {
    if (calcOperator === null) return;
    calcPrevious = calcCompute(calcPrevious, parseFloat(calcCurrent), calcOperator);
    calcCurrent = String(calcRound(calcPrevious));
    calcOperator = null;
    calcResetOnNextDigit = true;
    calcUpdateDisplay();
}

function calcClear() {
    calcCurrent = "0";
    calcPrevious = null;
    calcOperator = null;
    calcResetOnNextDigit = false;
    calcUpdateDisplay();
}

function calcBackspace() {
    calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : "0";
    calcUpdateDisplay();
}

function openCalculator() {
    calcClear();
    document.getElementById("calculatorOverlay").classList.add("open");
    document.body.classList.add("no-scroll");
}

function closeCalculator() {
    document.getElementById("calculatorOverlay").classList.remove("open");
    document.body.classList.remove("no-scroll");
}

document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("calculatorOverlay");

    document.getElementById("calcCloseBtn").addEventListener("click", closeCalculator);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeCalculator();
    });

    document.querySelectorAll("[data-calc-digit]").forEach((btn) => {
        btn.addEventListener("click", () => calcInputDigit(btn.dataset.calcDigit));
    });

    document.querySelectorAll("[data-calc-op]").forEach((btn) => {
        btn.addEventListener("click", () => calcSetOperator(btn.dataset.calcOp));
    });

    document.querySelector('[data-calc-action="clear"]').addEventListener("click", calcClear);
    document.querySelector('[data-calc-action="backspace"]').addEventListener("click", calcBackspace);
    document.querySelector('[data-calc-action="equals"]').addEventListener("click", calcEquals);

    document.getElementById("calcUseAsRateBtn").addEventListener("click", () => {
        const value = parseFloat(calcCurrent);
        if (isNaN(value) || value <= 0) return;
        saveSettings({ hourlyRate: value });
        refreshAllScreens();
        closeCalculator();
    });
});