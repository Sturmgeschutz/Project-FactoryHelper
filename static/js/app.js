document.addEventListener("DOMContentLoaded", init);

function init() {
    initNavigation();
    initProfileMenu();
    showPage("dashboard");
}

function initNavigation() {
    const buttons = document.querySelectorAll(".navitem");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });
    });
}

function initProfileMenu() {
    const btn = document.getElementById("profileBtn");
    const dropdown = document.getElementById("profileDropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", () => {
        dropdown.hidden = !dropdown.hidden;
    });

    document.addEventListener("click", (e) => {
        const wrap = document.querySelector(".profile-menu-wrap");
        if (wrap && !wrap.contains(e.target)) {
            dropdown.hidden = true;
        }
    });
}