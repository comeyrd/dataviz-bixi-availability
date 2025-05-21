const map = L.map("map", { renderer: L.canvas() }).setView(
  [45.508, -73.587],
  12
);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://carto.com/">CARTO</a> | © OpenStreetMap',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

map.on("drag", () => {
  map.fitBounds(map.getBounds());
});

map.on("zoom", () => {
  map.fitBounds(map.getBounds());
});

const bikeIcon = L.icon({
  iconUrl: "./bike.svg",
  iconSize: [10, 10], // or whatever size you want
  iconAnchor: [5, 5], // center the icon (optional)
  className: "", // optional: suppress default styles
});

let pavingLayer;

var lastUpdateTime = 0;
var to_wait = 0;
const msg = document.getElementById("update-msg");
var stations_layer;
const updating = "Updating...";

const max_bikes = 50;
const color_array = [];
const grey = "#cccccc";

function generate_color_array() {
  const red = [255, 0, 0];
  const orange = [255, 165, 0];
  const yellow = [255, 255, 0];
  const green = [0, 128, 0];
  const interp_color = (start, end, t) => Math.round(start + (end - start) * t);
  const interp_rgb = (start, end, t) => [
    interp_color(start[0], end[0], t),
    interp_color(start[1], end[1], t),
    interp_color(start[2], end[2], t),
  ];
  for (let n_bikes = 0; n_bikes < max_bikes; n_bikes++) {
    bike_color = [];
    if (n_bikes == 0) {
      bike_color = red;
    } else if (n_bikes < 5) {
      bike_color = interp_rgb(red, orange, n_bikes / 5);
    } else if (n_bikes < 10) {
      bike_color = interp_rgb(orange, yellow, (n_bikes - 5) / 5);
    } else if (n_bikes < 15) {
      bike_color = interp_rgb(yellow, green, (n_bikes - 10) / 5);
    } else {
      bike_color = green;
    }
    color_array[
      n_bikes
    ] = `rgb(${bike_color[0]},${bike_color[1]},${bike_color[2]})`;
  }
}

generate_color_array();

function can_update() {
  const now = Date.now();
  const secondsSinceLastUpdate = (now - lastUpdateTime) / 1000;

  if (secondsSinceLastUpdate < 60) {
    to_wait = Math.ceil(60 - secondsSinceLastUpdate);
    return false;
  }
  lastUpdateTime = now;
  return true;
}

function color_map(bikeData) {
  pavingLayer.eachLayer((layer) => {
    const stationId = layer.feature.properties.station_id;
    const bikes = bikeData[stationId];
    const color = color_array[bikes];
    layer.setStyle({ fillColor: color });
    layer.bindPopup(
      `${layer.feature.properties.name}<br>Bikes available: ${
        bikes !== undefined ? bikes : "N/A"
      }`
    );
  });
}

function updateBikeData() {
  if (can_update()) {
    msg.textContent = updating;
    msg.className = "update_message success";
    fetch("/api/bike-data")
      .then((res) => res.json())
      .then((bikeData) => {
        color_map(bikeData);
      })
      .catch((err) => console.error("Failed to update bike data:", err));
  } else {
    msg.className = "update_message failure";
    msg.textContent = `Please wait ${to_wait} second${
      to_wait > 1 ? "s" : ""
    } before updating.`;
  }
  setTimeout(() => {
    msg.textContent = " ";
  }, 1000);
}

fetch("/paving_with_station_ids.geojson")
  .then((res) => res.json())
  .then((geojsonData) => {
    fetch("/api/bike-data")
      .then((res) => res.json())
      .then((bikeData) => {
        pavingLayer = L.geoJson(geojsonData, {
          style: (feature) => ({
            color: "grey",
            weight: 0.01,
            fillOpacity: 0.2,
            fillColor: color_array[bikeData[feature.properties.station_id]],
          }),
        }).addTo(map);

        pavingLayer.eachLayer((layer) => {
          layer.bindPopup(
            `${layer.feature.properties.name}<br>Bikes available: ${
              bikeData[layer.feature.properties.station_id] !== undefined
                ? bikeData[layer.feature.properties.station_id]
                : "N/A"
            }`
          );
        });
        lastUpdateTime = Date.now();
      });
  })
  .catch((err) => console.error("Failed to load paving geojson:", err));

fetch("/stations_and_positions.geojson")
  .then((res) => res.json())
  .then((geojsonData) => {
    stations_layer = L.geoJSON(geojsonData, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: bikeIcon });
      },
    });
    updateMarkerVisibility();

    map.on("zoom", updateMarkerVisibility);
    map.on("zoomend", updateMarkerVisibility);
  })

  .catch((err) => console.error("Failed to load paving geojson:", err));

document.getElementById("update-btn").addEventListener("click", updateBikeData);

function updateMarkerVisibility() {
  if (map.getZoom() >= 15) {
    if (!map.hasLayer(stations_layer)) {
      map.addLayer(stations_layer);
    }
  } else {
    if (map.hasLayer(stations_layer)) {
      map.removeLayer(stations_layer);
    }
  }
}

document.getElementById("update-btn").addEventListener("click", updateBikeData);

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(got_geoloc);
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
}

function got_geoloc(position) {
  map.panTo([position.coords.latitude, position.coords.longitude]);
  var circle = L.circle(
    [position.coords.latitude, position.coords.longitude],
    50,
    {
      weight: 1,
      color: "blue",
      fillColor: "blue",
      fillOpacity: 1,
    }
  );
  map.addLayer(circle);
}

document.getElementById("gps-btn").addEventListener("click", getLocation);
getLocation();
