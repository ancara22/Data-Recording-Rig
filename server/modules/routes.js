import express from 'express';
import fs from 'fs';
import { sendAudioToAWSS3 } from './aws_services.js';
import { processGSRoutput, saveData } from './utility.js';
import { resetTimer } from './timer.js';


//////////////////////////////////////////////////////////////////////////////////
//Rig web-service
//////////////////////////////////////////////////////////////////////////////////

//Initiate routes
let imageRoute = express.Router(),
    gsrRoute = express.Router(),
    audioRoute = express.Router(),
    connectionRoute = express.Router();

let toUpdateConfig = false;         //Flag to update the rig configs

//GSR section object
let data = {
    startTime: null,
    finishTime: null,
    gsrData: [],
    artefacts: 0
}  

//Used for trainig
let trainingFileStart = {
    fileNumb: 43
}

//Get image and save to a file. 
//It will be saved in a temp direcotry to avoid processing incompleate images
imageRoute.post('/image', saveData('images', 'image'), (req, res) => {
    //Image is saved in the temporary direcotry
    let imageFile = req.file;                //Image file
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
audioRoute.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
    const audioFile = req.file;                                        //File name
    const filePath = './data/audio/row_audio/' + audioFile.filename;   //Row data path
  
    if (!audioFile) {
        console.error('No audio file received');
        res.sendStatus(400);
    }

    //Procces the audio file
    fs.promises.readFile(filePath)
        .then(()=> {
            //sendAudioToAWSS3(audioFile.filename); //Execute AWS Trasncriber
            res.sendStatus(200);
        })
});


//Receive GSR data
gsrRoute.post('/gsr', (req, res) => {
    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }
    
    insertGSRData(data, gsrData['gsr_data'], trainingFileStart); //Insert gsr data/ Used for LM training 
    processGSRoutput(gsrData['gsr_data'], false);               //Process GSr data, the permanent processor

    res.sendStatus(200);
});


//For connection testing and rig config updating
connectionRoute.get('/connection', (req, res) => {
    res.json({ status: 200, updateConfig: toUpdateConfig})
    toUpdateConfig = false;
    resetTimer();
})


export {
    imageRoute,
    audioRoute,
    gsrRoute,
    connectionRoute,
    toUpdateConfig
}