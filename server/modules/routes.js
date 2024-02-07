/**
 * The ServerRoutes Module.
 * @module ServerRoutes
 */

import express from 'express';
import fs from 'fs';
import { sendAudioToAWSS3 } from './aws_services.js';
import { saveData } from './utility.js';
import { resetTimer } from './timer.js';
import { SERVER_CONFIG, FILE_PATHS } from './server_settings.js';
import { insertGSRData, processGSRoutput } from './gsr_procesor.js';


//////////////////////////////////////////////////////////////////////////////////
//Rig web-service
//////////////////////////////////////////////////////////////////////////////////

/**
 * Express Router for server routes.
 * @type {express.Router}
 */
const serverRoutes = express.Router(); 

/**
 * Flag to update the rig configurations.
 * @type {{ toUpdateConfig: boolean }}
 */
let config = { toUpdateConfig: false };

/**
 * Object representing GSR (Galvanic Skin Response) section data.
 * @type {{ startTime: null | Date, finishTime: null | Date, gsrData: any[], artefacts: number }}
 */
let data = {
    startTime: null,
    finishTime: null,
    gsrData: [],
    artefacts: 0
}

/**
* Object used for training.
* @type {{ fileNumb: number }}
*/
let trainingFileStart = {
    fileNumb: 43
}

/**
 * POST request handler for uploading and saving images.
 * Images are temporarily saved in a directory to avoid processing incomplete images.
 *
 * @function
 * @memberof module:ServerRoutes
 * @name /image
 * @param {string} 'images' - The subdirectory for saving images.
 * @param {string} 'image' - The type of data being saved (image).
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 * @example
 * // Example of using the /image route
 * serverRoutes.post('/image', saveData('images', 'image'), (req, res) => {
 *     // Your custom logic for handling image upload
 * });
 */
serverRoutes.post('/image', saveData('images', 'image'), (req, res) => {
    SERVER_CONFIG.imagesNumber++; //Image counter for user interface

    //Image is saved in the temporary direcotry
    let imageFile = req.file,           //Image file
        imageName = imageFile.filename, //Image name
        tempPath = FILE_PATHS.IMAGE_FOLDER + imageName, //Temp saving directory
        destinationPath = FILE_PATHS.IMAGE_FOLDER + 'row_images/' + imageName; //Final directory, row_images

    //Check if image is receved
    if (!imageFile) {
        console.error('No image file received');
        return res.sendStatus(400);
    }

    fs.rename(tempPath, destinationPath, (err) => {}); //Relocate image from the temporary directory to destination direcotry

    res.sendStatus(200);
});


/**
 * POST request handler for uploading and saving audio files.
 * Audio files are saved in the 'row_audio' directory.
 *
 * @function
 * @memberof module:ServerRoutes
 * @name /audio
 * @param {string} 'audio/row_audio' - The subdirectory for saving audio files.
 * @param {string} 'audio' - The type of data being saved (audio).
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 * @example
 * // Example of using the /audio route
 * serverRoutes.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
 *     // Your custom logic for handling audio upload
 * });
 */
serverRoutes.post('/audio', saveData('audio/row_audio', 'audio'), (req, res) => {
    SERVER_CONFIG.audioNumber++; //Audio files counter for user interface

    const audioFile = req.file; //File name
    const filePath = FILE_PATHS.AUDIO_FOLDER + 'row_audio/' + audioFile.filename; //Row data path

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

/**
 * POST request handler for receiving GSR (Galvanic Skin Response) data.
 *
 * @function
 * @memberof module:ServerRoutes
 * @name /gsr
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 * @example
 * // Example of using the /gsr route
 * serverRoutes.post('/gsr', (req, res) => {
 *     // Your custom logic for handling GSR data
 * });
 */
serverRoutes.post('/gsr', (req, res) => {
    SERVER_CONFIG.gsrNumber++; //GSR data counter for user interface

    const gsrData = req.body;

    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }

    insertGSRData(data, gsrData['gsr_data'], trainingFileStart); //Insert gsr data/ Used for LM training 
    processGSRoutput(gsrData['gsr_data'], false); //Process GSr data, the permanent processor

    res.sendStatus(200);
});

/**
 * GET request handler for connection testing and rig config updating.
 *
 * @function
 * @memberof module:ServerRoutes
 * @name /connection
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 * @example
 * // Example of using the /connection route
 * serverRoutes.get('/connection', (req, res) => {
 *     // Your custom logic for connection testing and rig config updating
 * });
 */
serverRoutes.get('/connection', (req, res) => {
    res.json({
        status: 200,
        updateConfig: config.toUpdateConfig,
    })
    config.toUpdateConfig = false;
    resetTimer();
})

//Exports
export {
    serverRoutes,
    config
}