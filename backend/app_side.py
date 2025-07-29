import streamlit as st
import pandas as pd
import folium
from streamlit_folium import folium_static
from db_utils import fetch_all_points, fetch_analytics
import os

# Page configuration
st.set_page_config(
    page_title="Maine Infrastructure Platform",
    page_icon="🗺️",
    layout="wide"
)

def main():
    st.title("🗺️ Maine Infrastructure Platform")
    st.write("Interactive map showing all infrastructure points across Maine")
    
    # Add a refresh button
    if st.button("🔄 Refresh Data"):
        st.rerun()
    
    # Load all data
    points = fetch_all_points()
    df = pd.DataFrame(points, columns=["lat", "lon", "type", "name", "org_id"])
    
    # Get analytics
    total, type_counts, org_counts = fetch_analytics()
    
    if df.empty:
        st.error("No data available.")
        return
    
    # Show analytics
    st.subheader("📊 Platform Analytics")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Points", total)
    with col2:
        st.metric("Organizations", len(org_counts))
    with col3:
        st.metric("Infrastructure Types", len(type_counts))
    with col4:
        st.metric("Last Updated", "Real-time")
    
    # Show analytics tables
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Points by Type")
        if type_counts:
            type_df = pd.DataFrame(type_counts, columns=["Type", "Count"])
            st.dataframe(type_df, use_container_width=True)
        else:
            st.info("No type data available.")
    
    with col2:
        st.subheader("Points by Organization")
        if org_counts:
            org_df = pd.DataFrame(org_counts, columns=["Organization", "Count"])
            st.dataframe(org_df, use_container_width=True)
        else:
            st.info("No organization data available.")
    
    # Create and display map
    st.subheader("🗺️ All Infrastructure Points")
    
    # Center the map on Maine
    center_lat = df['lat'].mean()
    center_lon = df['lon'].mean()
    
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=7,
        tiles='OpenStreetMap'
    )
    
    # Color mapping for different types (using valid Folium colors)
    color_map = {
        'cell_tower': 'red',
        'electricity_plant': 'orange',
        'railway_station': 'blue',
        'hospital': 'green',
        'fire_station': 'darkred',
        'police_station': 'purple',
        'water_treatment': 'lightblue',
        'gas_station': 'darkblue'
    }
    
    # Add markers for each point
    for idx, row in df.iterrows():
        try:
            color = color_map.get(row['type'], 'gray')
            folium.Marker(
                location=[row['lat'], row['lon']],
                popup=f"<b>{row['name']}</b><br>Type: {row['type'].replace('_', ' ').title()}<br>Organization: {row['org_id']}",
                tooltip=row['name'],
                icon=folium.Icon(color=color, icon='info-sign')
            ).add_to(m)
        except Exception as e:
            st.error(f"Error adding marker for {row.get('name', 'Unknown')}: {e}")
            continue
    
    folium_static(m, width=1200, height=600)
    
    # Show all points table
    st.subheader("📋 All Infrastructure Points")
    if not df.empty:
        display_df = df[['name', 'type', 'org_id', 'lat', 'lon']].copy()
        display_df.columns = ['Name', 'Type', 'Organization', 'Latitude', 'Longitude']
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("No points to display yet.")

if __name__ == "__main__":
    main() 