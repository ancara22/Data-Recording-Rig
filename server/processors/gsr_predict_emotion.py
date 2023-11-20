import joblib
import numpy as np
import pandas as pd
import sys
import warnings

#Calculate slope
def calculate_slope(gsr_data):
    time_interval = 1.3 
    gsr_diff = np.diff(gsr_data)
    slope = gsr_diff / time_interval
    return np.mean(slope)


def calculate_time_duration(startTime, finishTime):
    start_time = pd.Timestamp(startTime)
    end_time = pd.Timestamp(finishTime)
    time_duration = end_time - start_time
    return time_duration.total_seconds()


input_gsr = list(map(int, sys.argv[1].split(',')))

variance = np.var(input_gsr)
std_dev = np.std(input_gsr)
slope = calculate_slope(input_gsr)

features = np.array([variance, std_dev, slope]).reshape(1, -1)

#Get the trained model
model = joblib.load('./processors/gsr_emotion_model.pkl')

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
# Make predictions
predicted_emotion = model.predict(features)

print(predicted_emotion[0])
