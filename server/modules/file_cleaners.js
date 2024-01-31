import { promisify } from "util";
import { join } from 'path';
import fs, { readdir, unlink } from 'fs';
import { FILE_PATHS } from "./server_settings.js";

////////////////////////////////////////////////////////////////////////////
//REMOVE FILES/ file cleaners
////////////////////////////////////////////////////////////////////////////

//Remove images from the directory
function removeStreamFiles(directoryPath) {
	readdir(directoryPath, (err, files) => {
		if (err) {
			console.error('Error reading directory:', err);
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

//Empty the data files
async function emptyAllFiles() {
	try {
		const writeFile = promisify(fs.writeFile);
		const filesToEmpty = [FILE_PATHS.GSR_SECTIONS_JSON_PATH, FILE_PATHS.AUDIO_TEXT_FILE_PATH];

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

//Empty the Image csv file
function cleanCSVFile(filePath, content) {
	try {
		//Write the new content to the CSV file
		fs.writeFile(filePath, content, () => {});
	} catch (err) {
		console.error('Error resetting CSV file:', err);
	}
}

//Clean the JSONL file
function cleanJSONL(filePath) {
	try {
		fs.truncateSync(filePath, 0);
	} catch (error) {
		console.log('Error cleaning JSONL file', error);
	}
}

//Clean old row files
function cleanOldRowData() {
	let folders = ["data/audio/row_audio", "data/images/row_images"];

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