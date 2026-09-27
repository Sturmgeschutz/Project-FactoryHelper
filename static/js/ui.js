const sheetOverlay = document.getElementById("sheetOverlay");
const sheetCloseBtn = document.getElementById("sheetClose");

function openSheet() {
    sheetOverlay.classList.add("open");
    document.body.classList.add("no-scroll");
}

function closeSheet() {
    sheetOverlay.classList.remove("open");
    document.body.classList.remove("no-scroll");
}

sheetOverlay.addEventListener("click", (event) => {
    if (event.target === sheetOverlay) closeSheet();
});

sheetCloseBtn.addEventListener("click", closeSheet);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
});