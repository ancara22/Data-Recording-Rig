/**
 * The Web Client Routes Module.
 * @module webClientRoutes
 */

import express from 'express';
import ini from 'ini';
import fs from 'fs';
import csv from 'csv-parser';
import path from "path";
import { saveData } from './utility.js';
import { FILE_PATHS } from './server_settings.js';
import { SERVER_CONFIG } from './server_settings.js';
import { rigControl } from './rig_controller.js';
import { cleanCSVFile } from './file_cleaners.js';


//////////////////////////////////////////////////////////////////////////////////
//Clien web-service
//////////////////////////////////////////////////////////////////////////////////

const webClientRoutes = express.Router();

/**
 * Route to serve the main web page.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get("/", (req, res) => res.sendFile(path.join(__dirname, '/webclient/index.html')));


/**
 * Route to get rig status for the web client.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /rigStatus
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/rigStatus', (req, res) => res.json({
    rigActive: SERVER_CONFIG.rigActive,
    imagesNumber: SERVER_CONFIG.imagesNumber,
    audioNumber: SERVER_CONFIG.audioNumber,
    gsrNumber: SERVER_CONFIG.gsrNumber
}));


/**
 * Route to start the rig and save new configs to the file.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /rigStart
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get("/rigStart", (req, res) => {
    cleanCSVFile(FILE_PATHS.CLIENT_GSR_GRAPH_FILE_PATH, 'Timestamp,GSR');
    cleanCSVFile(FILE_PATHS.CLIENT_EMOTIONS_PATH, 'startTime,endTime,Emotion\n');
    handleRigControl(req, res, "start")
});


/**
 * Route to stop the rig.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /rigStop
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get("/rigStop", (req, res) => handleRigControl(req, res, "stop"));


/**
 * Route to get GSR data from the file.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /gsrData
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/gsrData', (req, res) => {
    readFileAndHandleErrors(FILE_PATHS.CLIENT_GSR_GRAPH_FILE_PATH, res, (data) => {
        let rows = data.trim().split('\n'),
            header = rows[0].split(','),
            gsr_data = rows.slice(1).map(row => row.split(',').map(parseFloat));

        res.status(200).json({ header, gsr_data });
    })
});


/**
 * Route to get the rig configuration.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getConfig
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/getConfig', (req, res) => {
    readFileAndHandleErrors(FILE_PATHS.CONFIG_FILE_PATH, res, (data) => {
        const config = ini.parse(data)
        res.status(200).json({ config });
    })
});


/**
 * Route to save new configs to the file.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /saveConfig
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/saveConfig", (req, res) => {
    const config = req.body.config,
        iniConfig = ini.stringify(config);

    fs.writeFile(FILE_PATHS.CONFIG_FILE_PATH, iniConfig, (err) => {
        if (err) {
            config.toUpdateConfig = false;
            console.error('Error saving INI file:', err);
            res.status(500);
        } else {
            config.toUpdateConfig = true;
            rigControl('config');
            res.status(200);
        }
    });
});


/**
 * Route to get emotions data from a file.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getEmotions
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get("/getEmotions", (req, res) => {
    readFileAndHandleErrors(FILE_PATHS.CLIENT_EMOTIONS_PATH, res, (data) => {
        let rows = data.trim().split('\n'),
            header = rows[0].split(','),
            emotions = rows.slice(1).map(row => row.split(','));

        res.status(200).json({ header, emotions });
    });
});


/**
 * Route to set a new username and session start time.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /setNewUserName
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post('/setNewUserName', (req, res) => {
    let name = req.body.userName;

    readFileAndHandleErrors(FILE_PATHS.USER_FILE_PATH, res, (data) => {
        let userData = JSON.parse(data); //Get the data from the json file

        userData.sessionStart = Math.floor(Date.now() / 1000);
        userData.currentUser = name;

        let updatedData = JSON.stringify(userData, null, 4);

        //Rewrite the json file
        fs.writeFile(FILE_PATHS.USER_FILE_PATH, updatedData, 'utf8', (err) => {
            if (err) console.error('Error updating JSON file:', err)
        })

        res.status(200)
    })
})


/**
 * Route to get the user name and session start time.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getUserName
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/getUserName', (req, res) => {
    readFileAndHandleErrors(FILE_PATHS.USER_FILE_PATH, res, (data) => {
        res.send(data);
    })
})


/**
 * Route to get extracted audio text.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getAudioText
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/getAudioText', (req, res) => {
    readFileAndHandleErrors(FILE_PATHS.AUDIO_TEXT_FILE_PATH, res, (data) => {
        res.send(data)
    })
});


/**
 * Route to get extracted image text.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getImageText
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get('/getImageText', (req, res) => {
    readCsvAndHandleErrors(FILE_PATHS.IMAGE_TEXT_FILE_PATH, res, (data) => {
        res.json(data)
    })
});


/**
 * Route to save audio user intro.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /saveAudioIntro
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/saveAudioIntro", saveData('user', 'audio'), (req, res) => {
    res.json({
        success: true,
        message: 'Audio data saved successfully.'
    });
});


/**
 * Route to get all sessions from a folder.
 * @function
 * @memberof module:webClientRoutes
 * @name GET /getAllSessions
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.get("/getAllSessions", (req, res) => {
    fs.readdir(FILE_PATHS.SESSION_FOLDER, (err, files) => {
        if (err) {
            console.error('Error reading folder:', err);
            return;
        }

        //Filter files with the extension '.json'
        const matchingFiles = files.map(file => {
            const extension = path.extname(file),
                fileName = path.basename(file, extension);

            if(extension === '.json') {
                return fileName;
            }
        }).filter(fileName => fileName !== undefined )

        res.json(matchingFiles);
    }) 
});


/**
 * Route to get all images from a folder based on start time.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /getAllImages
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/getAllImages", (req, res) => {
    let startTime = Math.floor(req.body.startTime / 1000);

    fs.readdir(FILE_PATHS.PROCESSED_IMAGES, (err, files) => {
        if (err) {
            console.error('Error reading folder:', err);
            return;
        }

        //Filter files with the extension '.json'
        const matchingFiles = files.filter(file => {
            const extension = path.extname(file),
                fileName = path.basename(file, extension);

            let time = parseInt(fileName.split("-")[0]);
            let diferenceTime = time - startTime;
            let frameTime = 60 * 60;

            if(extension === '.jpg' && diferenceTime < frameTime) return fileName;
        })

        res.json(matchingFiles);
    }) 
});


/**
 * Route to get all audio files from a folder based on start time.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /getAllAudioFiles
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/getAllAudioFiles", (req, res) => {
    let startTime = Math.floor(req.body.startTime / 1000);

    fs.readdir(FILE_PATHS.CONVERTED_AUDIO, (err, files) => {
        if (err) {
            console.error('Error reading folder:', err);
            return;
        }

        //Filter files with the extension '.json'
        const matchingFiles = files.filter(file => {
            const extension = path.extname(file),
                fileName = path.basename(file, extension);

            let time = parseInt((fileName.split("_")[1]).split(".")[0]);
            let diferenceTime = time - startTime;
            let frameTime = 60 * 15;

            if(extension === '.wav' && diferenceTime < frameTime) return fileName;
        })

        res.json(matchingFiles);
    }) 
});


/**
 * Route to get the content of a JSON file.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /getOutputFileContent
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/getOutputFileContent", (req, res) => {
    const requestBody = req.body;

    if (!requestBody || !requestBody.fileName) {
        return res.status(400).json({ error: 'Invalid request. fileName is required.' });
    }

    let filePath = FILE_PATHS.SESSION_FOLDER + requestBody.fileName;
    console.log('Request File Content: ', filePath)

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading file.', details: err.message });
        }

        //Parse the JSON data
        let jsonOutput;

        try {
            jsonOutput = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).json({ error: 'Error parsing JSON.', details: parseError.message });
        }

        //Send back the json file content
        res.json(jsonOutput);
    });


})


/**
 * Route to get the audio file path.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /getAudioFilePath
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/getAudioFilePath", (req, res) => {
    const audioFileName = req.body.audioFileName;
    const __dirname = path.resolve();

    const audioFilePath = path.join(__dirname, 'data', 'audio', 'processed_audio', audioFileName);

    res.sendFile(audioFilePath)

})


/**
 * Route to get the image file.
 * @function
 * @memberof module:webClientRoutes
 * @name POST /getImage
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
webClientRoutes.post("/getImage", (req, res) => {
    const imageName = req.body.imageName;
    const __dirname = path.resolve();

    const imagePath = path.join(__dirname, 'data', 'images', 'processed_images', imageName);

    res.sendFile(imagePath)

})


//################################################################################################################################################
// Functions
//################################################################################################################################################

/**
 * Read a JSON file function with callback.
 * @function
 * @memberof module:webClientRoutes
 * @param {string} filePath - The path to the JSON file.
 * @param {express.Response} res - The Express response object.
 * @param {Function} callback - The callback function to handle the file data.
 * @returns {void}
 */
function readFileAndHandleErrors(filePath, res, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500);
        } else {
            callback(data);
        }
    });
}

/**
 * Handle rig control.
 * @function
 * @memberof module:webClientRoutes
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @param {string} action - The action to perform.
 * @returns {void}
 */
function handleRigControl(req, res, action) {
    rigControl(action);
    res.status(200);
}

/**
 * Read CSV file and handle errors.
 * @function
 * @memberof module:webClientRoutes
 * @param {string} filePath - The path to the CSV file.
 * @param {express.Response} res - The Express response object.
 * @param {Function} callback - The callback function to handle the CSV data.
 * @returns {void}
 */
function readCsvAndHandleErrors(filePath, res, callback) {
    try {
        const data = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                // Transform data and extract information
                const transformedData = data.map((item) => {
                    const imageNameMatch = item.image.match(/(\d+)-stream\.jpg/),
                        imageId = imageNameMatch ? imageNameMatch[1] : null;

                    return {
                        imageName: item.image,
                        imageTime: new Date(parseInt(imageId) * 1000).toLocaleString(),
                        text: item.text,
                    };
                });

                callback(transformedData);
            }).on('error', (err) => {
                console.error('Error reading CSV:', err);
                res.status(500).send('Internal Server Error');
            });
    } catch (err) {
        console.log('Error reading CSV file: ', err);
    }
}


//Export
export {  webClientRoutes }