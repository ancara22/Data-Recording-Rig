import express                 from 'express';
import bodyParser              from 'body-parser';
import path                    from 'path';
import { fileURLToPath }       from 'url';
import { updateTheFinalFile, getTheHash }  from './modules/utility.js';
import { rigControl }          from './modules/rig_controller.js';
import { removeStreamFiles, cleanOldRowData }   from './modules/file_cleaners.js';
import { serverRoutes }        from './modules/routes.js';
import { webClientRoutes }     from './modules/client-routes.js';
import { FILE_PATHS }          from './modules/server_settings.js';
import cors from "cors";
import {insertToJSON } from "./modules/aws_services.js";
import { Cortex } from './modules/cortex.js';


// Set the port for the server
const port = 8080;
const app = express();

app.use(cors());

app.use(bodyParser.json());

//Set the public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'webclient')));

//Routes
app.use('/', webClientRoutes); //Web clien routes
app.use('/', serverRoutes);    //Server client routes

//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    //cleanOldRowData();        //Clean old row data
    //rigControl('config');     //Configure the rig

    //updateTheFinalFile();     //Update the final file / interval  //TEST
    //concatinateWavFiles("./data/audio/row_audio/audio_1702150851.wav"); //TEST
    //getTheHash((hash) => console.log('hash: ', hash))     //TEST
    //insertToJSON("./data/audio/audio_1703090328.json", "audio_1703090328.wav");  //TEST
});



//Remove the colected data
//Temp code, to be removed
setInterval(() => {
    let dirPath = 'data/images/processed_images';
    //removeStreamFiles(dirPath);

    let dirPath2 = 'data/images/row_images';
    //removeStreamFiles(dirPath2);

    let dirPath3 = 'data/audio/row_audio';
    //removeStreamFiles(dirPath3);
}, 30000)


//http://192.168.0.57:8080





//EEG
let socketUrl = 'wss://localhost:6868';

let user = {
    "license": "",
    "clientId": "",
    "clientSecret": "",
    "debit": 1
}


let cortex = new Cortex(user, socketUrl)
cortex.listenForWarnings();

/*
    Have six kind of stream data ['fac', 'pow', 'eeg', 'mot', 'met', 'com']

    eeg - The raw EEG data from the headset
    fac - The results of the facial expressions detection
    met - The results of the performance metrics detection (Attention level, Stress level, etc)

    mot - The motion data from the headset
    pow - The band power of each EEG sensor. It includes the alpha, low beta, high beta, gamma, and theta bands
    com - The results of the mental commands detection. 
*/
let streams = ['eeg', 'fac', 'met']
cortex.sub(streams);
