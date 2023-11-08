import multer, { diskStorage } from 'multer';
import { Client } from 'ssh2';
import { readdir, unlink } from 'fs';
import { join } from 'path';
import { spawn, exec } from 'child_process';
import fs from 'fs';



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
function rigConfiguration() {
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

//Temp function
//Remove images from the directory
function removeStreamFiles(directoryPath) {
    readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach((file) => {
            if (file.includes('stream')) {
                const filePath = join(directoryPath, file);
                unlink(filePath, (error) => {
                    if (error) {
                        console.error(`Error deleting file ${file}:`, error);
                    } else {
                        console.log(`Deleted file: ${file}`);
                    }
                });
            }
        });
    });
}


//!!!!!!!!!!!!!!!!!!!!!!! TO BE SOLVED !!!!!!!!!!!!!!!!!!!!!!!!!!!!
//Run image processor python script, image_processor
function runImageProcessor(imageName) {
    exec(`python3 ./processors/image_processor.py ${imageName}`, (error, stdout, stderr) => {
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


function processGSRoutput(data) {
    let value = parseInt(data)  // they are comming in json format...modify tyhis line
    let notConnectedvalue = 600; //600+ when the sensors are not connected
    
    if(value < notConnectedvalue) {
        //Save data
        //Find the Normal state after data recording  ///Test
        
        //Save dat  to a csv file
        let timestamp = Date.now();
        const data = `\n${timestamp}, ${value}`;

        fs.appendFile("./data/gsr/gsrData.csv", data, "utf-8", (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("GSR data saved: " + value);
            }
        });
    }
}


function identifySpeachInAudio(audioFIleName) {
    exec(`python3 ./processors/transcriber.py ${audioFIleName}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error}`);
          return res.status(500).send('Error running Python script.');
        }
    
        const outputString = stdout.trim();
        
        if(outputString == 'true') {
            return true;
        } else if(outputString == 'false') {
            return false;
        } else {
            return false;
        }

    
    })
}

export {
    runImageProcessor,
    removeStreamFiles,
    rigConfiguration,
    saveData,
    processGSRoutput,
    identifySpeachInAudio
}