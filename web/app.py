import requests
from flask import Flask, jsonify

app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    return app.send_static_file("map.html")

@app.route("/paving")
def paving():
    return app.send_static_file("paving_with_station_ids.geojson")

@app.route("/bike-data")
def bike_data():
    url = "https://gbfs.velobixi.com/gbfs/en/station_status.json"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Convert list of stations to a dict: { station_id: num_bikes_available }
        stations = data["data"]["stations"]
        simplified = {
            station["station_id"]: station["num_bikes_available"]
            for station in stations
        }

        return jsonify(simplified)
    except Exception as e:
        return jsonify({"error": "Failed to fetch bike data", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
