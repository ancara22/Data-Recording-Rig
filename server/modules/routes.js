import express                                              from 'express';
import fs                                                   from 'fs';
import { sendAudioToAWSS3 }                                 from './aws_services.js';
import { processGSRoutput, saveData, insertGSRData }        from './utility.js';
import { imagesNumber, audioNumber, gsrNumber, resetTimer } from './timer.js';


//////////////////////////////////////////////////////////////////////////////////
//Rig web-service
//////////////////////////////////////////////////////////////////////////////////

const serverRoutes = express.Router();

//Flag to update the rig configs
let config = { 
    toUpdateConfig: false 
}; 

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
}; 


//Get image and save to a file. 
//It will be saved in a temp direcotry to avoid processing incompleate images
serverRoutes.post('/image', saveData('images', 'image'), (req, res) => {
    imagesNumber++;     //Image counter for user interface

    //Image is saved in the temporary direcotry
    let imageFile = req.file,                                   //Image file
        imageName = imageFile.filename;                         //Image name
        dirPath = 'data/images/',                               //Images directory
        tempPath = dirPath + imageName,                         //Temp saving directory
        destinationPath = dirPath + 'row_images/' + imageName;  //Final directory, row_images

    //Check if image is receved
    if (!imageFile) {
        console.error('No image file received');
        return res.sendStatus(400);
    }

    fs.rename(tempPath, destinationPath, (err) => {});           //Relocate image from the temporary directory to destination direcotry

    res.sendStatus(200);
});

//Get audio and save to the directory row_audio
serverRoutes.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
    audioNumber++;                                                      //Audio files counter for user interface

    const audioFile = req.file;                                         //File name
    const filePath = './data/audio/row_audio/' + audioFile.filename;    //Row data path

    if (!audioFile) {
        console.error('No audio file received');
        res.sendStatus(400);
    }

    //Procces the audio file
    fs.promises.readFile(filePath)
        .then(() => {
            sendAudioToAWSS3(audioFile.filename); //Execute AWS Trasncriber
            res.sendStatus(200);
        })
});

//Receive GSR data
serverRoutes.post('/gsr', (req, res) => {
    gsrNumber++;                                //GSR data counter for user interface

    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }

    insertGSRData(data, gsrData['gsr_data'], trainingFileStart);    //Insert gsr data/ Used for LM training 
    processGSRoutput(gsrData['gsr_data'], false);                   //Process GSr data, the permanent processor

    res.sendStatus(200);
});

//For connection testing and rig config updating
serverRoutes.get('/connection', (req, res) => {
    res.json({
        status: 200,
        updateConfig: config.toUpdateConfig,
    })
    config.toUpdateConfig = false;
    resetTimer();
})


export {
    serverRoutes,
    config
}