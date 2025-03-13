const API_KEY = 'YOUR_WEATHER_API_KEY';
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const currentLocationBtn = document.getElementById('current-location-btn');

let autocomplete;

function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(locationInput, {
        types: ['(cities)'],
        fields: ['formatted_address', 'geometry', 'name'],
        componentRestrictions: { } // No country restriction
    });

    // Style the autocomplete dropdown to match Windows/Material design
    const pac_container = document.querySelector('.pac-container');
    if (pac_container) {
        pac_container.style.fontFamily = "'Segoe UI', sans-serif";
        pac_container.style.borderRadius = '4px';
        pac_container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    }

    // Handle place selection
    autocomplete.addListener('place_changed', handlePlaceSelection);
    
    // Prevent form submission on enter (let autocomplete handle it)
    locationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

function handlePlaceSelection() {
    const place = autocomplete.getPlace();
    
    if (!place.geometry) {
        // User pressed enter without selecting from dropdown
        errorMessage.textContent = "Please select a location from the dropdown menu";
        errorMessage.classList.remove('hidden');
        return;
    }

    const lat = place.geometry.location.lat();
    const lon = place.geometry.location.lng();
    
    // Update input with formatted address
    locationInput.value = place.formatted_address;
    
    // Get weather for selected location
    getWeatherData(lat, lon);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        // Show loading state
        currentLocationBtn.disabled = true;
        currentLocationBtn.textContent = 'Getting location...';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Reverse geocode to get address
                try {
                    const geocoder = new google.maps.Geocoder();
                    const result = await geocoder.geocode({
                        location: { lat: latitude, lng: longitude }
                    });
                    
                    if (result.results[0]) {
                        locationInput.value = result.results[0].formatted_address;
                    }
                    
                    getWeatherData(latitude, longitude);
                } catch (error) {
                    console.error('Geocoding error:', error);
                    getWeatherData(latitude, longitude);
                }
                
                // Reset button
                currentLocationBtn.disabled = false;
                currentLocationBtn.textContent = 'Use Current Location';
            },
            (error) => {
                console.error('Geolocation error:', error);
                errorMessage.textContent = 'Unable to get your location. Please check your permissions.';
                errorMessage.classList.remove('hidden');
                
                // Reset button
                currentLocationBtn.disabled = false;
                currentLocationBtn.textContent = 'Use Current Location';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        errorMessage.textContent = 'Geolocation is not supported by your browser';
        errorMessage.classList.remove('hidden');
    }
}

// Initialize Google Maps functionality when page loads
window.onload = initAutocomplete;

// Add event listeners
searchBtn.addEventListener('click', () => {
    if (locationInput.value.trim()) {
        // Trigger place_changed event if there's text
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) {
            errorMessage.textContent = "Please select a location from the dropdown menu";
            errorMessage.classList.remove('hidden');
        }
    }
});

currentLocationBtn.addEventListener('click', getCurrentLocation);

async function getWeatherData(latitude, longitude) {
    try {
        console.log('Fetching weather for coordinates:', latitude, longitude);
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            console.error('API Error:', await response.text());
            throw new Error('Weather data not found');
        }

        const data = await response.json();
        console.log('Weather data received:', data);
        displayWeatherData(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError();
    }
}

async function getWeatherDataByCity(city) {
    try {
        console.log('Fetching weather for city:', city);
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(errorData.message || 'Location not found');
        }

        const data = await response.json();
        console.log('Weather data received:', data);
        displayWeatherData(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError();
    }
}

function displayWeatherData(data) {
    weatherInfo.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    document.getElementById('location').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('temperature').textContent = Math.round(data.main.temp);
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = data.main.humidity;
    document.getElementById('wind-speed').textContent = data.wind.speed;
    document.getElementById('weather-icon').src = 
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
}

function showError() {
    weatherInfo.classList.add('hidden');
    errorMessage.classList.remove('hidden');
} 