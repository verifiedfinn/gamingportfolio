document.addEventListener("DOMContentLoaded", function () {
    emailjs.init("2i16JF-0XWooEfHvQ"); // Initialize EmailJS with Public API Key

    const form = document.querySelector("form");
    const feedback = document.createElement("div");
    feedback.id = "formFeedback";
    form.appendChild(feedback); // notification basically to say if it sent or not 

    // Handle form submission
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Collect form values
        const firstName = document.getElementById("fname").value.trim();
        const lastName = document.getElementById("lname").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        // Input validation
        if (!firstName || !lastName || !email || !message) {
            displayFeedback("Please fill in all fields.", "error");
            return;
        }

        if (!isValidEmail(email)) {
            displayFeedback("Please enter a valid email address.", "error");
            return;
        }

        // Send the form data to EmailJS
        console.log("Sending data to EmailJS...");
        emailjs.send("service_1tghzb5", "template_76dgq9n", {
            fname: firstName,
            lname: lastName,
            email: email,
            message: message,
        }).then(function () {
            console.log("Form sent successfully.");
            displayFeedback("Your message has been sent successfully!", "success");
            form.reset();
        }).catch(function (error) {
            console.error("Error sending form:", error);
            displayFeedback("Failed to send your message. Please try again.", "error");
        });
    });

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Display feedback to the user
    function displayFeedback(message, type) {
        feedback.textContent = message;
        feedback.classList.remove("success", "error");
        feedback.classList.add(type);
        feedback.style.marginTop = "10px";
    }
});


