"""
OTT Audience Retention & Churn Intelligence Platform
Backend API Server

Preserves existing RF model and preprocessor.
Adds comprehensive analytics, customer, retention, and model insights APIs.
Uses SQLite for retention action persistence.
"""

from flask import Flask, request, render_template, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import json
import sqlite3
import csv
import io
import uuid
from datetime import datetime
from data_cleaning import clean_data

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, 'models')
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(BASE_DIR, 'retention.db')

RISK_THRESHOLDS = {
    'low_max': 0.40,
    'medium_max': 0.70,
}

# ---------------------------------------------------------------------------
# GLOBAL STATE
# ---------------------------------------------------------------------------
rf_model = None
preprocessor = None
data_df = None          # cleaned dataset
raw_df = None           # raw dataset
model_evaluation = {}   # cached evaluation results
feature_names_ordered = []

def get_db():
    """Get SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    """Initialize SQLite database for retention actions and prediction history."""
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS retention_actions (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            customer_name TEXT,
            action_type TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'New',
            notes TEXT,
            priority_score REAL,
            churn_probability REAL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prediction_history (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            customer_name TEXT,
            churn_probability REAL NOT NULL,
            risk_category TEXT NOT NULL,
            predicted_class INTEGER NOT NULL,
            model_name TEXT DEFAULT 'RandomForest',
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_retention_customer ON retention_actions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_retention_status ON retention_actions(status);
        CREATE INDEX IF NOT EXISTS idx_prediction_customer ON prediction_history(customer_id);
    ''')
    conn.commit()
    conn.close()

def load_resources():
    """Load ML model, preprocessor, and dataset."""
    global rf_model, preprocessor, data_df, raw_df, feature_names_ordered, model_evaluation

    try:
        rf_model = joblib.load(os.path.join(MODEL_DIR, 'rf_model.pkl'))
        preprocessor = joblib.load(os.path.join(MODEL_DIR, 'preprocessor.pkl'))

        data_path = os.path.join(DATA_DIR, 'customer_churn.csv')
        raw_df = pd.read_csv(data_path)
        data_df = clean_data(raw_df.copy())

        # Build ordered feature names from preprocessor
        num_features = preprocessor.transformers_[0][2]  # numeric column names
        cat_encoder = preprocessor.named_transformers_['cat']
        cat_features_input = preprocessor.transformers_[1][2]
        cat_feature_names = list(cat_encoder.get_feature_names_out(cat_features_input))
        feature_names_ordered = list(num_features) + cat_feature_names

        # Run model evaluation on startup (using 20% test split, same as training)
        _compute_model_evaluation()

        print(f"[OK] Loaded model ({type(rf_model).__name__}), preprocessor, dataset ({len(data_df)} rows)")

    except Exception as e:
        print(f"[ERROR] Loading resources: {e}")
        import traceback
        traceback.print_exc()


def _compute_model_evaluation():
    """Compute evaluation metrics using the same train/test split as training."""
    global model_evaluation

    try:
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                                     f1_score, roc_auc_score, confusion_matrix,
                                     classification_report, roc_curve)

        # Replicate the preprocessing pipeline from feature_engineering.py
        y = data_df['churned']
        X = data_df.drop(['churned', 'customer_id', 'login_bucket', 'customer_name'], axis=1, errors='ignore')

        X_processed = preprocessor.transform(X)

        # Same split as model.py: test_size=0.2, random_state=42, stratify=y
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y, test_size=0.2, random_state=42, stratify=y
        )

        # Predictions on test set
        y_pred = rf_model.predict(X_test)
        y_proba = rf_model.predict_proba(X_test)[:, 1]

        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_proba)

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        # ROC curve points
        fpr, tpr, thresholds = roc_curve(y_test, y_proba)

        # Feature importance
        importances = rf_model.feature_importances_
        feature_imp = []
        for i, name in enumerate(feature_names_ordered):
            feature_imp.append({'feature': name, 'importance': float(importances[i])})
        feature_imp.sort(key=lambda x: x['importance'], reverse=True)

        model_evaluation = {
            'metrics': {
                'accuracy': round(accuracy, 4),
                'precision': round(precision, 4),
                'recall': round(recall, 4),
                'f1': round(f1, 4),
                'f1_score': round(f1, 4),
                'roc_auc': round(roc_auc, 4),
                'test_samples': len(y_test),
                'train_samples': len(y_train),
            },
            'accuracy': round(accuracy, 4),
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'roc_auc': round(roc_auc, 4),
            'confusion_matrix': {
                'true_negative': int(tn),
                'false_positive': int(fp),
                'false_negative': int(fn),
                'true_positive': int(tp),
                'true_negatives': int(tn),
                'false_positives': int(fp),
                'false_negatives': int(fn),
                'true_positives': int(tp),
            },
            'roc_curve': {
                'fpr': [round(float(x), 4) for x in fpr[::max(1, len(fpr)//100)]],
                'tpr': [round(float(x), 4) for x in tpr[::max(1, len(tpr)//100)]]
            },
            'feature_importances': {item['feature']: item['importance'] for item in feature_imp[:15]},
            'feature_importance': feature_imp[:15],
            'model_info': {
                'algorithm': 'Random Forest Classifier',
                'model_name': 'Random Forest Classifier',
                'model_type': type(rf_model).__name__,
                'n_estimators': rf_model.n_estimators,
                'max_depth': rf_model.max_depth,
                'n_features_in': rf_model.n_features_in_,
                'test_size': 0.2,
                'random_state': 42
            },
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }

        print(f"[OK] Model evaluation: Acc={accuracy:.4f}, F1={f1:.4f}, AUC={roc_auc:.4f}")

    except Exception as e:
        print(f"[WARN] Could not compute model evaluation: {e}")
        import traceback
        traceback.print_exc()
        model_evaluation = {}


# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------

def get_risk_category(probability):
    """Classify churn probability into risk category."""
    if probability < RISK_THRESHOLDS['low_max']:
        return 'Low'
    elif probability < RISK_THRESHOLDS['medium_max']:
        return 'Medium'
    else:
        return 'High'

def get_risk_color(category):
    """Get color for risk category."""
    colors = {'Low': '#3F7657', 'Medium': '#C18A36', 'High': '#B94D46'}
    return colors.get(category, '#938274')

def compute_engagement_score(row):
    """
    Compute an engagement score (0-100) based on available features.
    Formula: weighted combination of normalized watch_hours, avg_watch_time_per_day,
    inverted last_login_days, and number_of_profiles.
    """
    # Normalize each feature to 0-1 range using dataset statistics
    stats = {
        'watch_hours': {'min': 0, 'max': float(data_df['watch_hours'].max())},
        'avg_watch_time_per_day': {'min': 0, 'max': float(data_df['avg_watch_time_per_day'].max())},
        'last_login_days': {'min': 0, 'max': float(data_df['last_login_days'].max())},
        'number_of_profiles': {'min': 1, 'max': 5}
    }

    def norm(val, mn, mx):
        if mx == mn:
            return 0.5
        return max(0, min(1, (val - mn) / (mx - mn)))

    wh = norm(row.get('watch_hours', 0), stats['watch_hours']['min'], stats['watch_hours']['max'])
    awt = norm(row.get('avg_watch_time_per_day', 0), stats['avg_watch_time_per_day']['min'], stats['avg_watch_time_per_day']['max'])
    login_inv = 1 - norm(row.get('last_login_days', 60), stats['last_login_days']['min'], stats['last_login_days']['max'])
    profiles = norm(row.get('number_of_profiles', 1), stats['number_of_profiles']['min'], stats['number_of_profiles']['max'])

    # Weights: watch_hours 40%, login recency 30%, avg_watch_time 20%, profiles 10%
    score = (wh * 0.40 + login_inv * 0.30 + awt * 0.20 + profiles * 0.10) * 100
    return round(score, 1)

def get_engagement_level(score):
    """Classify engagement score."""
    if score >= 70:
        return 'High'
    elif score >= 40:
        return 'Medium'
    else:
        return 'Low'

def generate_recommendations(customer_row, churn_prob, risk_category):
    """Generate retention recommendations based on customer attributes."""
    recommendations = []

    watch_hours = customer_row.get('watch_hours', 0)
    last_login = customer_row.get('last_login_days', 0)
    avg_watch = customer_row.get('avg_watch_time_per_day', 0)
    monthly_fee = customer_row.get('monthly_fee', 0)
    engagement = compute_engagement_score(customer_row)

    median_watch = float(data_df['watch_hours'].median())
    median_login = float(data_df['last_login_days'].median())

    if watch_hours < median_watch * 0.5:
        recommendations.append({
            'type': 'Low Engagement',
            'title': 'Re-engagement Campaign',
            'description': f'Watch hours ({watch_hours:.1f}h) are significantly below the median ({median_watch:.1f}h). Consider sending a personalized content recommendation based on their preferred genre.',
            'priority': 'High' if risk_category == 'High' else 'Medium',
            'icon': 'play-circle'
        })

    if last_login > median_login * 1.5:
        recommendations.append({
            'type': 'Extended Inactivity',
            'title': 'Return Reminder',
            'description': f'Last login was {last_login} days ago (median: {median_login:.0f} days). Send a personalized return reminder with curated content from their favorite genre.',
            'priority': 'High',
            'icon': 'clock'
        })

    if monthly_fee >= 17 and engagement < 40:
        recommendations.append({
            'type': 'High Cost / Low Usage',
            'title': 'Plan Review',
            'description': f'Customer pays ${monthly_fee:.2f}/month but has low engagement ({engagement:.0f}/100). Consider suggesting a more suitable subscription tier.',
            'priority': 'Medium',
            'icon': 'credit-card'
        })

    if avg_watch < 0.2 and watch_hours < 5:
        recommendations.append({
            'type': 'Very Low Activity',
            'title': 'Onboarding Support',
            'description': 'Extremely low daily viewing time suggests the customer may not have found content they enjoy. Consider a guided content discovery experience.',
            'priority': 'High' if risk_category != 'Low' else 'Medium',
            'icon': 'compass'
        })

    if risk_category == 'High' and engagement < 30:
        recommendations.append({
            'type': 'Critical Risk',
            'title': 'Priority Retention Outreach',
            'description': f'This subscriber has a {churn_prob*100:.0f}% churn probability with very low engagement. Recommend immediate personalized outreach.',
            'priority': 'Critical',
            'icon': 'alert-triangle'
        })

    if not recommendations and risk_category == 'Low':
        recommendations.append({
            'type': 'Healthy Subscriber',
            'title': 'Maintain Engagement',
            'description': 'This subscriber shows healthy engagement patterns. Continue providing quality content and consider loyalty rewards.',
            'priority': 'Low',
            'icon': 'check-circle'
        })

    if not recommendations:
        recommendations.append({
            'type': 'Monitor',
            'title': 'Regular Monitoring',
            'description': 'No critical risk indicators detected. Continue monitoring engagement metrics for changes.',
            'priority': 'Low',
            'icon': 'eye'
        })

    return recommendations

def compute_priority_score(churn_prob, engagement_score, monthly_fee):
    """
    Compute a retention priority score (0-100).
    Formula: churn_probability * 40 + (100 - engagement_score) * 0.35 + normalized_fee * 25
    Higher score = higher priority for retention action.
    """
    fee_norm = min(1.0, monthly_fee / 20.0) if monthly_fee else 0
    score = (churn_prob * 40) + ((100 - engagement_score) / 100 * 35) + (fee_norm * 25)
    return round(min(100, max(0, score)), 1)

def generate_risk_explanation(customer_row, churn_prob, risk_category):
    """Generate plain language explanation of the prediction."""
    factors = []
    watch_hours = customer_row.get('watch_hours', 0)
    last_login = customer_row.get('last_login_days', 0)
    avg_watch = customer_row.get('avg_watch_time_per_day', 0)
    monthly_fee = customer_row.get('monthly_fee', 0)
    engagement = compute_engagement_score(customer_row)

    median_watch = float(data_df['watch_hours'].median())
    median_login = float(data_df['last_login_days'].median())

    if watch_hours < median_watch * 0.7:
        factors.append(f"below-median watch hours ({watch_hours:.1f}h vs median {median_watch:.1f}h)")
    elif watch_hours > median_watch * 1.3:
        factors.append(f"above-median watch hours ({watch_hours:.1f}h vs median {median_watch:.1f}h)")

    if last_login > median_login * 1.3:
        factors.append(f"extended inactivity ({last_login} days since last login)")
    elif last_login < median_login * 0.5:
        factors.append(f"recent platform activity ({last_login} days since last login)")

    if avg_watch < 0.2:
        factors.append("very low daily viewing time")

    if engagement < 30:
        factors.append(f"low engagement score ({engagement:.0f}/100)")
    elif engagement > 70:
        factors.append(f"strong engagement score ({engagement:.0f}/100)")

    if risk_category == 'High':
        explanation = f"This subscriber has a high predicted churn risk ({churn_prob*100:.0f}%)."
        if factors:
            explanation += f" Key indicators include {', '.join(factors[:3])}."
        explanation += " Immediate retention action is recommended."
    elif risk_category == 'Medium':
        explanation = f"This subscriber shows moderate churn risk ({churn_prob*100:.0f}%)."
        if factors:
            explanation += f" Notable patterns: {', '.join(factors[:3])}."
        explanation += " Proactive engagement monitoring is suggested."
    else:
        explanation = f"This subscriber has a low predicted churn risk ({churn_prob*100:.0f}%)."
        if factors:
            explanation += f" Positive indicators: {', '.join(factors[:3])}."
        explanation += " Current engagement appears healthy."

    return explanation


# ---------------------------------------------------------------------------
# PREDICTION HELPER
# ---------------------------------------------------------------------------

def predict_customer(customer_row_df):
    """Run prediction on a single customer row (DataFrame with 1 row)."""
    cols_to_drop = ['churned', 'customer_id', 'customer_name', 'login_bucket']
    X_single = customer_row_df.drop(columns=[c for c in cols_to_drop if c in customer_row_df.columns])
    X_processed = preprocessor.transform(X_single)
    churn_prob = float(rf_model.predict_proba(X_processed)[0][1])
    predicted_class = int(churn_prob >= 0.5)
    risk_category = get_risk_category(churn_prob)
    return churn_prob, predicted_class, risk_category


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


# ===== SYSTEM APIs =====

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': rf_model is not None,
        'preprocessor_loaded': preprocessor is not None,
        'dataset_loaded': data_df is not None,
        'dataset_rows': len(data_df) if data_df is not None else 0,
        'database_available': os.path.exists(DB_PATH),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        'risk_thresholds': RISK_THRESHOLDS,
        'model_name': 'Random Forest Classifier',
        'dataset_info': {
            'rows': len(data_df) if data_df is not None else 0,
            'columns': list(data_df.columns) if data_df is not None else [],
            'numeric_columns': list(data_df.select_dtypes(include=[np.number]).columns) if data_df is not None else [],
            'categorical_columns': list(data_df.select_dtypes(include=['object', 'string']).columns) if data_df is not None else [],
        },
        'version': '2.0.0'
    })


@app.route('/api/config/thresholds', methods=['PUT'])
def update_thresholds():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    low_max = data.get('low_max')
    medium_max = data.get('medium_max')

    if low_max is not None:
        if not (0 < low_max < 1):
            return jsonify({'error': 'low_max must be between 0 and 1'}), 400
    if medium_max is not None:
        if not (0 < medium_max < 1):
            return jsonify({'error': 'medium_max must be between 0 and 1'}), 400

    new_low = low_max if low_max is not None else RISK_THRESHOLDS['low_max']
    new_med = medium_max if medium_max is not None else RISK_THRESHOLDS['medium_max']

    if new_low >= new_med:
        return jsonify({'error': 'low_max must be less than medium_max'}), 400

    RISK_THRESHOLDS['low_max'] = new_low
    RISK_THRESHOLDS['medium_max'] = new_med

    return jsonify({'status': 'updated', 'risk_thresholds': RISK_THRESHOLDS})


# ===== CUSTOMER APIs =====

@app.route('/api/customers', methods=['GET'])
def get_customers():
    """Paginated, filterable customer list with predictions."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    per_page = min(per_page, 100)

    search = request.args.get('search', '').strip()
    subscription = request.args.get('subscription', '').strip()
    churn_status = request.args.get('churn_status', '').strip()
    risk_filter = request.args.get('risk', '').strip()
    engagement_filter = request.args.get('engagement', '').strip()
    sort_by = request.args.get('sort_by', 'churn_probability')
    sort_order = request.args.get('sort_order', 'desc')
    min_tenure = request.args.get('min_tenure', type=float)
    max_tenure = request.args.get('max_tenure', type=float)

    df = data_df.copy()

    # Search
    if search:
        mask = (
            df['customer_name'].str.contains(search, case=False, na=False) |
            df['customer_id'].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    # Filters
    if subscription:
        df = df[df['subscription_type'].str.lower() == subscription.lower()]
    if churn_status == '0':
        df = df[df['churned'] == 0]
    elif churn_status == '1':
        df = df[df['churned'] == 1]

    # Generate predictions for filtered set
    if len(df) == 0:
        return jsonify({
            'customers': [],
            'total': 0,
            'page': page,
            'per_page': per_page,
            'total_pages': 0
        })

    # Batch predict
    cols_to_drop = ['churned', 'customer_id', 'customer_name', 'login_bucket']
    X_batch = df.drop(columns=[c for c in cols_to_drop if c in df.columns])
    X_processed = preprocessor.transform(X_batch)
    probas = rf_model.predict_proba(X_processed)[:, 1]

    df = df.copy()
    df['churn_probability'] = probas
    df['risk_category'] = df['churn_probability'].apply(get_risk_category)
    df['engagement_score'] = df.apply(lambda r: compute_engagement_score(r.to_dict()), axis=1)
    df['engagement_level'] = df['engagement_score'].apply(get_engagement_level)

    # Post-prediction filters
    if risk_filter:
        df = df[df['risk_category'].str.lower() == risk_filter.lower()]
    if engagement_filter:
        df = df[df['engagement_level'].str.lower() == engagement_filter.lower()]

    # Sorting
    valid_sorts = ['churn_probability', 'watch_hours', 'monthly_fee', 'age', 'last_login_days', 'engagement_score', 'customer_name']
    if sort_by in valid_sorts:
        ascending = sort_order.lower() == 'asc'
        df = df.sort_values(sort_by, ascending=ascending)
    else:
        df = df.sort_values('churn_probability', ascending=False)

    total = len(df)
    total_pages = max(1, (total + per_page - 1) // per_page)
    page = min(page, total_pages)
    start = (page - 1) * per_page
    end = start + per_page
    page_df = df.iloc[start:end]

    customers = []
    for _, row in page_df.iterrows():
        customers.append({
            'customer_id': row['customer_id'],
            'customer_name': row.get('customer_name', 'N/A'),
            'age': int(row['age']),
            'gender': row['gender'],
            'subscription_type': row['subscription_type'],
            'watch_hours': round(float(row['watch_hours']), 2),
            'last_login_days': int(row['last_login_days']),
            'region': row['region'],
            'device': row['device'],
            'monthly_fee': round(float(row['monthly_fee']), 2),
            'churned': int(row['churned']),
            'payment_method': row['payment_method'],
            'number_of_profiles': int(row['number_of_profiles']),
            'avg_watch_time_per_day': round(float(row['avg_watch_time_per_day']), 2),
            'favorite_genre': row['favorite_genre'],
            'churn_probability': round(float(row['churn_probability']), 4),
            'risk_category': row['risk_category'],
            'engagement_score': round(float(row['engagement_score']), 1),
            'engagement_level': row['engagement_level']
        })

    return jsonify({
        'customers': customers,
        'total': total,
        'page': page,
        'pages': total_pages,
        'per_page': per_page,
        'total_pages': total_pages
    })


@app.route('/api/customers/<customer_id>', methods=['GET'])
def get_customer_detail(customer_id):
    """Get detailed customer info with prediction and recommendations."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    mask = data_df['customer_id'] == customer_id
    customer_data = data_df[mask]

    if customer_data.empty:
        return jsonify({'error': 'Customer not found'}), 404

    row = customer_data.iloc[0]
    row_dict = row.to_dict()
    row_df = customer_data.head(1)

    churn_prob, predicted_class, risk_category = predict_customer(row_df)
    engagement = compute_engagement_score(row_dict)
    engagement_level = get_engagement_level(engagement)
    recommendations = generate_recommendations(row_dict, churn_prob, risk_category)
    explanation = generate_risk_explanation(row_dict, churn_prob, risk_category)
    priority = compute_priority_score(churn_prob, engagement, row_dict.get('monthly_fee', 0))

    # Dataset-wide comparisons
    comparisons = {}
    for field in ['watch_hours', 'last_login_days', 'avg_watch_time_per_day', 'monthly_fee']:
        val = float(row_dict.get(field, 0))
        med = float(data_df[field].median())
        mean = float(data_df[field].mean())
        comparisons[field] = {
            'value': round(val, 2),
            'median': round(med, 2),
            'mean': round(mean, 2),
            'vs_median': 'above' if val > med else ('below' if val < med else 'equal'),
            'percentile': round(float((data_df[field] <= val).mean() * 100), 1)
        }

    # Get prediction history from DB
    pred_history = []
    try:
        conn = get_db()
        cursor = conn.execute(
            'SELECT * FROM prediction_history WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10',
            (customer_id,)
        )
        pred_history = [dict(r) for r in cursor.fetchall()]
        conn.close()
    except:
        pass

    # Get retention actions
    ret_actions = []
    try:
        conn = get_db()
        cursor = conn.execute(
            'SELECT * FROM retention_actions WHERE customer_id = ? ORDER BY created_at DESC',
            (customer_id,)
        )
        ret_actions = [dict(r) for r in cursor.fetchall()]
        conn.close()
    except:
        pass

    return jsonify({
        'customer': {
            'customer_id': row_dict['customer_id'],
            'customer_name': row_dict.get('customer_name', 'N/A'),
            'age': int(row_dict['age']),
            'gender': row_dict['gender'],
            'subscription_type': row_dict['subscription_type'],
            'watch_hours': round(float(row_dict['watch_hours']), 2),
            'last_login_days': int(row_dict['last_login_days']),
            'region': row_dict['region'],
            'device': row_dict['device'],
            'monthly_fee': round(float(row_dict['monthly_fee']), 2),
            'churned': int(row_dict['churned']),
            'payment_method': row_dict['payment_method'],
            'number_of_profiles': int(row_dict['number_of_profiles']),
            'avg_watch_time_per_day': round(float(row_dict['avg_watch_time_per_day']), 2),
            'favorite_genre': row_dict['favorite_genre'],
            'churn_probability': round(churn_prob, 4),
            'risk_category': risk_category,
            'engagement_score': engagement,
            'priority_score': priority
        },
        'prediction': {
            'churn_probability': round(churn_prob, 4),
            'retention_probability': round(1 - churn_prob, 4),
            'predicted_class': predicted_class,
            'risk_category': risk_category,
            'risk_color': get_risk_color(risk_category),
            'model_name': 'Random Forest Classifier',
            'timestamp': datetime.now().isoformat()
        },
        'engagement': {
            'score': engagement,
            'level': engagement_level,
            'formula': 'watch_hours(40%) + login_recency(30%) + avg_daily_watch(20%) + profiles(10%)'
        },
        'priority_score': priority,
        'explanation': explanation,
        'recommendations': recommendations,
        'comparisons': comparisons,
        'prediction_history': pred_history,
        'retention_actions': ret_actions
    })


@app.route('/api/customers/search', methods=['GET'])
def search_customers():
    """Search customers by name or ID."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    query = request.args.get('q', '').strip()
    limit = request.args.get('limit', 10, type=int)

    if not query:
        return jsonify({'error': 'Search query is required'}), 400

    mask = (
        data_df['customer_name'].str.contains(query, case=False, na=False) |
        data_df['customer_id'].str.contains(query, case=False, na=False)
    )
    results = data_df[mask].head(limit)

    customers = []
    for _, row in results.iterrows():
        customers.append({
            'customer_id': row['customer_id'],
            'customer_name': row.get('customer_name', 'N/A'),
            'subscription_type': row['subscription_type'],
            'region': row['region'],
            'churned': int(row['churned'])
        })

    return jsonify({'results': customers, 'count': len(customers)})


# ===== PREDICTION APIs =====

@app.route('/predict', methods=['POST'])
def predict_legacy():
    """Predict endpoint - supports search by customer_name or customer_id, returns full insights."""
    data = request.get_json(silent=True) or {}
    query = data.get('customer_name') or data.get('customer_id') or data.get('query')

    if not query:
        return jsonify({'error': 'No customer_name or customer_id provided'}), 400

    query_str = str(query).strip()
    mask = (data_df['customer_id'].str.lower() == query_str.lower()) | (data_df['customer_name'].str.contains(query_str, case=False, na=False))
    customer_data = data_df[mask]

    if customer_data.empty:
        return jsonify({'error': 'Customer not found'}), 404

    customer_data = customer_data.head(1)
    row_dict = customer_data.iloc[0].to_dict()

    churn_prob, predicted_class, risk_category = predict_customer(customer_data)
    engagement = compute_engagement_score(row_dict)
    engagement_level = get_engagement_level(engagement)
    priority = compute_priority_score(churn_prob, engagement, row_dict.get('monthly_fee', 0))
    recommendations = generate_recommendations(row_dict, churn_prob, risk_category)
    explanation = generate_risk_explanation(row_dict, churn_prob, risk_category)

    # Save to prediction_history database
    try:
        conn = get_db()
        conn.execute('''
            INSERT INTO prediction_history (id, customer_id, customer_name, churn_probability, risk_category, predicted_class, model_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()),
            row_dict['customer_id'],
            row_dict.get('customer_name', ''),
            round(churn_prob, 4),
            risk_category,
            predicted_class,
            'Random Forest',
            datetime.now().isoformat()
        ))
        conn.commit()

        cursor = conn.execute(
            'SELECT * FROM prediction_history WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5',
            (row_dict['customer_id'],)
        )
        pred_history = [dict(r) for r in cursor.fetchall()]
        conn.close()
    except Exception:
        pred_history = []

    # Peer comparisons
    peer_comparisons = {}
    for field in ['watch_hours', 'last_login_days', 'avg_watch_time_per_day', 'monthly_fee']:
        val = float(row_dict.get(field, 0))
        med = float(data_df[field].median())
        peer_comparisons[field] = {
            'customer': round(val, 2),
            'median': round(med, 2)
        }

    return jsonify({
        'customer_id': row_dict['customer_id'],
        'customer_name': row_dict.get('customer_name', 'Subscriber'),
        'churn_probability': float(churn_prob),
        'risk_category': risk_category,
        'predicted_class': predicted_class,
        'engagement_score': engagement,
        'engagement_level': engagement_level,
        'priority_score': priority,
        'explanation': explanation,
        'recommendations': recommendations,
        'peer_comparisons': peer_comparisons,
        'prediction_history': pred_history,
        'customer_profile': {
            'customer_id': row_dict['customer_id'],
            'customer_name': row_dict.get('customer_name', 'N/A'),
            'age': int(row_dict['age']),
            'subscription_type': row_dict['subscription_type'],
            'region': row_dict['region'],
            'watch_hours': float(row_dict['watch_hours']),
            'monthly_fee': float(row_dict['monthly_fee']),
            'favorite_genre': row_dict['favorite_genre'],
            'gender': row_dict['gender'],
            'device': row_dict['device'],
            'payment_method': row_dict['payment_method'],
            'number_of_profiles': int(row_dict['number_of_profiles']),
            'avg_watch_time_per_day': float(row_dict['avg_watch_time_per_day']),
            'last_login_days': int(row_dict['last_login_days']),
            'churned': int(row_dict['churned'])
        },
        'info': {
            'name': row_dict.get('customer_name', 'N/A'),
            'id': row_dict['customer_id'].split('-')[0].upper(),
            'customer_id': row_dict['customer_id'],
            'plan': row_dict['subscription_type'],
            'fee': float(row_dict['monthly_fee']),
            'watch_hours': float(row_dict['watch_hours']),
            'region': row_dict['region'],
            'favorite_genre': row_dict['favorite_genre']
        }
    })


@app.route('/api/predict/<customer_id>', methods=['POST'])
def predict_by_id(customer_id):
    """Predict churn for a specific customer and save to history."""
    if data_df is None or rf_model is None:
        return jsonify({'error': 'Model or dataset not available'}), 503

    mask = data_df['customer_id'] == customer_id
    customer_data = data_df[mask]

    if customer_data.empty:
        return jsonify({'error': 'Customer not found'}), 404

    row_df = customer_data.head(1)
    row_dict = row_df.iloc[0].to_dict()

    churn_prob, predicted_class, risk_category = predict_customer(row_df)
    engagement = compute_engagement_score(row_dict)
    recommendations = generate_recommendations(row_dict, churn_prob, risk_category)
    explanation = generate_risk_explanation(row_dict, churn_prob, risk_category)

    # Save to prediction history
    try:
        conn = get_db()
        conn.execute(
            '''INSERT INTO prediction_history (id, customer_id, customer_name, churn_probability, risk_category, predicted_class, model_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (str(uuid.uuid4()), customer_id, row_dict.get('customer_name', 'N/A'),
             churn_prob, risk_category, predicted_class, 'RandomForest', datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[WARN] Could not save prediction history: {e}")

    return jsonify({
        'customer_id': customer_id,
        'churn_probability': round(churn_prob, 4),
        'retention_probability': round(1 - churn_prob, 4),
        'predicted_class': predicted_class,
        'risk_category': risk_category,
        'engagement_score': engagement,
        'engagement_level': get_engagement_level(engagement),
        'explanation': explanation,
        'recommendations': recommendations,
        'timestamp': datetime.now().isoformat()
    })


# ===== ANALYTICS APIs =====

@app.route('/api/analytics/overview', methods=['GET'])
def analytics_overview():
    """Executive overview KPIs and distribution data."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    total = len(data_df)
    churned = int(data_df['churned'].sum())
    active = total - churned
    churn_rate = round(churned / total, 4) if total > 0 else 0

    # Batch predict all customers for risk distribution
    cols_to_drop = ['churned', 'customer_id', 'customer_name', 'login_bucket']
    X_all = data_df.drop(columns=[c for c in cols_to_drop if c in data_df.columns])
    X_processed = preprocessor.transform(X_all)
    all_probas = rf_model.predict_proba(X_processed)[:, 1]

    risk_cats = pd.Series([get_risk_category(p) for p in all_probas])
    high_risk = int((risk_cats == 'High').sum())
    medium_risk = int((risk_cats == 'Medium').sum())
    low_risk = int((risk_cats == 'Low').sum())

    avg_churn_prob = round(float(np.mean(all_probas)), 4)
    avg_watch = round(float(data_df['watch_hours'].mean()), 2)
    avg_fee = round(float(data_df['monthly_fee'].mean()), 2)
    avg_login = round(float(data_df['last_login_days'].mean()), 1)

    # Engagement scores
    eng_scores = data_df.apply(lambda r: compute_engagement_score(r.to_dict()), axis=1)
    avg_engagement = round(float(eng_scores.mean()), 1)

    # Churn by subscription
    churn_by_sub = data_df.groupby('subscription_type')['churned'].agg(['sum', 'count']).reset_index()
    churn_by_sub['rate'] = (churn_by_sub['sum'] / churn_by_sub['count']).round(4)
    churn_by_subscription = churn_by_sub.rename(columns={'sum': 'churned', 'count': 'total'}).to_dict('records')

    # Churn by region
    churn_by_reg = data_df.groupby('region')['churned'].agg(['sum', 'count']).reset_index()
    churn_by_reg['rate'] = (churn_by_reg['sum'] / churn_by_reg['count']).round(4)
    churn_by_region = churn_by_reg.rename(columns={'sum': 'churned', 'count': 'total'}).to_dict('records')

    # Watch hours by churn status
    watch_by_churn = data_df.groupby('churned')['watch_hours'].agg(['mean', 'median']).reset_index()
    watch_by_churn_list = watch_by_churn.round(2).to_dict('records')

    # Priority customers (top 10 highest risk)
    temp_df = data_df.copy()
    temp_df['churn_probability'] = all_probas
    temp_df['risk_category'] = risk_cats.values
    temp_df['engagement_score'] = eng_scores.values
    temp_df['priority_score'] = temp_df.apply(
        lambda r: compute_priority_score(r['churn_probability'], r['engagement_score'], r['monthly_fee']), axis=1
    )
    priority_customers = temp_df.nlargest(10, 'priority_score')

    priority_list = []
    for _, row in priority_customers.iterrows():
        recs = generate_recommendations(row.to_dict(), row['churn_probability'], row['risk_category'])
        priority_list.append({
            'customer_id': row['customer_id'],
            'customer_name': row.get('customer_name', 'N/A'),
            'subscription_type': row['subscription_type'],
            'churn_probability': round(float(row['churn_probability']), 4),
            'risk_category': row['risk_category'],
            'engagement_score': round(float(row['engagement_score']), 1),
            'priority_score': round(float(row['priority_score']), 1),
            'watch_hours': round(float(row['watch_hours']), 2),
            'last_login_days': int(row['last_login_days']),
            'suggested_action': recs[0]['title'] if recs else 'Monitor'
        })

    # Churn by subscription dict
    sub_churn_dict = {row['subscription_type']: row['rate'] for row in churn_by_subscription}
    watch_active = float(watch_by_churn[watch_by_churn['churned'] == 0]['mean'].values[0]) if not watch_by_churn[watch_by_churn['churned'] == 0].empty else avg_watch
    watch_churned = float(watch_by_churn[watch_by_churn['churned'] == 1]['mean'].values[0]) if not watch_by_churn[watch_by_churn['churned'] == 1].empty else avg_watch

    kpis_dict = {
        'total_subscribers': total,
        'active_subscribers': active,
        'churned_subscribers': churned,
        'churned_count': churned,
        'active_count': active,
        'observed_churn_rate': churn_rate,
        'churn_rate': churn_rate,
        'high_risk_subscribers': high_risk,
        'high_risk_count': high_risk,
        'high_risk_pct': round(high_risk / total, 4) if total > 0 else 0,
        'medium_risk_subscribers': medium_risk,
        'medium_risk_count': medium_risk,
        'medium_risk_pct': round(medium_risk / total, 4) if total > 0 else 0,
        'low_risk_subscribers': low_risk,
        'low_risk_count': low_risk,
        'low_risk_pct': round(low_risk / total, 4) if total > 0 else 0,
        'avg_churn_probability': avg_churn_prob,
        'avg_watch_hours': avg_watch,
        'avg_monthly_fee': avg_fee,
        'avg_last_login_days': avg_login,
        'avg_engagement_score': avg_engagement
    }

    charts_dict = {
        'churn_distribution': {'Active': active, 'Churned': churned, 'active': active, 'churned': churned},
        'risk_distribution': {'Low': low_risk, 'Medium': medium_risk, 'High': high_risk, 'low': low_risk, 'medium': medium_risk, 'high': high_risk},
        'churn_by_subscription': sub_churn_dict,
        'watch_hours_by_churn': {'active_mean': watch_active, 'churned_mean': watch_churned}
    }

    return jsonify({
        'kpis': kpis_dict,
        'charts': charts_dict,
        'churn_distribution': charts_dict['churn_distribution'],
        'risk_distribution': charts_dict['risk_distribution'],
        'churn_by_subscription': sub_churn_dict,
        'watch_hours_by_churn': charts_dict['watch_hours_by_churn'],
        'priority_customers': priority_list,
        'risk_thresholds': RISK_THRESHOLDS
    })


@app.route('/api/analytics/audience', methods=['GET'])
def analytics_audience():
    """Detailed audience analytics: watch time, engagement, genres, subscription."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    df = data_df.copy()

    # Watch time analysis
    watch_stats = {
        'overall': {
            'mean': round(float(df['watch_hours'].mean()), 2),
            'median': round(float(df['watch_hours'].median()), 2),
            'std': round(float(df['watch_hours'].std()), 2),
            'min': round(float(df['watch_hours'].min()), 2),
            'max': round(float(df['watch_hours'].max()), 2)
        },
        'by_churn': df.groupby('churned')['watch_hours'].agg(['mean', 'median', 'std']).round(2).reset_index().to_dict('records'),
        'by_subscription': df.groupby('subscription_type')['watch_hours'].agg(['mean', 'median']).round(2).reset_index().to_dict('records'),
        'by_region': df.groupby('region')['watch_hours'].mean().round(2).reset_index().to_dict('records'),
        'distribution': {
            'bins': [],
            'counts': []
        }
    }

    # Watch time distribution (histogram data)
    counts, bin_edges = np.histogram(df['watch_hours'], bins=20)
    watch_stats['distribution']['bins'] = [round(float(b), 1) for b in bin_edges[:-1]]
    watch_stats['distribution']['counts'] = [int(c) for c in counts]

    # Daily watch time
    daily_watch = {
        'overall': {
            'mean': round(float(df['avg_watch_time_per_day'].mean()), 2),
            'median': round(float(df['avg_watch_time_per_day'].median()), 2),
        },
        'by_churn': df.groupby('churned')['avg_watch_time_per_day'].agg(['mean', 'median']).round(2).reset_index().to_dict('records'),
    }

    # Engagement analysis
    eng_scores = df.apply(lambda r: compute_engagement_score(r.to_dict()), axis=1)
    df['engagement_score'] = eng_scores
    df['engagement_level'] = eng_scores.apply(get_engagement_level)

    engagement = {
        'overall': {
            'mean': round(float(eng_scores.mean()), 1),
            'median': round(float(eng_scores.median()), 1),
        },
        'by_churn': [],
        'level_distribution': df['engagement_level'].value_counts().to_dict(),
        'by_subscription': df.groupby('subscription_type')['engagement_score'].mean().round(1).reset_index().to_dict('records')
    }

    for churn_val in [0, 1]:
        sub = df[df['churned'] == churn_val]
        engagement['by_churn'].append({
            'churned': churn_val,
            'mean': round(float(sub['engagement_score'].mean()), 1),
            'median': round(float(sub['engagement_score'].median()), 1)
        })

    # Login analysis
    login_stats = {
        'overall': {
            'mean': round(float(df['last_login_days'].mean()), 1),
            'median': round(float(df['last_login_days'].median()), 1),
        },
        'by_churn': df.groupby('churned')['last_login_days'].agg(['mean', 'median']).round(1).reset_index().to_dict('records'),
    }

    # Genre analysis
    genre_dist = df['favorite_genre'].value_counts().to_dict()
    genre_by_churn = df.groupby(['favorite_genre', 'churned']).size().reset_index(name='count')
    genre_churn_data = []
    for genre in df['favorite_genre'].unique():
        genre_data = genre_by_churn[genre_by_churn['favorite_genre'] == genre]
        active_count = int(genre_data[genre_data['churned'] == 0]['count'].sum())
        churned_count = int(genre_data[genre_data['churned'] == 1]['count'].sum())
        total_count = active_count + churned_count
        genre_churn_data.append({
            'genre': genre,
            'active': active_count,
            'churned': churned_count,
            'total': total_count,
            'churn_rate': round(churned_count / total_count, 4) if total_count > 0 else 0
        })

    # Subscription analysis
    sub_stats = df.groupby('subscription_type').agg({
        'churned': ['sum', 'count'],
        'monthly_fee': 'mean',
        'watch_hours': 'mean',
    }).reset_index()
    sub_stats.columns = ['subscription_type', 'churned', 'total', 'avg_fee', 'avg_watch']
    sub_stats['churn_rate'] = (sub_stats['churned'] / sub_stats['total']).round(4)
    subscription_analysis = sub_stats.round(2).to_dict('records')

    # Payment analysis
    payment_stats = df.groupby('payment_method').agg({
        'churned': ['sum', 'count'],
    }).reset_index()
    payment_stats.columns = ['payment_method', 'churned', 'total']
    payment_stats['churn_rate'] = (payment_stats['churned'] / payment_stats['total']).round(4)
    payment_analysis = payment_stats.to_dict('records')

    # Device analysis
    device_stats = df.groupby('device').agg({
        'churned': ['sum', 'count'],
        'watch_hours': 'mean',
    }).reset_index()
    device_stats.columns = ['device', 'churned', 'total', 'avg_watch']
    device_stats['churn_rate'] = (device_stats['churned'] / device_stats['total']).round(4)
    device_analysis = device_stats.round(2).to_dict('records')

    # Age analysis
    age_bins = [18, 25, 35, 45, 55, 65, 71]
    age_labels = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
    df['age_group'] = pd.cut(df['age'], bins=age_bins, labels=age_labels, right=False)
    age_stats = df.groupby('age_group', observed=True).agg({
        'churned': ['sum', 'count'],
        'watch_hours': 'mean'
    }).reset_index()
    age_stats.columns = ['age_group', 'churned', 'total', 'avg_watch']
    age_stats['churn_rate'] = (age_stats['churned'] / age_stats['total']).round(4)
    age_stats['age_group'] = age_stats['age_group'].astype(str)
    age_analysis = age_stats.round(2).to_dict('records')

    # Profiles analysis
    profile_stats = df.groupby('number_of_profiles').agg({
        'churned': ['sum', 'count'],
    }).reset_index()
    profile_stats.columns = ['profiles', 'churned', 'total']
    profile_stats['churn_rate'] = (profile_stats['churned'] / profile_stats['total']).round(4)
    profile_analysis = profile_stats.to_dict('records')

    # Region churn analysis
    region_stats = df.groupby('region').agg({
        'churned': ['sum', 'count'],
        'watch_hours': 'mean'
    }).reset_index()
    region_stats.columns = ['region', 'churned', 'total', 'avg_watch']
    region_stats['churn_rate'] = (region_stats['churned'] / region_stats['total']).round(4)
    region_analysis = region_stats.round(2).to_dict('records')

    return jsonify({
        'watch_time': watch_stats,
        'daily_watch_time': daily_watch,
        'engagement': engagement,
        'login_stats': login_stats,
        'genre_analysis': {
            'distribution': genre_dist,
            'by_churn': genre_churn_data
        },
        'subscription_analysis': subscription_analysis,
        'payment_analysis': payment_analysis,
        'device_analysis': device_analysis,
        'age_analysis': age_analysis,
        'profile_analysis': profile_analysis,
        'region_analysis': region_analysis
    })


# ===== MODEL INSIGHTS API =====

@app.route('/api/model/evaluation', methods=['GET'])
def get_model_evaluation():
    """Return cached model evaluation metrics."""
    if not model_evaluation:
        return jsonify({'error': 'Model evaluation not available'}), 503

    return jsonify(model_evaluation)


# ===== RETENTION APIs =====

@app.route('/api/retention/actions', methods=['GET'])
def get_retention_actions():
    """Get all retention actions with optional filters."""
    status_filter = request.args.get('status', '').strip()
    customer_id = request.args.get('customer_id', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)

    conn = get_db()
    query = 'SELECT * FROM retention_actions WHERE 1=1'
    params = []

    if status_filter:
        query += ' AND status = ?'
        params.append(status_filter)
    if customer_id:
        query += ' AND customer_id = ?'
        params.append(customer_id)

    query += ' ORDER BY created_at DESC'

    # Count total
    count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
    total = conn.execute(count_query, params).fetchone()[0]

    # Paginate
    query += ' LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])

    cursor = conn.execute(query, params)
    actions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        'actions': actions,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': max(1, (total + per_page - 1) // per_page)
    })


@app.route('/api/retention/actions', methods=['POST'])
def create_retention_action():
    """Create a new retention action."""
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    customer_id = data.get('customer_id')
    action_type = data.get('action_type')

    if not customer_id or not action_type:
        return jsonify({'error': 'customer_id and action_type are required'}), 400

    # Verify customer exists
    if data_df is not None:
        if not (data_df['customer_id'] == customer_id).any():
            return jsonify({'error': 'Customer not found'}), 404

    action_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    conn = get_db()
    conn.execute(
        '''INSERT INTO retention_actions
           (id, customer_id, customer_name, action_type, description, status, notes, priority_score, churn_probability, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (action_id, customer_id, data.get('customer_name', ''),
         action_type, data.get('description', ''), data.get('status', 'New'),
         data.get('notes', ''), data.get('priority_score', 0),
         data.get('churn_probability', 0), now, now)
    )
    conn.commit()
    conn.close()

    return jsonify({'id': action_id, 'action_id': action_id, 'status': 'created'}), 201


@app.route('/api/retention/actions/<action_id>', methods=['PUT'])
def update_retention_action(action_id):
    """Update a retention action."""
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conn = get_db()
    existing = conn.execute('SELECT * FROM retention_actions WHERE id = ?', (action_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Action not found'}), 404

    updates = []
    params = []
    for field in ['status', 'notes', 'description', 'action_type']:
        if field in data:
            updates.append(f'{field} = ?')
            params.append(data[field])

    if not updates:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400

    updates.append('updated_at = ?')
    params.append(datetime.now().isoformat())
    params.append(action_id)

    conn.execute(f'UPDATE retention_actions SET {", ".join(updates)} WHERE id = ?', params)
    conn.commit()

    updated = conn.execute('SELECT * FROM retention_actions WHERE id = ?', (action_id,)).fetchone()
    conn.close()

    return jsonify(dict(updated))


@app.route('/api/retention/actions/<action_id>', methods=['DELETE'])
def delete_retention_action(action_id):
    """Delete a retention action."""
    conn = get_db()
    existing = conn.execute('SELECT * FROM retention_actions WHERE id = ?', (action_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Action not found'}), 404

    conn.execute('DELETE FROM retention_actions WHERE id = ?', (action_id,))
    conn.commit()
    conn.close()

    return jsonify({'status': 'deleted'})


@app.route('/api/retention/segments', methods=['GET'])
def get_retention_segments():
    """Get customers segmented by risk level."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    # Batch predict
    cols_to_drop = ['churned', 'customer_id', 'customer_name', 'login_bucket']
    X_all = data_df.drop(columns=[c for c in cols_to_drop if c in data_df.columns])
    X_processed = preprocessor.transform(X_all)
    all_probas = rf_model.predict_proba(X_processed)[:, 1]

    df = data_df.copy()
    df['churn_probability'] = all_probas
    df['risk_category'] = df['churn_probability'].apply(get_risk_category)
    df['engagement_score'] = df.apply(lambda r: compute_engagement_score(r.to_dict()), axis=1)
    df['priority_score'] = df.apply(
        lambda r: compute_priority_score(r['churn_probability'], r['engagement_score'], r['monthly_fee']), axis=1
    )

    segment = request.args.get('segment', '').strip()
    sort_by = request.args.get('sort_by', 'priority_score')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    if segment:
        df = df[df['risk_category'].str.lower() == segment.lower()]

    # Sort
    if sort_by in ['priority_score', 'churn_probability', 'engagement_score', 'watch_hours']:
        df = df.sort_values(sort_by, ascending=False)

    total = len(df)
    total_pages = max(1, (total + per_page - 1) // per_page)
    page = min(page, total_pages)
    start = (page - 1) * per_page
    page_df = df.iloc[start:start + per_page]

    customers = []
    for _, row in page_df.iterrows():
        row_dict = row.to_dict()
        recs = generate_recommendations(row_dict, row['churn_probability'], row['risk_category'])
        rec_title = recs[0]['title'] if recs else 'Standard check-in'
        customers.append({
            'customer_id': row['customer_id'],
            'customer_name': row.get('customer_name', 'N/A'),
            'subscription_type': row['subscription_type'],
            'churn_probability': round(float(row['churn_probability']), 4),
            'risk_category': row['risk_category'],
            'engagement_score': round(float(row['engagement_score']), 1),
            'priority_score': round(float(row['priority_score']), 1),
            'watch_hours': round(float(row['watch_hours']), 2),
            'monthly_fee': round(float(row['monthly_fee']), 2),
            'last_login_days': int(row['last_login_days']),
            'top_recommendation': rec_title,
            'recommendation': rec_title
        })

    high_c = int((data_df.assign(cp=all_probas).pipe(lambda d: d['cp'].apply(get_risk_category)) == 'High').sum())
    med_c = int((data_df.assign(cp=all_probas).pipe(lambda d: d['cp'].apply(get_risk_category)) == 'Medium').sum())
    low_c = int((data_df.assign(cp=all_probas).pipe(lambda d: d['cp'].apply(get_risk_category)) == 'Low').sum())

    return jsonify({
        'customers': customers,
        'total': total,
        'page': page,
        'pages': total_pages,
        'per_page': per_page,
        'total_pages': total_pages,
        'summary': {
            'high_count': high_c,
            'medium_count': med_c,
            'low_count': low_c
        },
        'segment_counts': {
            'high': high_c,
            'medium': med_c,
            'low': low_c
        }
    })


# ===== EXPORT APIs =====

@app.route('/api/export/customers', methods=['GET'])
def export_customers():
    """Export filtered customer data as CSV."""
    if data_df is None:
        return jsonify({'error': 'Dataset not loaded'}), 503

    df = data_df.copy()

    # Apply filters
    search = request.args.get('search', '').strip()
    subscription = request.args.get('subscription', '').strip()
    risk_filter = request.args.get('risk', '').strip()

    if search:
        mask = (
            df['customer_name'].str.contains(search, case=False, na=False) |
            df['customer_id'].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    if subscription:
        df = df[df['subscription_type'].str.lower() == subscription.lower()]

    # Add predictions
    cols_to_drop = ['churned', 'customer_id', 'customer_name', 'login_bucket']
    X_all = df.drop(columns=[c for c in cols_to_drop if c in df.columns])
    X_processed = preprocessor.transform(X_all)
    probas = rf_model.predict_proba(X_processed)[:, 1]

    df = df.copy()
    df['churn_probability'] = [round(float(p), 4) for p in probas]
    df['risk_category'] = df['churn_probability'].apply(get_risk_category)
    df['engagement_score'] = df.apply(lambda r: compute_engagement_score(r.to_dict()), axis=1)

    if risk_filter:
        df = df[df['risk_category'].str.lower() == risk_filter.lower()]

    # Remove internal columns
    export_cols = ['customer_id', 'customer_name', 'age', 'gender', 'subscription_type',
                   'watch_hours', 'last_login_days', 'region', 'device', 'monthly_fee',
                   'churned', 'payment_method', 'number_of_profiles', 'avg_watch_time_per_day',
                   'favorite_genre', 'churn_probability', 'risk_category', 'engagement_score']
    export_df = df[[c for c in export_cols if c in df.columns]]

    output = io.StringIO()
    export_df.to_csv(output, index=False)
    output.seek(0)

    return app.response_class(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=customer_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
    )


@app.route('/api/export/retention', methods=['GET'])
def export_retention():
    """Export retention actions as CSV."""
    conn = get_db()
    cursor = conn.execute('SELECT * FROM retention_actions ORDER BY created_at DESC')
    actions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not actions:
        return app.response_class(
            'No retention actions found.',
            mimetype='text/plain',
            headers={'Content-Disposition': 'attachment; filename=retention_actions_empty.csv'}
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=actions[0].keys())
    writer.writeheader()
    writer.writerows(actions)
    output.seek(0)

    return app.response_class(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=retention_actions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
    )


@app.route('/api/export/model-report', methods=['GET'])
def export_model_report():
    """Export model evaluation report as CSV."""
    if not model_evaluation:
        return jsonify({'error': 'Model evaluation not available'}), 503

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Metric', 'Value'])
    writer.writerow(['Model Name', model_evaluation.get('model_name', 'N/A')])
    writer.writerow(['Accuracy', model_evaluation.get('accuracy', 'N/A')])
    writer.writerow(['Precision', model_evaluation.get('precision', 'N/A')])
    writer.writerow(['Recall', model_evaluation.get('recall', 'N/A')])
    writer.writerow(['F1 Score', model_evaluation.get('f1_score', 'N/A')])
    writer.writerow(['ROC AUC', model_evaluation.get('roc_auc', 'N/A')])
    writer.writerow(['Test Samples', model_evaluation.get('test_samples', 'N/A')])
    writer.writerow(['Train Samples', model_evaluation.get('train_samples', 'N/A')])

    cm = model_evaluation.get('confusion_matrix', {})
    writer.writerow(['True Negatives', cm.get('true_negatives', 'N/A')])
    writer.writerow(['False Positives', cm.get('false_positives', 'N/A')])
    writer.writerow(['False Negatives', cm.get('false_negatives', 'N/A')])
    writer.writerow(['True Positives', cm.get('true_positives', 'N/A')])

    writer.writerow([])
    writer.writerow(['Feature', 'Importance'])
    for fi in model_evaluation.get('feature_importance', []):
        writer.writerow([fi['feature'], fi['importance']])

    output.seek(0)

    return app.response_class(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=model_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
    )


# ---------------------------------------------------------------------------
# INITIALIZATION
# ---------------------------------------------------------------------------
init_db()
load_resources()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
