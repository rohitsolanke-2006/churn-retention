from flask import Flask, request, render_template, jsonify
import pandas as pd
import joblib
import os
from data_cleaning import clean_data

app = Flask(__name__)

# Load models and preprocessor
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
rf_model = None
preprocessor = None
data_df = None

def load_resources():
    global rf_model, preprocessor, data_df
    try:
        rf_model = joblib.load(os.path.join(MODEL_DIR, 'rf_model.pkl'))
        preprocessor = joblib.load(os.path.join(MODEL_DIR, 'preprocessor.pkl'))
        # Load data to simulate database lookup for the dashboard
        data_path = os.path.join(os.path.dirname(__file__), 'data', 'customer_churn.csv')
        # We read raw, then clean it on the fly or just use cleaned for lookup
        raw_df = pd.read_csv(data_path)
        data_df = clean_data(raw_df)
    except Exception as e:
        print(f"Error loading resources: {e}")

load_resources()

@app.route('/')
def index():
    # Render the Retention Control Room dashboard
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Looks up a customer by name, runs the preprocessor, and returns the churn probability.
    """
    customer_name = request.json.get('customer_name')
    
    if not customer_name:
        return jsonify({'error': 'No customer_name provided'}), 400
        
    # Case-insensitive partial match
    mask = data_df['customer_name'].str.contains(customer_name, case=False, na=False)
    customer_data = data_df[mask]
    
    if customer_data.empty:
        return jsonify({'error': 'Customer not found'}), 404
        
    # Take the first match if multiple exist
    customer_data = customer_data.head(1)
    
    cols_to_drop = ['churned', 'customer_id', 'customer_name']
    X_single = customer_data.drop(columns=[col for col in cols_to_drop if col in customer_data.columns])
    
    try:
        # Preprocess
        X_processed = preprocessor.transform(X_single)
        
        # Predict probability of churn (class 1)
        churn_prob = rf_model.predict_proba(X_processed)[0][1]
        
        # Extract some basic info for the UI
        customer_info = {
            'name': customer_data['customer_name'].iloc[0],
            'id': customer_data['customer_id'].iloc[0].split('-')[0].upper(),
            'age': int(customer_data['age'].iloc[0]),
            'plan': customer_data['subscription_type'].iloc[0],
            'region': customer_data['region'].iloc[0],
            'watch_hours': float(customer_data['watch_hours'].iloc[0]),
            'fee': float(customer_data['monthly_fee'].iloc[0]),
            'favorite_genre': customer_data['favorite_genre'].iloc[0]
        }
        
        return jsonify({
            'customer_name': customer_info['name'],
            'churn_probability': float(churn_prob),
            'info': customer_info
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
