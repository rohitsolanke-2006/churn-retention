import pandas as pd
import random

first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Rohit", "Priya", "Rahul", "Neha", "Amit", "Sneha"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Sharma", "Verma", "Patel", "Kumar", "Singh"]

df = pd.read_csv('c:/Users/rohit/Documents/DS-CP/data/customer_churn.csv')
if 'customer_name' not in df.columns:
    random.seed(42)
    names = [f"{random.choice(first_names)} {random.choice(last_names)}" for _ in range(len(df))]
    df.insert(1, 'customer_name', names)
    df.to_csv('c:/Users/rohit/Documents/DS-CP/data/customer_churn.csv', index=False)
    print("Added customer_name column to dataset.")
else:
    print("customer_name already exists.")
