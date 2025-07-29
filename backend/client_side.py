import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
from db_utils import fetch_points, add_point, fetch_history
import os

# Page configuration
st.set_page_config(
    page_title="Client Data Entry",
    page_icon="➕",
    layout="wide"
)

def main():
    st.title("➕ Client Data Entry Interface")
    st.write("Enter your organization name to access your infrastructure data")
    
    # Organization login
    org_id = st.text_input("Enter your organization name (ID):", placeholder="e.g., Acme Corp, City of Portland")
    
    if not org_id:
        st.warning("Please enter your organization name to continue.")
        st.stop()
    
    st.success(f"🏢 Logged in as: {org_id}")
    
    # Load existing data for this organization
    points = fetch_points(org_id)
    df = pd.DataFrame(points, columns=["id", "lat", "lon", "type", "name"])
    
    # Create two columns
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("🗺️ Your Infrastructure Points")
        
        if not df.empty:
            # Create map with organization's points
            center_lat = df["lat"].mean()
            center_lon = df["lon"].mean()
            
            m = folium.Map(
                location=[center_lat, center_lon],
                zoom_start=7,
                tiles='OpenStreetMap'
            )
            
            # Color mapping for different types
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
            for _, row in df.iterrows():
                color = color_map.get(row["type"], "gray")
                folium.Marker(
                    location=[row["lat"], row["lon"]],
                    popup=f"<b>{row['name']}</b><br>Type: {row['type'].replace('_', ' ').title()}",
                    tooltip=row["name"],
                    icon=folium.Icon(color=color, icon='info-sign')
                ).add_to(m)
            
            st_folium(m, width=700, height=500)
        else:
            st.info("No infrastructure points found for your organization. Add your first point below!")
    
    with col2:
        st.subheader("📝 Add New Point")
        
        # Form for adding new point
        with st.form("add_point_form"):
            # Coordinate inputs
            lat = st.number_input(
                "Latitude:",
                min_value=43.0,
                max_value=48.0,
                value=44.5,
                step=0.0001,
                format="%.4f",
                help="Enter latitude coordinate (Maine: 43.0 to 48.0)"
            )
            
            lon = st.number_input(
                "Longitude:",
                min_value=-71.0,
                max_value=-66.0,
                value=-69.0,
                step=0.0001,
                format="%.4f",
                help="Enter longitude coordinate (Maine: -71.0 to -66.0)"
            )
            
            # Infrastructure type selection
            infrastructure_types = [
                'cell_tower',
                'electricity_plant',
                'railway_station',
                'hospital',
                'fire_station',
                'police_station',
                'water_treatment',
                'gas_station'
            ]
            
            point_type = st.selectbox(
                "Infrastructure Type:",
                options=infrastructure_types,
                format_func=lambda x: x.replace('_', ' ').title(),
                help="Select the type of infrastructure point"
            )
            
            point_name = st.text_input(
                "Point Name:",
                placeholder="e.g., Portland Cell Tower 2",
                help="Enter a descriptive name for the infrastructure point"
            )
            
            # Submit button
            submitted = st.form_submit_button("Add Point")
            
            if submitted:
                if not point_name:
                    st.error("Please enter a point name.")
                else:
                    # Add the point
                    point_id = add_point(org_id, lat, lon, point_type, point_name)
                    if point_id:
                        st.success(f"✅ Point '{point_name}' added successfully!")
                        st.info("You'll receive an email notification with updated analytics.")
                        st.rerun()
    
    # Show current data summary for this organization
    st.subheader("📊 Your Organization Summary")
    if not df.empty:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Your Points", len(df))
        with col2:
            st.metric("Infrastructure Types", len(df['type'].unique()))
        with col3:
            st.metric("Last Updated", "Real-time")
        
        # Show points table
        st.write("Your infrastructure points:")
        display_df = df[['name', 'type', 'lat', 'lon']].copy()
        display_df.columns = ['Name', 'Type', 'Latitude', 'Longitude']
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("No data available for your organization yet.")
    
    # Show history for this organization
    st.subheader("📋 Your Activity History")
    history = fetch_history(org_id)
    if history:
        hist_df = pd.DataFrame(history, columns=["Latitude", "Longitude", "Type", "Name", "Action", "Timestamp"])
        st.dataframe(hist_df, use_container_width=True)
    else:
        st.info("No activity history yet for your organization.")

if __name__ == "__main__":
    main() 