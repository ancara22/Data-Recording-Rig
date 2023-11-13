from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import cross_val_score
import joblib
import pandas as pd
import numpy as np
import ast


#Calculate slope
def calculate_slope(gsr_data):
    time_interval = 1.3 
    gsr_diff = np.diff(gsr_data)
    slope = gsr_diff / time_interval
    return np.mean(slope)

def safe_eval(x):
    try:
        return ast.literal_eval(x)
    except (SyntaxError, ValueError):
        return None
    

def calculate_time_duration(row):
    start_time = pd.Timestamp(row['startTime'])
    end_time = pd.Timestamp(row['finishTime'])
    time_duration = end_time - start_time
    return time_duration.total_seconds()


data = pd.read_csv('../data/gsr/gsrSections.csv')

data['GSR'] = data['GSR'].apply(lambda x: safe_eval(x))
data_expanded = data['GSR'].apply(pd.Series)

data = pd.concat([data, data_expanded], axis=1)
#data['GSR Mean'] = data[data_expanded.columns].mean(axis=1)
data['GSR Variance'] = data[data_expanded.columns].var(axis=1)
data['GSR StdDev'] = data[data_expanded.columns].std(axis=1)
data['GSR Slope'] = data['GSR'].apply(calculate_slope)
#data['GSR Time Duration'] = data.apply(calculate_time_duration, axis=1)

#features = data[['GSR Mean', 'GSR Variance', 'GSR StdDev', 'GSR Slope', 'GSR Time Duration']]
features = data[['GSR Variance', 'GSR StdDev', 'GSR Slope']]

EMOTION = data['Emotion']

#Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(features, EMOTION, test_size=0.2, random_state=42)

#Initialize and train
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')

cv_scores = cross_val_score(model, features, EMOTION, cv=5)

# Print the cross-validation scores
print("Cross-Validation Scores:", cv_scores)
print("Mean CV Score:", cv_scores.mean())



model.fit(X_train, y_train)

#Make predictions on the test set
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

#Print result
print("Shape of X_train:", X_train.shape)
print("Class distribution in y_train:", y_train.value_counts())
print("Predictions on the test set:", y_pred)
print("Accuracy:", accuracy)

#Save the model
joblib.dump(model, 'gsr_emotion_model.pkl')




