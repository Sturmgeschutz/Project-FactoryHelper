function showPage(page) {
    const pages = document.querySelectorAll("main > section");
    pages.forEach((section) => {
        section.hidden = section.dataset.page !== page;
    });

    const buttons = document.querySelectorAll(".navitem");
    buttons.forEach((button) => {
        button.classList.toggle("active", button.dataset.page === page);
    });
}