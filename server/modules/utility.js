import multer, { diskStorage } from 'multer';
import { Client } from 'ssh2';
import { readdir, unlink } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util'
import wav from 'wav';
import Papa from 'papaparse';



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


//Send the connfiguration, config.ini file to the raspberry pi
function rigControl(startRig) {
    //SSH connection config
    let config = {
        host: "raspberry.local",
        port: 22,
        username: "rig",
        password: "raspberry"
    }

    const ssh = new Client();

    //On connection ready send the configs
    ssh.on("ready", () => {
        console.log('Connection ready.')

        ssh.sftp((er, sftp) => {
            if(er) console.log("SSH connection is imposible!");
        
            let rigDirectory = "/home/rig/Documents/App/main/";   //Raspberry pi config.ini directory

            //Copy file to the raspberry pi directory
            sftp.fastPut('../config.ini', `${rigDirectory}config.ini`, (err) => {
                if (err) {
                    console.error('Error transferring the file:', err);
                    sftp.end(); 
                    ssh.end();
                    return 0;
                }

                if(startRig != 'config') {
                    //Stop all the previews processes
                    ssh.exec('pkill -f python', (err, stream) => {
                        const sleep = (milliseconds) => {
                            return new Promise(resolve => setTimeout(resolve, milliseconds));
                        };

                        if(startRig == 'start') {
                            sleep(1000).then(()=> {
                                // Run the rig recording on the raspberry pi
                                ssh.exec("python3 /home/rig/Documents/App/main/app.py", (err, stream) => {
                                    if (err) {
                                        console.error("Error running the app:", err);
                                        ssh.end();
                                        return;
                                    }
                                    
                                    stream.stderr.on('data', (data) => {
                                        console.error('Python Script Error:', data.toString());
                                
                                    });
                                
                                    stream.on("close", (code, signal) => { 
                                        console.log("Recording process closed. Exit code:", code, "Signal:", signal);
                                        ssh.end();
                                    });
                                });
                            })
                        }
                    }) 
                }
            })
            
            //On writing close, close the ssh connection
            sftp.on('close', () => {
                ssh.end();
            })
        })
    })

    //On ssh connection error
    ssh.on("error", (err) => {
        console.log('SSH connection error: ', err)
    })

    ssh.connect(config); //Start connection
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
//GSR DATA PROCESSORS
////////////////////////////////////////////////////////////////////////////

//Save GSR data to a csv file/ used for graphs visualisation
function processGSRoutput(data, nr) {
    let value = parseInt(data) 
    let notConnectedvalue = 600; //600+ when the sensors are not connected
    
    if(value < notConnectedvalue) {
        //Save dat  to a csv file
        let timestamp =  Math.floor(Date.now() / 1000); 
        const data = `\n${timestamp}, ${value}`;

        let filePath = `./data/gsr/gsr_training_data/gsrData${nr}.csv`; //Creates a file that represent the gsr section for graph visualisation

        if(nr == false) {
            filePath = `./data/gsr/gsr_graph.csv`
        }

        createFileIfNotExists(filePath , "Timestamp,GSR");

        fs.appendFile(filePath, data, "utf-8", (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("GSR data saved: " + value);
            }
        });
    }
}


//Insert data into 3 minuts sections
function insertGSRData(data, dataValue, data2) {
    let value = parseInt(dataValue) 
    let notConnectedvalue = 600;

    if(value < notConnectedvalue) {
        if(data.startTime == null) data.startTime = Math.floor(Date.now() / 1000);
        data.gsrData.push(value);
    } else {
        data.artefacts ++;
    }

    if(data.artefacts >= 3) {
        data.startTime = Math.floor(Date.now() / 1000);
        data.artefacts = 0;
    }

    processGSRoutput(dataValue, data2.fileNumb); //Creates separate files of each section/for manual lm training
        
    if(Math.floor(Date.now() / 1000) - data.startTime >= 3 * 60 * 1000 && data.startTime != null || (data.gsrData).length >= 85) {
            data.finishTime = Math.floor(Date.now() / 1000); 
            writeSectionToCSV(data);     //For model training
            writeSectionTOJSON(data);    //Save data in a json file
            data2.fileNumb++;
    }
}


//Predict GSR section emotion
function predictGSREmotion(inputGSR) {
    return new Promise((resolve, reject) => {
        const inputGSRString = inputGSR.join(',');
        const command = `python3 ./processors/gsr_predict_emotion.py ${inputGSRString}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            }
            if (stderr) {
            console.error(`Stderr: ${stderr}`);
            reject(stderr);
            }
            const emotion = stdout.trim();

            console.log(`Output: ${emotion}`);
            resolve(emotion);
        });
    })
}



////////////////////////////////////////////////////////////////////////////
//FILE WRITERS
////////////////////////////////////////////////////////////////////////////

//Append the GSR section to the json output file
async function writeSectionTOJSON(gsrSection) {
    let gsr_file_path = "./data/gsr/gsr_sections.json";

    fs.readFile(gsr_file_path, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        let dataObject = JSON.parse(data);  //Get the data from the json file
        dataObject.push(gsrSection);        //Append new data

        //Rewrite the json file
        fs.writeFile(gsr_file_path, dataObject, 'utf8', (err) => {
            if (err) {
            console.error('Error updating JSON file:', err);
            }
        })

    })
}

//Insert the section to csv file
async function writeSectionToCSV(data) {
    try {
        const emotion = await predictGSREmotion(data.gsrData);
        const csvRow = `${data.startTime},${data.finishTime},"[${data.gsrData.join(', ')}]",${emotion}\n`;

        fs.appendFile("./data/gsr/gsr_training.csv",  csvRow, (err) => {
            if (err) {
                console.error('Error writing to CSV file:', err);
            }
        });

        // Clear the data for the next section
        data.startTime = null;
        data.finishTime = null;
        data.gsrData = [];
    
    } catch(e) {
        console.log('Error: ', e)
    }
    
}

//Read the json file
function readJSONFile(filename) {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
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
    //Data files paths
    let audio_file_path = "./data/audio/audio_text.json",
        gsr_file_path = "./data/gsr/gsr_sections.json",
        final_file_path = './data/recording_output.json',
        image_file_path = './data/images/image_text/image_text.csv';

    let audioData = readJSONFile(audio_file_path);  //Audio text data
    let gsrData = readJSONFile(gsr_file_path);      //GSR data

    let mergedData = []; //Final file content

    //Get the audio timestamp as a section timestamp reference
    audioData.forEach(audioSection => {
        let referenceTimestamp = parseInt(audioSection.timestamp);  //Audio file end timestamp

        //Find the gsr section according to the reference 3 min + - 1
        let gsrSection = gsrData.filter(section => {
            let gsrEndTimestamp = parseInt(section.endTime);
            let dif1 = Math.abs(gsrEndTimestamp - referenceTimestamp);
            let dif2 = Math.abs(referenceTimestamp - gsrEndTimestamp);

            return dif1 < 90 || dif2 < 90;
        })

        //Read the image text csv file
        let imageCsv = fs.readFileSync(image_file_path, 'utf8');
        let parsedData = Papa.parse(imageCsv, { header: true }); //Parse CSV data

        //Filter all the images data in the interval of 3 min ultin timestamp reference
        let filteredImages = parsedData.data.filter(row => {
            let imageName = row.image,
                timestamp = imageName.match(/(\d+)/);
            
            timestamp = timestamp ? parseInt(timestamp[0]) : null;

            return timestamp && timestamp >= referenceTimestamp - (3 * 60) && timestamp <= referenceTimestamp;
        })

        // Create the final data format
        let merged = {
            endTimestamp: referenceTimestamp,
            audio: audioSection,
            gsr: gsrSection,
            img: filteredImages
        }

        mergedData.push(merged);
    });

    let mergedJson = JSON.stringify(mergedData, null, 2);   //Convert mergedData array to JSON
   
    fs.writeFileSync(final_file_path, mergedJson, 'utf8');    // Write the merged data to a new file

    console.log(`Merged data written to ${final_file_path}`);
}

//Run the final file content update by interval
function updateTheFinalFile() {
    setInterval(() => {
        insertDataToFinalFile();
    }, 3 * 60 * 1000)
}



////////////////////////////////////////////////////////////////////////////
//REMOVE FILES
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
                    if (error) {
                        console.error(`Error deleting file ${file}:`, error);
                    }
                });
            }
        });
    });
}

//Clean old row files
function cleanOldRowData() {
    let folders = ["data/audio/row_audio", "data/audio/row_images", "data/audio/row_audio"];

    folders.forEach(folder => {
        removeStreamFiles(folder);
    });
}



export {
    runImageProcessor,
    removeStreamFiles,
    rigControl,
    saveData,
    processGSRoutput,
    identifySpeachInAudio,
    insertGSRData,
    //concatinateWavFiles,
    predictGSREmotion,
    updateTheFinalFile,
    cleanOldRowData
}









//Identify speech in an audio file
const execAsync = promisify(exec);

async function identifySpeachInAudio(audioFileName) {
    return execAsync(`python3 ./processors/audio_transcriber.py ${audioFileName}`)
        .then(({ stdout, stderr }) => {
            const outputString = stdout.trim();
            if (outputString === 'true') {
                return true;
            } else if (outputString === 'false') {
                return false;
            } else {
                return false;
            }
        })
        .catch(error => {
            console.error(`Error: ${error.message}`);
            return false;
        });
}


/*
//Concatinate more audio files
function concatinateWavFiles(wavFilesArray) {
    let match = wavFilesArray[0].match(/(\d+)/);
    const startTimestamp = match ? match[0] : null;

    match = wavFilesArray[wavFilesArray.length-1].match(/(\d+)/);
    const finishTimeshtamp = match ? match[0] : null;

    let fileDir = "./data/audio/processed_audio/";
    let outputFile = "audio_" + startTimestamp + "_" + finishTimeshtamp + ".wav";
    let filePath = fileDir + outputFile;

    const writer = new wav.FileWriter(filePath, {
        channels: 1,
        sampleRate: 44100,
        bitDepth: 16
    });

    
    function concatFile(index) {
        if (index < wavFilesArray.length) {
            const reader = new wav.Reader();

            reader.on('format', (format) => {
                if (!writer._writeState) {
                    writer.pipe(fs.createWriteStream(filePath, { flags: 'a' }));
                }
            });

            reader.on('end', () => {
                concatFile(index + 1);
            });

            reader.on('error', (er) => console.log('first', er))

            fs.createReadStream(wavFilesArray[index]).pipe(reader).pipe(writer, { end: false });
        } else {
            writer.end();
        }
    }

    concatFile(0);

    return outputFile;
}
*/