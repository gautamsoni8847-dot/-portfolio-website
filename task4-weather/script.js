/* =====================================================================
   Weather Dashboard — script.js (Task 4: Asynchronous JavaScript & REST APIs)
   Vanilla JS only. Two REST calls power this app, both against Open-Meteo
   (no API key required):
     1. Geocoding API  — turns a typed city name into latitude/longitude.
     2. Forecast API   — returns live current-weather data for that point.
   ===================================================================== */

(() => {
  'use strict';

  /* -------------------------------------------------------------
     CONFIG — REST API endpoints (Open-Meteo, free, keyless)
     ------------------------------------------------------------- */
  const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const THEME_KEY = 'gs-weather-theme';

  /* -------------------------------------------------------------
     DOM REFERENCES
     ------------------------------------------------------------- */
  const form = document.getElementById('search-form');
  const cityInput = document.getElementById('city-input');
  const inputError = document.getElementById('input-error');
  const statusAnnouncer = document.getElementById('status-announcer');

  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const emptyState = document.getElementById('empty-state');
  const weatherResult = document.getElementById('weather-result');

  const els = {
    cityName: document.getElementById('city-name'),
    regionCountry: document.getElementById('region-country'),
    localTime: document.getElementById('local-time'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherCondition: document.getElementById('weather-condition'),
    currentTemp: document.getElementById('current-temp'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('detail-humidity'),
    wind: document.getElementById('detail-wind'),
    pressure: document.getElementById('detail-pressure'),
    visibility: document.getElementById('detail-visibility'),
    tempMin: document.getElementById('detail-min'),
    tempMax: document.getElementById('detail-max'),
  };

  const themeToggle = document.querySelector('.theme-toggle');

  // Tracks the in-flight request so a fast second search can cancel a
  // slower first one (prevents an old response overwriting a new search).
  let activeController = null;

  /* -------------------------------------------------------------
     WEATHER CODE -> human-readable description + icon
     Open-Meteo returns numeric WMO weather codes; we translate them
     for display since the API itself only gives numbers.
     ------------------------------------------------------------- */
  const WEATHER_CODES = {
    0: { description: 'Clear sky', icon: '☀️' },
    1: { description: 'Mainly clear', icon: '🌤️' },
    2: { description: 'Partly cloudy', icon: '⛅' },
    3: { description: 'Overcast', icon: '☁️' },
    45: { description: 'Fog', icon: '🌫️' },
    48: { description: 'Depositing rime fog', icon: '🌫️' },
    51: { description: 'Light drizzle', icon: '🌦️' },
    53: { description: 'Moderate drizzle', icon: '🌦️' },
    55: { description: 'Dense drizzle', icon: '🌦️' },
    56: { description: 'Light freezing drizzle', icon: '🌧️' },
    57: { description: 'Dense freezing drizzle', icon: '🌧️' },
    61: { description: 'Slight rain', icon: '🌧️' },
    63: { description: 'Moderate rain', icon: '🌧️' },
    65: { description: 'Heavy rain', icon: '🌧️' },
    66: { description: 'Light freezing rain', icon: '🌧️' },
    67: { description: 'Heavy freezing rain', icon: '🌧️' },
    71: { description: 'Slight snow fall', icon: '❄️' },
    73: { description: 'Moderate snow fall', icon: '❄️' },
    75: { description: 'Heavy snow fall', icon: '❄️' },
    77: { description: 'Snow grains', icon: '❄️' },
    80: { description: 'Slight rain showers', icon: '🌦️' },
    81: { description: 'Moderate rain showers', icon: '🌦️' },
    82: { description: 'Violent rain showers', icon: '🌦️' },
    85: { description: 'Slight snow showers', icon: '🌨️' },
    86: { description: 'Heavy snow showers', icon: '🌨️' },
    95: { description: 'Thunderstorm', icon: '⛈️' },
    96: { description: 'Thunderstorm with hail', icon: '⛈️' },
    99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
  };

  function describeWeatherCode(code) {
    return WEATHER_CODES[code] || { description: 'Unknown conditions', icon: '🌡️' };
  }

  /* -------------------------------------------------------------
     REST CALL 1 — GEOCODING
     Converts a city name into coordinates using fetch() + async/await.
     Throws a friendly Error the caller can display if the city isn't
     found or the request itself fails.
     ------------------------------------------------------------- */
  async function geocodeCity(cityName, signal) {
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

    // fetch() returns a Promise; await pauses this async function until
    // the network response headers arrive (the body is read separately).
    const response = await fetch(url, { signal });

    // fetch() only rejects on network failure — a 404/500 still "succeeds"
    // as far as fetch is concerned, so HTTP errors must be checked manually.
    if (!response.ok) {
      throw new Error('Unable to reach the location service. Please try again.');
    }

    // .json() is itself async — it reads and parses the response body.
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`We couldn't find a city named "${cityName}". Check the spelling and try again.`);
    }

    return data.results[0];
  }

  /* -------------------------------------------------------------
     REST CALL 2 — FORECAST
     Fetches live current-weather data for a given latitude/longitude.
     ------------------------------------------------------------- */
  async function fetchWeather(latitude, longitude, signal) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure',
      hourly: 'visibility',
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
    });

    const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error('Unable to retrieve weather data right now. Please try again shortly.');
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error('Weather data is unavailable for this location.');
    }

    return data;
  }

  /* -------------------------------------------------------------
     UI STATE HELPERS
     ------------------------------------------------------------- */
  function showLoading(cityName) {
    loadingState.hidden = false;
    errorState.hidden = true;
    emptyState.hidden = true;
    weatherResult.hidden = true;
    announce(`Loading weather for ${cityName}…`);
  }

  function showError(message) {
    loadingState.hidden = true;
    weatherResult.hidden = true;
    emptyState.hidden = true;
    errorState.hidden = false;
    errorState.textContent = message;
    announce(message);
  }

  function announce(message) {
    statusAnnouncer.textContent = message;
  }

  /* -------------------------------------------------------------
     DOM RENDERING
     Takes the parsed JSON from both API calls and writes it into the
     page using textContent (never innerHTML) for user-influenced data.
     ------------------------------------------------------------- */
  function renderWeather(location, weatherData) {
    const current = weatherData.current;
    const daily = weatherData.daily;
    const { description, icon } = describeWeatherCode(current.weather_code);
// Update the page atmosphere based on the current weather.
document.body.classList.remove(
  'weather-clear',
  'weather-cloudy',
  'weather-rain',
  'weather-thunder'
);

const weatherCode = current.weather_code;

if (weatherCode === 0 || weatherCode === 1) {
  document.body.classList.add('weather-clear');
} else if (
  weatherCode === 2 ||
  weatherCode === 3 ||
  weatherCode === 45 ||
  weatherCode === 48
) {
  document.body.classList.add('weather-cloudy');
} else if (
  weatherCode >= 95
) {
  document.body.classList.add('weather-thunder');
} else if (
  (weatherCode >= 51 && weatherCode <= 67) ||
  (weatherCode >= 80 && weatherCode <= 82)
) {
  document.body.classList.add('weather-rain');
} else {
  document.body.classList.add('weather-cloudy');
}
    // --- Location ---
    els.cityName.textContent = location.name;
    const regionParts = [location.admin1, location.country].filter(Boolean);
    els.regionCountry.textContent = regionParts.join(', ');
    els.localTime.textContent = `Local time: ${formatDateTime(current.time)}`;

    // --- Condition ---
    els.weatherIcon.textContent = icon;
    els.weatherCondition.textContent = description;

    // --- Temperature ---
    els.currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
    els.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

    // --- Detail cards ---
    els.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    els.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    els.pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
    els.visibility.textContent = getVisibilityText(weatherData);

    if (daily && daily.temperature_2m_min && daily.temperature_2m_max) {
      els.tempMin.textContent = `${Math.round(daily.temperature_2m_min[0])}°C`;
      els.tempMax.textContent = `${Math.round(daily.temperature_2m_max[0])}°C`;
    } else {
      els.tempMin.textContent = '—';
      els.tempMax.textContent = '—';
    }

    loadingState.hidden = true;
    errorState.hidden = true;
    emptyState.hidden = true;
    weatherResult.hidden = false;
    announce(`Weather loaded for ${location.name}: ${description}, ${Math.round(current.temperature_2m)} degrees Celsius.`);
  }

  /** Matches the current hour against the hourly visibility array. */
  function getVisibilityText(weatherData) {
    const hourly = weatherData.hourly;
    if (!hourly || !hourly.time || !hourly.visibility) return '—';

    const index = hourly.time.indexOf(weatherData.current.time);
    if (index === -1 || typeof hourly.visibility[index] !== 'number') return '—';

    const km = hourly.visibility[index] / 1000;
    return `${km.toFixed(1)} km`;
  }

  function formatDateTime(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  /* -------------------------------------------------------------
     SEARCH ORCHESTRATION
     Ties the two REST calls together with try/catch/finally so every
     failure mode (bad city, network error, missing data) is handled.
     ------------------------------------------------------------- */
  async function handleSearch(cityName) {
    // Cancel any still-in-flight request from a previous search so an
    // old, slower response can't overwrite a newer one on screen.
    if (activeController) activeController.abort();
    activeController = new AbortController();
    const { signal } = activeController;

    showLoading(cityName);

    try {
      const location = await geocodeCity(cityName, signal);
      const weatherData = await fetchWeather(location.latitude, location.longitude, signal);
      renderWeather(location, weatherData);
    } catch (err) {
      // A search that was intentionally cancelled by a newer one should
      // fail silently rather than flashing an error message.
      if (err.name === 'AbortError') return;

      // fetch() rejects with a TypeError for genuine network failures
      // (offline, DNS failure, CORS block, etc.) — distinguish that from
      // the friendly Errors thrown deliberately above.
      const message = err instanceof TypeError
        ? 'Network error — please check your internet connection and try again.'
        : err.message;

      showError(message);
    }
  }

  /* -------------------------------------------------------------
     EVENT HANDLING
     ------------------------------------------------------------- */
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // Enter key already triggers this via the form
    const cityName = cityInput.value.trim();

    if (!cityName) {
      inputError.hidden = false;
      return;
    }
    inputError.hidden = true;

    // handleSearch is async; we intentionally don't await it here since
    // this is a synchronous event handler — errors are handled inside
    // handleSearch's own try/catch instead.
    handleSearch(cityName);
  });

  cityInput.addEventListener('input', () => {
    if (!inputError.hidden) inputError.hidden = true;
  });

  /* -------------------------------------------------------------
     THEME TOGGLE (persisted, independent of other tasks' theme keys)
     ------------------------------------------------------------- */
 function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const isLight = theme === 'light';

  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.querySelector('.icon').textContent = isLight ? '☀️' : '🌙';
  themeToggle.querySelector('.label').textContent = isLight ? 'Light' : 'Dark';
}

  const savedTheme = window.localStorage.getItem(THEME_KEY);
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(savedTheme || (systemPrefersLight ? 'light' : 'dark'));

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  });
})();