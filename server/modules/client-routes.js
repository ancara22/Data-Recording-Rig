import express from 'express';
import { rigControl, saveData } from './utility.js';
import ini from 'ini';
import { config } from './routes.js';
import { rigActive  } from './timer.js';
import fs, { readFile } from 'fs';


const CLIENT_EMOTIONS_FILE_PATH = './data/gsr/client_graph/client_emotions.csv';
const CLIENT_GSR_GRAPH_FILE_PATH = './data/gsr/client_graph/gsr_graph.csv';
const CONFIG_FILE_PATH = '../config.ini';
const USER_FILE_PATH = './data/user/user.json';

//////////////////////////////////////////////////////////////////////////////////
//Clien web-service
//////////////////////////////////////////////////////////////////////////////////

const webClientRoutes = express.Router();


//Web interface/web page
webClientRoutes.get("/", (req, res) => res.sendFile(path.join(__dirname, '/webclient/index.html')));

//Get rig status for the web client /Web client webservice
webClientRoutes.get('/rigStatus', (req, res) => res.json({ active: rigActive }));

//Save new configs to the file
webClientRoutes.get( "/rigStart", (req, res) => handleRigControl(req, res, "start"));

//Save new configs to the file
webClientRoutes.get( "/rigStop", (req, res) => handleRigControl(req, res, "stop"));

//Get gsr data from the file
webClientRoutes.get('/gsrData', (req, res) => {
  readFileAndHandleErrors(CLIENT_GSR_GRAPH_FILE_PATH, res, (data) => {
      let rows = data.trim().split('\n');
      let header = rows[0].split(',');
      let gsr_data = rows.slice(1).map(row => row.split(',').map(parseFloat));

      res.status(200).json({ header, gsr_data });
  });
});

//getRigConfigFile
webClientRoutes.get('/getConfig', (req, res) => {
  readFileAndHandleErrors(CONFIG_FILE_PATH, res, (data) => {
    const config = ini.parse(data)
    res.status(200).json({ config });
  })
});

//Save new configs to the file
webClientRoutes.post( "/saveConfig", (req, res) => {
    const config = req.body.config;
    const iniConfig = ini.stringify(config);

    fs.writeFile(CONFIG_FILE_PATH, iniConfig, (err) => {
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

//Save new configs to the file
webClientRoutes.get( "/getEmotions", (req, res) => {
    readFileAndHandleErrors(CLIENT_EMOTIONS_FILE_PATH, res, (data) => {
        let rows = data.trim().split('\n');
        let header = rows[0].split(',');
        let emotions = rows.slice(1).map(row => row.split(','));

        res.status(200).json({ header, emotions });
    });
});

//Set the new username and session start time
webClientRoutes.post('/setNewUserName', (req, res) => {
    let name = req.body.userName;

    readFileAndHandleErrors(USER_FILE_PATH, res, (data) => {
        let userData = JSON.parse(data);     //Get the data from the json file
            
        userData.sessionStart = Math.floor(Date.now() / 1000); 
        userData.currentUser = name;

        let updatedData = JSON.stringify(userData, null, 2);

        //Rewrite the json file
        fs.writeFile(user_file_path, updatedData, 'utf8', (err) => {
            if (err) {
                console.error('Error updating JSON file:', err);
            }
        })

        res.status(200)
    })
})

//Get the user name and session start time
webClientRoutes.get('/getUserName', (req, res) => {
    readFileAndHandleErrors(USER_FILE_PATH, res, (data) => {
        let userData = JSON.parse(data);     //Get the data from the json file
        res.status(200).json(userData)
    })
})

// Save audio user intro
webClientRoutes.post("/saveAudioIntro", saveData('user', 'audio'), (req, res) => {
    res.json({ success: true, message: 'Audio data saved successfully.' });
});


//Read a JSON file function with callback
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

//Handle rig control
function handleRigControl(req, res, action) {
  rigControl(action);
  res.status(200);
}


export { webClientRoutes }