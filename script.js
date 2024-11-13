// Fetch user's location using a geolocation API
async function getLocation() {
    try {
        // Call a free geolocation API (e.g., ipapi.co)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        // Display the location on the webpage
        document.getElementById('location').textContent =
            `You are visiting from ${data.city}, ${data.region}, ${data.country_name}`;
    } catch (error) {
        // Handle errors gracefully
        document.getElementById('location').textContent =
            "Unable to determine your location.";
    }
}

// Call the function when the page loads
getLocation();
