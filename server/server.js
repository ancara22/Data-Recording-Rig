import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { processGSRoutput, saveData, rigConfiguration, removeStreamFiles, runImageProcessor, identifySpeachInAudio, insertGSRData } from './modules/utility.js'
import { sendAudioToAWSS3 } from './modules/aws_services.js';
import path from 'path';
import { fileURLToPath } from 'url'


// Set the port for the server
const port = 8080;
const app = express();
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'webclient')));


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

    //Row data path
    const filePath = './data/audio/row_audio/' + audioFile.filename;

    //Read the audio file/Promise
    fs.promises.readFile(filePath)
        .then(()=> {
            return true;
            //identifySpeachInAudio(audioFile.filename) //Significall work/ Test
        }).then((isSpeech) => {
            if (isSpeech) {
              sendAudioToAWSS3(audioFile.filename); //Execute AWS Trasncriber
            }
            res.sendStatus(200);
        })
});


//Get GSR 
//##############################################

//GSR section object
let data = {
    startTime: null,
    finishTime: null,
    gsrData: [],
    artefacts: 0
}  

//Used for trainig
let trainingFileStart = {
    fileNumb: 8
}

app.post('/gsr', (req, res) => {
    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }
    
    insertGSRData(data, gsrData['gsr_data'], trainingFileStart) //Insert gsr data/ Used for LM training 
    //processGSRoutput(gsrData['gsr_data']);   /// Process GSr data, the permanent processor

    res.sendStatus(200);
});


//For connection testing
app.get('/connection', (req, res) => {
    res.sendStatus(200);
})


//Web interface
//##############################################

app.get("/", (req, res)=> {
    res.sendFile(path.join(__dirname, '/webclient/index.html'));
})

app.get('/gsrData', (req, res) => {
    const filePath = './data/gsr/gsr_data.csv';
  
    //Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        res.status(500);
      } else {
        let rows = data.trim().split('\n');
        let header = rows[0].split(',');
        let gsr_data = rows.slice(1).map(row => row.split(',').map(parseFloat));
  
        res.json({ header, gsr_data });
      }
    });
  });


//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    //rigConfiguration();
    //runImageProcessor();
});





//##############################################################################################################################################

//Remove the colected images
//Temp code, to be removed
//###############################################
setInterval(() => {
    let dirPath = 'data/images/processed_images';
    removeStreamFiles(dirPath);

    let dirPath2 = 'data/images/row_images';
    //removeStreamFiles(dirPath2);

    let dirPath3 = 'data/audio/row_audio';
    //removeStreamFiles(dirPath3);
}, 30000)



  

//Text sentiment
//Rig random pip
//find the key words start - finish in the audio text (assign that text in a separate conversation section json)
//Save gsr in a file//and after creating an section of 3 min - execute the lm_prediction
        //Collect more data and improve the accuracy

//Write the frontend
    //Rig settings
    //Rig Restart
    //Run the app
    //stop the app
    //shutdown the rig
    //GSR graph  /sentiment
    //Audio files text/ sentiment
    //images list and text
    //data counter
