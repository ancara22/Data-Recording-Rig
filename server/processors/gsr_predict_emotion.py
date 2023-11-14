import joblib
import numpy as np
import pandas as pd
import ast
from server.processors.gsr_model import calculate_slope


def calculate_time_duration(startTime, finishTime):
    start_time = pd.Timestamp(startTime)
    end_time = pd.Timestamp(finishTime)
    time_duration = end_time - start_time
    return time_duration.total_seconds()


#Testting set
input_gsr = [453, 442, 430, 414, 414, 410, 398, 390, 384, 380, 386, 386, 377, 386, 377, 380, 377, 372, 364, 362, 369, 359, 363, 367, 350, 366, 364, 365, 350, 354, 351, 351, 356, 352, 365, 366, 365, 351, 366, 365, 366, 355, 354, 350, 350, 365, 358, 363, 350, 349, 364, 346, 346, 346, 349, 363, 347, 347, 363, 351, 351, 348, 357, 346, 360, 360, 360, 352, 348, 360, 355, 345, 353, 340, 352, 345, 357, 353, 348, 351, 355, 354, 350, 359, 356]

#mean = np.mean(input_gsr)
variance = np.var(input_gsr)
std_dev = np.std(input_gsr)
slope = calculate_slope(input_gsr)
#duration=calculate_time_duration(input_gsr, 1699737615250, 1699737759154)

features = np.array([ variance, std_dev, slope]).reshape(1, -1)


#Get the trained model
model = joblib.load('./gsr_emotion_model.pkl')


# Make predictions
predicted_emotion = model.predict(features )

print("Predicted Emotion:", predicted_emotion)
