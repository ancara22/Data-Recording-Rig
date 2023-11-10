from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pandas as pd
import numpy as np

data = pd.read_csv('your_data.csv')

data['GSR'] = data['GSR'].apply(lambda x: np.array(eval(x)))    # extract gsr feature 

# Calculate the Mean
data['GSR Mean'] = data['GSR'].apply(lambda x: sum(eval(x)) / len(eval(x)))

# Calculate the variance and standard deviation for each row
data['GSR Variance'] = data['GSR'].apply(lambda x: np.var(x))
data['GSR StdDev'] = data['GSR'].apply(lambda x: np.std(x))


GSR = data['GSR']
MEAN = data['GSR Mean']
VARIATION = data['GSR Variance']
STDDEV = data['GSR StdDev']
EMOTIONS = data['Emotion'] 

features = pd.concat([GSR, MEAN, VARIATION, STDDEV], axis=1)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(features, EMOTIONS, test_size=0.2, random_state=42)

# Initialize and train the RandomForestClassifier
classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)

# Make predictions on the test set
y_pred = classifier.predict(X_test)

# Evaluate the model
accuracy = accuracy_score(y_test, y_pred)
print("Accuracy:", accuracy)