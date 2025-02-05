$(document).ready(function () {
    let data; // Store JSON data
    let currentIndex = 0; // Track the current slide
    let autoFadeInterval; // Store the interval for auto-fading

    // Load JSON data
    $.ajax({
        url: "data/favskins.json", // Path to your JSON file
        success: function (response) {
            data = response;
            console.log("JSON Data Loaded:", data); // Debug
            initialise(data); // Initialize carousel and dropdown
        },
        error: function () {
            console.error("Failed to load JSON data.");
        }
    });

    // Initialize carousel and dropdown
    function initialise(data) {
        if (data && data.length > 0) {
            updateContent(); // Show the first slide
            populateDropdown(data); // Populate dropdown
            startAutoFade(); // Start auto-fading
        } else {
            console.error("No data found in JSON.");
        }
    }

    // Update carousel content with fade animation
    function updateContent() {
        const project = data[currentIndex]; // Get the current project
        const displayContainer = $("#image-display");
        const existingContent = displayContainer.find(".carousel-item");

        if (existingContent.length > 0) {
            existingContent.fadeOut(300, function () {
                displayContainer.empty();
                appendNewContent(project, displayContainer);
                displayContainer.children().hide().fadeIn(300);
            });
        } else {
            appendNewContent(project, displayContainer);
            displayContainer.children().hide().fadeIn(300);
        }
    }

    // Function to append new content to the display container
    function appendNewContent(project, displayContainer) {
        const contentHTML = `
            <div class="carousel-item">
                <h2><a href="${project.url}" target="_blank">${project.title}</a></h2>
                <ul>
                    ${project.description.map((item) => `<li>${item}</li>`).join("")}
                </ul>
                <div class="project_image_container">
                    <img src="${project.images.src}" alt="${project.images.alt}" class="skin_image">
                </div>
            </div>
        `;
        displayContainer.append(contentHTML);
    }

    // Start auto-fading
    function startAutoFade() {
        autoFadeInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % data.length;
            updateContent();
        }, 10000); // Auto-fade every 10 seconds
    }

    // Stop auto-fading
    function stopAutoFade() {
        clearInterval(autoFadeInterval);
        console.log("Auto-fade stopped.");
    }

    // Next button functionality
    $("#next").on("click", function () {
        stopAutoFade();
        currentIndex = (currentIndex + 1) % data.length;
        updateContent();
    });

    // Previous button functionality
    $("#prev").on("click", function () {
        stopAutoFade();
        currentIndex = (currentIndex - 1 + data.length) % data.length;
        updateContent();
    });

    // Unified hover and click effects for navigation buttons
    $("#prev, #next").on({
        mouseenter: function () {
            $(this).css("background-color", "green");
        },
        mouseleave: function () {
            $(this).css("background-color", "red");
        },
        click: function () {
            $(this).css("background-color", "orange");
        }
    });

    // Populate dropdown content dynamically
    function populateDropdown(data) {
        const dropdownContainer = $("#skins-list");
        dropdownContainer.empty(); // Clear existing content

        data.forEach(item => {
            const dropdownContent = `
                <div class="skin-item">
                    <h2><a href="${item.url}" target="_blank">${item.title}</a></h2>
                    <ul>
                        ${item.description.map(desc => `<li>${desc}</li>`).join("")}
                    </ul>
                    <img src="${item.images.src}" alt="${item.images.alt}" class="skin_image">
                </div>
            `;
            dropdownContainer.append(dropdownContent); // Add each item
        });
    }

    // Smooth dropdown functionality for the slider button
    $("#sliderbutton").click(function () {
        const content = $("#slidercontent");

        // Prevent animation interruptions
        content.stop(true, false);

        if (content.is(":visible")) {
            content.slideUp(400, "swing");
        } else {
            content.slideDown(400, "swing", function () {
                $("html, body").animate(
                    { scrollTop: content.offset().top },
                    400,
                    "swing"
                );
            });
        }
    });
});

