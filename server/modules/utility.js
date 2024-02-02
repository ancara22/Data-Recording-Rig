import multer, { diskStorage } from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import Papa from 'papaparse';
import crypto from 'crypto';
import { FILE_PATHS, SERVER_CONFIG, APP_CONFIG } from "./server_settings.js";
import { emptyAllFiles } from "./file_cleaners.js";

/**
 * Middleware to handle file uploads and save them to a specified folder.
 *
 * @function
 * @memberof module:utility
 * @param {string} folder - The folder where the data will be stored.
 * @param {string} fileType - The type of file being uploaded.
 * @returns {Function} Middleware function for handling file uploads.
 * @throws {Error} Throws an error if there is an issue with file storage.
 *
 * @example
 * const uploadMiddleware = saveData('uploads', 'image');
 * app.post('/upload', uploadMiddleware, (req, res) => {
 *   // Handle file upload
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
 *
 * @function
 * @memberof module:utility
 * @name runImageProcessor
 * @throws {Error} If there is an error during execution.
 * @returns {void}
 * @example
 * runImageProcessor();
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
 * @memberof module:utility
 * @name readJSONFile
 * @param {string} filePath - The path to the JSON file.
 * @param {Function} [callback=() => {}] - A callback function to be executed after reading the file.
 * @throws {Error} If there is an error reading or parsing the JSON file.
 * @returns {void}
 * @example
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
 * @memberof module:utility
 * @name writeJSONFile
 * @param {string} filePath - The path to the JSON file.
 * @param {Object} data - The data to be written to the file.
 * @throws {Error} If there is an error writing the JSON file.
 * @returns {void}
 * @example
 * const jsonData = { key: 'value' };
 * writeJSONFile('/path/to/file.json', jsonData);
 */
function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
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
 * @memberof module:utility
 * @name convertImageData
 * @returns {Array<Object>} An array of objects containing converted image data.
 * @example
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
            [timestamp]: imageName,
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
 * @memberof module:utility
 * @name convertAudioData
 * @param {Array<Object>} audioData - Array of audio data objects.
 * @returns {Object} Object containing audio data, experience data, and sentiments.
 * @example
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
            [audioSection.timestamp]: audioSection.audio_file,
            text: audioSection.text,
            sentiment: audioSection.text_emotion
        }

        let des = {
            [audioSection.timestamp]: audioSection.audio_file,
            text: audioSection.experienceDetected,
        }

        sentiments.push({
            [audioSection.timestamp]: audioSection.audio_file,
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
 * @memberof module:utility
 * @name convertGSRData
 * @param {Array<Object>} gsrData - Array of GSR data objects.
 * @param {Array<Object>} sentiments - Array of sentiment data to be updated.
 * @returns {Array<Object>} Array of formatted GSR data objects.
 * @example
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
            start: gsrSection.startTime,
            end: gsrSection.endTime,
            section: gsrSection.gsr_section,
            sentiment: gsrSection.emotion_state
        }

        sentiments.push({
            [gsrSection.startTime]: gsrSection.endTime,
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
 * @memberof module:utility
 * @name insertDataToFinalFile
 * @example
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
                    //Create the final data format
                    const merged = {
                        head: {
                            [user.sessionStart]: user.sessionFile,
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
                            sentiment: sentiments,
                            image: imageObject
                        }
                    }

                    writeJSONFile(SERVER_CONFIG.current_session_file, merged); // Write the merged data to a new file
                    console.log(`Merged data written to ${SERVER_CONFIG.current_session_file}`);
                })
            })
        })
    })
}


/**
 * Extract the timestamp from a string.
 *
 * @function
 * @memberof module:utility
 * @name extractTimestamp
 * @param {string} fromString - The input string containing the timestamp.
 * @returns {number|null} Extracted timestamp as a number or null if not found.
 * @example
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
 * @memberof module:utility
 */
function runSessionFileUpdatingInterval() {
    setInterval(() => insertDataToFinalFile(), 1 * 60 * 100);
}


/**
 * Update the session file when the time is more than defined time minutes.
 *
 * @function
 * @memberof module:utility
 * @param {Function} callback - Callback function to be executed after the update.
 */
function checkSessionFilePeriod(callback) {
    try {
        //Read user.json file
        readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
            let { sessionStart, sessionFile } = userObject; //Extract sessionStart and sessionFile

            //Calculate the difference between current time and sessionStart in milliseconds
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - sessionStart;

            let shouldCreateNewSession = () => {
                return (sessionStart == '' || sessionFile == '' || timeDifference > SERVER_CONFIG.OUTPUT_LENGTH * 60 * 1000)
            }

            //Check if the difference is more than minutes (minutes * 60 * 1000 milliseconds)
            if (shouldCreateNewSession) {
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
 * @memberof module:utility
 * @param {number} currentTime - Current time in milliseconds.
 * @param {object} userObject - User object containing session details.
 * @param {Function} callback - Callback function to be executed after the creation.
 */
function createNewSession(currentTime, userObject, callback) {
    getTheHash((hash) => {
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
 * @memberof module:utility
 * @returns {Array} Parsed data containing image information.
 * @throws {Error} Throws an error if there's an issue reading or parsing the CSV file.
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
 * @memberof module:utility
 * @param {Object} data - The data to be hashed.
 * @returns {string} The SHA-256 hash of the data.
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
 * @memberof module:utility
 * @param {Function} callback - The callback function to handle the retrieved hash.
 * @throws Will throw an error if there is an issue reading JSON files or making the API request.
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
 * @memberof module:utility
 * @param {string} filePath - The path to the JSONL file.
 * @returns {Object} An object containing the converted data and session IDs.
 * @throws Will throw an error if there is an issue reading the file or parsing JSON.
 */
function getJSONLFileContent(filePath) {
    let sids = [],
        previeusSession = undefined;

    try {
        //Convert Data
        const fileContent = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '')
        const convertedData = fileContent.map(item => JSON.parse(item));

        convertedData.forEach(element => {
            if (previeusSession == undefined) {
                previeusSession = element.sid;
                sids.push(previeusSession);
            } else if (element.sid != previeusSession) {
                previeusSession = element.sid;
                sids.push(previeusSession);
            }

            delete element.sid;
        });

        return {
            convertedData,
            sids
        };

    } catch (error) {
        console.log('Error reading JSONL file: ', error);
        return {
            convertedData: [],
            sids: []
        };
    }
}


/**
 * Get content from all EEG files and organize it by type.
 *
 * @function
 * @memberof module:utility
 * @returns {Object} An object containing EEG data organized by type and unique session IDs.
 * @throws Will throw an error if there is an issue reading the files or parsing JSON.
 */
function getAllEEGFilesContent() {
    let sessionIDs = [];

    let finalEEGdata = {
        sessionIds: [],
        expression: [],
        performance: [],
        sensors: [],
        row: []
    }

    FILE_PATHS.EEG_FILES_LIST.forEach(file => {
        let type = undefined;

        // Determine the type of EEG file based on its name
        if (file.includes('facial')) {
            type = "expression";
        } else if (file.includes('performance')) {
            type = "performance";
        } else if (file.includes('sensors')) {
            type = "sensors";
        } else if (file.includes('row')) {
            type = "row";
        }

        let { convertedData, sids } = getJSONLFileContent(file);

        // Collect session IDs and organize data by type
        sessionIDs.push(...sids);
        finalEEGdata[type] = convertedData;
    });

    // Remove duplicate session IDs using a Set
    let unicIds = new Set(sessionIDs);
    finalEEGdata.sessionIds = [...unicIds];

    return finalEEGdata;
}


//Exports
export {
    getAllEEGFilesContent,
    getJSONLFileContent,
    runImageProcessor,
    saveData,
    runSessionFileUpdatingInterval,
    insertDataToFinalFile,
    readJSONFile,
    extractTimestamp,
    getTheHash,
    writeJSONFile
}