import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { rigControl, removeStreamFiles, updateTheFinalFile, cleanOldRowData, concatinateWavFiles } from './modules/utility.js';
import { serverRoutes } from './modules/routes.js';
import { webClientRoutes } from './modules/client-routes.js';
//import { sendAudioToAWSS3,  extractEmotionsFromText } from './modules/aws_services.js';
//import { runImageProcessor, insertDataToFinalFile } from './modules/utility.js';


// Set the port for the server
const port = 8080;
const app = express();

app.use(bodyParser.json());

//Set the public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'webclient')));

//Routes
app.use('/', webClientRoutes);              //Web clien routes
app.use('/', serverRoutes);                 //Server client routes

//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    cleanOldRowData();        //Clean old row data
    rigControl('config');     //Configure the rig
    updateTheFinalFile();     //Update the final file / interval
    
    //concatinateWavFiles("audio_1700586321.wav"); //TEST
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
