# PULSE — OTT Audience Retention & Churn Intelligence Platform

An enterprise-grade, interactive Machine Learning intelligence platform designed for Over-The-Top (OTT) streaming services. PULSE combines predictive ML models, behavioral audience analytics, customer risk segmentation, and actionable retention workflow management in a dark cinematic single-page application.

---

## 🌟 Key Features & Architecture

### 1. Executive Overview
- **Real-Time KPIs**: Total subscribers (5,000 active pool), historical churn rate, high/medium/low risk distribution, and average watch time.
- **Visual Analytics**: Interactive Chart.js visualizations for observed churn distribution, predicted risk segments, churn rate by subscription tier, and watch hours vs. churn status.
- **Retention Priority Queue**: Instant view of the top subscribers most in need of retention intervention, sorted by dynamic priority score.

### 2. Audience Analytics Deep-Dive
- **Watch Time Intelligence**: Mean/median/max watch hours distribution, viewing histograms, and cross-tabulations by subscription tier and geographic region.
- **Engagement Profiling**: Multi-factor engagement scoring (0–100) combining normalized watch hours (40%), login recency (30%), daily viewing density (20%), and profile count (10%).
- **Content & Genre Dynamics**: Favorite genre breakdown vs. churn rates to detect content affinity trends.
- **Subscription & Infrastructure**: Analysis across payment methods, device categories, profile counts, and age demographics.

### 3. ML Churn Prediction & Risk Interpretation
- **Real-Time Lookup**: Search by subscriber name or UUID with instant autocomplete recommendations.
- **Cinematic Risk Gauge**: Half-doughnut risk visualization displaying churn probability alongside retention likelihood.
- **Explainable AI (XAI)**: Contextual plain-language breakdown of key churn drivers (e.g., login inactivity, viewing decay, plan fee misalignment).
- **Benchmark Comparisons**: Subscriber metrics contrasted directly against platform-wide medians and percentiles.
- **Targeted Recommendations**: Automated retention campaign proposals tailored to the subscriber's usage behavior.
- **Audit Logging**: Prediction history logged to SQLite database for longitudinal tracking.

### 4. Subscriber Explorer
- **Interactive Data Grid**: Filter and query 5,000 subscriber records by subscription tier, churn status, risk tier, and engagement level.
- **Multi-Field Sorting**: Sort by churn probability, watch hours, monthly fee, engagement score, or name.
- **Pagination & Subscriber Drawer**: Deep-dive profile drawer for any subscriber with one-click action logging.

### 5. Retention Center & Action Tracker
- **Segment Management**: Dedicated view for High, Medium, and Low risk cohorts with automated retention recommendations.
- **SQLite Persistence**: Full CRUD workflow for retention actions (Status: New ➔ Planned ➔ In Progress ➔ Completed).
- **Direct Intervention Logging**: Schedule re-engagement campaigns, special discounts, content recommendations, or VIP support outreach.

### 6. Model Insights & Validation
- **Performance Evaluation**: Accuracy (98.2%), Precision (98.3%), Recall (98.1%), F1-Score (98.2%), and ROC-AUC (0.9971).
- **ROC Curve**: Interactive ROC curve with true positive rate vs. false positive rate across probability thresholds.
- **Confusion Matrix**: Visual breakdown of True Negatives, False Positives, False Negatives, and True Positives.
- **Gini Feature Importance**: Ranked influence of input features (dominated by `avg_watch_time_per_day`, `watch_hours`, and `last_login_days`).
- **Model Metadata**: Inspection of Random Forest hyper-parameters (100 estimators, max depth 10, 29 one-hot encoded input dimensions).

### 7. Reports & Data Exports
- **CSV Data Export**: Instant download of filtered or full subscriber records with predicted probabilities.
- **Retention Action Audit Export**: Export all logged intervention records.
- **Model Evaluation Report**: Export complete model validation report as formatted CSV/JSON.

### 8. Settings & Dynamic Thresholds
- **Customizable Risk Thresholds**: Configure Low-Risk and Medium-Risk cutoffs live via `PUT /api/config/thresholds` with instant classification previews.
- **System Health Monitor**: Live check of ML model status, preprocessor state, and SQLite connectivity.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, Flask-CORS, SQLite3, Joblib
- **Machine Learning**: Scikit-Learn (`RandomForestClassifier`, `StandardScaler`, `OneHotEncoder`), NumPy, Pandas
- **Frontend**: Vanilla JavaScript (ES6+ SPA architecture), Vanilla CSS (Custom warm cinematic design system), HTML5
- **Visualizations**: Chart.js v4, Lucide Icons, Google Fonts (Outfit & Inter)

---

## 📂 Project Structure

```text
├── app.py                     # Flask REST API server (1400+ lines, comprehensive routes)
├── data/
│   └── customer_churn.csv     # OTT subscriber dataset (5,000 records × 15 features)
├── models/
│   ├── rf_model.pkl           # Pre-trained Random Forest Classifier
│   ├── linear_reg_model.pkl   # Pre-trained Linear Regression model
│   └── preprocessor.pkl       # ColumnTransformer (StandardScaler + OneHotEncoder)
├── static/
│   ├── css/
│   │   └── style.css          # Warm cinematic dark theme design system
│   ├── js/
│   │   └── main.js            # Frontend SPA application logic
│   └── plots/                 # Static exploratory data analysis plots
├── templates/
│   └── index.html             # 8-page responsive Single Page Application
├── retention.db               # SQLite database for action tracking and prediction history
├── data_cleaning.py           # Outlier handling and data preprocessing pipeline
├── feature_engineering.py     # Transformer serialization and data scaling
├── eda.py                     # Statistical inference and plot generator
├── model.py                   # Machine learning training & evaluation pipeline
├── add_names.py               # Dataset enrichment script
└── requirements.txt           # Python dependencies
```

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Application
```bash
python app.py
```

### 3. Open the Dashboard
Navigate to `http://127.0.0.1:5000` in your web browser.

---

## 📡 Key REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the single-page intelligence platform |
| `GET` | `/api/health` | System health and resource verification |
| `GET` | `/api/config` | Configuration and dataset metadata |
| `PUT` | `/api/config/thresholds` | Update dynamic churn risk thresholds |
| `GET` | `/api/customers` | Paginated, filtered, and sorted customer records |
| `GET` | `/api/customers/<id>` | Full customer profile with AI explanation & benchmarks |
| `GET` | `/api/customers/search` | Autocomplete search for customers by name/ID |
| `POST` | `/predict` | Predict churn risk by name or UUID, logs to database |
| `GET` | `/api/analytics/overview` | Executive KPIs, priority customers, and summary charts |
| `GET` | `/api/analytics/audience` | Granular viewing, engagement, and demographic metrics |
| `GET` | `/api/model/evaluation` | Accuracy, Precision, Recall, F1, ROC-AUC, ROC points, importances |
| `GET` | `/api/retention/segments` | Segmented risk cohorts with automated recommendations |
| `GET` | `/api/retention/actions` | Query logged retention actions |
| `POST` | `/api/retention/actions` | Create a new retention action |
| `PUT` | `/api/retention/actions/<id>` | Update action status or notes |
| `DELETE` | `/api/retention/actions/<id>` | Delete an action record |
| `GET` | `/api/export/customers` | Download filtered subscribers CSV |
| `GET` | `/api/export/retention` | Download retention actions CSV |
| `GET` | `/api/export/model-report`| Download model evaluation CSV |
