import psycopg2
import streamlit as st
import requests
import os
from datetime import datetime
from dotenv import load_dotenv


load_dotenv()

def get_connection():
    """Get database connection - for local testing, you'll need to set these as environment variables"""
    try:
        # For local testing, you can set these as environment variables
        # or create a .env file and use python-dotenv
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),  # Change to your RDS endpoint
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'postgres'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', '')
        )
    except Exception as e:
        st.error(f"Database connection failed: {e}")
        return None

def fetch_points(org_id):
    """Fetch points for a specific organization"""
    conn = get_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, lat, lon, type, name FROM points_of_interest WHERE org_id = %s ORDER BY id",
                (org_id,)
            )
            return cur.fetchall()
    except Exception as e:
        st.error(f"Error fetching points: {e}")
        return []
    finally:
        conn.close()

def add_point(org_id, lat, lon, type_, name):
    """Add a new point and trigger Lambda notification"""
    conn = get_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO points_of_interest (org_id, lat, lon, type, name) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (org_id, lat, lon, type_, name)
            )
            point_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO point_history (org_id, lat, lon, type, name, action) VALUES (%s, %s, %s, %s, %s, %s)",
                (org_id, lat, lon, type_, name, 'added')
            )
            conn.commit()
            
            # Trigger Lambda notification (only if API URL is set)
            lambda_url = os.getenv('LAMBDA_API_URL')
            if lambda_url:
                try:
                    requests.post(lambda_url, timeout=5)
                    st.success("✅ Point added and notification sent!")
                except Exception as e:
                    st.warning(f"Point added but notification failed: {e}")
            else:
                st.success("✅ Point added successfully!")
            
            return point_id
    except Exception as e:
        st.error(f"Error adding point: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()

def update_point(point_id, org_id, lat, lon, type_, name):
    """Update a point and trigger Lambda notification"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE points_of_interest SET lat = %s, lon = %s, type = %s, name = %s WHERE id = %s AND org_id = %s",
                (lat, lon, type_, name, point_id, org_id)
            )
            if cur.rowcount > 0:
                cur.execute(
                    "INSERT INTO point_history (org_id, lat, lon, type, name, action) VALUES (%s, %s, %s, %s, %s, %s)",
                    (org_id, lat, lon, type_, name, 'updated')
                )
                conn.commit()
                
                # Trigger Lambda notification
                lambda_url = os.getenv('LAMBDA_API_URL')
                if lambda_url:
                    try:
                        requests.post(lambda_url, timeout=5)
                    except:
                        pass
                
                return True
            return False
    except Exception as e:
        st.error(f"Error updating point: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_point(point_id, org_id):
    """Delete a point and trigger Lambda notification"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            # Get point details before deletion for history
            cur.execute("SELECT lat, lon, type, name FROM points_of_interest WHERE id = %s AND org_id = %s", (point_id, org_id))
            point = cur.fetchone()
            
            if point:
                cur.execute("DELETE FROM points_of_interest WHERE id = %s AND org_id = %s", (point_id, org_id))
                cur.execute(
                    "INSERT INTO point_history (org_id, lat, lon, type, name, action) VALUES (%s, %s, %s, %s, %s, %s)",
                    (org_id, point[0], point[1], point[2], point[3], 'deleted')
                )
                conn.commit()
                
                # Trigger Lambda notification
                lambda_url = os.getenv('LAMBDA_API_URL')
                if lambda_url:
                    try:
                        requests.post(lambda_url, timeout=5)
                    except:
                        pass
                
                return True
            return False
    except Exception as e:
        st.error(f"Error deleting point: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def fetch_history(org_id):
    """Fetch history for a specific organization"""
    conn = get_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT lat, lon, type, name, action, timestamp FROM point_history WHERE org_id = %s ORDER BY timestamp DESC",
                (org_id,)
            )
            return cur.fetchall()
    except Exception as e:
        st.error(f"Error fetching history: {e}")
        return []
    finally:
        conn.close()

def fetch_all_points():
    """Fetch all points for the display app"""
    conn = get_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT lat, lon, type, name, org_id FROM points_of_interest ORDER BY id")
            return cur.fetchall()
    except Exception as e:
        st.error(f"Error fetching all points: {e}")
        return []
    finally:
        conn.close()

def fetch_analytics():
    """Fetch analytics data"""
    conn = get_connection()
    if not conn:
        return 0, [], []
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM points_of_interest")
            total = cur.fetchone()[0]
            
            cur.execute("SELECT type, COUNT(*) FROM points_of_interest GROUP BY type")
            type_counts = cur.fetchall()
            
            cur.execute("SELECT org_id, COUNT(*) FROM points_of_interest GROUP BY org_id")
            org_counts = cur.fetchall()
            
            return total, type_counts, org_counts
    except Exception as e:
        st.error(f"Error fetching analytics: {e}")
        return 0, [], []
    finally:
        conn.close() 