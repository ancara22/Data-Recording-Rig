import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { processGSRoutput, saveData, rigConfiguration, removeStreamFiles, runImageProcessor, identifySpeachInAudio } from './utility.js'
import { sendAudioToAWSS3 } from './aws.js';

// Set the port for the server
const port = 8080;
const app = express();
app.use(bodyParser.json());


//Get image and save to a file. 
//It will be saved in a temp direcotry to avoid processing incompleate images
///##############################################

app.post('/image', saveData('images', 'image'), (req, res) => {
    //Image is saved in the temporary direcotry
    let imageFile = req.file                //Image file
    let imageName = imageFile.filename;     //Image name
    let dirPath = 'data/images/';           //Images directory
    let tempPath = dirPath + imageName;     //Temp saving directory
    let destinationPath = dirPath + 'row_images/' + imageName;  //Final directory, row_images

    //Check if image is receved
    if (!imageFile) {
        console.error('No image file received');
        return res.sendStatus(400);
    }
  
    //Relocate image from the temporary directory to destination direcotry
    fs.rename(tempPath, destinationPath, (err) => {});
  
    res.sendStatus(200);
});


//Get audio and save to the directory row_audio
//##############################################

app.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
    const audioFile = req.file;
  
    if (!audioFile) {
        console.error('No audio file received');
        return res.sendStatus(400);
    }

    const filePath = './data/audio/row_audio/' + audioFile.filename;

    fs.stat(filePath, (err, stats) => {
        if (err) {
            console.error('Error checking file status:', err);
            return res.sendStatus(500);
        }

        if (stats.isFile()) {
            console.log('filename: ', audioFile.filename);
            if(identifySpeachInAudio(audioFile.filename)) {
                //sendAudioToAWSS3(audioFile.filename);
            }
            
            return res.sendStatus(200);
        }
    })

    //res.sendStatus(200);
});


//Get GSR json and save to a file
//##############################################

app.post('/gsr', saveData('gsr', 'json'), (req, res) => {
    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }
    console.log('gsrData: ', gsrData)
    processGSRoutput(gsrData['gsr_data']);

    res.sendStatus(200);
});


//Get video and save to a file
//##############################################

app.post('/video', saveData('videos', 'video'), (req, res) => {
    const videoFile = req.file;
  
    if (!videoFile) {
      console.error('No video file received');
      return res.sendStatus(400);
    }
    res.sendStatus(200);
});


//Remove the colected images
//Temp code, to be removed
//###############################################
setInterval(() => {
    let dirPath = 'data/images/row_images';
    removeStreamFiles(dirPath);
}, 30000)



//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
   
    rigConfiguration();
    runImageProcessor();
  });
  