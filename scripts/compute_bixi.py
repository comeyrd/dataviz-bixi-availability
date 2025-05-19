import geopandas as gpd
import pandas as pd
import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Polygon
import requests
import json

def download_json(url):
    response = requests.get(url)
    return json.loads(response.text)

def generate_influence_area(bixi_stations_geo, border_points=None):
    coords = np.vstack([bixi_stations_geo.geometry.x,
                       bixi_stations_geo.geometry.y]).T
    coords_border = []
    if border_points is not None:
        coords_border = np.vstack(
            [border_points.geometry.x, border_points.geometry.y]).T
    all_cords = np.vstack([coords, coords_border])
    vor = Voronoi(all_cords)

    polygons = []
    points = []
    bad_points = []
    for i, region_ix in enumerate(vor.point_region):
        region = vor.regions[region_ix]
        if -1 not in region:
            if (vor.points[i] not in coords_border):
                polygons.append(Polygon([vor.vertices[j]
                                for j in region if j != -1]))
                points.append(bixi_stations_geo.loc[i, "station_id"])
        else:
            if (vor.points[i] not in coords_border):
                bad_points.append(vor.points[i])

    gdf_polygons = gpd.GeoDataFrame({
        'station_id': points,        
        'geometry': polygons 
    }, crs="EPSG:4326")
    return gdf_polygons,bad_points

def create_paving(stations_url):
    bixi_stations = pd.DataFrame(download_json(stations_url)["data"]["stations"])
    bixi_stations_geo = gpd.GeoDataFrame(bixi_stations,geometry=gpd.points_from_xy(bixi_stations["lon"],bixi_stations["lat"]),    crs='EPSG:4326')
    border_points = gpd.GeoDataFrame.from_file("data/border.geojson")
    gdf_polygons,bad_points = generate_influence_area(bixi_stations_geo,border_points)
    id_name_df = bixi_stations[["station_id","name"]]
    gdf_polygons = pd.merge(gdf_polygons,id_name_df,how="left",on="station_id")
    return bixi_stations_geo,gdf_polygons