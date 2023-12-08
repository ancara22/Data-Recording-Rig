import multer, { diskStorage }      from 'multer';
import { Client }                   from 'ssh2';
import fs, { readdir, unlink }      from 'fs';
import { join }                     from 'path';
import { exec }                     from 'child_process';
import wav                          from 'wav';
import Papa                         from 'papaparse';
import util, { promisify }          from "util";
import { FILE_PATHS, RIG_CONFIG, SERVER_CONFIG }   from "./server_settings.js";


let current_session_file = "";   //Current session file name
let isDataUpdated = false;       //To update the GSR session


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

    const upload = multer({ storage: storage });
    return upload.single(fileType);
}

//Concatinate more audio files
function concatinateWavFiles(wavFile) {
    let match = wavFile.match(/(\d+)/),
        fileEndTimestamp = match ? match[0] : null;         //The timestamp from the file name

    let filePath = FILE_PATHS.ROW_AUDIO_FOLDER_PATH + "audio_" + fileEndTimestamp + ".wav";
    

    //Define the writer
    const writer = new wav.FileWriter(filePath, {
        channels: 1,
        sampleRate: 44100,
        bitDepth: 16
    });

    //Define the reader and handle the excetions
    const reader = new wav.Reader();

    reader.on('format', (format) => {
        if (!writer._writeState) {
            writer.pipe(fs.createWriteStream(FILE_PATHS.USER_INTRO_AUDIO_PATH , { flags: 'a' }));
        }
    });

    reader.on('error', (er) => console.log('first', er))

    fs.createReadStream(wavFile).pipe(reader).pipe(writer, { end: false }); //Concatinate the files

    writer.end();  //End the writing
}


////////////////////////////////////////////////////////////////////////////
//RIG Control
////////////////////////////////////////////////////////////////////////////

//Send the connfiguration, config.ini file to the raspberry pi
function rigControl(startRig) {
    const ssh = new Client();

    //On connection ready send the configs
    ssh.on("ready", () => {
        console.log('Connection ready.')

        ssh.sftp((er, sftp) => {
            if(er) console.log("SSH connection is imposible!");

            //Copy file to the raspberry pi directory
            sftp.fastPut(FILE_PATHS.CONFIG_FILE_PATH, `/home/rig/Documents/App/main/config.ini`, (err) => {
                if (err) {
                    console.error('Error transferring the file:', err);
                    sftp.end(); 
                    ssh.end();
                    return 0;
                }

                if(startRig != 'config')  runTheRecordingApp(ssh, startRig);
            })
        
            sftp.on('close', () => ssh.end());       //Close the ssh connection
        })
    })

    handleSSHError(ssh);

    ssh.connect(RIG_CONFIG); //Start connection
}

//Execute the RIG terminal command
function executeCommand(ssh) {
    ssh.exec("python3 /home/rig/Documents/App/main/app.py", (err, stream) => {
        if (err) {
            console.error("Error running the app:", err);
            ssh.end();
            return;
        }
        
        stream.stderr.on('data', (data) => console.error('Python Script Error:', data.toString()));
    
        stream.on("close", (code, signal) => { 
            console.log("Recording process closed. Exit code:", code, "Signal:", signal);
            ssh.end();
        });
    });
}

//Run the recording app
function runTheRecordingApp(ssh, startRig) {
    //Stop all the previews processes
    ssh.exec('pkill -f python', (err, stream) => {
        const sleep = (milliseconds) => {
            return new Promise(resolve => setTimeout(resolve, milliseconds));
        };

        if(startRig == 'start') {
            sleep(1000).then(()=> {
                executeCommand(ssh);    // Run the rig recording on the raspberry pi
                runImageProcessor();    //Rund image processor
            })
        }
    }) 
}

//Handle the SSH error
function handleSSHError(ssh) {
    //On ssh connection error
    ssh.on("error", (err) => {
        if(err.code == 'ENOTFOUND') {
            console.log('SSH connection error. The RIG is Offline.')
        } else {
            console.log('SSH connection error: ', err)
        }
    })

}

//Run image processor python script, image_processor
function runImageProcessor() {
    exec(`python3 ./processors/image_processor.py`, (error, stdout, stderr) => {
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
//GSR processing
////////////////////////////////////////////////////////////////////////////

//Predict GSR section emotion
async function predictGSREmotion(inputGSR) {
    try {
        const inputGSRString = inputGSR.join(',');
        const command = `python3 ./processors/gsr_predict_emotion.py ${inputGSRString}`;

        const { stdout, stderr } = await util.promisify(exec)(command);
        const emotion = stdout.trim();

        return emotion;
    } catch(error) {
        console.error(`Error: ${error.message}`);
    }
}

//Save GSR data to a csv file/ used for graphs visualisation
function processGSRoutput(data, nr) {
    let value = parseInt(data), 
        notConnectedvalue = 600;    //600+ when the sensors are not connected
    
    if(value < notConnectedvalue) {
        //Save dat  to a csv file
        let timestamp =  Math.floor(Date.now() / 1000); 
        const data = `\n${timestamp}, ${value}`;

        let filePath = `./data/gsr/gsr_training_data/gsrData${nr}.csv`;     //Creates a file that represent the gsr section for graph visualisation

        if(nr == false) filePath = `./data/gsr/client_graph/gsr_graph.csv`;

        createFileIfNotExists(filePath , "Timestamp,GSR");

        fs.appendFile(filePath, data, "utf-8", (err) => {
            if (err) console.log(err);
            else console.log("GSR data saved: " + value);
        });
    }
}

//Insert data into 3 minuts sections All files
function insertGSRData(data, dataValue, data2) {
    let value = parseInt(dataValue),
        notConnectedvalue = 600;

    if(value < notConnectedvalue) {
        if(data.startTime == null) {
            data.startTime = Math.floor(Date.now() / 1000);
            isDataUpdated = true;
        }
        data.gsrData.push(value);
    } else {
        data.artefacts ++;
    }

    if(data.artefacts >= 3) {
        data.startTime = Math.floor(Date.now() / 1000);
        data.artefacts = 0;
    }

    processGSRoutput(dataValue, data2.fileNumb); //Creates separate files of each section/for manual lm training
    
    if(Math.floor(Date.now() / 1000) - data.startTime >= 3 * 60 && data.startTime != null && (data.gsrData).length >= 85 && isDataUpdated) {
            console.log('yess')
            data.finishTime = Math.floor(Date.now() / 1000); 
            isDataUpdated = false;

            writeSectionToCSV(data, () => {
                data2.fileNumb++;
                isDataUpdated = true;
            });  
    }
}

//Append the GSR section to the json output file 
async function writeSectionTOJSON(gsrSection) {
    readJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, (dataObject) => {
        dataObject.push(gsrSection);                                    // Append new data
        writeJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, dataObject);   // Rewrite the JSON file
    });
}

//Write gsr emotions
function writeClientGSREmotionsToCSV(data) {
    createFileIfNotExists(FILE_PATHS.CLIENT_EMOTIONS_PATH, "Emotion");

    const csvRow = `${data.startTime},${data.endTime},"${ data.emotion_state }"\n`;

    fs.appendFile(FILE_PATHS.CLIENT_EMOTIONS_PATH, csvRow, "utf-8", (err) => {
        if (err) console.log(err)
    });
}

//Insert the section to csv file
async function writeSectionToCSV(data, callback) {
    try {
        const emotion = await predictGSREmotion(data.gsrData);
        const csvRow = `${data.startTime},${data.finishTime},"[${data.gsrData.join(', ')}]",${emotion}\n`;

        fs.appendFile(FILE_PATHS.GSR_TRAINING_FILE_PATH,  csvRow, (err) => {
            if (err) console.error('Error writing to CSV file:', err)
        });

        let newData = {
            startTime: data.startTime,
            endTime: data.finishTime,
            gsr_section: data.gsrData,
            emotion_state: emotion
        }

        writeClientGSREmotionsToCSV(newData);   //Write emotiuon in a csv file for user interface display
        writeSectionTOJSON(newData);            //Save data in a json file

        // Clear the data for the next section
        data.startTime = null;
        data.finishTime = null;
        data.gsrData = [];

        callback();
    } catch(e) {
        console.log('Error: ', e)
    }
    
}


////////////////////////////////////////////////////////////////////////////
//File handlers
////////////////////////////////////////////////////////////////////////////

//Read the json file
function readJSONFile(filePath, callback = (dataObject) => {}) {
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
    } catch(err) {
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

//Create the file if it doesnt exist
function createFileIfNotExists(filePath, content) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content || '', 'utf-8');
      console.log(`File created: ${filePath}`);
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
        let audioObject = [], imageObject = [];
        const imagesData = getImages();

        //Format images data
        imagesData.forEach(row => {
            let imageName = row.image,
                timestamp = imageName.match(/(\d+)/);
                timestamp = timestamp ? parseInt(timestamp[0]) : null;

            let data = { [timestamp]: imageName, text: row.text }

            if(timestamp != null) {
                imageObject.push(data);
            }
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

                const mergedJson = JSON.stringify(merged, null, 2);                           //Convert mergedData array to JSON
                fs.writeFileSync(current_session_file, mergedJson, 'utf8');    // Write the merged data to a new file

                console.log(`Merged data written to ${current_session_file}`);
            })
        });     
    });        
   
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
            //Extract sessionStart and sessionFile
            let { sessionStart, sessionFile } = userObject;
        
            //Calculate the difference between current time and sessionStart in milliseconds
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - sessionStart;
            const folder_path = `./data/session_files/`;
        
            //Check if the difference is more than 30 minutes (30 * 60 * 1000 milliseconds)
            if (sessionStart == '' || sessionFile == '' || timeDifference > SERVER_CONFIG.OUTPUT_LENGTH * 60 * 1000) {
                //Create a new JSON file with the name "session" + current timestamp
                const newFileName = `session_${currentTime}.json`;
                const newSessionFilename = folder_path + newFileName;
                fs.writeFileSync(newSessionFilename, JSON.stringify([]), { encoding: 'utf-8' });
        
                //Assign the created filename to current_session_file
                current_session_file = newSessionFilename;
                console.log(`New session file created: ${current_session_file}`);

                sessionStart = currentTime;
                sessionFile = newFileName;
                writeJSONFile(FILE_PATHS.USER_FILE_PATH, { ...userObject, sessionStart, sessionFile });

                emptyFiles();
            } else {
                //Difference is less than 30 minutes
                current_session_file = folder_path + sessionFile;
            }
        });
    } catch (error) {
        console.error('Error updating the session file:', error);
    }
}

//Get image data from the file
function getImages() {
    const imageCsv = fs.readFileSync(FILE_PATHS.IMAGE_TEXT_FILE_PATH, 'utf8');  //Read the image text csv file
    const parsedData = Papa.parse(imageCsv, { header: true });                  //Parse CSV data    

    return parsedData.data;
}


////////////////////////////////////////////////////////////////////////////
//REMOVE FILES/ file cleaners
////////////////////////////////////////////////////////////////////////////

//Remove images from the directory
function removeStreamFiles(directoryPath) {
    readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach((file) => {
            if (file.includes('stream') || file.includes('audio')) {
                const filePath = join(directoryPath, file);
                unlink(filePath, (error) => {
                    if (error) console.error(`Error deleting file ${file}:`, error)
                });
            }
        });
    });
}

//Clean old row files
function cleanOldRowData() {
    let folders = ["data/audio/row_audio", "data/images/row_images"];

    folders.forEach(folder => {
        removeStreamFiles(folder);
    });
}

//Empty the data files
async function emptyFiles() {
  try {
    const writeFile = promisify(fs.writeFile);
    const filesToEmpty = [FILE_PATHS.GSR_SECTIONS_JSON_PATH, FILE_PATHS.AUDIO_TEXT_FILE_PATH];

    //Empty the content of each file
    await Promise.all(filesToEmpty.map(async (filename) => {
      await writeFile(filename, JSON.stringify([{}]));
    }));

    resetCSVFile(FILE_PATHS.IMAGE_TEXT_FILE_PATH)

  } catch(err) {
    console.log('Error cleaning files: ', err);
  }
}

//Empty the Image csv file
function resetCSVFile(filePath) {
    try {
      //Create the new content with the column names
      const newContent = 'image,text';
  
      //Write the new content to the CSV file
      fs.writeFile(filePath, newContent, ()=> {});
    } catch (err) {
      console.error('Error resetting CSV file:', err);
    }
}





export {
    runImageProcessor,
    removeStreamFiles,
    rigControl,
    saveData,
    processGSRoutput,
    insertGSRData,
    concatinateWavFiles,
    predictGSREmotion,
    updateTheFinalFile,
    cleanOldRowData,
    insertDataToFinalFile,
    readJSONFile,
}





