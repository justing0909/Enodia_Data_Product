#!/usr/bin/env python3
"""
Database Setup Script for Maine Infrastructure Platform

This script creates the necessary tables in your RDS database.
Run this once after setting up your RDS instance.
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Create the database tables"""
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'dbname': os.getenv('DB_NAME', 'postgres'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', '')
    }
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        
        # Create points_of_interest table
        print("Creating points_of_interest table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS points_of_interest (
                id SERIAL PRIMARY KEY,
                org_id VARCHAR(255) NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                type VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create point_history table
        print("Creating point_history table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS point_history (
                id SERIAL PRIMARY KEY,
                org_id VARCHAR(255) NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                type VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                action VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create indexes for better performance
        print("Creating indexes...")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_points_org_id ON points_of_interest(org_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_org_id ON point_history(org_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_points_type ON points_of_interest(type);")
        
        # Commit changes
        conn.commit()
        
        print("✅ Database setup completed successfully!")
        print(f"Tables created: points_of_interest, point_history")
        print(f"Indexes created: idx_points_org_id, idx_history_org_id, idx_points_type")
        
        # Show table info
        cur.execute("SELECT COUNT(*) FROM points_of_interest;")
        points_count = cur.fetchone()[0]
        print(f"Current points in database: {points_count}")
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🗺️ Maine Infrastructure Platform - Database Setup")
    print("=" * 50)
    setup_database() 