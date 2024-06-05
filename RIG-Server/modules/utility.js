/**
 * The Utility Module.
 * @module UtilityModule
 */

import multer, { diskStorage } from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import Papa from 'papaparse';
import crypto from 'crypto';
import { FILE_PATHS, SERVER_CONFIG, APP_CONFIG } from "./server_settings.js";
import { emptyAllFiles } from "./file_cleaners.js";

let sessionFileUpdatingIntervalId = null;

/**
 * Creates and returns a middleware for handling file uploads and saving them to a specified folder.
 *
 * @function
 * @memberof module:UtilityModule
 * @param {string} folder - The folder where the files will be saved.
 * @param {string} fileType - The type of file being uploaded.
 * @returns {function} A middleware function for handling file uploads.
 * @example
 * // Use saveData middleware for handling image uploads
 * app.post('/upload-image', saveData('images', 'image'), (req, res) => {
 *     // Handle the uploaded image file
 *     const uploadedFile = req.file;
 *     // Additional logic...
 *     res.sendStatus(200);
 * });
 */
function saveData(folder, fileType) {
    const storage = diskStorage({
        destination: (r, f, callback) => {
            callback(null, `data/${folder}/`);
        },

        filename: (r, file, callback) => {
            callback(null, file.originalname);
        }
    });

    const upload = multer({
        storage: storage
    });

    return upload.single(fileType);
}


/**
 * Run the image processor Python script.
 * @function
 * @memberof module:UtilityModule
 * @name runImageProcessor
 * @throws {Error} If there is an error during execution.
 * @returns {void}
 * @example
 * // Execute the image processor
 * runImageProcessor();
 *
 * @description
 * This function runs the image processor Python script specified in the APP_CONFIG.
 * It utilizes the child_process.exec method to execute the script and captures
 * any errors, standard output, or standard error messages. If an error occurs
 * during execution, it is thrown to indicate failure. The captured output is logged
 * to the console.
 */
function runImageProcessor() {
    exec(APP_CONFIG.IMAGE_PROCESSOR_COMMAND, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            throw error; //Throw an error to indicate failure
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(`Output: ${stdout}`);
    });
}


////////////////////////////////////////////////////////////////////////////
//File handlers
////////////////////////////////////////////////////////////////////////////

/**
 * Read the content of a JSON file and parse it into a JavaScript object.
 *
 * @function
 * @memberof module:UtilityModule
 * @name readJSONFile
 * @param {string} filePath - The path to the JSON file.
 * @param {Function} [callback=() => {}] - A callback function to be executed after reading the file.
 * @throws {Error} If there is an error reading or parsing the JSON file.
 * @returns {void}
 * @example
 * // Read data from a JSON file and log it
 * readJSONFile('/path/to/file.json', (dataObject) => {
 *   console.log('Read data:', dataObject);
 * });
 */
function readJSONFile(filePath, callback = () => {}) {
    try {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                callback(err, null);
                return;
            }
            console.log('filePath2', filePath)
            const dataObject = JSON.parse(data || '[]');
            callback(dataObject);
        });
    } catch (err) {
        console.log('Error reading file: ', err)
    }
}

/**
 * Write data to a JSON file, formatting the JSON content for readability.
 *
 * @function
 * @memberof module:UtilityModule
 * @name writeJSONFile
 * @param {string} filePath - The path to the JSON file.
 * @param {Object} data - The data to be written to the file.
 * @throws {Error} If there is an error writing the JSON file.
 * @returns {void}
 * @example
 * // Create sample JSON data
 * const jsonData = { key: 'value' };
 * // Write JSON data to a file
 * writeJSONFile('/path/to/file.json', jsonData);
 */
function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 0), 'utf8');
    } catch (error) {
        console.error(`Error writing JSON file (${filePath}):`, error);
    }
}



////////////////////////////////////////////////////////////////////////////
//FORMAT THE DATA, MERGE AND SAVE TO A FILE
////////////////////////////////////////////////////////////////////////////

/**
 * Get and convert image data from the data file.
 *
 * @function
 * @memberof module:UtilityModule
 * @name convertImageData
 * @returns {Array<Object>} An array of objects containing converted image data.
 * @example
 * // Get and convert image data
 * const convertedData = convertImageData();
 * console.log(convertedData);
 */
function convertImageData() {
    let imageData = getImages(),
        result = [];

    //Format images data
    imageData.forEach(row => {
        let imageName = row.image,
            timestamp = extractTimestamp(imageName);

        let data = {
            time: timestamp,
            file: imageName,
            text: row.text
        }

        let exist = result.find(img => img.text === data.text);
        if (timestamp != null && !exist) result.push(data);
    })

    return result;
}


/**
 * Convert audio data and extract audio text, detected experience, and sentiments.
 *
 * @function
 * @memberof module:UtilityModule
 * @name convertAudioData
 * @param {Array<Object>} audioData - Array of audio data objects.
 * @returns {Object} Object containing audio data, experience data, and sentiments.
 * @example
 * // Convert audio data and extract relevant information
 * const audioData = [...]; // Your audio data array
 * const { audioObject, experienceObject, sentiments } = convertAudioData(audioData);
 * console.log(audioObject, experienceObject, sentiments);
 */
function convertAudioData(audioData) {
    let audioObject = [],
        experienceObject = [],
        sentiments = [];

    audioData.forEach(audioSection => {
        let data = {
            time: audioSection.timestamp,
            file: audioSection.audio_file,
            text: audioSection.text,
            sentiment: audioSection.text_emotion
        }

        let des = {
            time: audioSection.timestamp,
            file:  audioSection.audio_file,
            text: audioSection.experienceDetected,
        }

        sentiments.push({
            time: audioSection.timestamp,
            file:  audioSection.audio_file,
            sentiment: audioSection.text_emotion
        })

        experienceObject.push(des);
        audioObject.push(data);

    });

    experienceObject = experienceObject.filter(el => el.text != null);

    return {
        audioObject,
        experienceObject,
        sentiments
    };
}


/**
 * Convert GSR (Galvanic Skin Response) data and update the sentiments array.
 *
 * @function
 * @memberof module:UtilityModule
 * @name convertGSRData
 * @param {Array<Object>} gsrData - Array of GSR data objects.
 * @param {Array<Object>} sentiments - Array of sentiment data to be updated.
 * @returns {Array<Object>} Array of formatted GSR data objects.
 * @example
 * // Convert GSR data and update sentiments array
 * const gsrData = [...]; // Your GSR data array
 * const sentiments = [...]; // Your sentiments array
 * const gsrObject = convertGSRData(gsrData, sentiments);
 * console.log(gsrObject);
 */
function convertGSRData(gsrData, sentiments) {
    let gsrObject = [];

    //Format the GSR datax
    gsrData.forEach(gsrSection => {
        let data = {
            time: gsrSection.startTime,
            section: gsrSection.gsr_section,
            sentiment: gsrSection.emotion_state
        }

        sentiments.push({
            time: gsrSection.startTime,
            sentiment: gsrSection.emotion_state
        })

        gsrObject.push(data);
    })

    return gsrObject;
}


/**
 * Create the final output file by merging and formatting various data sources.
 *
 * @function
 * @memberof module:UtilityModule
 * @name insertDataToFinalFile
 * @example
 * // Create the final output file
 * insertDataToFinalFile();
 */
function insertDataToFinalFile() {
    checkSessionFilePeriod(() => {
        //Read Audio text data
        readJSONFile(FILE_PATHS.AUDIO_TEXT_FILE_PATH, (audioData) => {
            let imageObject = convertImageData(); //replace the code bellow

            let {
                audioObject,
                experienceObject,
                sentiments
            } = convertAudioData(audioData);
            let eegObject = getAllEEGFilesContent();

            //Read GSR data
            readJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, (gsrData) => {
                let gsrObject = convertGSRData(gsrData, sentiments);

                //Read user data file
                readJSONFile(FILE_PATHS.USER_FILE_PATH, (user) => {
                    readJSONFile(FILE_PATHS.IMAGE_LABELS_FILE_PATH, (imageLabels) => {
                        //Create the final data format
                        const merged = {
                            head: {
                                time: user.sessionStart,
                                user: user.currentUser,
                                version: user.version,
                                duration: user.duration,
                                blockchain: user.blockchain
                            },
                            data: {
                                gsr: gsrObject,
                                eeg: eegObject,
                                audio: audioObject,
                                des: experienceObject,
                                overallSentiment: sentiments,
                                image: {
                                    text: imageObject,
                                    labels: imageLabels
                                }
                            }
                        }

                        writeJSONFile(SERVER_CONFIG.current_session_file, merged); // Write the merged data to a new file
                        console.log(`Merged data written to ${SERVER_CONFIG.current_session_file}`);
                    })
                })
            })
        })
    })
}

/**
 * Extract the timestamp from a string.
 *
 * @function
 * @memberof module:UtilityModule
 * @name extractTimestamp
 * @param {string} fromString - The input string containing the timestamp.
 * @returns {number|null} Extracted timestamp as a number or null if not found.
 * @example
 * // Extract timestamp from a string
 * const timestamp = extractTimestamp("Day 1: 12345");
 * console.log(timestamp); // Output: 12345
 */
function extractTimestamp(fromString) {
    let match = fromString.match(/(\d+)/);

    return match ? parseInt(match[0]) : null;
}


/**
 * Runs the final file content update at regular intervals.
 *
 * @function
 * @memberof module:UtilityModule
 * @name runSessionFileUpdatingInterval
 * @example
 * // Run the final file content update at regular intervals
 * runSessionFileUpdatingInterval();
 */
function runSessionFileUpdatingInterval() {
    console.log('Running the session file controls interval.')
    sessionFileUpdatingIntervalId = setInterval(() => insertDataToFinalFile(), 20 * 60 * 100);
}

/**
 * Stops the session file updating interval.
 * 
 * @function stopSessionFileUpdatingInterval
 * @returns {void}
 */
function stopSessionFileUpdatingInterval() {
    clearInterval(sessionFileUpdatingIntervalId);
}

/**
 * Update the session file when the time is more than the defined time in minutes.
 *
 * @function
 * @memberof module:UtilityModule
 * @name checkSessionFilePeriod
 * @param {Function} callback - Callback function to be executed after the update.
 * @example
 * // Update the session file and execute a callback function
 * checkSessionFilePeriod(() => {
 *    // Your callback logic here
 * });
 */
function checkSessionFilePeriod(callback) {
    try {
        //Read user.json file
        readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
            let { sessionStart, sessionFile } = userObject; //Extract sessionStart and sessionFile

            //Calculate the difference between current time and sessionStart in milliseconds
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - sessionStart;

            //Check if the difference is more than minutes (minutes * 60 * 1000 milliseconds)
            if (sessionStart == '' || sessionFile == '' || timeDifference > SERVER_CONFIG.OUTPUT_LENGTH * 60 * 1000) {
                createNewSession(currentTime, userObject, callback);
            } else {
                SERVER_CONFIG.current_session_file = FILE_PATHS.SESSION_FOLDER + sessionFile; //Difference is less than setted time
                callback();

                console.log("Session Updated!")
            }
        });
    } catch (error) {
        console.error('Error updating the session file:', error);
    }
}


/**
 * Creates a new session.
 *
 * @function
 * @memberof module:UtilityModule
 * @name createNewSession
 * @param {number} currentTime - Current time in milliseconds.
 * @param {object} userObject - User object containing session details.
 * @param {Function} callback - Callback function to be executed after the creation.
 * @example
 * // Create a new session and execute a callback function
 * createNewSession(currentTime, userObject, () => {
 *    // Your callback logic here
 * });
 */
function createNewSession(currentTime, userObject, callback) {
    getTheHash((hash) => {
        let sessionStart = '';
        let sessionFile  = '';
        //Create a new JSON file with the name "session" + current timestamp
        const newFileName = `session_${currentTime}.json`;
        const newSessionFilename = FILE_PATHS.SESSION_FOLDER + newFileName;
        writeJSONFile(newSessionFilename, {});

        //Assign the created filename to current_session file
        SERVER_CONFIG.current_session_file = newSessionFilename;
        console.log(`New session file created: ${SERVER_CONFIG.current_session_file}`);

        sessionStart = currentTime;
        sessionFile = newFileName;

        let blockchain = {
            authority: "Evolwe",
            hash: hash
        };

        let concatinatedOBJ = Object.assign({}, userObject, {
            sessionStart,
            sessionFile,
            blockchain
        });

        writeJSONFile(FILE_PATHS.USER_FILE_PATH, concatinatedOBJ);
        emptyAllFiles();
        callback();
    });
}


/**
 * Get image data from a CSV file.
 *
 * @function
 * @memberof module:UtilityModule
 * @name getImages
 * @returns {Array} Parsed data containing image information.
 * @throws {Error} Throws an error if there's an issue reading or parsing the CSV file.
 * @example
 * const imageArray = getImages();
 * console.log(imageArray);
 */
function getImages() {
    const imageCsv = fs.readFileSync(FILE_PATHS.IMAGE_TEXT_FILE_PATH, 'utf8'); //Read the image text csv file
    const parsedData = Papa.parse(imageCsv, {
        header: true
    }); //Parse CSV data    

    return parsedData.data;
}


/**
 * Hash the given data using SHA-256 algorithm.
 *
 * @function
 * @memberof module:UtilityModule
 * @name hashTheData
 * @param {Object} data - The data to be hashed.
 * @returns {string} The SHA-256 hash of the data.
 * @example
 * const dataToHash = { key: 'value' };
 * const hashedData = hashTheData(dataToHash);
 * console.log(hashedData);
 */
function hashTheData(data) {
    // Convert data to JSON string
    let jsonData = JSON.stringify(data);

    // Create a SHA-256 hash of the JSON string
    const hash = crypto.createHash('sha256').update(jsonData).digest('hex');

    return hash;
}


/**
 * Get the hash from the cloud.
 *
 * @function
 * @memberof module:UtilityModule
 * @name getTheHash
 * @param {Function} callback - The callback function to handle the retrieved hash.
 * @throws Will throw an error if there is an issue reading JSON files or making the API request.
 * @example
 * getTheHash((rehashedValue) => {
 *    console.log('Rehashed value:', rehashedValue);
 * });
 */
function getTheHash(callback) {
    // Read user.json file
    readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
        let { sessionFile, currentUser } = userObject;

        // Read session file
        readJSONFile(`./data/session_files/${sessionFile}`, (session) => {
            // Hash the session data
            let hash = hashTheData(session);

            // Make API request to get the rehashed value
            fetch("https://olkjccryjj.execute-api.eu-west-2.amazonaws.com/prod/rehash", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hash: hash,
                    user: currentUser
                })
            }).then(res => res.json()).then(data => {
                // Invoke the callback with the rehashed value
                callback(data.rehashedValue);
            })
        })
    })
}


/**
 * Read the JSONL file and return the content and session IDs.
 *
 * @function
 * @memberof module:UtilityModule
 * @name getJSONLFileContent
 * @param {string} filePath - The path to the JSONL file.
 * @returns {Object} An object containing the converted data.
 * @throws Will throw an error if there is an issue reading the file or parsing JSON.
 * @example
 * const filePath = '/path/to/data.jsonl';
 * const { convertedData } = getJSONLFileContent(filePath);
 * console.log('Converted Data:', convertedData);
 */
function getJSONLFileContent(filePath) {
    try {
        //Convert Data
        const fileContent = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '')
        let convertedData = fileContent.map(item => JSON.parse(item));

        convertedData.forEach(element => {
            delete element.sid;
        });

        return convertedData;

    } catch (error) {
        console.log('Error reading JSONL file: ', error);
        return [];
    }
}


/**
 * Get content from all EEG files and organize it by type.
 *
 * @function
 * @memberof module:UtilityModule
 * @name getAllEEGFilesContent
 * @returns {Object} An object containing EEG data organized by type and unique session IDs.
 * @throws Will throw an error if there is an issue reading the files or parsing JSON.
 * @example
 * const eegData = getAllEEGFilesContent();
 * console.log('EEG Data:', eegData);
 */
function getAllEEGFilesContent() {
    let finalEEGdata = {
    }

    FILE_PATHS.EEG_FILES_LIST.forEach(file => {
        let type = undefined, data = [];
        let convertedData = getJSONLFileContent(file);

        // Determine the type of EEG file based on its name
        if (file.includes('facial')) {
            type = "expression";

            convertedData.forEach(element => {
                let elObject = {
                    time: element.time,
                    eyeAction: element.fac[0],
                    upperFace: {
                        action: element.fac[1],
                        power: element.fac[2]
                    },
                    lowerFace: {
                        action: element.fac[3],
                        power: element.fac[4]
                    }
                }

                data.push(elObject);
            });
        } else if (file.includes('performance')) {
            type = "cognition";

            convertedData.forEach(element => {
                if(element.met[0]) {
                    let elObject = {
                        time: element.time,
                        engagement: element.met[1],
                        excitement: element.met[3],
                        stress: element.met[5],
                        longExcitement: element.met[6],
                        relaxation: element.met[8],
                        interest: element.met[10],
                        focus: element.met[12],
                    }
    
                    data.push(elObject);
                }   
            });
        } else if (file.includes('sensors')) {
            type = "frequencyAnalysis";

            convertedData.forEach(element => {
                let elObject = {
                    time: element.time,
                    bandPower: {
                        "AF3/theta": element.pow[0],"AF3/alpha": element.pow[1],"AF3/betaL": element.pow[2],"AF3/betaH": element.pow[3],"AF3/gamma": element.pow[4],
                        "F7/theta": element.pow[5],"F7/alpha": element.pow[6],"F7/betaL": element.pow[7],"F7/betaH": element.pow[8],"F7/gamma": element.pow[9],
                        "F3/theta": element.pow[10],"F3/alpha": element.pow[11],"F3/betaL": element.pow[12],"F3/betaH": element.pow[13],"F3/gamma": element.pow[14],
                        "FC5/theta": element.pow[15],"FC5/alpha": element.pow[16],"FC5/betaL": element.pow[17],"FC5/betaH": element.pow[18],"FC5/gamma": element.pow[19],
                        "T7/theta": element.pow[20],"T7/alpha": element.pow[21],"T7/betaL": element.pow[22],"T7/betaH": element.pow[23],"T7/gamma": element.pow[24],
                        "P7/theta": element.pow[25],"P7/alpha": element.pow[26],"P7/betaL": element.pow[27],"P7/betaH": element.pow[28],"P7/gamma": element.pow[29],
                        "O1/theta": element.pow[30],"O1/alpha": element.pow[31],"O1/betaL": element.pow[32],"O1/betaH": element.pow[33],"O1/gamma": element.pow[34],
                        "O2/theta": element.pow[35],"O2/alpha": element.pow[36],"O2/betaL": element.pow[37],"O2/betaH": element.pow[38],"O2/gamma": element.pow[39],
                        "P8/theta": element.pow[40],"P8/alpha": element.pow[41],"P8/betaL": element.pow[42],"P8/betaH": element.pow[43],"P8/gamma": element.pow[44],
                        "T8/theta": element.pow[45],"T8/alpha": element.pow[46],"T8/betaL": element.pow[47],"T8/betaH": element.pow[48],"T8/gamma": element.pow[49],
                        "FC6/theta": element.pow[50],"FC6/alpha": element.pow[51],"FC6/betaL": element.pow[52],"FC6/betaH": element.pow[53],"FC6/gamma": element.pow[54],
                        "F4/theta": element.pow[55],"F4/alpha": element.pow[56],"F4/betaL": element.pow[57],"F4/betaH": element.pow[58],"F4/gamma": element.pow[59],
                        "F8/theta": element.pow[60],"F8/alpha": element.pow[61],"F8/betaL": element.pow[62],"F8/betaH": element.pow[63],"F8/gamma": element.pow[64],
                        "AF4/theta": element.pow[65],"AF4/alpha": element.pow[66],"AF4/betaL": element.pow[67],"AF4/betaH": element.pow[68],"AF4/gamma": element.pow[69]
                    }
                }

                data.push(elObject);
            });
        } else if (file.includes('raw')) {
            type = "rawEEG";

            convertedData.forEach(element => {
                let elObject = {
                time: element.time,
                AF3: element.eeg[2],
                F7: element.eeg[3],
                F3: element.eeg[4],
                FC5: element.eeg[5],
                T7: element.eeg[6],
                P7: element.eeg[7],
                O1: element.eeg[8],
                O2: element.eeg[9],
                P8: element.eeg[10],
                T8: element.eeg[11],
                FC6: element.eeg[12],
                F4: element.eeg[13],
                F8: element.eeg[14],
                AF4: element.eeg[15]
                }

                data.push(elObject);
            
            });
        }

        // Collect and organize data by type
        finalEEGdata[type] = data;  
});
  
    return finalEEGdata;
}


//Function that will check the server enviroment and create all the neccessary folders and files
function checkEnviroment() {
    console.log('Setting the Enviroment...')

    const enviromentFolders = [
        FILE_PATHS.RAW_IMAGES,
        FILE_PATHS.DATA_FOLDER, 
        FILE_PATHS.AUDIO_FOLDER, 
        FILE_PATHS.EEG_FOLDER, 
        FILE_PATHS.GSR_FOLDER, 
        FILE_PATHS.IMAGE_FOLDER, 
        FILE_PATHS.USER_FOLDER, 
        FILE_PATHS.SESSION_FOLDER, 
        FILE_PATHS.RAW_AUDIO_FOLDER_PATH, 
        FILE_PATHS.PROCESSED_IMAGES, 
        FILE_PATHS.CONVERTED_AUDIO, 
        FILE_PATHS.GSR_CLIENT_GRAPH_FOLDER, 
        FILE_PATHS.GSR_TRAINING_FOLDER,
        FILE_PATHS.IMAGE_TEXT_FOLDER
    ];

    const enviromentFiles = [
        FILE_PATHS.AUDIO_TEXT_FILE_PATH, 
        ...FILE_PATHS.EEG_FILES_LIST, 
        FILE_PATHS.GSR_SECTIONS_JSON_PATH, 
        FILE_PATHS.USER_FILE_PATH,
        FILE_PATHS.IMAGE_LABELS_FILE_PATH
    ]

    enviromentFolders.forEach(path => {
        fs.access(path, fs.constants.F_OK, (err) => {
            if(err) {
                fs.mkdir(path, {recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating folder:', err);
                    }
                })
            }
        })
    });

    enviromentFiles.forEach(filePath => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if(err) {
                fs.writeFile(filePath, JSON.stringify([]), (err) => {
                    if (err) {
                        console.error('Error creating file:', err);
                    } else {
                        console.log('File created successfully');
                    }
                });
            }
        })
    });



}

//Exports
export {
    getAllEEGFilesContent,
    getJSONLFileContent,
    runImageProcessor,
    saveData,
    runSessionFileUpdatingInterval,
    stopSessionFileUpdatingInterval,
    insertDataToFinalFile,
    readJSONFile,
    extractTimestamp,
    getTheHash,
    writeJSONFile,
    checkEnviroment
}