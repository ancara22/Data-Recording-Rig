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

# Parse input GSR data from command line arguments
input_gsr = list(map(int, sys.argv[1].split(',')))

# Calculate statistical features from GSR data
variance = np.var(input_gsr)
std_dev = np.std(input_gsr)
slope = calculate_slope(input_gsr)

# Prepare features for model prediction
features = np.array([variance, std_dev, slope]).reshape(1, -1)

# Load the pre-trained model
model = joblib.load('./processors/gsr_emotion_model.pkl')

# Suppress user warnings during prediction
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

# Make predictions
predicted_emotion = model.predict(features)

# Print the predicted emotion
print(predicted_emotion[0])
