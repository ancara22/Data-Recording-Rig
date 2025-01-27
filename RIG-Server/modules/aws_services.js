/**
 * The AWS Services Module.
 * @module AWSServices
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import https from 'https';
import { readJSONFile, extractTimestamp } from "./utility.js";
import { exec } from 'child_process';
import { FILE_PATHS, EXPERIENCE_CONFIG } from "./server_settings.js";

//Configure AWS region
AWS.config.update({ region: 'eu-west-2' });

//Initiate AWS components
const transcribeService = new AWS.TranscribeService(); //Init AWS Transcriber
const S3 = new AWS.S3();                               //Init AWS S3 Bucket
const comprehend = new AWS.Comprehend();               //Init AWS Comprehend


/**
 * Insert audio file to the AWS S3 Bucket
 * @memberof module:AWSServices
 * @param {string} audioFile - The name of the audio file
 */
function sendAudioToAWSS3(audioFile) {
    let filePath = FILE_PATHS.RAW_AUDIO_FOLDER_PATH + audioFile,
        convertedFilePath = FILE_PATHS.CONVERTED_AUDIO + audioFile;

    concatinateWavFiles(filePath, () => {
        //Configure the AWS bucket
        const bucketName = 'audiobucketfortranscirber';

        fs.readFile(convertedFilePath, (err, data) => {
            if (err) console.log('File reading error: ', err)

            //Upload the audio file to the AWS S3 bucket
            S3.upload({
                Bucket: bucketName,
                Key: audioFile,
                Body: data
            }, (error, result) => {
                if (error) console.log('Error uploading the audio file to the bucket:', error);
                else transcribeTheAudioFile(audioFile); //Run the Transcriber job
            })
        });
    });  
}


/**
 * Create and run the Transcriber job on the AWS Transcribe service
 * @memberof module:AWSServices
 * @param {string} audioFile - The name of the audio file
 */
function transcribeTheAudioFile(audioFile) {
    let transcriptionJobName = "audioT_" + audioFile.replace('.wav', ''); //Create a unic job name

    //Job params
    const params = {
        TranscriptionJobName: transcriptionJobName,
        LanguageCode: "en-US",
        Media: {
            MediaFileUri: "s3://audiobucketfortranscirber/" + audioFile
        },
        MediaFormat: "wav",
        MediaSampleRateHertz: 44100,
        Settings: {
            MaxSpeakerLabels: 2,
            ShowSpeakerLabels: true,
        }
    };

    //Run the transcriber
    transcribeService.startTranscriptionJob(params, (err, resp) => {
        if (err) console.log(err, err.stack);
        else getTranscriptionStatus(transcriptionJobName, audioFile); //Check the job status
    });
}

/**
 * Request to the AWS Transcribe job to get the job status
 * @memberof module:AWSServices
 * @param {string} transcriptionJobName - The name of the transcription job
 * @param {string} audioFile - The name of the audio file
 */
function getTranscriptionStatus(transcriptionJobName, audioFile) {
    //Send the request
    transcribeService.getTranscriptionJob({
        TranscriptionJobName: transcriptionJobName
    }, (err, data) => {
        //Check connection
        if (err) {
            console.log('Transcriber Job error:', err);
            return 0;
        }

        let job_status = data.TranscriptionJob.TranscriptionJobStatus; //Get the status

        //Manage the status
        if (job_status == 'FAILED') {
            console.log('Transcriber process error!');
        } else if (job_status == 'COMPLETED') {
            console.log('Transcriber process completed!')

            let result_file_url = data.TranscriptionJob.Transcript.TranscriptFileUri; //Get the Trascriber result file url
            getTranscriptionData(result_file_url, audioFile); //Get the Transcriber data from the url
        } else {
            setImmediate(() => getTranscriptionStatus(transcriptionJobName, audioFile), 20000); //Repeat the request, if there is no result yet
        }
    })
}

/**
 * Function to get Transcribe data from the URL
 * @memberof module:AWSServices
 * @param {string} resultFileUrl - The URL of the Transcribe result file
 * @param {string} audioFile - The name of the audio file
 */
function getTranscriptionData(result_file_url, audioFile) {
    let outputPath = './data/audio/' + (audioFile.replace('.wav', '.json')); //Output file name
    let file = fs.createWriteStream(outputPath); //Create a empty file

    //Request the data
    https.get(result_file_url, (response) => {
        response.pipe(file);

        //Once request finish, get data
        file.on('finish', () => {
            file.close(() => {
                insertToJSON(outputPath, audioFile)
            });
        });
    }).on('error', (err) => console.error('Error downloading JSON file:', err));
}


/**
 * Insert audio transcribed data into a JSON file.
 * @memberof module:AWSServices
 * @param {string} outputPath - The path of the transcribed audio data JSON file.
 * @param {string} audioFile - The name of the audio file.
 */
function insertToJSON(outputPath, audioFile) {
    //One speaker data
    let newData = {
        timestamp: undefined,
        text: [],
        audio_file: undefined,
        experienceDetected: "",
        text_emotion: ""
    }

    //Format the comversation
    formatTheAudioJson(outputPath, newData)
        .then(() => {
            //Get the timestamp from the file name
            let str = audioFile.match(/\d+/);
            let timestamp = str ? parseInt(str[0], 10) : null;

            newData.audio_file = audioFile; //Add the audio file name
            newData.timestamp = timestamp; //Add the audio start timestamp

            try {
                if (newData.text.length > 0) {
                    //Read the final json file
                    fs.readFile(FILE_PATHS.AUDIO_TEXT_FILE_PATH, 'utf8', (err, data) => {
                        if (err) {
                            console.error('Error reading JSON file:', err);
                            return;
                        }

                        let experienceDetected = detectExterienceSampling(newData); //Detect/Get the experience recording in the extracted text from audio

                        setTimeout(() => {
                            if (experienceDetected != "") newData.experienceDetected = experienceDetected;
                            else newData.experienceDetected = undefined;

                            let dataObject = JSON.parse(data); //Parse the json data to object
                            dataObject.push(newData); //Add the new data to the file object

                            let dataJson = JSON.stringify(dataObject, null, 4); //Convert the object to json

                            //Write the json file
                            fs.writeFile(FILE_PATHS.AUDIO_TEXT_FILE_PATH, dataJson, 'utf8', (err) => {
                                if (err) console.error('Error updating JSON file:', err)
                            })
                        }, 1000)
                    })
                }
            } catch (e) {
                console.log('Error reading the audio json file.')
            }

            removeAJsonFile(outputPath); //Remove the json file(the transcribed file from one audio data)
        }).catch(err => {
            console.log('Error formating: ', err);
        })
}


/**
 * Format the conversation to JSON format.
 * @memberof module:AWSServices
 * @param {string} filePath - The path of the input file (from transcriber).
 * @param {object} respons - Object to store formatted data.
 * @returns {Promise} - Promise that resolves when formatting is complete.
 */
function formatTheAudioJson(filePath, respons) {
    return new Promise(async (resolve, reject) => {
        readJSONFile(FILE_PATHS.USER_FILE_PATH, (user) => {
            try {
                let words, content = '',
                    newSpeaker = false;

                //Read the input file/from transcriber
                readJSONFile(filePath, (data) => {
                    //One speaker data
                    let speakerData = {
                        speaker: undefined,
                        text: ''
                    }

                    extractEmotionsFromText(data.results.transcripts[0].transcript)
                        .then(emotion => {
                            respons.text_emotion = emotion;

                            return true;
                        }).then(() => {
                            words = data["results"]["items"]; //Get the extracted words

                            let s = 0; //Speakers count

                            for (let i in words) {
                                let speaker_label = words[i]["speaker_label"];

                                //Control the current speaker id
                                if (!speakerData.speaker) {
                                    speakerData.speaker = speaker_label; //Set the first speaker

                                    respons.text.push(speakerData); //Add the speakers data
                                    
                                } else if (speakerData.speaker != speaker_label) {
                                    newSpeaker = true;
                                    speakerData = {
                                        speaker: '',
                                        text: ''
                                    } //Clean the speaker data, prepare for the next speaker
                                }

                                respons.text[s].text = content.replace(/\s([.,?!])/g, '$1'); //Update the speaker speach

                                //Change the speaker
                                if (newSpeaker) {
                                    s++; //Next speaker
                                    speakerData.speaker = speaker_label; //Speaker data frame
                                    
                                    speakerData.text = '';
                                    content = '';

                                    respons.text.push(speakerData);
                                    respons.text[s].text = content.replace(/\s([.,?!])/g, '$1');

                                    newSpeaker = false;
                                } else {
                                    content += ' ';
                                }

                                content += words[i]["alternatives"][0]["content"]; //Add the next word
                                respons.text[s].text = content.replace(/\s([.,?!])/g, '$1');
                            }

                            processTextObject(respons, user.currentUser);

                            resolve();
                        }).catch(err => {
                            console.log('Error extracting emotions: ', err)
                        })
                });

            } catch (err) {
                reject(err);
            }
        })
    })
}


/**
 * Remove a JSON file.
 * @memberof module:AWSServices
 * @param {string} filePath - The path of the file to be removed.
 */
function removeAJsonFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err)
    });
}


/**
 * Detect user experience from the audio text.
 * @memberof module:AWSServices
 * @param {object} dataObject - Object containing transcribed audio data.
 * @returns {string|null} - Extracted experience text or null if not found.
 */
function detectExterienceSampling(dataObject) {
    let str = "",
        data = dataObject.text;

    //Concatinate the discusion in one string
    for (let i = 0; i < data.length; i++)
        str += data[i].text + " ";

    //Define the patterns
    const pattern1 = new RegExp(`${EXPERIENCE_CONFIG.EXPERIENCE_START_KEYWORDS}(.*?)(?:${EXPERIENCE_CONFIG.EXPERIENCE_END_KEYWORDS})`, 'i'); //Patttern, start and end phrases
    const pattern2 = new RegExp(`${EXPERIENCE_CONFIG.EXPERIENCE_START_KEYWORDS}(.*?)(?:${EXPERIENCE_CONFIG.EXPERIENCE_END_KEYWORDS}|\\b.{0,${EXPERIENCE_CONFIG.EXPERIENCE_AUTO_LENGTH}}\\b)`, 'i'); //Pattern, start - no end

    //Find matches
    const match1 = pattern1.exec(str);
    const match2 = pattern2.exec(str);

    //Get the result if match is not null
    if (match1 || match2) {
        let extractedText = '';

        // Extract the matched text
        if (match1 && match1[1] != '') extractedText = match1[1].trim();
        else extractedText = (match2[0].trim()).slice(14);

        return extractedText;
    } else {
        return null;
    }
}


/**
 * Extract emotions from text using AWS Comprehend.
 * @memberof module:AWSServices
 * @param {string} text - The input text for emotion extraction.
 * @returns {Promise<object>} - A promise that resolves to the emotion detection result.
 */
function extractEmotionsFromText(text) {
    return new Promise(async (resolve, reject) => {
        try {
            const params = {
                LanguageCode: 'en',
                Text: text
            };
            const result = await comprehend.detectSentiment(params).promise();

            resolve(result);
        } catch (error) {
            reject(error)
        }
    });
}

/**
 * Concatenate audio file to user intro.
 * @memberof module:AWSServices
 * @param {string} wavFile - The path of the audio file to be concatenated.
 * @param {function} callback - Callback function to be called after the concatenation is complete.
 */
function concatinateWavFiles(wavFile, callback) {
    let fileEndTimestamp = extractTimestamp(wavFile),
        filePath = FILE_PATHS.CONVERTED_AUDIO + "audio_" + fileEndTimestamp + ".wav";

    let userIntro = FILE_PATHS.USER_INTRO_AUDIO_PATH;
    let userIntroConverted = './data/user/userIntroConverted.wav';   
    
    //Convert the User audio intro and concatinate the files
    exec(`sox ${userIntro} -r 44100 -c 1 ${userIntroConverted}`, (conversionError) => {
        if (conversionError) {
            console.error('Error during file conversion:', conversionError);
        } else {
            console.log('first', wavFile)
            const command = `sox ${userIntroConverted} ${wavFile} ${filePath}`;
            
            exec(command, (concatenationError) => {
                if (concatenationError) {
                    console.error('Error during concatenation:', concatenationError);
                } else {
                    console.log('Concatenation successful');

                    fs.unlink(wavFile, (unlinkError) => {
                        if (unlinkError) {
                            console.error('Error removing original audio file:', unlinkError);
                        } else {
                            console.log('Original audio file removed');
                        }
        
                        callback();
                    });
                }
            });

            
        }
    })
}


/**
 * Remove the user introduction text from the conversation and label him.
 * @memberof module:AWSServices
 * @param {object} inputObject - Object containing transcribed audio data.
 * @param {string} username - The username used for labeling the speaker.
 */
function processTextObject(inputObject, username) {
    if (inputObject && inputObject.text && Array.isArray(inputObject.text)) {
        inputObject.text.shift();   //Remove the first element from the 'text' array

        //Rename 'speaker' to 'username' if it is equal to 'spk_0'
        inputObject.text.forEach((item) => {
            if (item.speaker === 'spk_0') {
                item.speaker = username;
            }
        });
    }
}


//Run image objects labeling
function runImageObjectLabelling(imagePath, callback) {
    let rekognition = new AWS.Rekognition();

    let image = fs.readFileSync(imagePath);

    let params = {
        Image: {
            Bytes: image
        }
    }

    //Detect image labells
    rekognition.detectLabels(params, (err, data) => {
        if(err) {
            console.log('Error labeling image objects: ', err)
            callback();
        } else {
            let imageName = imagePath.replace('./data/images/', '');

            try {
                let dataLabels = data.Labels;

                dataLabels.forEach(label => {
                    delete label.Instances;
                });

                let formatedLabels = {
                    image: imageName,
                    labels: dataLabels
                }

                fs.readFile(FILE_PATHS.IMAGE_LABELS_FILE_PATH, 'utf8', (error, dataJson) => {
                    if(error) {
                        console.log('Error reading JSON file: ', error);
                    }

                    let objectData;

                    try {
                        objectData = JSON.parse(dataJson);
                    } catch {
                        console.log('Error parsing JSON data.'); 
                    }

                    objectData.push(formatedLabels);

                    let jsonData = JSON.stringify(objectData, null, 2); //Convert the object to json

                    //Write the json file
                    fs.writeFile(FILE_PATHS.IMAGE_LABELS_FILE_PATH , jsonData, 'utf8', (err) => {
                        if (err) console.error('Error updating JSON file:', err)
                    })
                })
                
            } catch {
                console.log('Error writing labelled images data into JSON file!');
            }

            callback();
        }
    })
}


export {
    sendAudioToAWSS3,
    insertToJSON,
    detectExterienceSampling,
    concatinateWavFiles,
    runImageObjectLabelling
}