"use strict";

// Submit to Formspree without leaving NorthStar. Existing card filters are unchanged.
const contactForm = document.querySelector("#contact-form");
if (contactForm) {
    const status = document.querySelector("#contact-status");
    const button = contactForm.querySelector('button[type="submit"]');
    const nameField = contactForm.elements.namedItem("name");
    const messageField = contactForm.elements.namedItem("message");

    // Reject whitespace-only messages and names as well as missing values.
    function checkText(field) {
        field.setCustomValidity(field.value.trim() ? "" : "Please enter text, not only spaces.");
    }
    [nameField, messageField].forEach((field) => {
        field.addEventListener("input", () => checkText(field));
    });

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (button.disabled) return;
        [nameField, messageField].forEach(checkText);
        if (!contactForm.reportValidity()) return;

        const data = new FormData(contactForm);
        button.disabled = true;
        button.textContent = "Sending...";
        contactForm.setAttribute("aria-busy", "true");
        status.dataset.state = "pending";
        status.textContent = "Sending your message...";
        try {
            const response = await fetch(contactForm.action, {
                method: "POST",
                body: data,
                headers: { "Accept": "application/json" }
            });
            if (response.ok) {
                // Confirm only after the service accepts the submission.
                status.dataset.state = "success";
                status.textContent = "Thank you! Your message was submitted successfully to NorthStar.";
                contactForm.reset();
                [nameField, messageField].forEach((field) => field.setCustomValidity(""));
            } else {
                const result = await response.json().catch(() => ({}));
                const details = Array.isArray(result.errors)
                    ? result.errors.map((error) => error.message).filter(Boolean).join(" ") : "";
                status.dataset.state = "error";
                // Use textContent so server messages cannot be interpreted as HTML.
                status.textContent = details
                    ? "Your submission was not accepted. " + details
                    : "Your submission was not accepted. Please try again later.";
            }
        } catch (error) {
            status.dataset.state = "error";
            status.textContent = "We could not confirm your submission. Your entries are still here. Check your connection before trying again.";
        } finally {
            button.disabled = false;
            button.textContent = "Send Message";
            contactForm.removeAttribute("aria-busy");
        }
    });
}
