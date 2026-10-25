import pandas as pd

df = pd.read_csv('c:/Users/rohit/Documents/DS-CP/data/customer_churn.csv')
print("--- INFO ---")
df.info()
print("\n--- HEAD ---")
print(df.head())
print("\n--- DESCRIBE ---")
print(df.describe())
print("\n--- MISSING ---")
print(df.isnull().sum())
print("\n--- CHURN DISTRIBUTION ---")
print(df['churned'].value_counts())
