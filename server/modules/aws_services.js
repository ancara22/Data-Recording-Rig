import AWS from 'aws-sdk';
import fs from 'fs';
import https from 'https'

AWS.config.update({
    region: 'eu-west-2'
});

let transcribeService = new AWS.TranscribeService();        //Init AWS Transcriber
const s3 = new AWS.S3();                                    //Init AWS S3 Bucket


//Insert audio file to the AWS S3 Bucket 
function sendAudioToAWSS3(audioFile) {
    let filePath = "./data/audio/row_audio/" + audioFile;
    
    //Configure the AWS bucket
    const bucketName = 'audiobucketfortranscirber';
    
    fs.readFile(filePath, (err, data) => {
        if(err) console.log('File reading error: ', err)

        //Upload the audio file to the AWS S3 bucket
        s3.upload({
            Bucket: bucketName,
            Key: audioFile,
            Body: data
        }, (error, result) => {
            if(error) {
                console.log('Error uploading the audio file to the bucket:', error);
            } else {
                transcribeTheAudioFile(audioFile) //Run the Transcriber job
            }
        })
    }); 
}


//Create and run the Transcriber job on the AWS Transcriber service
function transcribeTheAudioFile(audioFile) {
    let transcriptionJobName = "audioT_" +  audioFile.replace('.wav', '');  //Create a unic job name
        
    //Job params
    const params = {
        TranscriptionJobName: transcriptionJobName,
        LanguageCode: "en-US",
        Media: {
          MediaFileUri: "s3://audiobucketfortranscirber/" + audioFile,
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
        if (err)  {
            console.log(err, err.stack); 
        } else {
            getTranscriptionStatus(transcriptionJobName, audioFile); //Check the job status
        }    
    });  
}    


//Request to the AWS Trascriber job, to get the job status
function getTranscriptionStatus(transcriptionJobName, audioFile) {
    //Send the request
    transcribeService.getTranscriptionJob({TranscriptionJobName:  transcriptionJobName}, (err, data) => {
        //Check connection
        if(err) {
            console.log('Transcriber Job error:', err);
            return 0;
        }
        
        //Get the status
        let job_status = data.TranscriptionJob.TranscriptionJobStatus;

        //Manage the status
        if(job_status == 'FAILED') {
            console.log('Transcriber process error!');
        } else if(job_status == 'COMPLETED') {
            console.log('Transcriber process completed!')

            //Get the Trascriber result file url
            let result_file_url = data.TranscriptionJob.Transcript.TranscriptFileUri;

            getTranscriptionData(result_file_url, audioFile); //Get the Transcriber data from the url
        } else {
            //Repeat the request, if there is no result yet
            setImmediate(() => { getTranscriptionStatus(transcriptionJobName, audioFile) }, 20000);
        }
    })
}


//Get Transcriber output
function getTranscriptionData(result_file_url, audioFile) {
    let outputPath = './data/audio/' + (audioFile.replace('.wav', '.json')); //Output file name

    //Create a empty file
    let file = fs.createWriteStream(outputPath);

    //Request the data
    https.get(result_file_url, (response) => {
        response.pipe(file);
        
        //Once request finish, get data
        file.on('finish', () => {
            file.close(() => {
                insertToJSON(outputPath, audioFile)
            });
        });
    
    }).on('error', (err) => {
        console.error('Error downloading JSON file:', err);
    });
}


//Insert audio transcribed data in an json file
function insertToJSON(outputPath, audioFile) {
    let final_file_path = './data/audio/audio_text.json';

    //One speaker data
    let newData = {
        timestamp: undefined,
        text: [],
        audio_file: undefined,
        experienceDetected: ""
    }

    formatTheAudioJson(outputPath, newData);    //Format the comversation

    setTimeout(()=> {
        let str = audioFile.match(/\d+/);           //Get the timestamp from the file name
        let timestamp = str ? parseInt(str[0], 10) : null;  

        newData.audio_file = audioFile;     //Add the audio file name
        newData.timestamp = timestamp;      //Add the audio start timestamp

        try {
            if(newData.text.length > 0) {
                //Read the final json file
                fs.readFile(final_file_path, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading JSON file:', err);
                        return;
                    }

                    let experienceDetected = detectExterienceSampling(newData)
                    

                    setTimeout(() => {
                        if(experienceDetected != "") {
                            newData.experienceDetected = experienceDetected;
                        } else {
                            newData.experienceDetected = undefined
                        }


                        let dataObject = JSON.parse(data);  //Parse the json data to object
                        dataObject.push(newData);           //Add the new data to the file object

                        let dataJson = JSON.stringify(dataObject);      //Convert the object to json

                        
                        //Write the json file
                        fs.writeFile(final_file_path, dataJson, 'utf8', (err) => {
                            if (err) {
                            console.error('Error updating JSON file:', err);
                            }
                        })
                    }, 1000)
                    
                })
            }
        } catch(e) {
            console.log('Error reading the audio json file.')
        }

        removeAJsonFile(outputPath);  //Remove the json file(the transcribed file from one audio data)
        
    }, 1000)
}


//Format the conversation to json format
function formatTheAudioJson(filePath, respons) {
    let words, content = '', newSpeaker = false;

    //Read the input file/from transcriber
    fs.readFile(filePath, (err, data) => {
        //One speaker data
        let speakerData = {
            speaker: undefined,
            text: '' 
        }

        words = JSON.parse(data)["results"]["items"];   //Get the extracted words

        let s = 0; //speaker count

        for(let i in words) {
            let speaker_label = words[i]["speaker_label"]; 

            //Control the current speaker id
            if(!speakerData.speaker) {
                speakerData.speaker = speaker_label;        //Set the first speaker
                respons.text.push(speakerData);             
            } else if(speakerData.speaker != speaker_label) {
                newSpeaker = true;  
                speakerData = {
                    speaker: '',
                    text: '' 
                }    
            }

            respons.text[s].text = content.replace(/\s([.,?!])/g, '$1'); //Update the speaker speach

            //Change the speaker
            if(newSpeaker) {
                s++;

                speakerData.speaker = speaker_label;
                speakerData.text = '';

                content = '';
                respons.text.push(speakerData);
                respons.text[s].text = content.replace(/\s([.,?!])/g, '$1');

                newSpeaker = false;
            } else {
                content += ' ';
            }

            //Add the next word
            content += words[i]["alternatives"][0]["content"];

            respons.text[s].text = content.replace(/\s([.,?!])/g, '$1');
        }

    });
    
   
}


//Remove the a file
function removeAJsonFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error removing file:', err);
        }
    });
}


function detectExterienceSampling(dataObject) {
    let str = "";
    let data = dataObject.text;

    let startWords = "Start Recording";
    let endWords = "Stop Recording";
    let endMissing = 100;

    for(let i=0; i < data.length; i++) {
        str += data[i].text + " ";
    }

    const pattern1 = new RegExp(`${startWords}(.*?)(?:${endWords})`, 'i');
    const pattern2 = new RegExp(`${startWords}(.*?)(?:${endWords}|\\b.{0,${endMissing}}\\b)`, 'i');
    
    const match1 = pattern1.exec(str);
    const match2 = pattern2.exec(str);

    if (match1 || match2) {
        let extractedText = '';

        if(match1 && match1[1] != '') {
            // Extract the matched text
            extractedText = match1[1].trim();

        } else {
            extractedText = (match2[0].trim()).slice(7);
        }
        
        console.log('Found:', extractedText);
        return extractedText;
    } else {
        console.log('No match found');
        return null;
    }
}


export {
    sendAudioToAWSS3,
    insertToJSON,
    detectExterienceSampling
}