import express from 'express';
import { rigControl } from './utility.js';
import ini from 'ini';
import { toUpdateConfig } from './routes.js';
import { rigActive  } from './timer.js';


//////////////////////////////////////////////////////////////////////////////////
//Clien web-service
//////////////////////////////////////////////////////////////////////////////////


const webClientRoutes = express.Router();


//Web interface/web page
webClientRoutes.get("/", (req, res)=> {
    res.sendFile(path.join(__dirname, '/webclient/index.html'));
})


//Get rig status for the web client /Web client webservice
webClientRoutes.get('/rigStatus', (req, res) => {
    res.json({ active: rigActive })
})


//Get gsr data from the file
webClientRoutes.get('/gsrData', (req, res) => {
    const filePath = './data/gsr/gsr_graph.csv';
  
    //Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        res.status(500);
      } else {
        let rows = data.trim().split('\n');
        let header = rows[0].split(',');
        let gsr_data = rows.slice(1).map(row => row.split(',').map(parseFloat));
  
        res.json({ header, gsr_data });
      }
    });
});


//getRigConfigFile
webClientRoutes.get('/getConfig', (req, res) => {
    const filePath = '../config.ini';
  
    //Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        res.status(500);
      } else {
        const config = ini.parse(data)
        res.json({ config });
      }
    });
});


//Save new configs to the file
webClientRoutes.post( "/saveConfig", (req, res) => {
    const config = req.body.config;
    const iniConfig = ini.stringify(config);

    fs.writeFile('../config.ini', iniConfig, (err) => {
        if (err) {
            toUpdateConfig = false;
            console.error('Error saving INI file:', err);
            res.status(500);
        } else {
            toUpdateConfig = true;
            rigControl('config');
            res.status(200);
        }
      });
});


//Save new configs to the file
webClientRoutes.get( "/rigStart", (req, res) => {
    rigControl('start');

    res.status(200);
});


//Save new configs to the file
webClientRoutes.get( "/rigStop", (req, res) => {
    rigControl('stop');

    res.status(200);
});


export { webClientRoutes }