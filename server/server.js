import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { rigControl, removeStreamFiles, runImageProcessor, updateTheFinalFile, cleanOldRowData, insertDataToFinalFile } from './modules/utility.js';
import { imageRoute, audioRoute, gsrRoute, connectionRoute } from './modules/routes.js';
import { webClientRoutes } from './modules/client-routes.js';
import { sendAudioToAWSS3 } from './modules/aws_services.js';

// Set the port for the server
const port = 8080;
const app = express();

app.use(bodyParser.json());

//Set the public folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'webclient')));

//Routes
app.use('/gsr', gsrRoute);                  //GSR data receiver route
app.use('/audio', audioRoute);              //Audio receiver route
app.use('/image', imageRoute);              //Image receiver route
app.use('/connection', connectionRoute);    //Rig Connection checking route
app.use('/', webClientRoutes);              //Web clien route

//List the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    cleanOldRowData();        //Clean old row data
    rigControl('config');       //Configure the rig
    runImageProcessor();      //Run the python image processor
    updateTheFinalFile();     //Update the final file / interval

    //sendAudioToAWSS3("audio_1700586321.wav");  //DEMO
    //insertDataToFinalFile()                    //DEMO
});



//##############################################################################################################################################
//Remove the colected data
//Temp code, to be removed
setInterval(() => {
    let dirPath = 'data/images/processed_images';
    //removeStreamFiles(dirPath);

    let dirPath2 = 'data/images/row_images';
    removeStreamFiles(dirPath2);

    let dirPath3 = 'data/audio/row_audio';
    //removeStreamFiles(dirPath3);
}, 30000)



