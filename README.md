<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>I know where you live!</title>
    <script>
        async function getLocation() {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                document.getElementById('location').textContent = 
                    `You are visiting from ${data.city}, ${data.region}, ${data.country_name}`;
            } catch (error) {
                document.getElementById('location').textContent = 
                    "Unable to fetch your location.";
            }
        }
        window.onload = getLocation;
    </script>
</head>
<body>
    <header>
        <h1>GIMME £10 not to sell your info!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!</h1>
        <p id="location">Determining your location...</p>
    </header>
    <main id="projects">
    </main>
    <footer>
        <p>&copy; 2024 Your Name</p>
    </footer>
</body>
</html>
