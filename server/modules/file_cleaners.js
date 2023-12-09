import { promisify } from "util";
import { join } from 'path';
import fs, { readdir, unlink } from 'fs';

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

//Clean old row files
function cleanOldRowData() {
    let folders = ["data/audio/row_audio", "data/images/row_images"];

    folders.forEach(folder => {
        removeStreamFiles(folder);
    });
}

//Empty the data files
async function emptyFiles() {
  try {
    const writeFile = promisify(fs.writeFile);
    const filesToEmpty = [FILE_PATHS.GSR_SECTIONS_JSON_PATH, FILE_PATHS.AUDIO_TEXT_FILE_PATH];

    //Empty the content of each file
    await Promise.all(filesToEmpty.map(async (filename) => {
      await writeFile(filename, JSON.stringify([{}]));
    }));

    resetCSVFile(FILE_PATHS.IMAGE_TEXT_FILE_PATH)

  } catch(err) {
    console.log('Error cleaning files: ', err);
  }
}

//Empty the Image csv file
function resetCSVFile(filePath) {
    try {
      //Create the new content with the column names
      const newContent = 'image,text';
  
      //Write the new content to the CSV file
      fs.writeFile(filePath, newContent, ()=> {});
    } catch (err) {
      console.error('Error resetting CSV file:', err);
    }
}



export {
    removeStreamFiles,
    cleanOldRowData,
    emptyFiles
}