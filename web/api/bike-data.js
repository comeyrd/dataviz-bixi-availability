const axios = require("axios");

export default async function handler(req, res) {
  const url = "https://gbfs.velobixi.com/gbfs/en/station_status.json";

  try {
    const response = await axios.get(url);
    const stations = response.data.data.stations;

    const simplified = {};
    stations.forEach((station) => {
      simplified[station.station_id] = station.num_bikes_available;
    });

    res.status(200).json(simplified);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch bike data",
      details: error.message,
    });
  }
}
