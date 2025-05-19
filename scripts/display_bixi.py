import folium
import branca.colormap as cm
import pandas as pd

def display_point(bixi_stations_geo):
    m = folium.Map(location=[bixi_stations_geo['lat'].mean(), bixi_stations_geo['lon'].mean()], zoom_start=13)
    folium.GeoJson(
        bixi_stations_geo,
        name="stations",
        marker = folium.CircleMarker(radius = 5,
                                            weight = 0,
                                            fill_color = "#D80641", 
                                            fill_opacity = 1),
    ).add_to(m)
    m.add_child(folium.LatLngPopup())
    return m

def display_station(gdf_polygons,bixi_stations_geo):
    m = folium.Map(location=[bixi_stations_geo['lat'].mean(), bixi_stations_geo['lon'].mean()], zoom_start=13)
    folium.GeoJson(
        gdf_polygons,
        name="Paving",
        style_function=lambda feature: {
            'fillColor': "#ad2121ff", 
            'color': 'blue',          
            'weight': 1,
            'fillOpacity': 0
        }).add_to(m)
    return m

def station_point_finder(bixi_stations_geo,station_ix_str,gdf_polygons):
    filtered_point = bixi_stations_geo[bixi_stations_geo['station_id'] == station_ix_str]
    filtered_polygon = gdf_polygons[gdf_polygons['station_id'] == station_ix_str]
    m = folium.Map(location=[bixi_stations_geo['lat'].mean(), bixi_stations_geo['lon'].mean()], zoom_start=13)
    folium.GeoJson(
        filtered_point,
        name="stations",
        marker = folium.CircleMarker(radius = 5,
                                            weight = 0,
                                            fill_color = "#D80641", 
                                            fill_opacity = 1),
    ).add_to(m)

    folium.GeoJson(
    filtered_polygon,
    name="Paving",
    style_function=lambda feature: {
        'fillColor': "#ad2121ff", 
        'color': 'blue',          
        'weight': 1,
        'fillOpacity': 0
    }).add_to(m)
    return m



def display_station_polygon(bixi_stations_geo,gdf_polygons):
    m = folium.Map(location=[bixi_stations_geo['lat'].mean(), bixi_stations_geo['lon'].mean()], zoom_start=13)
    folium.GeoJson(
        bixi_stations_geo,
        name="stations",
        marker = folium.CircleMarker(radius = 5,
                                            weight = 0,
                                            fill_color = "#D80641", 
                                            fill_opacity = 1),
    ).add_to(m)

    folium.GeoJson(
    gdf_polygons,
    name="Paving",
    style_function=lambda feature: {
        'fillColor': "#ad2121ff", 
        'color': 'blue',          
        'weight': 1,
        'fillOpacity': 0
    }).add_to(m)
    return m

def display_area_color(gdf_polygons):
    gdf = gdf_polygons

    m = folium.Map(location=[gdf.geometry.centroid.y.mean(), gdf.geometry.centroid.x.mean()], zoom_start=13)
   
    gdf["id"] = gdf["station_id"].astype(int)
   
    min_id = gdf['id'].min()
    max_id = gdf['id'].max()

    colormap = cm.LinearColormap(
        colors=['blue', 'green', 'yellow', 'red'], 
        vmin=min_id,
        vmax=max_id,
        caption='ID Gradient'
    )

   
    def style_function(feature):
        id_val = feature['properties']['id']
        return {
            'fillColor': colormap(id_val),
            'color': 'black',     
            'weight': 1,
            'fillOpacity': 0.7
        }

   
    folium.GeoJson(
        gdf,
        style_function=style_function,
        name="Polygons"
    ).add_to(m)

   
    colormap.add_to(m)
    return m

def get_color(num_bikes):
        if pd.isna(num_bikes):
            return "gray"  # For missing data
        elif num_bikes == 0:
            return "#FF0000"  # Bright Red
        elif num_bikes < 5:
            return "#FFA500"  # Orange
        elif num_bikes <= 10:
            return "#FFFF00"  # Yellow
        else:
            return "#008000"  # Green

def map_with_num_bikes(gdf_polygons,station_status):
    gdf_merged = gdf_polygons.merge(station_status, on="station_id", how="left")

    m = folium.Map(location=[gdf_polygons.geometry.centroid.y.mean(), gdf_polygons.geometry.centroid.x.mean()], zoom_start=13)
    folium.GeoJson(
        gdf_merged,
        name="Bixi Stations",
        style_function=lambda feature: {
            'fillColor': get_color(feature['properties']['num_bikes_available']),
            'color': 'blue',
            'weight': 0,
            'fillOpacity': 0.4
        }
    ).add_to(m)
    return m