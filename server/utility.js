import multer, { diskStorage } from 'multer';
import { Client } from 'ssh2';
import { readdir, unlink } from 'fs';
import { join } from 'path';
import { spawn, exec } from 'child_process';


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
                        //console.error('Python Script Error:', data.toString());
                
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
function runImageProcessor() {
    exec('python3 ./processors/image_processor.py', (error, stdout, stderr) => {
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

//!!!!!!!!!!!!!!!!!!!!!!! TO BE SOLVED !!!!!!!!!!!!!!!!!!!!!!!!!!!!
//Run the audio direalizer python script, transcriber
function runSpeakersTranscriber() { 
    let transcriber = spawn('python3', ['processors/transcriber.py']);
}



export {
    runImageProcessor,
    removeStreamFiles,
    rigConfiguration,
    saveData,
    runSpeakersTranscriber
}