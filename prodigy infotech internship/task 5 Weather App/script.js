const container = document.querySelector('.container');
const searchInput = document.querySelector('#search-input');
const searchButton = document.querySelector('#search-button');
const locationButton = document.querySelector('#location-button');
const weatherBox = document.querySelector('.weather-box');
const weatherDetails = document.querySelector('.weather-details');
const error404 = document.querySelector('.not-found');

// Your OpenWeatherMap API Key
const API_KEY = '4d8fb5b93d4af21d66a2948710284366';

// Debug mode flag
const DEBUG = true;

// Search history and cache
const MAX_HISTORY = 5;
const MAX_CACHE_AGE = 10 * 60 * 1000; // 10 minutes
let searchHistory = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
let weatherCache = new Map();

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Function to handle search suggestions
function showSearchSuggestions(searchTerm) {
    const suggestions = searchHistory.filter(item => 
        item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Remove existing suggestions
    const existingSuggestions = document.querySelector('.search-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    if (searchTerm && suggestions.length > 0) {
        const suggestionBox = document.createElement('div');
        suggestionBox.className = 'search-suggestions';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                suggestionBox.remove();
                getWeatherData(suggestion);
            });
            suggestionBox.appendChild(item);
        });

        searchInput.parentNode.appendChild(suggestionBox);
    }
}

// Function to update search history
function updateSearchHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.unshift(city);
        if (searchHistory.length > MAX_HISTORY) {
            searchHistory.pop();
        }
        localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
    }
}

// Function to check cache
function checkCache(city) {
    if (weatherCache.has(city)) {
        const cachedData = weatherCache.get(city);
        if (Date.now() - cachedData.timestamp < MAX_CACHE_AGE) {
            return cachedData.data;
        } else {
            weatherCache.delete(city);
        }
    }
    return null;
}

// Function to update cache
function updateCache(city, data) {
    weatherCache.set(city, {
        data: data,
        timestamp: Date.now()
    });
}

// For development only - remove in production
function debugLog(message, data = null) {
    if (DEBUG) {
        console.log(`[Weather App Debug] ${message}`);
        if (data) {
            console.log(data);
        }
    }
}

// Update API key validation
function validateApiKey() {
    if (!API_KEY || API_KEY === 'your_openweathermap_api_key_here' || API_KEY === 'YOUR_API_KEY') {
        showError('Please set up your API key in the script.js file');
        throw new Error('API key not configured');
    }
}

// Function to show error state
function showError(message) {
    debugLog('Error:', message);
    container.style.height = '400px';
    weatherBox.style.display = 'none';
    weatherDetails.style.display = 'none';
    error404.style.display = 'block';
    error404.classList.add('fadeIn');
    error404.querySelector('p').textContent = message || 'Oops! Invalid location!';
}

// Function to validate weather data
function validateWeatherData(data) {
    debugLog('Validating weather data:', data);
    
    const requiredFields = {
        weather: Array.isArray(data.weather) && data.weather.length > 0,
        main: data.main && typeof data.main === 'object',
        name: typeof data.name === 'string',
        sys: data.sys && typeof data.sys === 'object',
        coord: data.coord && typeof data.coord === 'object',
        wind: data.wind && typeof data.wind === 'object'
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([, valid]) => !valid)
        .map(([field]) => field);

    if (missingFields.length > 0) {
        debugLog('Missing or invalid fields:', missingFields);
        return false;
    }

    return true;
}

// Function to fetch weather data
async function getWeatherData(city, retryCount = 0) {
    try {
        validateApiKey();

        if (!city) {
            showError('Please enter a city name');
            return;
        }

        // Check cache first
        const cachedData = checkCache(city);
        if (cachedData) {
            debugLog('Using cached data for:', city);
            updateUI(cachedData);
            return;
        }

        debugLog('Fetching weather data for city:', city);

        // Show loading state
        showLoading();

        // Check network connectivity
        if (!navigator.onLine) {
            throw new Error('No internet connection');
        }

        // Fetch current weather
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
        );

        debugLog('API Response status:', weatherResponse.status);

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 404) {
                // Try searching with fuzzy matching
                const fuzzyResponse = await fetch(
                    `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${API_KEY}`
                );
                const fuzzyResults = await fuzzyResponse.json();
                
                if (fuzzyResults.length > 0) {
                    // Use the first match
                    const bestMatch = fuzzyResults[0];
                    return getWeatherData(`${bestMatch.name}, ${bestMatch.country}`, retryCount);
                }
            }
            throw new Error(`HTTP error! Status: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        debugLog('Weather API Response data:', weatherData);

        // Fetch additional forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();
        
        // Combine weather and forecast data
        const combinedData = {
            current: weatherData,
            forecast: forecastData
        };

        // Validate and process data
        if (!validateWeatherData(weatherData)) {
            throw new Error('Incomplete weather data received');
        }

        // Update cache and history
        updateCache(city, combinedData);
        updateSearchHistory(city);

        // Update UI
        updateUI(combinedData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        
        if (retryCount < 2 && error.message.includes('HTTP error')) {
            // Retry with delay
            debugLog(`Retrying... Attempt ${retryCount + 1}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return getWeatherData(city, retryCount + 1);
        }
        
        showError(error.message || 'Failed to fetch weather data. Please try again.');
    }
}

// Function to show loading state
function showLoading() {
    weatherBox.style.display = 'none';
    weatherDetails.style.display = 'none';
    error404.style.display = 'none';
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    container.appendChild(loadingIndicator);
}

// Function to update UI with weather data
function updateUI(data) {
    const { current, forecast } = data;
    
    // Remove loading indicator
    const loadingIndicator = container.querySelector('.loading');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    error404.style.display = 'none';
    error404.classList.remove('fadeIn');

    const image = document.querySelector('.weather-box img');
    const temperature = document.querySelector('.weather-box .temperature');
    const description = document.querySelector('.weather-box .description');
    const cityName = document.querySelector('.weather-box .city');
    const humidity = document.querySelector('.weather-details .humidity span');
    const wind = document.querySelector('.weather-details .wind span');

    // Get weather icon code from API response
    const weatherIcon = current.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;

    // Preload and set weather icon
    const preloadImage = new Image();
    preloadImage.onload = () => {
        image.src = iconUrl;
        image.classList.add('weather-icon');
    };
    preloadImage.onerror = () => {
        debugLog('Error loading weather icon:', iconUrl);
        // Use default icon if loading fails
        image.src = `https://openweathermap.org/img/wn/02d@2x.png`;
        image.classList.add('weather-icon');
    };
    preloadImage.src = iconUrl;

    // Update weather information with enhanced formatting
    temperature.innerHTML = `${Math.round(current.main.temp)}<span>°C</span>`;
    description.innerHTML = `${current.weather[0].description} | Feels like ${Math.round(current.main.feels_like)}°C`;
    cityName.innerHTML = `${current.name}, ${current.sys.country}`;
    humidity.innerHTML = `${current.main.humidity}%`;
    wind.innerHTML = `${Math.round(current.wind.speed * 3.6)}Km/h`; // Convert m/s to km/h

    // Show the weather information with animation
    weatherBox.style.display = '';
    weatherDetails.style.display = '';
    weatherBox.classList.add('fadeIn');
    weatherDetails.classList.add('fadeIn');
    container.style.height = '590px';

    // Update forecast if available
    if (forecast && forecast.list) {
        updateForecast(forecast.list);
    }

    debugLog('Weather data successfully displayed');
}

// Function to check if it's daytime
function isDayTime(sunrise, sunset) {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return now >= sunrise && now <= sunset;
}

// Function to update forecast display
function updateForecast(forecastList) {
    // Implementation for forecast display
    // This would create and update a forecast section in your HTML
}

// Event listeners with debouncing
searchInput.addEventListener('input', debounce((e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length >= 2) {
        showSearchSuggestions(searchTerm);
    }
}, 300));

searchButton.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) getWeatherData(city);
});

locationButton.addEventListener('click', getCurrentLocation);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) getWeatherData(city);
    }
});

// Add this CSS to your stylesheet
const style = document.createElement('style');
style.textContent = `
.search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    margin-top: 8px;
    overflow: hidden;
    z-index: 1000;
}

.suggestion-item {
    padding: 12px 20px;
    color: #fff;
    cursor: pointer;
    transition: all 0.3s ease;
}

.suggestion-item:hover {
    background: rgba(255, 255, 255, 0.3);
}

.loading {
    text-align: center;
    margin: 20px 0;
}
`;
document.head.appendChild(style);

// Initial setup
validateApiKey();

// Function to request and verify location permission
async function checkLocationPermission() {
    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        debugLog('Geolocation permission status:', permission.state);
        
        switch (permission.state) {
            case 'granted':
                return true;
            case 'prompt':
                showError('Please allow location access when prompted');
                return true;
            case 'denied':
                showError('Location access is denied. Please enable it in your browser settings.');
                return false;
            default:
                return false;
        }
    } catch (error) {
        debugLog('Error checking location permission:', error);
        return false;
    }
}

// Function to get user's current location
async function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    try {
        const hasPermission = await checkLocationPermission();
        if (!hasPermission) return;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                debugLog('Got user location:', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });

                try {
                    const response = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&units=metric&appid=${API_KEY}`
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    const data = await response.json();
                    debugLog('Location weather data:', data);

                    if (data && data.name) {
                        searchInput.value = data.name;
                        getWeatherData(data.name);
                    } else {
                        showError('Could not determine your location');
                    }
                } catch (error) {
                    console.error('Error fetching location data:', error);
                    showError('Failed to get weather for your location');
                }
            },
            (error) => {
                debugLog('Geolocation error:', error);
                let errorMessage = 'Failed to get your location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'Please try again or enter a city manually.';
                }
                showError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } catch (error) {
        console.error('Error in getCurrentLocation:', error);
        showError('An error occurred while getting your location');
    }
} 