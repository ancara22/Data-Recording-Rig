from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import pandas as pd
import ast

def safe_eval(x):
    try:
        return ast.literal_eval(x)
    except (SyntaxError, ValueError):
        return None

data = pd.read_csv('../data/gsr/gsrSections.csv')

data['GSR'] = data['GSR'].apply(lambda x: safe_eval(x))
data_expanded = data['GSR'].apply(pd.Series)

data = pd.concat([data, data_expanded], axis=1)
data['GSR Mean'] = data[data_expanded.columns].mean(axis=1)
data['GSR Variance'] = data[data_expanded.columns].var(axis=1)
data['GSR StdDev'] = data[data_expanded.columns].std(axis=1)
features = data[['GSR Mean', 'GSR Variance', 'GSR StdDev']]

EMOTION = data['Emotion']

#Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(features, EMOTION, test_size=0.2, random_state=11)

#Initialize and train
classifier = RandomForestClassifier(n_estimators=100, random_state=30, class_weight='balanced')
classifier.fit(X_train, y_train)

#Make predictions on the test set
y_pred = classifier.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

#Print result
print("Shape of X_train:", X_train.shape)
print("Class distribution in y_train:", y_train.value_counts())
print("Predictions on the test set:", y_pred)
print("Accuracy:", accuracy)

#Save the model
joblib.dump(classifier, 'model.pkl')
