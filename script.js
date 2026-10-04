"use strict";

// Reuse the same filtering behavior on Collection and Cards.
document.querySelectorAll("[data-card-browser]").forEach((browser) => {
    const controls = browser.querySelector("[data-filter-controls]");
    const search = browser.querySelector("[data-card-search]");
    const colorFilter = browser.querySelector("[data-color-filter]");
    const typeFilter = browser.querySelector("[data-type-filter]");
    const resetButton = browser.querySelector("[data-reset-filters]");
    const resultCount = browser.querySelector("[data-result-count]");
    const noResults = browser.querySelector("[data-no-results]");
    const cards = Array.from(browser.querySelectorAll("[data-card]"));

    // Only activate filters when all required controls are present.
    if (!controls || !search || !colorFilter || !typeFilter ||
        !resetButton || !resultCount || !noResults) {
        return;
    }

    function filterCards() {
        const searchText = search.value.trim().toLowerCase();
        const selectedColor = colorFilter.value;
        const selectedType = typeFilter.value;
        let matches = 0;

        cards.forEach((card) => {
            const name = (card.dataset.name || "").toLowerCase();
            const colors = (card.dataset.color || "").split(/\s+/);
            const types = (card.dataset.type || "").split(/\s+/);

            // A multicolor card matches either of its listed colors.
            const matchesName = name.includes(searchText);
            const matchesColor =
                selectedColor === "" || colors.includes(selectedColor);
            const matchesType =
                selectedType === "" || types.includes(selectedType);

            const isMatch = matchesName && matchesColor && matchesType;
            card.hidden = !isMatch;

            if (isMatch) {
                matches += 1;
            }
        });

        // Count card entries, rather than the number of copies owned.
        resultCount.textContent =
            `Showing ${matches} of ${cards.length} card entries.`;
        noResults.hidden = matches !== 0;
    }

    // Update the results as visitors type or choose an option.
    search.addEventListener("input", filterCards);
    colorFilter.addEventListener("change", filterCards);
    typeFilter.addEventListener("change", filterCards);

    // Restore all entries and return focus to the search field.
    resetButton.addEventListener("click", () => {
        search.value = "";
        colorFilter.value = "";
        typeFilter.value = "";
        filterCards();
        search.focus();
    });

    filterCards();
    controls.hidden = false;
});
