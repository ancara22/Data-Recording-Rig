/**
 * The Timer Module.
 * @module Timer
 */

import { SERVER_CONFIG } from './server_settings.js';

let timer;

/**
 * Handles the timer expiration by switching the rig status to offline.
 * This function is typically called when the timer set by {@link resetTimer} reaches zero.
 *
 * @function
 * @memberof module:Timer
 * @name timerHandler
 * @returns {void}
 * @example
 * // Example of using the timerHandler function
 * timerHandler();
 */
function timerHandler() {
    SERVER_CONFIG.rigActive = false;
    console.log('\n------The Rig is not active!-----');
}

/**
 * Resets the timer for a specified duration.
 * If the timer is already active, it cancels the current timer and starts a new one.
 *
 * @function
 * @memberof module:Timer
 * @name resetTimer
 * @param {number} duration - The duration (in milliseconds) for the new timer.
 * @returns {void}
 * @example
 * // Example of using the resetTimer function with a duration of 5000 milliseconds (5 seconds)
 * resetTimer(5000);
 */
function resetTimer() {
    SERVER_CONFIG.rigActive = true;
    clearTimeout(timer);
    timer = setTimeout(timerHandler, 5000);
}

timer = setTimeout(timerHandler, 5000); //Initiate the timer

//Exports
export { resetTimer };
