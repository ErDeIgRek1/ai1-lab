const API_KEY = "b2b247dd2a2bc6c2cd6bb444f6771efc"; 
const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

class WeatherTable {
  constructor(container) {
    this.container = container;
  }

  render(forecastList) {

    this.container.innerHTML = "";

    if (!forecastList || forecastList.length === 0) {
      this.container.textContent = "Brak danych prognozy.";
      return;
    }

    const table = document.createElement("table");
    table.className = "weather-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = ["Data i godzina", "Temperatura [°C]", "Opis", "Wilgotność [%]"];
    headers.forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    forecastList.forEach(item => {
      const row = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = item.dt_txt;

      const tempCell = document.createElement("td");
      tempCell.textContent = item.main.temp.toFixed(1);

      const descCell = document.createElement("td");
      descCell.textContent = item.weather[0].description;

      const humCell = document.createElement("td");
      humCell.textContent = item.main.humidity;

      row.appendChild(dateCell);
      row.appendChild(tempCell);
      row.appendChild(descCell);
      row.appendChild(humCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    this.container.appendChild(table);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("city-input");
  const weatherBtn = document.getElementById("weather-btn");
  const currentWeatherContent = document.getElementById("current-weather-content");
  const forecastContent = document.getElementById("forecast-content");

  const forecastTable = new WeatherTable(forecastContent);

  weatherBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (!city) {
      alert("Podaj nazwę miejscowości.");
      return;
    }

    loadCurrentWeatherXHR(city, currentWeatherContent);
    loadForecastFetch(city, forecastTable);
  });
});


function loadCurrentWeatherXHR(city, container) {
  const url = `${CURRENT_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pl`;

  const xhr = new XMLHttpRequest();

  xhr.open("GET", url, true);

  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log("Current weather response:", data);

            renderCurrentWeather(data, container);
          } catch (e) {
            console.error("Błąd parsowania JSON (current):", e);
            container.textContent = "Błąd przetwarzania odpowiedzi.";
          }
        } else {
          let status = xhr.status;
          let errMsg = `Błąd zapytania (current), status: ${status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed && parsed.message) errMsg += ` — ${parsed.message}`;
          } catch (e) {
          }
          console.error(errMsg);

          if (status === 401) {
            container.textContent = "Autoryzacja nie powiodła się (401). Sprawdź klucz API w zmiennej `API_KEY`.";
          } else if (status === 404) {
            container.textContent = "Nie znaleziono miejscowości (404). Sprawdź nazwę miasta.";
          } else {
            container.textContent = "Nie udało się pobrać bieżącej pogody.";
          }
        }
      }
  };

  xhr.onerror = function () {
    console.error("Błąd sieci przy zapytaniu (current).");
    container.textContent = "Błąd sieci.";
  };

  xhr.send();
}

function renderCurrentWeather(data, container) {
  container.innerHTML = "";

  const cityName = document.createElement("div");
  cityName.className = "weather-row";
  cityName.textContent = `Miejscowość: ${data.name}`;

  const temp = document.createElement("div");
  temp.className = "weather-row";
  temp.textContent = `Temperatura: ${data.main.temp.toFixed(1)} °C`;

  const desc = document.createElement("div");
  desc.className = "weather-row";
  desc.textContent = `Opis: ${data.weather[0].description}`;

  const humidity = document.createElement("div");
  humidity.className = "weather-row";
  humidity.textContent = `Wilgotność: ${data.main.humidity} %`;

  container.appendChild(cityName);
  container.appendChild(temp);
  container.appendChild(desc);
  container.appendChild(humidity);
}

function loadForecastFetch(city, tableInstance) {
  const url = `${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pl`;

  fetch(url)
    .then(response => {
      if (!response.ok) {

        return response
          .json()
          .then(errBody => {
            const serverMsg = errBody && errBody.message ? ` — ${errBody.message}` : "";
            throw new Error(`Błąd HTTP: ${response.status}${serverMsg}`);
          })
          .catch(() => {
            throw new Error(`Błąd HTTP: ${response.status}`);
          });
      }
      return response.json();
    })
    .then(data => {
      console.log("Forecast response:", data);


      tableInstance.render(data.list);
    })
    .catch(error => {
      console.error("Błąd podczas pobierania prognozy:", error);
      const msg = error && error.message ? error.message : "Nieznany błąd.";
      if (msg.includes("401")) {
        tableInstance.container.textContent = "Autoryzacja nie powiodła się (401). Sprawdź klucz API w zmiennej `API_KEY`.";
      } else if (msg.includes("404")) {
        tableInstance.container.textContent = "Nie znaleziono miejscowości. Sprawdź nazwę miasta.";
      } else {
        tableInstance.container.textContent = "Nie udało się pobrać prognozy. " + msg;
      }
    });
}
