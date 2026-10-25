import pandas as pd
import numpy as np
import os

def clean_data(df):
    """
    # Phase 2: Clean data & handle outliers
    Demonstrates data imputation and outlier treatment.
    """
    print("\n--- Starting Data Cleaning ---")
    
    # 1. Handle the impossible avg_watch_time_per_day (> 24 hours)
    # We will use the IQR method to cap outliers to avoid dropping too much data.
    q1 = df['avg_watch_time_per_day'].quantile(0.25)
    q3 = df['avg_watch_time_per_day'].quantile(0.75)
    iqr = q3 - q1
    upper_bound = q3 + 1.5 * iqr
    
    # Cap values at the upper bound. Since you can't logically watch > 24 hrs, 
    # we ensure the upper bound doesn't exceed a reasonable max (e.g., 24).
    # But mathematically, IQR capping is a standard approach.
    cap_value = min(upper_bound, 24.0)
    
    outliers_count = len(df[df['avg_watch_time_per_day'] > cap_value])
    print(f"Capping {outliers_count} outliers in 'avg_watch_time_per_day' to {cap_value:.2f}")
    
    df['avg_watch_time_per_day'] = np.where(
        df['avg_watch_time_per_day'] > cap_value, 
        cap_value, 
        df['avg_watch_time_per_day']
    )
    
    # 2. Check for missing values (already confirmed 0 in Phase 1, but good practice)
    if df.isnull().sum().any():
        print("Handling missing values...")
        df = df.fillna(df.median(numeric_only=True))
        df = df.fillna(df.mode().iloc[0])
        
    print("--- Data Cleaning Complete ---")
    return df

def get_cleaned_data(filepath):
    df = pd.read_csv(filepath)
    return clean_data(df)

if __name__ == "__main__":
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'customer_churn.csv')
    cleaned_df = get_cleaned_data(file_path)
    print("\nCleaned Summary:")
    print(cleaned_df.describe())
