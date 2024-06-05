/**
 * The GSR Processor Module.
 * @module GSRProcessor
 */

import util from "util";
import fs from 'fs';
import { exec } from 'child_process';
import { FILE_PATHS } from "./server_settings.js";
import { readJSONFile, writeJSONFile } from "./utility.js";


////////////////////////////////////////////////////////////////////////////
//GSR processing
////////////////////////////////////////////////////////////////////////////

let isDataUpdated = false;       //To update the GSR session

/**
 * Predict GSR (Galvanic Skin Response) emotion using a Python script.
 *
 * @async
 * @function
 * @memberof module:GSRProcessor
 * @param {number[]} inputGSR - An array of GSR data values.
 * @returns {Promise<string>} A promise that resolves with the predicted emotion.
 * @throws {Error} If there is an error during execution.
 * @example
 * // Example of using predictGSREmotion function
 * const inputGSR = [300, 320, 340, 360];
 * const predictedEmotion = await predictGSREmotion(inputGSR);
 * console.log(predictedEmotion);
 */
async function predictGSREmotion(inputGSR) {
    try {
        const inputGSRString = inputGSR.join(',');
        const command = `python ./processors/gsr_predict_emotion.py ${inputGSRString}`;

        const { stdout, stderr } = await util.promisify(exec)(command);
        const emotion = stdout.trim();

        return emotion;
    } catch(error) {
        console.error(`Error: ${error.message}`);
    }
}


/**
 * Save GSR data to a CSV file for graph visualization.
 *
 * @function
 * @memberof module:GSRProcessor
 * @param {number} data - The GSR data value to be saved.
 * @param {number} nr - The GSR section number.
 * @returns {void}
 * @example
 * // Example of using processGSRoutput function
 * const gsrData = 380;
 * const sectionNumber = 1;
 * processGSRoutput(gsrData, sectionNumber);
 */
function processGSRoutput(data, nr) {
    let value = parseInt(data), 
        notConnectedvalue = 600;    //600+ when the sensors are not connected
    
    if(value < notConnectedvalue) {
        //Save dat  to a csv file
        let timestamp =  Math.floor(Date.now() / 1000); 
        const data = `\n${timestamp}, ${value}`;

        let filePath = `./data/gsr/gsr_training_data/gsrData${nr}.csv`;     //Creates a file that represent the gsr section for graph visualisation

        if(nr == false) filePath = `./data/gsr/client_graph/gsr_graph.csv`;

        createFileIfNotExists(filePath , "Timestamp,GSR");

        fs.appendFile(filePath, data, "utf-8", (err) => {
            if (err) console.log(err);
            else console.log("GSR data saved: " + value);
        });
    } else {
        console.log("The GSR sensors are not connected!")
    }
}


/**
 * Simple GSR data labeling from Low to High sweating levels.
 *
 * @function
 * @memberof module:GSRProcessor
 * @param {number} value - The GSR data value to be labeled.
 * @returns {string} The sweating level label.
 * @example
 * // Example of using predictSweatingLevel function
 * const gsrValue = 380;
 * const sweatingLevel = predictSwetingLevel(gsrValue);
 * console.log(sweatingLevel);
 */
function predictSwetingLevel(value) {
    if(value > 400) {
        return "High";
    } else if(value > 350) {
        return "Medium";
    } else if(value > 300) {
        return "Normal";
    } else if(value > 250) {
        return "Low";
    } else {
        return "Minimal";
    }
}

/**
 * Insert GSR (Galvanic Skin Response) data into 3-minute sections.
 *
 * @function
 * @memberof module:GSRProcessor
 * @param {Object} data - The object containing GSR data and section information.
 * @param {number} dataValue - The GSR data value to be inserted.
 * @param {Object} data2 - The object containing additional data, such as file number.
 * @returns {void}
 * @example
 * // Example of using insertGSRData function
 * const gsrData = { startTime: null, finishTime: null, gsrData: [], artefacts: 0 };
 * const gsrValue = 380;
 * const additionalData = { fileNumb: 1 };
 * insertGSRData(gsrData, gsrValue, additionalData);
 */
function insertGSRData(data, dataValue, data2) {
    let value = parseInt(dataValue),
        notConnectedvalue = 600;

    let timestamp =  Math.floor(Date.now() / 1000); 
    let swetingLevel = predictSwetingLevel(value);

    let formatedData = {
        [timestamp]: value,
        level: swetingLevel
    }

    if(value < notConnectedvalue) {
        if(data.startTime == null) {
            data.startTime = Math.floor(Date.now() / 1000);
            isDataUpdated = true;
        }
        data.gsrData.push(formatedData);
    } else {
        data.artefacts ++;
    }

    if(data.artefacts >= 3) {
        data.startTime = Math.floor(Date.now() / 1000);
        data.artefacts = 0;
    }

    //processGSRoutput(dataValue, data2.fileNumb); //Creates separate files of each section/for manual lm training
    
    if(Math.floor(Date.now() / 1000) - data.startTime >= 3 * 60 && data.startTime != null && (data.gsrData).length >= 60 && isDataUpdated) {
            console.log('Insert GSR section')
            data.finishTime = Math.floor(Date.now() / 1000); 
            isDataUpdated = false;

            writeSectionToCSV(data, () => {
                data2.fileNumb++;
                isDataUpdated = true;
            });  
    }
}


/**
 * Append the GSR section to the JSON output file.
 *
 * @async
 * @function
 * @memberof module:GSRProcessor
 * @param {Object} gsrSection - The GSR section object to be appended to the JSON file.
 * @returns {Promise<void>}
 * @throws {Error} If there is an issue reading or writing the JSON file.
 * @example
 * // Example of using writeSectionTOJSON function
 * const gsrSection = { startTime: 1643921360, finishTime: 1643921420, gsrData: [ { '1643921360': 350, level: 'Medium' } ], artefacts: 0 };
 * await writeSectionTOJSON(gsrSection);
 */
async function writeSectionTOJSON(gsrSection) {
    readJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, (dataObject) => {
        dataObject.push(gsrSection);                                    // Append new data
        writeJSONFile(FILE_PATHS.GSR_SECTIONS_JSON_PATH, dataObject);   // Rewrite the JSON file
    });
}


/**
 * Write client GSR (Galvanic Skin Response) emotions to a CSV file.
 *
 * @function
 * @memberof module:GSRProcessor
 * @param {Object} data - The object containing GSR emotion data.
 * @returns {void}
 * @example
 * // Example of using writeClientGSREmotionsToCSV function
 * const gsrEmotionData = { startTime: 1643921360, endTime: 1643921420, emotion_state: 'Excited' };
 * writeClientGSREmotionsToCSV(gsrEmotionData);
 */
function writeClientGSREmotionsToCSV(data) {
    createFileIfNotExists(FILE_PATHS.CLIENT_EMOTIONS_PATH, "Emotion");

    const csvRow = `${data.startTime},${data.endTime},"${ data.emotion_state }"\n`;

    fs.appendFile(FILE_PATHS.CLIENT_EMOTIONS_PATH, csvRow, "utf-8", (err) => {
        if (err) console.log(err)
    });
}


/**
 * Insert a GSR section into a CSV file.
 *
 * @async
 * @function
 * @memberof module:GSRProcessor
 * @param {Object} data - The object containing GSR section data.
 * @param {Function} callback - Callback function to be executed after writing the section to the CSV file.
 * @returns {Promise<void>}
 * @throws {Error} If there is an issue predicting GSR emotion, reading or writing files.
 * @example
 * // Example of using writeSectionToCSV function
 * const gsrSectionData = { startTime: 1643921360, finishTime: 1643921420, gsrData: [ { '1643921360': 350, level: 'Medium' } ], artefacts: 0 };
 * const callback = () => console.log('Section written to CSV');
 * await writeSectionToCSV(gsrSectionData, callback);
 */
async function writeSectionToCSV(data, callback) {
    try {
        const gsrValues = data.gsrData.map(item => Object.values(item)[0]);

        const emotion = await predictGSREmotion(gsrValues);
        const csvRow = `${data.startTime},${data.finishTime},"[${data.gsrData.join(', ')}]",${emotion}\n`;

        fs.appendFile(FILE_PATHS.GSR_TRAINING_FILE_PATH,  csvRow, (err) => {
            if (err) console.error('Error writing to CSV file:', err)
        });

        //New data object
        let newData = {
            startTime: data.startTime,
            endTime: data.finishTime,
            gsr_section: data.gsrData,
            emotion_state: emotion
        }

        writeClientGSREmotionsToCSV(newData);   //Write emotiuon in a csv file for user interface display
        writeSectionTOJSON(newData);            //Save data in a json file

        // Clear the data for the next section
        data.startTime = null;
        data.finishTime = null;
        data.gsrData = [];

        callback();
    } catch(e) {
        console.log('Error: ', e)
    }
}


/**
 * Create a file if it doesn't exist.
 *
 * @function
 * @memberof module:GSRProcessor
 * @param {string} filePath - The path of the file to be created.
 * @param {string} [content] - The content to be written to the file.
 * @returns {void}
 * @example
 * // Example of using createFileIfNotExists function
 * const filePath = './data/sample.txt';
 * createFileIfNotExists(filePath, 'Hello, World!');
 */
function createFileIfNotExists(filePath, content) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content || '', 'utf-8');
      console.log(`File created: ${filePath}`);
    }
}

//Exports
export {
    processGSRoutput,
    insertGSRData,
    predictGSREmotion,
}