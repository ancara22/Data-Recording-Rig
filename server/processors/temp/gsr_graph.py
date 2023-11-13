import matplotlib.pyplot as plt
import pandas as pd
import time
import sys

filename = str(sys.argv[1])

#Update the graph
def update():
    frame = pd.read_csv(filePath)
    frame['Timestamp'] = pd.to_datetime(frame['Timestamp'], unit='ms')
    axes.clear()
    axes.set_xlabel('Timestamp')
    axes.set_ylabel('GSR')
    axes.set_title('GSR Data Graph')
    axes.plot(frame['Timestamp'], frame['GSR'], label='GSR Data')
    axes.legend()
    plt.draw()


#filePath = '../data/gsr/gsrData.csv'        #File path
filePath = '../data/gsr/' + filename

fig, axes = plt.subplots()

update() #Create the first state

try:
    while True:
        previous_timestamp = pd.to_datetime(pd.read_csv(filePath)['Timestamp'].iloc[-1], unit='ms')
        time.sleep(1)  

        if pd.to_datetime(pd.read_csv(filePath)['Timestamp'].iloc[-1], unit='ms') > previous_timestamp:
            update()

        plt.pause(1) 
        
except KeyboardInterrupt:
    pass

plt.close()
