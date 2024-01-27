import { SERVER_CONFIG } from './server_settings.js';

let timer;

//##############################################################
//Rig status check timer
//##############################################################

//Switch rig status to offline
function timerHandler() {
    SERVER_CONFIG.rigActive = false;
    console.log('Rig is not active!');
}

//Reset the timer
function resetTimer() {
    SERVER_CONFIG.rigActive = true;
    clearTimeout(timer);
    timer = setTimeout(timerHandler, 5000);
}

timer = setTimeout(timerHandler, 5000); //Initiate the timer

//Exports
export { resetTimer };
