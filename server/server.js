const express = require('express');
const multer = require('multer');
const app = express();
const bodyParser = require('body-parser');
const fs =  require('fs');
const path = require('path');
const { Client } = require('ssh2');
const { spawn } = require('child_process');


// Set the port for the server
const port = 8080;
app.use(express.json());
app.use(bodyParser.json());

//Save data to a file
function saveData(folder, fileType) {
    const storage = multer.diskStorage({
        destination: (r, f, callback) => {
            callback(null, __dirname + `/data/${folder}/`);
        },
        
        filename: (r, file, callback) => {
            callback(null, file.originalname);
        }
    });

    const upload = multer({ storage: storage });
    return upload.single(fileType);
}


//Send the connfiguration, config.txt file to the raspberry pi
function rigConfiguration() {
    let config = {
        host: "raspberry.local",
        port: 22,
        username: "rig",
        password: "raspberry"
    }

    const ssh = new Client();

    ssh.on("ready", () => {
        console.log('Connection ready.')

        ssh.sftp((er, sftp) => {
            if (er) {
                console.log("SSH connection is imposible!");
            };
        
            let rigDirectory = "/home/rig/Documents/App/main/";

            sftp.fastPut('./config.ini', `${rigDirectory}config.ini`, (err) => {
                if (err) {
                    console.error('Error transferring the file:', err);
                    sftp.end(); 
                    ssh.end();
                    return 0;
                }

                // Run the rig recording
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
        
           
            sftp.on('close', () => {
                ssh.end();
                console.log('Rig configuration compleated.');
            })
      
        })
    })

    ssh.on("error", (err) => {
        console.log('first', err)
    })

    ssh.connect(config);

}


//Get image and save to a file
app.post('/image', saveData('images/row_images', 'image'), (req, res) => {
    const imageFile = req.file;
  
    if (!imageFile) {
      console.error('No image file received');
      return res.sendStatus(400);
    }
    
    res.sendStatus(200);
});


//Get video and save to a file
app.post('/video', saveData('videos', 'video'), (req, res) => {
    const videoFile = req.file;
  
    if (!videoFile) {
      console.error('No video file received');
      return res.sendStatus(400);
    }
    res.sendStatus(200);
});


//Get audio and save to a file
app.post('/audio', saveData('audio', 'audio'), (req, res) => {
    const audioFile = req.file;
  
    if (!audioFile) {
        console.error('No audio file received');
        return res.sendStatus(400);
    }
    res.sendStatus(200);
});


//Get GSR json and save to a file
app.post('/gsr', saveData('gsr', 'json'), (req, res) => {
    const gsrData = req.body;
  
    console.log('gsrData: ', gsrData)
    if (!gsrData) {
        console.error('No GSR data received');
        return res.sendStatus(400);
    }
    res.sendStatus(200);
});


function removeStreamFiles(directoryPath) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach((file) => {
            if (file.includes('stream')) {
                const filePath = path.join(directoryPath, file);
                fs.unlink(filePath, (error) => {
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


function runSpeakersTranscriber() { 
    let process = spawn('python3', ['transcriber.py']);
}


setInterval(() => {
    dirPath = './data/images';
    removeStreamFiles(dirPath);
}, 30000)




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  rigConfiguration();
});
