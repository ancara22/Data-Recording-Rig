import requests
import os
import sys


#Send the data to the server. Image and Audio
def sendData(web_service_url, fileName, fileType):
    #If it is image, set the path
    if(fileType == "image"):
        fileName = "/home/rig/Documents/App/main/data/images/" + fileName

    try:
        #Open and read the saved file
        with open(fileName, 'rb') as data:
            files = {fileType: (data)}
            response = requests.post(web_service_url, files=files)   #Send the file, POST
            os.remove(fileName)    #Remove the file

            #Check the status
            if response.status_code == 200:
                print('Data sent successfully to the web service')
            else:
                print('Failed to send the data to the web service')
                
            
    except Exception as e:
        print(f"Error while sending audio/image.")
        return False
        

#Send GSR data in json format
def sendGSR(data, web_service_url):
    try:
        response = requests.post(web_service_url, json={'gsr_data': data})   #Send the data

        #Check the status
        if response.status_code == 200:
            pass
        else:
            print(f'Failed to send GSR data. Status code: {response.status_code}')
    except Exception as e:
        print(f'Error while sending GSR data.')
        return False
        

#Check if the connection to the server 
def checkConnection(web_service_url):
    try:
        respons = requests.get(web_service_url)

        if(respons.status_code == 200):
            print("Connection fine!")

    except Exception as e:
        print(f"Connection failed! {e}")
        sys.exit(0)


#Update the application configs
def toUpdateConfigs(web_service_url):
    try:
        response = requests.get(web_service_url)
        
        if response.status_code == 200:
            data = response.json()
            update_config = data.get('updateConfig')

            return update_config

    except Exception as e:
        print(f"Connection failed! {e}")
        return False
        

