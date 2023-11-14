import AWS from 'aws-sdk';
import fs from 'fs';
import https from 'https'

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
                //jsonToText(outputPath) //Convert aditionaly the speach in readable form
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
    }

    formatTheAudioJson(outputPath, newData);    //Format the comversation

    let str = audioFile.match(/\d+/);           //Get the timestamp from the file name
    let timestamp = str ? parseInt(str[0], 10) : null;  

    newData.audio_file = audioFile;     //Add the audio file name
    newData.timestamp = timestamp;      //Add the audio start timestamp

    try {
        //Read the final json file
        fs.readFile(final_file_path, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                return;
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
        })
    } catch(e) {
        console.log('Error reading the audio json file.')
    }

    removeAJsonFile(outputPath);  //Remove the json file(the transcribed file from one audio data)
    
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

            respons.text[s].text = content; //Update the speaker speach

            //Change the speaker
            if(newSpeaker) {
                s++;

                speakerData.speaker = speaker_label;
                speakerData.text = '';

                content = '';
                respons.text.push(speakerData);
                respons.text[s].text = content;

                newSpeaker = false;
            } else {
                content += ' ';
            }

            //Add the next word
            content += words[i]["alternatives"][0]["content"];

            respons.text[s].text = content;
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



export {
    sendAudioToAWSS3
}