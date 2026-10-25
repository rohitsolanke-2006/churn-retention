import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from data_cleaning import get_cleaned_data

def run_eda_and_hypothesis_test(df, output_dir="static/plots"):
    """
    # Phase 3: EDA + one hypothesis test
    Generates the requested 8 charts and performs a T-test.
    """
    print("\n--- Starting Exploratory Data Analysis ---")
    os.makedirs(output_dir, exist_ok=True)
    
    # Set aesthetics for plots (Dark cinematic theme for consistency)
    plt.style.use('dark_background')
    sns.set_palette("flare")
    
    # 1. Pie chart: Churn distribution
    plt.figure(figsize=(6, 6))
    churn_counts = df['churned'].value_counts()
    plt.pie(churn_counts, labels=['Active (0)', 'Churned (1)'], autopct='%1.1f%%', colors=['#4CAF50', '#F44336'])
    plt.title('Churn Distribution')
    plt.savefig(os.path.join(output_dir, '1_churn_distribution.png'))
    plt.close()
    
    # 2. Bar chart: Churn by subscription type
    plt.figure(figsize=(8, 5))
    sns.countplot(data=df, x='subscription_type', hue='churned', palette=['#4CAF50', '#F44336'])
    plt.title('Churn by Subscription Type')
    plt.savefig(os.path.join(output_dir, '2_churn_by_subscription.png'))
    plt.close()
    
    # 3. Boxplot: Watch time by churn status
    plt.figure(figsize=(8, 5))
    sns.boxplot(data=df, x='churned', y='watch_hours', palette=['#4CAF50', '#F44336'])
    plt.title('Watch Time by Churn Status')
    plt.savefig(os.path.join(output_dir, '3_watch_time_by_churn.png'))
    plt.close()
    
    # 4. Histogram: Charges distribution (monthly_fee)
    plt.figure(figsize=(8, 5))
    sns.histplot(df['monthly_fee'], bins=20, kde=True, color='#FF9800')
    plt.title('Monthly Fee Distribution')
    plt.savefig(os.path.join(output_dir, '4_monthly_fee_distribution.png'))
    plt.close()
    
    # 5. Scatter: Watch time vs Charges
    plt.figure(figsize=(8, 5))
    sns.scatterplot(data=df, x='monthly_fee', y='watch_hours', hue='churned', alpha=0.6, palette=['#4CAF50', '#F44336'])
    plt.title('Watch Time vs Monthly Fee')
    plt.savefig(os.path.join(output_dir, '5_watch_time_vs_fee.png'))
    plt.close()
    
    # 6. Line chart: Churn by tenure bucket (proxy using age as tenure isn't available, or last_login_days)
    # Using last_login_days as a behavioral bucket
    plt.figure(figsize=(8, 5))
    df['login_bucket'] = pd.cut(df['last_login_days'], bins=5, labels=['Recent', 'A while', 'Moderate', 'Long', 'Very Long'])
    churn_rate_by_login = df.groupby('login_bucket')['churned'].mean().reset_index()
    sns.lineplot(data=churn_rate_by_login, x='login_bucket', y='churned', marker='o', color='#F44336')
    plt.title('Churn Rate by Last Login Bucket')
    plt.ylabel('Churn Rate')
    plt.savefig(os.path.join(output_dir, '6_churn_by_login_bucket.png'))
    plt.close()
    
    # 7. Correlation Heatmap (only numeric features)
    plt.figure(figsize=(10, 8))
    numeric_df = df.select_dtypes(include=['int64', 'float64'])
    sns.heatmap(numeric_df.corr(), annot=True, fmt='.2f', cmap='coolwarm', vmin=-1, vmax=1)
    plt.title('Correlation Heatmap')
    plt.savefig(os.path.join(output_dir, '7_correlation_heatmap.png'))
    plt.close()
    
    print(f"Generated 7 EDA charts in {output_dir}/ (ROC curve will be in model.py)")
    
    # Hypothesis Test: T-test on Watch Hours between Churned and Active users
    # Null Hypothesis (H0): Mean watch hours are equal.
    # Alternate Hypothesis (H1): Mean watch hours are different.
    print("\n--- Hypothesis Testing ---")
    active_watch = df[df['churned'] == 0]['watch_hours']
    churned_watch = df[df['churned'] == 1]['watch_hours']
    
    t_stat, p_val = stats.ttest_ind(active_watch, churned_watch, equal_var=False)
    print(f"T-statistic: {t_stat:.4f}")
    print(f"P-value: {p_val:.4e}")
    if p_val < 0.05:
        print("Conclusion: Reject the null hypothesis. There is a significant difference in watch hours between active and churned users.")
    else:
        print("Conclusion: Fail to reject the null hypothesis. No significant difference found.")
        
    print("--- EDA Complete ---")

if __name__ == "__main__":
    file_path = os.path.join(os.path.dirname(__file__), 'data', 'customer_churn.csv')
    cleaned_df = get_cleaned_data(file_path)
    run_eda_and_hypothesis_test(cleaned_df)
