import { Client } from 'ssh2';
import { FILE_PATHS, RIG_CONFIG, SERVER_CONFIG } from "./server_settings.js";
import { runImageProcessor } from './utility.js';


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
            sftp.fastPut(FILE_PATHS.CONFIG_FILE_PATH, SERVER_CONFIG.PATH, (err) => {
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
    ssh.exec(SERVER_CONFIG.APP_RUNNING_COMMAND, (err, stream) => {
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
    ssh.exec(SERVER_CONFIG.KILL_PYTHON_APPS_COMMAND, (err, stream) => {
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


export { rigControl }