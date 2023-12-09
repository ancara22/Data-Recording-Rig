import AWS from 'aws-sdk';
import fs from 'fs';
import https from 'https';
import { readJSONFile, concatinateWavFiles } from "./utility.js";
import { FILE_PATHS,  EXPERIENCE_START_KEYWORDS, EXPERIENCE_END_KEYWORDS, EXPERIENCE_AUTO_LENGTH } from "./server_settings.js";

AWS.config.update({ region: 'eu-west-2' });

const transcribeService = new AWS.TranscribeService(); //Init AWS Transcriber
const S3 = new AWS.S3(); //Init AWS S3 Bucket
const comprehend = new AWS.Comprehend(); //Init AWS Comprehend


//Insert audio file to the AWS S3 Bucket 
function sendAudioToAWSS3(audioFile) {
    let filePath = FILE_PATHS.ROW_AUDIO_FOLDER_PATH + audioFile;

    concatinateWavFiles(filePath);

    //Configure the AWS bucket
    const bucketName = 'audiobucketfortranscirber';

    fs.readFile(filePath, (err, data) => {
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
}

//Create and run the Transcriber job on the AWS Transcriber service
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

//Request to the AWS Trascriber job, to get the job status
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

//Get Transcriber output
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

//Insert audio transcribed data in an json file
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

                            let dataJson = JSON.stringify(dataObject); //Convert the object to json

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
        })
}

//Format the conversation to json format
function formatTheAudioJson(filePath, respons) {
    return new Promise(async (resolve, reject) => {
        readJSONFile(FILE_PATHS.USER_INTRO_AUDIO_PATH, (user) => {
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

                    extractEmotionsFromText(data.text)
                        .then(emotion => {
                            console.log('resp', emotion)
                            respons.text_emotion = emotion;

                            return true;
                        }).then(() => {
                            words = JSON.parse(data)["results"]["items"]; //Get the extracted words

                            let s = 0; //Speakers count

                            for (let i in words) {
                                let speaker_label = words[i]["speaker_label"];

                                //Control the current speaker id
                                if (!speakerData.speaker) {
                                    speakerData.speaker = speaker_label; //Set the first speaker

                                    if (speakerData.speaker == "spk_0")
                                        speakerData.speaker = user.currentUser;

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

                            resolve();
                        })
                });

            } catch (err) {
                reject(err);
            }
        })
    })





}

//Remove the a file
function removeAJsonFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err)
    });
}

//Detect user exterience from the audio text
function detectExterienceSampling(dataObject) {
    let str = "",
        data = dataObject.text;

    //Concatinate the discusion in one string
    for (let i = 0; i < data.length; i++)
        str += data[i].text + " ";

    //Define the patterns
    const pattern1 = new RegExp(`${EXPERIENCE_START_KEYWORDS}(.*?)(?:${EXPERIENCE_END_KEYWORDS})`, 'i'); //Patttern, start and end phrases
    const pattern2 = new RegExp(`${EXPERIENCE_START_KEYWORDS}(.*?)(?:${EXPERIENCE_END_KEYWORDS}|\\b.{0,${EXPERIENCE_AUTO_LENGTH}}\\b)`, 'i'); //Pattern, start - no end

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

//Extract wmotions from text using AWS Comprehend
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



export {
    sendAudioToAWSS3,
    insertToJSON,
    detectExterienceSampling
}