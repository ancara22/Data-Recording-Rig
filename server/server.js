import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import ini from 'ini';
import path from 'path';
import { fileURLToPath } from 'url'

import { sendAudioToAWSS3 } from './modules/aws_services.js';
import { processGSRoutput, saveData, rigControl, removeStreamFiles, runImageProcessor, 
        identifySpeachInAudio, insertGSRData, concatinateWavFiles} from './modules/utility.js'



// Set the port for the server
const port = 8080;
const app = express();
app.use(bodyParser.json());

//Set the public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'webclient')));



//////////////////////////////////////////////////////////////////////////////////
//Rig Status controler

let toUpdateConfig = false;         //Flag to update the rig configs
let rigActive = false;              //Rig status flag

//Status update timer
//Set status false
function timerHandler() {
    rigActive = false;
    console.log('Rig is not active!');
}

//Reset the timer
function resetTimer() {
    rigActive = true
    clearTimeout(timer); //Clear the current timer
    timer = setTimeout(timerHandler, 5000);
}

//Create a timer
let timer = setTimeout(timerHandler, 5000);


//////////////////////////////////////////////////////////////////////////////////
//Rig webservice

//Get image and save to a file. 
//It will be saved in a temp direcotry to avoid processing incompleate images
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


let vawArray = [];

//Get audio and save to the directory row_audio
app.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
    const audioFile = req.file;
  
    if (!audioFile) {
        console.error('No audio file received');
        return res.sendStatus(400);
    }

    //Row data path
    const dir = './data/audio/row_audio/'
    const filePath = dir + audioFile.filename;

    vawArray.push(filePath);

    if(vawArray.length > 6) {
        //Read the audio file/Promise
        let outputFile = concatinateWavFiles(vawArray)

        setTimeout(() => {
            fs.promises.readFile(outputFile)
            .then(()=> {
                vawArray = []
                //return true;
                return identifySpeachInAudio(outputFile) //Significall work/ Test
            }).then((isSpeech) => {
                if (isSpeech) {
                    console.log('first')
                    //sendAudioToAWSS3(audioFile.filename); //Execute AWS Trasncriber
                }
                res.sendStatus(200);
            })
        }, 20000);

    } else {
        res.sendStatus(200)
    }
   

    
});


//Get GSR 
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

app.post('/gsr', (req, res) => {
    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }
    
    insertGSRData(data, gsrData['gsr_data'], trainingFileStart) //Insert gsr data/ Used for LM training 
    processGSRoutput(gsrData['gsr_data'], false);   /// Process GSr data, the permanent processor

    res.sendStatus(200);
});

//For connection testing and rig config updating
app.get('/connection', (req, res) => {
    res.json({ status: 200, updateConfig: toUpdateConfig})
    toUpdateConfig = false;
    resetTimer();
})



//////////////////////////////////////////////////////////////////////////////////
//Web Client webservices

//Web interface/web page
app.get("/", (req, res)=> {
    res.sendFile(path.join(__dirname, '/webclient/index.html'));
})

//Get rig status for the web client /Web client webservice
app.get('/rigStatus', (req, res) => {
    res.json({ active: rigActive })
})

//Get gsr data from the file
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

//getRigConfigFile
app.get('/getConfig', (req, res) => {
    const filePath = '../config.ini';
  
    //Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        res.status(500);
      } else {
        const config = ini.parse(data)
        res.json({ config });
      }
    });
});

//Save new configs to the file
app.post( "/saveConfig", (req, res) => {
    const config = req.body.config;
    const iniConfig = ini.stringify(config);

    fs.writeFile('../config.ini', iniConfig, (err) => {
        if (err) {
            toUpdateConfig = false;
            console.error('Error saving INI file:', err);
            res.status(500);
        } else {
            toUpdateConfig = true;
            rigControl('config');
            res.status(200);
        }
      });
});

//Save new configs to the file
app.get( "/rigStart", (req, res) => {
    rigControl('start');

    res.status(200);
});

//Save new configs to the file
app.get( "/rigStop", (req, res) => {
    rigControl('stop');

    res.status(200);
});



//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    rigControl('config');
    //runImageProcessor();
});



//##############################################################################################################################################
//Remove the colected data
//Temp code, to be removed
setInterval(() => {
    let dirPath = 'data/images/processed_images';
    removeStreamFiles(dirPath);

    let dirPath2 = 'data/images/row_images';
    removeStreamFiles(dirPath2);

    let dirPath3 = 'data/audio/row_audio';
    //removeStreamFiles(dirPath3);
}, 30000)



