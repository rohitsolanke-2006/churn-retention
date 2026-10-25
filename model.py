import os
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_curve, auc, mean_squared_error, r2_score
from data_cleaning import get_cleaned_data
from feature_engineering import preprocess_data

def train_and_evaluate_models(X_cls, y_cls, X_orig, output_dir="models", plot_dir="static/plots"):
    """
    # Phase 5, 6, 7: Train models and evaluate them
    Trains Logistic Regression and Random Forest for classification (Churn).
    Trains Linear Regression for continuous prediction (Watch Hours).
    """
    print("\n--- Starting Modeling Phase ---")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(plot_dir, exist_ok=True)
    
    # ---------------------------------------------------------
    # Classification: Predicting Churn
    # ---------------------------------------------------------
    print("\n--- Unit V: Train/Test Split (Classification) ---")
    X_train, X_test, y_train, y_test = train_test_split(X_cls, y_cls, test_size=0.2, random_state=42, stratify=y_cls)
    
    # Model 1: Logistic Regression
    print("Training Logistic Regression...")
    log_reg = LogisticRegression(max_iter=1000, random_state=42)
    log_reg.fit(X_train, y_train)
    lr_preds = log_reg.predict(X_test)
    lr_probs = log_reg.predict_proba(X_test)[:, 1]
    
    print("\nLogistic Regression Evaluation:")
    print(f"Accuracy: {accuracy_score(y_test, lr_preds):.4f}")
    
    # Model 2: Random Forest
    print("\nTraining Random Forest Classifier...")
    rf_clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf_clf.fit(X_train, y_train)
    rf_preds = rf_clf.predict(X_test)
    rf_probs = rf_clf.predict_proba(X_test)[:, 1]
    
    print("\nRandom Forest Evaluation:")
    print(f"Accuracy: {accuracy_score(y_test, rf_preds):.4f}")
    print("\nClassification Report (Random Forest):")
    print(classification_report(y_test, rf_preds))
    
    # Save the best model (let's save Random Forest as it generally performs better and captures non-linearities)
    joblib.dump(rf_clf, os.path.join(output_dir, 'rf_model.pkl'))
    print(f"Saved Random Forest model to {output_dir}/rf_model.pkl")
    
    # 8th Chart: ROC Curve
    plt.style.use('dark_background')
    plt.figure(figsize=(8, 6))
    
    fpr_lr, tpr_lr, _ = roc_curve(y_test, lr_probs)
    roc_auc_lr = auc(fpr_lr, tpr_lr)
    
    fpr_rf, tpr_rf, _ = roc_curve(y_test, rf_probs)
    roc_auc_rf = auc(fpr_rf, tpr_rf)
    
    plt.plot(fpr_lr, tpr_lr, color='#FF9800', lw=2, label=f'Logistic Regression (AUC = {roc_auc_lr:.2f})')
    plt.plot(fpr_rf, tpr_rf, color='#4CAF50', lw=2, label=f'Random Forest (AUC = {roc_auc_rf:.2f})')
    plt.plot([0, 1], [0, 1], color='gray', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC)')
    plt.legend(loc="lower right")
    plt.savefig(os.path.join(plot_dir, '8_roc_curve.png'))
    plt.close()
    print("Saved ROC curve (8th chart).")

    # ---------------------------------------------------------
    # Regression: Predicting Watch Hours (Engagement Metric)
    # ---------------------------------------------------------
    print("\n--- Regression: Predicting Watch Hours ---")
    # We will use the same preprocessed features but we need to remove 'watch_hours' from predictors
    # First, let's find the column index for watch_hours in the scaled X matrix.
    # Since watch_hours was scaled, we need to locate it.
    watch_hours_col = [col for col in X_cls.columns if 'watch_hours' in col][0]
    
    # Target for regression is the original unscaled watch_hours
    y_reg = X_orig['watch_hours']
    
    # Predictors are all other columns except watch_hours
    X_reg = X_cls.drop(columns=[watch_hours_col])
    
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)
    
    lin_reg = LinearRegression()
    lin_reg.fit(X_train_r, y_train_r)
    r_preds = lin_reg.predict(X_test_r)
    
    rmse = mean_squared_error(y_test_r, r_preds) ** 0.5
    r2 = r2_score(y_test_r, r_preds)
    print(f"Linear Regression RMSE: {rmse:.4f}")
    print(f"Linear Regression R2 Score: {r2:.4f}")
    
    # Save the regression model
    joblib.dump(lin_reg, os.path.join(output_dir, 'linear_reg_model.pkl'))
    print(f"Saved Linear Regression model to {output_dir}/linear_reg_model.pkl")
    print("--- Modeling Phase Complete ---")

if __name__ == "__main__":
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'customer_churn.csv')
    cleaned_df = get_cleaned_data(file_path)
    X, y, X_orig = preprocess_data(cleaned_df)
    train_and_evaluate_models(X, y, X_orig)
