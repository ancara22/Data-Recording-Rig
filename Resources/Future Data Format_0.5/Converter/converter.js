

import fs from 'fs';


//Convert the old session file into new files format
function convertSessionFile(filePath) {
    fs.readFile(filePath, (err, data) => {
        if(err) {
            console.log('Error reading file: ', err);
            return
        }

        let fileContent = JSON.parse(data);
    
        generateRecordFile(fileContent);
        generateAnalysisFile(fileContent);
    })
    
}

//Write the JSON file
function writeFile(filePath, data) {
    fs.writeFile(filePath, JSON.stringify(data), (err) => {
        if(err) {
            console.log('Error writing file: ', err)
            return;
        }
    });
}

//Generate the Records JSON file
function generateRecordFile(fileContent) {
    let gsrRecords = [];
    let audioRecords = [];
    let imageRecords = [];
    let eegRecords = [];

    fileContent.data.gsr.forEach(element => {
        element.section.forEach(gsrValue => {
            let timestamp = Object.keys(gsrValue)[0];
            const value = gsrValue[timestamp];
            timestamp = parseInt(timestamp);

            gsrRecords.push({
                time: timestamp,
                value: value
            });
        });
    });


    fileContent.data.audio.forEach(element => {
        audioRecords.push({
            time: element.time,
            duration: 1 * 60 * 1000,
            URI: element.file
        })
    })

    fileContent.data.image.text.forEach(element => {
        imageRecords.push({
            time: element.time,
            URI: element.file
        })
    })

    fileContent.data.eeg.rawEEG.forEach(element => {
        let {time, ...rest } = element 
        eegRecords.push({
            time: time,
            values: rest
        })
    })

    let recordFileData = {
        "$schema": "./record_schema_0.6.json",
        head: {
            time: fileContent.head.time,
            duration: fileContent.head.duration,
            user: fileContent.head.user,
            version: fileContent.head.version,
            blockchain: fileContent.head.blockchain
        },
        body: {
            gsr: gsrRecords,
            eeg: {
                rawEEG: eegRecords
            },
            audio: audioRecords,
            images: imageRecords,
            des: {
                startPhrase: "start Ziggy",
                endPhrase: "stop Ziggy"
            }
        }
    }

    writeFile("./output/record_0.6.json", recordFileData);


}

//Generate the Analysis JSON file
function generateAnalysisFile(fileContent) {
    let audioAnalysisText = [];
    let audioAnalysisemotions = [];
    let imageText = [];
    let gsrValue = []

    let eegData = fileContent.data.eeg;
    let audioData = fileContent.data.audio;
    let imageData = fileContent.data.image;
    let gsrData = fileContent.data.gsr;


    audioData.forEach(element => {
        audioAnalysisText.push({
            time: element.time,
            conversation: element.text
        })

        audioAnalysisemotions.push({
            time: element.time,
            sentiment: element.sentiment
        })
    });

    imageData.text.forEach(element => {
        imageText.push({
            time: element.time,
            text: element.text
        })
    });

    gsrData.forEach(element => {
        gsrValue.push({
                time: element.time,
                state: element.sentiment
            
        })
       
    });
    
    let analysisFileData = {
        "$schema": "./analysis_schema_0.6.json",
        "recordURI": "./record_example_0.6.json.",
        streamAnalysis: {
            gsr: {
                state: gsrValue
            },
            eeg: {
                faceExpression: eegData.expression,
                cognition: eegData.cognition,
                bandPower: eegData.frequencyAnalysis
            },
            audio: {
                text: audioAnalysisText,
                sentiment: audioAnalysisemotions
            },
            images: {
                text: imageText,
                labels: imageData.labels.labels
            }
        },
        globalAnalysis: {
            emotion: fileContent.data.overallSentiment
        }

    }

   writeFile("./output/analysis_0.5.json", analysisFileData);
}

convertSessionFile('./session_1711661371458.json');