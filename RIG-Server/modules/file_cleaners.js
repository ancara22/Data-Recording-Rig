/**
 * The File Cleaner Module.
 * @module FileCleaner
 */

import { promisify } from "util";
import { join } from 'path';
import fs, { readdir, unlink } from 'fs';
import { FILE_PATHS } from "./server_settings.js";

////////////////////////////////////////////////////////////////////////////
//REMOVE FILES/ file cleaners
////////////////////////////////////////////////////////////////////////////

/**
 * Remove files with names containing 'stream' or 'audio' from the specified directory.
 *
 * @function
 * @memberof module:FileCleaner
 * @param {string} directoryPath - The path of the directory from which to remove files.
 * @returns {void}
 * @example
 * // Example of using removeStreamFiles function
 * const directoryPath = './data/images';
 * removeStreamFiles(directoryPath);
 */
function removeStreamFiles(directoryPath) {
	readdir(directoryPath, (err, files) => {
		if (err) {
			//console.error('Error reading directory:', err);
			return;
		}

		files.forEach((file) => {
			if (file.includes('stream') || file.includes('audio')) {
				const filePath = join(directoryPath, file);
				unlink(filePath, (error) => {
					if (error) console.error(`Error deleting file ${file}:`, error)
				});
			}
		});
	});
}

/**
 * Empty the content of specified files and clean old row files.
 *
 * @async
 * @function
 * @memberof module:FileCleaner
 * @returns {Promise<void>}
 * @throws {Error} If there is an issue writing to files.
 * @example
 * // Example of using emptyAllFiles function
 * await emptyAllFiles();
 */
async function emptyAllFiles() {
	try {
		const writeFile = promisify(fs.writeFile);
		const filesToEmpty = [FILE_PATHS.GSR_SECTIONS_JSON_PATH, FILE_PATHS.AUDIO_TEXT_FILE_PATH , FILE_PATHS.IMAGE_LABELS_FILE_PATH];

		//Empty the content of each file
		await Promise.all(filesToEmpty.map(async (filename) => {
			await writeFile(filename, JSON.stringify([]));
		}));

		cleanCSVFile(FILE_PATHS.IMAGE_TEXT_FILE_PATH, 'image,text\n');

		FILE_PATHS.EEG_FILES_LIST.forEach(file => {
			cleanJSONL(file);
		});
	} catch (err) {
		console.log('Error cleaning files: ', err);
	}
}

/**
 * Empty the content of the specified CSV file.
 *
 * @function
 * @memberof module:FileCleaner
 * @param {string} filePath - The path of the CSV file to be cleaned.
 * @param {string} content - The content to be written to the CSV file.
 * @returns {void}
 * @example
 * // Example of using cleanCSVFile function
 * const filePath = './data/images/image_text.csv';
 * cleanCSVFile(filePath, 'image,text\n');
 */
function cleanCSVFile(filePath, content) {
	try {
		//Write the new content to the CSV file
		fs.writeFile(filePath, content, () => {});
	} catch (err) {
		console.error('Error resetting CSV file:', err);
	}
}

/**
 * Clean the content of the specified JSONL file by truncating it to zero length.
 *
 * @function
 * @memberof module:FileCleaner
 * @param {string} filePath - The path of the JSONL file to be cleaned.
 * @returns {void}
 * @example
 * // Example of using cleanJSONL function
 * const filePath = './data/eeg_data.jsonl';
 * cleanJSONL(filePath);
 */
function cleanJSONL(filePath) {
	try {
		fs.truncateSync(filePath, 0);
	} catch (error) {
		console.log('Error cleaning JSONL file', error);
	}
}

/**
 * Clean old row files by removing files with names containing 'stream' or 'audio'.
 *
 * @function
 * @memberof module:FileCleaner
 * @returns {void}
 * @example
 * // Example of using cleanOldRowData function
 * cleanOldRowData();
 */
function cleanOldRowData() {
	let folders = ["data/audio/raw_audio", "data/images/raw_images"];

	folders.forEach(folder => {
		removeStreamFiles(folder);
	});
}


//Export
export {
	removeStreamFiles,
	cleanOldRowData,
	emptyAllFiles,
	cleanCSVFile
}