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
    let outputPath = './data/audio/audio_text/' + (audioFile.replace('.wav', '.json')); //Output file name

    //Create a empty file
    let file = fs.createWriteStream(outputPath);

    //Request the data
    https.get(result_file_url, (response) => {
        response.pipe(file);

        //Once request finish, get data
        file.on('finish', () => {
            file.close(() => {
                jsonToText(outputPath) //Convert aditionaly the speach in readable form
            });
        });
    }).on('error', (err) => {
        console.error('Error downloading JSON file:', err);
    });
}


//Convert the Transcriber JSON output in a clear text form
function jsonToText(filePath) {
    //Read the JSon file
    fs.readFile(filePath, (err, data) => {
        try {
            let words = JSON.parse(data)["results"]["items"];   //Get the extracted words
            let content = words[0]["speaker_label"] + ":";      //Final string builder
            let newSpeaker = false;                             //Detect skeaker change
            let speaker;                                        //Speaker id

            for(let i in words) {
                let speaker_label = words[i]["speaker_label"];

                //Control the current speaker id
                if(speaker == undefined) {
                    speaker = speaker_label;
                } else if(speaker != speaker_label) {  
                    speaker = speaker_label;
                    newSpeaker = true;      
                }

                //Change the speaker
                if(newSpeaker) {
                    content += "\n" + speaker + ': ';
                    newSpeaker = false;
                } else {
                    content += ' ';
                }

                //Add the next word
                content += words[i]["alternatives"][0]["content"];
            }

            //Write the conversation to a file
            fs.writeFile(filePath.replace('.json', '.txt'), content.replace(/\s([.,?!])/g, '$1'), (err) => {
                if(err) console.log('err', err);
            });
        } catch(e) {
            console.log(e)
        }
    })
}


function gettextSentiment() {
    
}


export {
    sendAudioToAWSS3
}