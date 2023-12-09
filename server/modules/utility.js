import multer, { diskStorage } from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import wav from 'wav';
import Papa from 'papaparse';
import { FILE_PATHS, SERVER_CONFIG } from "./server_settings.js";


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

//Concatinate more audio files
function concatinateWavFiles(wavFile) {
    let fileEndTimestamp = extractTimestamp(wavFile),
        filePath = FILE_PATHS.ROW_AUDIO_FOLDER_PATH + "audio_" + fileEndTimestamp + ".wav";

    //Define the writer
    const writer = new wav.FileWriter(filePath, {
        channels: 1,
        sampleRate: 44100,
        bitDepth: 16
    });

    //Define the reader and handle the excetions
    const reader = new wav.Reader();

    reader.on('format', (format) => {
        if (!writer._writeState)
            writer.pipe(fs.createWriteStream(FILE_PATHS.USER_INTRO_AUDIO_PATH, { flags: 'a' }));
    });

    reader.on('error', (er) => console.log('first', er))

    fs.createReadStream(wavFile).pipe(reader).pipe(writer, { end: false }); //Concatinate the files

    writer.end(); //End the writing
}

//Run image processor python script, image_processor
function runImageProcessor() {
    exec(SERVER_CONFIG.IMAGE_PROCESSOR_COMMAND, (error, stdout, stderr) => {
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
    updateTheSessionFIle();

    //Read Audio text data
    readJSONFile(FILE_PATHS.AUDIO_TEXT_FILE_PATH, (audioData) => {
        let audioObject = [],
            imageObject = [],
            imagesData = getImages();

        //Format images data
        imagesData.forEach(row => {
            let imageName = row.image,
                timestamp = extractTimestamp(imageName);

            let data = { 
                [timestamp]: imageName, 
                text: row.text 
            }

            if (timestamp != null) imageObject.push(data);
        })

        //Format the audio data
        audioData.forEach(audioSection => {
            let data = {
                [audioSection.timestamp]: audioSection.audio_file,
                text: audioSection.text,
                experience: audioSection.experienceDetected,
                sentiment: audioSection.sentiment
            }

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
                        image: imageObject
                    }
                }

                writeJSONFile(SERVER_CONFIG.current_session_file, merged); // Write the merged data to a new file
                console.log(`Merged data written to ${SERVER_CONFIG.current_session_file}`);
            })
        });
    });
}

//Extract timestamp from the string
function extractTimestamp(fromString) {
    let match = fromString.match(/(\d+)/);

    return match ? parseInt(match[0]) : null;
}

//Run the final file content update by interval
function updateTheFinalFile() {
    setInterval(() => insertDataToFinalFile(), 3 * 60 * 1000);
}

//Update the session file when the time is more than 30 min
function updateTheSessionFIle() {
    try {
        //Read user.json file
        readJSONFile(FILE_PATHS.USER_FILE_PATH, (userObject) => {
            let { sessionStart, sessionFile } = userObject;  //Extract sessionStart and sessionFile

            //Calculate the difference between current time and sessionStart in milliseconds
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - sessionStart;

            //Check if the difference is more than 30 minutes (30 * 60 * 1000 milliseconds)
            if (sessionStart == '' || sessionFile == '' || timeDifference > SERVER_CONFIG.OUTPUT_LENGTH * 60 * 1000) {
                //Create a new JSON file with the name "session" + current timestamp
                const newFileName = `session_${currentTime}.json`;
                const newSessionFilename = FILE_PATHS.SESSION_FOLDER + newFileName;
                writeJSONFile(newSessionFilename, JSON.stringify([]));

                //Assign the created filename to current_session file
                SERVER_CONFIG.current_session_file = newSessionFilename;
                console.log(`New session file created: ${SERVER_CONFIG.current_session_file}`);

                sessionStart = currentTime;
                sessionFile = newFileName;

                writeJSONFile(FILE_PATHS.USER_FILE_PATH, { ...userObject, sessionStart, sessionFile });
                emptyFiles();
            } else {
                SERVER_CONFIG.current_session_file = FILE_PATHS.SESSION_FOLDER + sessionFile; //Difference is less than 30 minutes
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



export {
    runImageProcessor,
    saveData,
    concatinateWavFiles,
    updateTheFinalFile,
    insertDataToFinalFile,
    readJSONFile,
}
