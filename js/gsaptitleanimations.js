document.addEventListener("DOMContentLoaded", function () {
    // Initial drop-in animation for the title (from the bottom)
    gsap.from("#title span", {
        duration: 1.5,
        opacity: 0,
        y: 40, // Start from below
        stagger: 0.1, // Create a wave-like effect for letters
        ease: "power2.out", // Smooth easing
        onComplete: function () {
            // Start the color ripple effect after the initial animation
            startColorRipple();
        },
    });

    // Continuous color ripple effect for the title
    function startColorRipple() {
        gsap.to("#title span", {
            color: "#00d9ff", // Tron-inspired neon blue
            duration: 3, // Smooth transition duration
            repeat: -1, // Infinite loop
            yoyo: true, // Reverse colors for a seamless ripple
            ease: "sine.inOut", // Smooth sine-wave motion
            stagger: {
                each: 0.1, // Delay between letters for the ripple effect
                from: "left", // Ripple flows from left to right
            },
        });
    }

    // Initial float-in animation for the description
    gsap.from("#description", {
        duration: 1.5, // Smooth float-in duration
        opacity: 0, // Fade in
        y: 20, // Start from below
        ease: "power2.out", // Smooth easing
        onComplete: function () {
            // Start subtle floating effect after the initial animation
            startSubtleFloat();
        },
    });

    // Subtle continuous floating effect for the description
    function startSubtleFloat() {
        gsap.to("#description", {
            y: 5, // Reduced vertical float for subtlety
            duration: 4, // Smooth animation over 4 seconds
            repeat: -1, // Infinite loop
            yoyo: true, // Reverse direction for a smooth float
            ease: "sine.inOut", // Gentle easing for natural motion
        });
    }
});
