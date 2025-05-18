const map = L.map("map").setView([45.508, -73.587], 12);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://carto.com/">CARTO</a> | © OpenStreetMap',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

map.on('drag', () => {
  map.fitBounds(map.getBounds());
});
const canvasRenderer = L.canvas();

let pavingLayer;

var lastUpdateTime = 0;
var to_wait = 0;
const msg = document.getElementById("update-msg");

const updating = "Updating...";

// Smooth gradient color function based on bike availability
function getColor(bikes) {
  if (bikes === null || bikes === undefined) return "#cccccc"; // gray

  // Clamp bikes count to [0, 15]
  const clamped = Math.max(0, Math.min(bikes, 15));

  // Define color stops
  const colorStops = [
    { bikes: 0, color: [255, 0, 0] }, // Red
    { bikes: 5, color: [255, 165, 0] }, // Orange
    { bikes: 10, color: [255, 255, 0] }, // Yellow
    { bikes: 15, color: [0, 128, 0] }, // Green
  ];

  // Find surrounding stops
  let lower, upper;
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (clamped >= colorStops[i].bikes && clamped <= colorStops[i + 1].bikes) {
      lower = colorStops[i];
      upper = colorStops[i + 1];
      break;
    }
  }

  // Linear interpolate RGB values
  const range = upper.bikes - lower.bikes;
  const t = (clamped - lower.bikes) / range;

  const interp = (start, end) => Math.round(start + (end - start) * t);

  const [r, g, b] = [
    interp(lower.color[0], upper.color[0]),
    interp(lower.color[1], upper.color[1]),
    interp(lower.color[2], upper.color[2]),
  ];

  return `rgb(${r},${g},${b})`;
}

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
    const color = getColor(bikes);
    layer.setStyle({ fillColor: color });
    layer.bindPopup(
      `Station ID: ${stationId}<br>${
        layer.feature.properties.name
      }<br>Bikes available: ${bikes !== undefined ? bikes : "N/A"}`
    );
  });
}
// Update polygons styles and popups with live bike data
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
// Load GeoJSON, add to map, then update bike data
fetch("/paving_with_station_ids.geojson")
  .then((res) => res.json())
  .then((geojsonData) => {
    pavingLayer = L.geoJson(geojsonData, {
      renderer: canvasRenderer,
      style: (feature) => ({
        color: "grey",
        weight: 0.01,
        fillOpacity: 0.2,
        fillColor: getColor(null),
      }),
      onEachFeature: function (feature, layer) {
        const stationId = feature.properties.station_id;
        layer.bindPopup(`Station ID: ${stationId}`);
      },
    }).addTo(map);
    // Initial bike data update
    updateBikeData();
  })
  .catch((err) => console.error("Failed to load paving geojson:", err));

// Button to manually update bike data
document.getElementById("update-btn").addEventListener("click", updateBikeData);
