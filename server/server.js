import express                 from 'express';
import bodyParser              from 'body-parser';
import path                    from 'path';
import { fileURLToPath }       from 'url';
import { rigControl }          from './modules/rig_controller.js';
import { serverRoutes }        from './modules/routes.js';
import { webClientRoutes }     from './modules/client-routes.js';
import { cleanOldRowData }     from './modules/file_cleaners.js';
import { runSessionFileUpdatingInterval } from './modules/utility.js';
import dotenv from "dotenv";
import cors from "cors";

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

//Listen the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

    cleanOldRowData();        //Clean old row data
    rigControl('config');     //Configure the rig
    //runSessionFileUpdatingInterval();

});



//####################################################################################################
//Remove the colected data
//Temp code, to be removed
setInterval(() => {
    let dirPath = 'data/images/processed_images';
    //removeStreamFiles(dirPath);

    let dirPath2 = 'data/images/raw_images';
    //removeStreamFiles(dirPath2);

    let dirPath3 = 'data/audio/raw_audio';
    //removeStreamFiles(dirPath3);
}, 30000)




