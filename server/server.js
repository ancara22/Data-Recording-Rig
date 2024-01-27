import express                 from 'express';
import bodyParser              from 'body-parser';
import path                    from 'path';
import { fileURLToPath }       from 'url';
import { rigControl }          from './modules/rig_controller.js';
import { serverRoutes }        from './modules/routes.js';
import { webClientRoutes }     from './modules/client-routes.js';
import { Cortex }              from './modules/cortex.js';
import dotenv from "dotenv";
import cors from "cors";

 //For Testing ######################################################################
import { updateTheFinalFile }  from './modules/utility.js';
import {insertToJSON } from "./modules/aws_services.js";
import { FILE_PATHS }          from './modules/server_settings.js';
import { removeStreamFiles, cleanOldRowData }   from './modules/file_cleaners.js';
 //###################################################################################

dotenv.config(); //Local  headset variables

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


    //For Testing ######################################################################
    //updateTheFinalFile();         //Update the final file / interval            //TEST
    //concatinateWavFiles("./data/audio/row_audio/audio_1702150851.wav");         //TEST
    //getTheHash((hash) => console.log('hash: ', hash))                           //TEST
    //insertToJSON("./data/audio/audio_1703090328.json", "audio_1703090328.wav"); //TEST
    //###################################################################################
});



//FOr Testing. It will run together with the app
//EEG
let socketUrl = 'wss://localhost:6868';

let user = {
    "license": process.env.HEADSET_LICENSE,
    "clientId": process.env.HEADSET_CLIENT_ID,
    "clientSecret": process.env.HEADSET_CLIENT_SECRET,
    "debit": 1
}


let cortex = new Cortex(user, socketUrl)
//cortex.run();









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


//http://192.168.0.57:8080 - wifi home
//http://172.20.10.4:8080 - mobile hotspot


