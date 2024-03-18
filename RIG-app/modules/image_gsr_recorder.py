import time
import picamera2
from modules.web_services import sendData, sendGSR, checkConnection, toUpdateConfigs
from grove.adc import ADC
import configparser
import sys

imageConfig = None
gsrConfig = None
CONNECTION_HOST = None

#Load and set the configurations
def load_img_gsr_config():
    global imageConfig
    global gsrConfig
    global CONNECTION_HOST

    #Get configurations from the config.ini
    config = configparser.ConfigParser()
    config.read('/home/rig/Documents/App/main/config.ini')
    CONNECTION_HOST = config.get('CONNECTION', 'host')

    #Set the image recording configurations 
    imageConfig = {
        "host": config.get("image", 'image_host'),
        "loresX": config.get("image", 'loresX'),
        "loresY": config.get("image", 'loresY'),
        "framerate": config.get("image", 'framerate'),
        "frequence": config.get("image", 'frequence'),
    }

    #Set the GSR recording configurations
    gsrConfig = {
        "host": config.get('GSR', 'gsr_host'),
        "frequence": config.get('GSR', 'frequence'),
    }


#Grove GSR sensor initiating
class GroveGSRSensor:
    def __init__(self, channel):
        self.channel = channel
        self.adc = ADC()

    @property
    def GSR(self):
        value = self.adc.read(self.channel)
        return value

Grove = GroveGSRSensor     #GSR sensor socket on the grove base


#Start paralel recording of images and gsr data
def recordImageAndGSR():
    load_img_gsr_config()
    
    #Image quality/resolution
    loresX = int(imageConfig['loresX'])
    loresY = int(imageConfig['loresY'])

    #Camera configs
    camera = picamera2.Picamera2()
    camera_config = camera.create_still_configuration(main={"size": (1920, 1080)}, lores={"size": (loresX, loresY)}, display="lores")
    camera.configure(camera_config)
    camera.framerate = imageConfig['framerate']
    camera.start()

    #GSR sensor
    sensor = GroveGSRSensor(0)

    #Recording
    while True:
        checkConnection(CONNECTION_HOST)
        toPpdate = toUpdateConfigs(CONNECTION_HOST)

        if(toPpdate):
            camera.framerate = imageConfig['framerate']

        timestamp = int(time.time())  #Unic identifier

        try:
            gsrSent = sendGSR(sensor.GSR, gsrConfig['host'])   #Record and send GSR

            #Record and send image
            output = str(timestamp) + "-stream.jpg"
            camera.capture_file("/home/rig/Documents/App/main/data/images/" + output)
            imgSent = sendData(imageConfig['host'], output, 'image')
        finally:
            if(gsrSent == False or imgSent == False):
                print("Connection error! Image, GSR recording stoped.")
                sys.exit(0)

            time.sleep(float(imageConfig['frequence']))
