

import fs, { write } from 'fs';


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
        createDeviceFile("./output/device_0.6.json");

        console.log('Conversion finished!')
    })
    
}

function createDeviceFile(filePath) {
    fs.readFile(filePath, (err, data) => {
        if(err) {
            console.log('Error reading file: ', err);
            return
        }

        let device = JSON.parse(data);


        writeFile("./output/device_0.6.json", device);
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
                time: timestamp * 1000,
                value: value
            });
        });
    });


    fileContent.data.audio.forEach(element => {
        audioRecords.push({
            time: element.time * 1000,
            duration: 1 * 60 * 1000,
            URI: element.file
        })
    })

    fileContent.data.image.text.forEach(element => {
        imageRecords.push({
            time: element.time * 1000,
            URI: element.file
        })
    })

    fileContent.data.eeg.rawEEG.forEach(element => {
        let {time, ...rest } = element 
        eegRecords.push({
            time: parseInt(time * 1000),
            values: rest
        })
    })

    let recordFileData = {
        "$schema": "../../Data Format_0.6/Schema_0.6/record_schema_0.6.json",
        head: {
            time: fileContent.head.time,
            duration: fileContent.head.duration,
            user: fileContent.head.user,
            version: fileContent.head.version,
            device: {
                name: "RIG",
                URI: "./device_0.6.json"
            },
            blockchain: fileContent.head.blockchain
        },
        body: {
            gsr: gsrRecords,
            eeg: eegRecords,
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
    let faceExpressions = []
    let cognitions = []
    let frecvencyPowers = []
    let imageLabels = []

    let eegData = fileContent.data.eeg;
    let audioData = fileContent.data.audio;
    let imageData = fileContent.data.image;
    let gsrData = fileContent.data.gsr;

    
    eegData.expression.forEach(element => {
        let { time, ...expression} = element;

        faceExpressions.push({
            time: parseInt(element.time * 1000),
            expression
        })
    });

    eegData.cognition.forEach(element => {
        let { time, ...states } = element;

        cognitions.push({
            time:parseInt(element.time * 1000),
            states
        })
    })


    eegData.frequencyAnalysis.forEach(element => {
        frecvencyPowers.push({
                  time: parseInt(element.time * 1000),
                  values: {
                    "AF3": {
                        "theta": element.bandPower["AF3/theta"],
                        "alpha": element.bandPower["AF3/alpha"],
                        "betaL": element.bandPower["AF3/betaL"],
                        "betaH": element.bandPower["AF3/betaH"],
                        "gamma": element.bandPower["AF3/gamma"],
                    },
                    "F7": {
                        "theta": element.bandPower["F7/theta"],
                        "alpha": element.bandPower["F7/alpha"],
                        "betaL": element.bandPower["F7/betaL"],
                        "betaH": element.bandPower["F7/betaH"],
                        "gamma": element.bandPower["F7/gamma"],
                    },
                    "F3": {
                        "theta": element.bandPower["F3/theta"],
                        "alpha": element.bandPower["F3/alpha"],
                        "betaL": element.bandPower["F3/betaL"],
                        "betaH": element.bandPower["F3/betaH"],
                        "gamma": element.bandPower["F3/gamma"],
                    },
                    "FC5": {
                        "theta": element.bandPower["FC5/theta"],
                        "alpha": element.bandPower["FC5/alpha"],
                        "betaL": element.bandPower["FC5/betaL"],
                        "betaH": element.bandPower["FC5/betaH"],
                        "gamma": element.bandPower["FC5/gamma"],
                    },
                    "T7": {
                        "theta": element.bandPower["T7/theta"],
                        "alpha": element.bandPower["T7/alpha"],
                        "betaL": element.bandPower["T7/betaL"],
                        "betaH": element.bandPower["T7/betaH"],
                        "gamma": element.bandPower["T7/gamma"],
                    },
                    "P7": {
                        "theta": element.bandPower["P7/theta"],
                        "alpha": element.bandPower["P7/alpha"],
                        "betaL": element.bandPower["P7/betaL"],
                        "betaH": element.bandPower["P7/betaH"],
                        "gamma": element.bandPower["P7/gamma"],
                    },
                    "O1": {
                        "theta": element.bandPower["O1/theta"],
                        "alpha": element.bandPower["O1/alpha"],
                        "betaL": element.bandPower["O1/betaL"],
                        "betaH": element.bandPower["O1/betaH"],
                        "gamma": element.bandPower["O1/gamma"],
                    },
                    "O2": {
                        "theta": element.bandPower["O2/theta"],
                        "alpha": element.bandPower["O2/alpha"],
                        "betaL": element.bandPower["O2/betaL"],
                        "betaH": element.bandPower["O2/betaH"],
                        "gamma": element.bandPower["O2/gamma"],
                    },
                    "P8": {
                        "theta": element.bandPower["P8/theta"],
                        "alpha": element.bandPower["P8/alpha"],
                        "betaL": element.bandPower["P8/betaL"],
                        "betaH": element.bandPower["P8/betaH"],
                        "gamma": element.bandPower["P8/gamma"],
                    },
                     "T8": {
                        "theta": element.bandPower["T8/theta"],
                        "alpha": element.bandPower["T8/alpha"],
                        "betaL": element.bandPower["T8/betaL"],
                        "betaH": element.bandPower["T8/betaH"],
                        "gamma": element.bandPower["T8/gamma"],
                    },
                    "FC6": {
                        "theta": element.bandPower["FC6/theta"],
                        "alpha": element.bandPower["FC6/alpha"],
                        "betaL": element.bandPower["FC6/betaL"],
                        "betaH": element.bandPower["FC6/betaH"],
                        "gamma": element.bandPower["FC6/gamma"],
                    },
                    "F4": {
                        "theta": element.bandPower["F4/theta"],
                        "alpha": element.bandPower["F4/alpha"],
                        "betaL": element.bandPower["F4/betaL"],
                        "betaH": element.bandPower["F4/betaH"],
                        "gamma": element.bandPower["F4/gamma"],
                    },
                    "F8": {
                        "theta": element.bandPower["F8/theta"],
                        "alpha": element.bandPower["F8/alpha"],
                        "betaL": element.bandPower["F8/betaL"],
                        "betaH": element.bandPower["F8/betaH"],
                        "gamma": element.bandPower["F8/gamma"],
                    },
                    "AF4": {
                        "theta": element.bandPower["AF4/theta"],
                        "alpha": element.bandPower["AF4/alpha"],
                        "betaL": element.bandPower["AF4/betaL"],
                        "betaH": element.bandPower["AF4/betaH"],
                        "gamma": element.bandPower["AF4/gamma"],
                    }
                }
        }) 
    })

    let bandPower = {
        "bands": {
          "theta": {
            "minimum": 4,
            "maximum": 8
          },
          "alpha": {
            "minimum": 8,
            "maximum": 12
          },
          "betaL": {
            "minimum": 12,
            "maximum": 16
          },
          "betaH": {
            "minimum": 16,
            "maximum": 25
          },
          "gamma": {
            "minimum": 25,
            "maximum": 45
          }
        }
    }

    bandPower.power = frecvencyPowers;

    audioData.forEach(element => {
        let speakers = ""

        element.text.forEach(conv => {
            if(!speakers.includes(conv.speaker)) {
                speakers != "" ? speakers += ", ": '';
                speakers += conv.speaker;
            }
           

            audioAnalysisText.push({
                time: element.time * 1000,
                speaker: conv.speaker,
                text: conv.text
            })
        });

        audioAnalysisemotions.push({
            time: element.time * 1000,
            speaker: speakers,
            sentiment: element.sentiment
        })
    });

    imageData.text.forEach(element => {
        let text = element.text.replace(/[()\[\]\{\}\\<>]/g, '') 
                  .replace(/\s\s+/g, ' ')       
                  .replace(/[\n\r]/g, '')          
                  .replace(/[^\w\s]|_/g, '')   
                  .replace(/\s+/g, ' ')
                  .replace(/\"/g, '');

        console.log('text', text)

        imageText.push({
            time: element.time * 1000,
            text
        })
        
    });

    imageData.labels.forEach(element => {
        let timestamp = parseInt(element.image.match(/\d+/)[0]) * 1000;
        let labels = element.labels;

        labels.forEach(entry => {
            imageLabels.push({
                time: timestamp,
                name: entry.Name,
                parents: entry.Parents,
                aliases: entry.Aliases,
                categories: entry.Categories,
                confidence: entry.Confidence
               
            })
        });
        
    });

   
    gsrData.forEach(element => {
        let state = 0;

        if(element.sentiment == "Relaxing State") {
            state = 0.3
        } else if(element.sentiment == "Normal State") {
            state = 0.1
        } else if(element.sentiment == "Stress State") {
            state = 0.6
        } else if(element.sentiment == "High Stress State") {
            state = 0.9
        }

        gsrValue.push({
                time: element.time * 1000,
                state: {
                    level: state
                }
            
        })
       
    });
    
    let analysisFileData = {
        "$schema": "../../Data Format_0.6/Schema_0.6/analysis_schema_0.6.json",
        "recordURI": "./record_0.6.json.",
        streamAnalysis: {
            gsr: {
                state: gsrValue
            },
            eeg: {
                faceExpression: faceExpressions,
                cognition: cognitions,
                bandPower: bandPower
            },
            audio: {
                text: audioAnalysisText,
                sentiment: audioAnalysisemotions
            },
            images: {
                text: imageText,
                labels: imageLabels
            }
        }

    }

   writeFile("./output/analysis_0.6.json", analysisFileData);
}

convertSessionFile('/Users/dionisbarcari/Documents/Courseworks/Final-Coursework/RIG/Resources/Current Data Example/session_1712236502822.json');