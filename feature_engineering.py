import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib
import os
from data_cleaning import get_cleaned_data

def preprocess_data(df, output_dir="models"):
    """
    # Phase 4: Feature engineering
    Encodes categorical variables and scales numeric variables.
    Returns the processed feature matrix X and target vector y.
    Also saves the preprocessor object for the Flask app.
    """
    print("\n--- Starting Feature Engineering ---")
    os.makedirs(output_dir, exist_ok=True)
    
    # Target variable
    y = df['churned']
    
    # Drop target and identifiers
    X = df.drop(['churned', 'customer_id', 'login_bucket'], axis=1, errors='ignore')
    
    # Identify numerical and categorical columns
    numeric_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_features = X.select_dtypes(include=['object']).columns.tolist()
    
    print(f"Numeric features to scale: {numeric_features}")
    print(f"Categorical features to encode: {categorical_features}")
    
    # Create the column transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), categorical_features)
        ])
    
    # Fit and transform the data
    X_processed = preprocessor.fit_transform(X)
    
    # Get feature names after transformation
    num_names = numeric_features
    # Use get_feature_names_out for OneHotEncoder
    cat_names = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_features)
    feature_names = num_names + list(cat_names)
    
    # Convert back to dataframe for readability and model training
    X_processed_df = pd.DataFrame(X_processed, columns=feature_names)
    
    # Save the preprocessor for deployment
    joblib.dump(preprocessor, os.path.join(output_dir, 'preprocessor.pkl'))
    print(f"Saved preprocessor to {output_dir}/preprocessor.pkl")
    
    print(f"Feature engineering complete. Original features: {X.shape[1]}, Processed features: {X_processed_df.shape[1]}")
    return X_processed_df, y, X # Returning X as well for regression target selection

if __name__ == "__main__":
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'customer_churn.csv')
    cleaned_df = get_cleaned_data(file_path)
    X, y, X_orig = preprocess_data(cleaned_df)
    print("\nProcessed Features Sample:")
    print(X.head())
