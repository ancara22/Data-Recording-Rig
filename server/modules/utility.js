import multer, { diskStorage } from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import Papa from 'papaparse';
import crypto from 'crypto';
import { FILE_PATHS, SERVER_CONFIG, APP_CONFIG } from "./server_settings.js";
import { emptyFiles } from "./file_cleaners.js";


//Save data to a file
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

//Run image processor python script, image_processor
function runImageProcessor() {
    exec(APP_CONFIG.IMAGE_PROCESSOR_COMMAND, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
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

//Read the json file
function readJSONFile(filePath, callback = () => {}) {
    try {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                callback(err, null);
                return;
            }

            const dataObject = JSON.parse(data);
            callback(dataObject);
        });
    } catch (err) {
        console.log('Error reading file: ', err)
    }

}

//Write json file
function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing JSON file (${filePath}):`, error);
    }
}


////////////////////////////////////////////////////////////////////////////
//FORMAT THE DATA, MERGE AND SAVE TO A FILE
////////////////////////////////////////////////////////////////////////////

//Create finnal output file
function insertDataToFinalFile() {
   

    updateTheSessionFIle(() => {
        //Read Audio text data
        readJSONFile(FILE_PATHS.AUDIO_TEXT_FILE_PATH, (audioData) => {
            let audioObject = [],
                imageObject = [],
                experienceObject = [],
                imagesData = getImages(),
                sentiments = {};

            //Format images data
            imagesData.forEach(row => {
                let imageName = row.image,
                    timestamp = extractTimestamp(imageName);

                let data = { 
                    [timestamp]: imageName, 
                    text: row.text 
                }

                let exist = imageObject.find(img => img.text === data.text);

                if (timestamp != null && !exist) imageObject.push(data);
            })

            //Format the audio data
            audioData.forEach(audioSection => {
                let data = {
                    [audioSection.timestamp]: audioSection.audio_file,
                    text: audioSection.text,
                    sentiment: audioSection.sentiment
                }

                let des = {
                    [audioSection.timestamp]: audioSection.audio_file,
                    text: audioSection.experienceDetected,
                }

                sentiments.push({
                    [audioSection.timestamp]: audioSection.audio_file,
                    sentiment: audioSection.sentiment
                })

                experienceObject.push(des)
                audioObject.push(data);
            });

            //Read GSR data
            readJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, (gsrData) => {
                let gsrObject = [], eegObject = [];

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

//Extract timestamp from the string
function extractTimestamp(fromString) {
    let match = fromString.match(/(\d+)/);

    return match ? parseInt(match[0]) : null;
}

//Run the final file content update by interval
function updateTheFinalFile() {
    setInterval(() => insertDataToFinalFile(), 3 * 60 * 100);
}

//Update the session file when the time is more than 30 min
function updateTheSessionFIle(callback) {
    try {
        //Read user.json file
        readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
            let { sessionStart, sessionFile } = userObject;  //Extract sessionStart and sessionFile

            //Calculate the difference between current time and sessionStart in milliseconds
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - sessionStart;

            //Check if the difference is more than minutes (minutes * 60 * 1000 milliseconds)
            if (sessionStart == '' || sessionFile == '' || timeDifference > SERVER_CONFIG.OUTPUT_LENGTH * 60 * 1000) {
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
                        hash
                    }

                    writeJSONFile(FILE_PATHS.USER_FILE_PATH, { ...userObject, sessionStart, sessionFile, blockchain });
                    emptyFiles();

                    callback();
                });
            } else {
                SERVER_CONFIG.current_session_file = FILE_PATHS.SESSION_FOLDER + sessionFile; //Difference is less than 30 minutes
                callback();

                console.log("Session Updated!")
            }
        });
    } catch (error) {
        console.error('Error updating the session file:', error);
    }
}

//Get image data from the file
function getImages() {
    const imageCsv = fs.readFileSync(FILE_PATHS.IMAGE_TEXT_FILE_PATH, 'utf8'); //Read the image text csv file
    const parsedData = Papa.parse(imageCsv, { header: true }); //Parse CSV data    

    return parsedData.data;
}

//Hash the data
function hashTheData(data) {
    let jsonData = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(jsonData).digest('hex'); 

    return hash;
}

//Get the Hash from the cloud
function getTheHash(callback) {
    readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
        let { sessionFile, currentUser } = userObject;

        readJSONFile(`./data/session_files/${sessionFile}`, (session) => {
            let hash = hashTheData(session);

            fetch("https://olkjccryjj.execute-api.eu-west-2.amazonaws.com/prod/rehash", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hash: hash,
                    user: currentUser
                })
            }).then(res => res.json()
            ).then(data => {
                callback(data.rehashedValue);
            })
        })
    })
}

export {
    runImageProcessor,
    saveData,
    updateTheFinalFile,
    insertDataToFinalFile,
    readJSONFile,
    extractTimestamp,
    getTheHash,
    writeJSONFile
}
