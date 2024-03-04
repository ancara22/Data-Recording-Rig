/**
 * The RigControl Module.
 * @module RigControl
 */

import { Client } from 'ssh2';
import { FILE_PATHS, RIG_CONFIG, APP_CONFIG } from "./server_settings.js";
import { runImageProcessor, runSessionFileUpdatingInterval, stopSessionFileUpdatingInterval } from './utility.js';
import { Cortex } from "./cortex.js"


let cortex;

////////////////////////////////////////////////////////////////////////////
//RIG Control
////////////////////////////////////////////////////////////////////////////

/**
 * Send the configuration file (config.ini) to the Raspberry Pi.
 * If specified, also starts the recording application on the Raspberry Pi.
 *
 * @function
 * @memberof module:RigControl
 * @param {string} startRig - If 'config', only sends the configuration file; otherwise, starts the recording application.
 * @returns {void}
 * @example
 * // Example of using rigControl function
 * rigControl('start'); // Sends the configuration file and starts the recording application
 */
function rigControl(startRig) {
    const ssh = new Client();

    //On connection ready send the configs
    ssh.on("ready", () => {
        console.log('Connection ready.')

        ssh.sftp((er, sftp) => {
            if(er) console.log("SSH connection is imposible!");

            //Copy file to the raspberry pi directory
            sftp.fastPut(FILE_PATHS.CONFIG_FILE_PATH, APP_CONFIG.PATH, (err) => {
                if (err) {
                    console.error('Error transferring the file:', err);
                    sftp.end(); 
                    ssh.end();
                    return 0;
                }

                if(startRig != 'config')  {
                    runTheRecordingApp(ssh, startRig);
                    startEEGRecording()   //EEG recording app
                }

                if(startRig == "stop") {
                    console.log('Stopping the Recording process.')
                    stopSessionFileUpdatingInterval();
                    cortex.stopRecording();
                }
            })
        
            sftp.on('close', () => ssh.end());       //Close the ssh connection
        })
    })

    handleSSHError(ssh);
    ssh.connect(RIG_CONFIG); //Start connection
}

/**
 * Execute the RIG terminal command to run the recording application.
 *
 * @function
 * @memberof module:RigControl
 * @param {Client} ssh - The SSH client instance for connecting to the Raspberry Pi.
 * @returns {void}
 * @example
 * // Example of using executeCommand function
 * executeCommand(sshInstance); // Executes the RIG terminal command to run the recording application
 */
function executeCommand(ssh) {
    ssh.exec(APP_CONFIG.APP_RUNNING_COMMAND, (err, stream) => {
        if (err) {
            console.error("Error running the app:", err);
            ssh.end();
            return;
        }
        
        runSessionFileUpdatingInterval();     //Update the final file / interval
        
        stream.stderr.on('data', (data) => console.error('Python Script Error:', data.toString()));
    
        stream.on("close", (code, signal) => { 
            console.log("Recording process closed. Exit code:", code, "Signal:", signal);
            ssh.end();
        });
    });
}


/**
 * Run the recording app.
 *
 * @function
 * @memberof module:RigControl
 * @param {Client} ssh - The SSH client instance for connecting to the Raspberry Pi.
 * @param {string} startRig - If 'start', starts the recording application; otherwise, stops preview processes.
 * @returns {void}
 * @example
 * // Example of using runTheRecordingApp function
 * runTheRecordingApp(sshInstance, 'start'); // Starts the recording application on the Raspberry Pi
 */
function runTheRecordingApp(ssh, startRig) {
    //Stop all the previews processes
    ssh.exec(APP_CONFIG.KILL_PYTHON_APPS_COMMAND, (err, stream) => {
        const sleep = (milliseconds) => {
            return new Promise(resolve => setTimeout(resolve, milliseconds));
        };

        if(startRig == 'start') {
            console.log('Starting the Recording process.')
            sleep(1000).then(()=> {
                executeCommand(ssh);    // Run the rig recording on the raspberry pi
                runImageProcessor();    //Rund image processor
            })
        }
    }) 
}

/**
 * Handle SSH connection errors.
 *
 * @function
 * @memberof module:RigControl
 * @param {Client} ssh - The SSH client instance for connecting to the Raspberry Pi.
 * @returns {void}
 * @example
 * // Example of using handleSSHError function
 * handleSSHError(sshInstance); // Handles SSH connection errors
 */
function handleSSHError(ssh) {
    //On ssh connection error
    ssh.on("error", (err) => {
        if(err.code == 'ENOTFOUND') {
            console.log('SSH connection error. No active devices!')
        } else {
            console.log('SSH connection error: ', err)
        }
    })
}

/**
 * Start EEG recording.
 *
 * @function
 * @memberof module:RigControl
 * @returns {void}
 * @example
 * // Example of using startEEGRecording function
 * startEEGRecording(); // Starts EEG recording
 */
function startEEGRecording() {
    console.log('Starting the EEG recording.')

    //EEG
    let socketUrl = 'wss://localhost:6868';

    let user = {
        "license": process.env.HEADSET_LICENSE,
        "clientId": process.env.HEADSET_CLIENT_ID,
        "clientSecret": process.env.HEADSET_CLIENT_SECRET,
        "debit": 1
    }

    cortex = new Cortex(user, socketUrl)
    cortex.run();
}

//Export
export { rigControl }