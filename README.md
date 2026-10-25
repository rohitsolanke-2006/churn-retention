# OTT Subscriber Churn Predictor

This project is a Data Science pipeline and web application designed to predict subscriber churn for an Over-The-Top (OTT) streaming platform. It includes data cleaning, exploratory data analysis (EDA), feature engineering, machine learning modeling, and a Flask-based "Retention Control Room" dashboard.

## Project Phases

### Phase 1: Load & Inspect Data
- **File**: `data_cleaning.py`
- **Unit Mapping**: Unit I (Data Loading & Inspection)
- **Description**: Loaded the dataset using pandas, inspected the shape (5000 rows, 14 columns), checked for missing values (0 missing), and analyzed the target variable distribution (perfectly balanced: 50.3% churned, 49.7% active). Identified impossible values in `avg_watch_time_per_day` (>24 hours).

### Phase 2: Clean Data & Handle Outliers
- **File**: `data_cleaning.py`
- **Unit Mapping**: Unit II (Data Preprocessing & Outlier Handling)
- **Description**: Handled the impossible values in `avg_watch_time_per_day` using the Interquartile Range (IQR) method, capping values to a maximum of 24 hours to prevent dropping data while ensuring logical consistency. Missing value logic was implemented (median/mode) as a best practice, though the dataset was complete.

### Phase 3: Exploratory Data Analysis & Hypothesis Testing
- **File**: `eda.py`
- **Unit Mapping**: Unit III (EDA & Statistical Inference)
- **Description**: Generated 7 key visualizations mapping churn against various metrics (e.g., watch hours, monthly fee, subscription type) to uncover patterns. Performed an independent T-test on watch hours between active and churned users, revealing a statistically significant difference (p < 0.05). All plots are saved in `static/plots/`.

### Phase 4: Feature Engineering
- **File**: `feature_engineering.py`
- **Unit Mapping**: Unit IV (Feature Engineering & Scaling)
- **Description**: Prepared data for modeling by applying `OneHotEncoder` to categorical features (gender, subscription_type, region, etc.) and `StandardScaler` to numeric features. This ensures models process features on a uniform scale without being biased by magnitude.

### Phase 5 & 6: Machine Learning Models
- **File**: `model.py`
- **Unit Mapping**: Unit V (Predictive Modeling: Classification & Regression)
- **Description**:
  - **Classification**: Built Logistic Regression and Random Forest models to predict the binary `churned` label. Random Forest was selected as the primary model due to its ability to handle non-linear relationships.
  - **Regression**: Built a Linear Regression model to predict `watch_hours` (a continuous engagement metric) based on user demographics and subscription details.

### Phase 7: Model Evaluation
- **File**: `model.py`
- **Unit Mapping**: Unit VI (Model Evaluation & Metrics)
- **Description**: Evaluated classification models using Accuracy, Precision, Recall, and F1-score. Generated an ROC curve (the 8th chart) comparing the AUC of Logistic Regression vs. Random Forest. Evaluated the regression model using RMSE and R² Score. Models and preprocessors were serialized using `joblib`.

### Phase 8 & 9: Dashboard Development
- **File**: `app.py`, `templates/index.html`, `static/css/style.css`, `static/js/main.js`
- **Unit Mapping**: Unit VII (Deployment & Visualization)
- **Description**: Developed a Flask backend with a REST endpoint (`/predict`). Created a custom frontend styled as an internal "Retention Control Room" using a dark cinematic theme, asymmetric layout, and an interactive Chart.js gauge to visualize the probability of churn for a specific customer UUID.

## How to Run

1. **Install Requirements**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Generate Models and Plots**:
   ```bash
   python eda.py
   python model.py
   ```

3. **Run the Dashboard**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser. Use a UUID from the dataset (e.g., `a9b75100-82a8-427a-a208-72f24052884a`) to see the risk analysis.
