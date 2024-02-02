const vueApp = new Vue({
    el: '#app',
    data: {
        pageContent            : '',           //Page content manager
        graphInterval          : null,         //Graph update interval
        rigActive              : false,        //Rig status
        statusText             : 'OFFLINE',    //Rig status label
        startTime              : false,        //Rig start time
        tempColorGray          : false,        //Temp button colors status
        emotionsList           : [],           //GSR Emotions list from the server
        isUserMenuDisplayed    : true,         //To display the user menu or not
        userName               : '',           //Current user name
        oldUsername            : '',           //Old user name
        audioData              : null,         //Recorded Audio data
        recording              : false,        //Audio Recording status
        recordingTimer         : 15,           //Audio Recording timer
        hideAudioRecording     : true,         //Show/hide audio recording menu
        isRunDisabled          : true,         //Disable the Start button
        imageText              : [],           //Images extracted text
        audioText              : [],           //Audio extracted text and emotions
        imagesNumber           : 0,            //Images counter
        audioNumber            : 0,            //Audio counter
        gsrTime                : '00hh 00mm',            //Gsr counter
        sessionsList           : [],
        outputSessionContent   : {},
        selectedFile           : null,
        currentImageURL        :  './public/no-image.jpg',
        selectedImageName      : undefined,
        imageList              : [],
        audioList              : [],
        currentAudioFile       : '',
        metricNames            : ["At", "2", "3", "4", "5", "6"],

        //Rig image configurations
        imageSettings: {
            frequence   : undefined,
            framerate   : undefined,
            size_x      : undefined,
            size_y      : undefined,
            host        : '',
        },

        //Rig audio configurations
        audioSettings: {
            frequence   : undefined,
            sampleRate  : undefined,
            chunk       : undefined,
            host        : undefined
        },

        //Rig GSR configurationss
        gsrSettings: {
            frequence   : undefined,
            host        : undefined
        },

        //Rig connection configurations
        connectionSettings: { host: undefined }
    },

    mounted() {
        this.getGSREmotions();  //Get GSR data 

        //Set the default gape
        const page = localStorage.getItem('page');

        if(page !== null && page !== undefined) {
            this.pageContent = page 
        } else {
            localStorage.setItem('page', 'settings');
            this.pageContent = localStorage.getItem('page');
        }
        
        setInterval(()=> this.getRigStatus(), 1000);    //Check the Rig Status in interval of time

        this.readConfigFile();                          //Get the config file data

        this.pageContent =='data' ? this.getGSRdata() : clearInterval(this.graphInterval);   //Clear the GSR updating interval on page change

        this.getAllSessionsNames(); //Get all the recorded session files

        this.currentImageURL = this.currentImageURL ?   this.currentImageURL: './public/no-image.jpg';

      
    },

    watch: {
        //Control the page content
        pageContent: function(newPage, oldPage) {
            //Control the GSR graph updates
            if(oldPage == 'data') clearInterval(this.graphInterval);

            newPage == "data" ? localStorage.setItem('page', 'data') : localStorage.setItem('page', 'settings');
            
            //Start the GSR grpath updating
            if(newPage == 'data') {
                this.getGSRdata();
                this.getAudioText();
                this.getImageText();

                this.graphInterval = setInterval(()=> this.getGSRdata(), 1000);
            } 

            if(this.pageContent == "history") {
                this.renderGSRSEssionPlot();
                this.getAllImagesNames();
                this.getAllAudioFiles();

                setTimeout(() => {
                    this.renderRowEEGCharts();
                }, 500)
               
               
            }
        },

        //Manage rig status interface
        rigActive: function(newStatus, oldStatus) {
            newStatus == true ? this.statusText = 'ONLINE' : this.statusText = 'OFFLINE';
        }

    },

    methods: {
        //Get the server side configuration file
        readConfigFile() {
            fetch('/getConfig')
                .then(res => res.json())
                .then(data => {
                    //Get the image recording configs
                    let imgConfig = data["config"]['image'];
                    this.imageSettings.frequence = parseFloat(imgConfig.frequence);
                    this.gsrSettings.frequence = parseFloat(imgConfig.frequence);
                    this.imageSettings.framerate = parseFloat(imgConfig.framerate);
                    this.imageSettings.host = imgConfig.image_host;
                    this.imageSettings.size_x = parseFloat(imgConfig.mainX);
                    this.imageSettings.size_y = parseFloat(imgConfig.mainY);

                    //Get the audio recording configs
                    const audioConfig = data["config"]['audio'];

                    this.audioSettings.frequence = parseFloat(audioConfig.frequence);
                    this.audioSettings.sampleRate = parseFloat(audioConfig.samp_rate);
                    this.audioSettings.chunk = parseFloat(audioConfig.chunk);
                    this.audioSettings.host = audioConfig.audio_host;

                    //Get the gsr recordign configs
                    this.gsrSettings.host = data["config"]['GSR'].gsr_host;
                    this.connectionSettings.host = data["config"]['CONNECTION'].host;
                }).catch(error => console.error('Error geting config file:', error));
        },

        //Save the configs and send to the server
        saveConfigFile() {
            fetch("/saveConfig", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    //configurations file body
                    config: {
                        CONNECTION: {
                            host: this.connectionSettings.host
                        },
                        GSR: {
                            gsr_host: this.gsrSettings.host,
                            frequence: this.imageSettings.frequence
                        },
                        audio: {
                            audio_host: this.audioSettings.host, 
                            frequence: this.audioSettings.frequence, 
                            dev_index: "0", 
                            samp_rate: this.audioSettings.sampleRate,
                            chunk: this.audioSettings.chunk
                        },
                        image: {
                            image_host: this.imageSettings.host, 
                            frequence: this.imageSettings.frequence, 
                            framerate: this.imageSettings.framerate, 
                            mainX: this.imageSettings.size_x, 
                            mainY: this.imageSettings.size_y,
                            loresX: "640",
                            loresY: "480"
                        } 
                    }
                }),
              }).then(response => response.json())
                .then(responseData => console.log('Server response:', responseData))
                .catch(error => console.error('Error:', error));
        },

        //Get the rig status
        getRigStatus() {
            fetch("/rigStatus")
                .then(response => response.json())
                .then(data => {
                    this.rigActive = data.rigActive;   //Update the local rig status 
                    this.imagesNumber = data.imagesNumber;
                    this.audioNumber = data.audioNumber;
                    let { hours, minutes, sec } = this.secondsToHoursMinutes(data.gsrNumber)
                    this.gsrTime = hours + "h " + minutes + "m " + sec + "s";
                
                }).catch(error => console.error('Error:', error));
        },

        //Start the rig
        startRig() {
            this.tempColorGray = true;

            setTimeout(() => this.tempColorGray = false, 1000);

            fetch("/rigStart")
                .then(response => response.json())
                .then(data => this.rigActive = data.active)  //Update the local status
                .catch(error => console.error('Error:', error));
        },

        //Stop the rig
        stopRig() {
            fetch("/rigStop")
                .then(response => response.json())
                .then(data => this.rigActive = data.active)  //Set the status
                .catch(error => console.error('Error:', error));
        },

        //get GSR data from the server side file
        getGSRdata() {
            fetch('/gsrData')
                .then(res => res.json())
                .then(data => {
                    //Set the plot for gsr data
                    let layout = { title: 'GSR Data Graph', xaxis: { title: 'Timestamp' }, yaxis: { title: 'GSR' } };
                    let trace = { type: 'scatter', mode: 'lines', x: data.gsr_data.map(row => new Date(row[0])), y: data.gsr_data.map(row => row[1]) };
                    
                    //Drow the plot for GSR data
                    Plotly.newPlot('gsrGraph', [trace], layout);
                }).catch(error => console.error('Error fetching GSR data:', error));

            this.getGSREmotions();
        },

        //GET GSR Emotions from the server
        getGSREmotions() {
            let currentArrayLength = this.emotionsList.length;

            fetch('/getEmotions')
                .then(res => res.json())
                .then(data => {
                    if(currentArrayLength < data.emotions.length) {
                        this.emotionsList = [];
                        this.renderEmotions(data.emotions);
                    }
                }).catch(error => console.error('Error fetching GSR Emotions:', error));
        },

        //Render GSR emotions on the page
        renderEmotions(data) {
            if(data.length > 0) {
                let reversedData = data.reverse();

                reversedData.forEach(element => {
                    let emotion = {
                        startTime: element[0],
                        endTime: element[1],
                        emotion: element[2].replace("\"", "").replace("\"", ""),
                        current: false
                    }

                    this.emotionsList.push(emotion)
                });

                this.emotionsList[0].current = true;
            }
        },

        //Set a new user
        setNewUser() {
            this.isUserMenuDisplayed = false;

            if(this.userName != this.oldUsername) this.hideAudioRecording = false;
        },

        setUserName() {
            fetch("/setNewUserName", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ userName: this.userName })
            }).then(() => this.continueRecording())
        },
 
        //Ccontinue with the same user
        continueRecording() {
            this.isUserMenuDisplayed = false;

            fetch('/getUserName')
                .then(res => res.json())
                .then(data => {
                    this.userName = data.currentUser;
                    this.oldUsername = data.currentUser;
                    this.startTime = data.sessionStart;
                    this.isRunDisabled = false;
                }).catch(error => console.error('Error fetching GSR Emotions:', error));
        },

        //Start audio recording
        startRecording() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.recording = true;
                    this.audioData = null;

                    // Create an audio context and a recorder
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.recorder = new Recorder(audioContext.createMediaStreamSource(stream));

                    this.recorder.record(); // Start recording
                    this.recordingTimer = 15; 

                    this.recordingTimerInterval = setInterval(() => {
                        if(this.recordingTimer > 0) {
                            this.recordingTimer--
                        } else {
                            this.stopRecording(); 
                            clearInterval(this.recordingTimerInterval)
                        } 
                    }, 1000);
                   
                }).catch(error => console.error('Error accessing microphone:', error));
        },

        //Stop audio recording
        stopRecording() {
            this.recording = false;
            this.recorder.stop();   // Stop recording
        
            // Export the recorded data as a WAV format
            this.recorder.exportWAV(data => {
                if (!data || data.size === 0) {
                    console.error('No audio data exported or empty audio data.');
                    return;
                }
                this.audioData = new Blob([data], { type: 'audio/wav' });
            });

            clearInterval(this.recordingTimerInterval);
            this.recorder.clear();  //Clear the recorder for the next recording
        },

        //Send recording to the server and save
        saveRecording() {
            if (this.audioData) {
                const formData = new FormData();
                formData.append('audio', this.audioData, 'userIntro.wav');

                fetch("/saveAudioIntro", { method: 'POST', body: formData })
                    .then(response => response.json())
                    .then(() => {
                        this.isRunDisabled = false;
                        this.setUserName();
                        this.continueRecording()})
                    .catch(error => console.error('Error sending data to server:', error));
            }
            
            this.hideAudioRecording = true;
        },

        //Get audio text
        getAudioText() {
            fetch('/getAudioText')
                .then(res => res.json())
                .then(data => {
                    data.forEach(item => {
                        item.text.shift();
                    })

                    this.audioText = data;
                })
        },

        //Get Image text
        getImageText() {
            fetch('/getImageText')
                .then(res => res.json())
                .then(data => this.imageText = data)
        },

        //Convert seconds to time hh mm ss
        secondsToHoursMinutes(seconds) {
            //Calculate hours and remaining seconds
            const hours = Math.floor(seconds / 3600);
            const remainingSeconds = seconds % 3600;
        
            //Calculate minutes
            const minutes = Math.floor(remainingSeconds / 60);
            const sec = Math.floor(remainingSeconds % 60);
        
            return { hours, minutes, sec };
        },

        //Get all sessions file names
        getAllSessionsNames() {
            fetch("/getAllSessions")
                .then(response => response.json())
                .then(data => {
                    this.sessionsList = data;
                    this.getFileContent(this.sessionsList[0]);
                    this.selectedFile = this.sessionsList[0];
                }).catch(error => console.error('Error:', error));
        },

        //Get the session file name content
        getFileContent(fileName) {
            this.selectedAudio = ''
            this.currentAudioFile = ''

            fetch("/getOutputFileContent", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ fileName: fileName + ".json" })
            }).then(response => response.json()
            ).then(data => {
                this.outputSessionContent = data;
                this.selectedFile = fileName;
                
                if(this.pageContent == "history") {
                    Plotly.purge("gsr-plot");
                    this.renderGSRSEssionPlot();
                    this.getAllImagesNames();
                    this.getAllAudioFiles();
                setTimeout(()=>{
                    this.renderRowEEGCharts()
                }, 500)
                   
                    
                }
            }).catch(error => console.error('Error:', error));
        },

        //extract the timestamp from a string and convert to date
        getTime(fileName) {
            const timestampString = fileName.replace('session_', '');
            const base = timestampString.length > 8 ? 10 : 8;

            let timestamp = parseInt(timestampString, 10);    //Parse the timestamp string to a number
      
            if(base > 8 && !fileName.includes('session_')) {
                timestamp = timestamp * 1000;
            }

            //Check if the timestamp is a valid number
            if (isNaN(timestamp)) {
                throw new Error('Invalid timestamp in input string');
            }

            //Convert the timestamp to a Date object
            const dateObject = new Date(timestamp);

            // Format the date and time as 'YYYY-MM-DDTHH:mm:ss'
            const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
            const formattedDateTime = dateObject.toLocaleString('en-US', options).replace(/[-\/]/g, '-');
        
            return formattedDateTime;
        },

        //Get sentiment if the input is object or return the original
        getSentiment(sentiment) {
            let response = sentiment;

            if(typeof sentiment == "object") {
                response  = sentiment.Sentiment
            }

            return response;
        },

        renderGSRSEssionPlot() {
            let data = this.outputSessionContent.data.gsr;
            let plotInput = [];

            data.forEach(item => {
                let section = item.section;

                section.forEach(gsrRecord => {
                    let timestamp = parseInt(Object.keys(gsrRecord)[0]);
                    let value = Object.values(gsrRecord)[0];

                    plotInput.push([timestamp, value]);
                });
            });

            let layout = { title: 'GSR Data Graph', xaxis: { title: 'Timestamp' }, yaxis: { title: 'GSR' } };
            let trace = { type: 'scatter', mode: 'lines', x: plotInput.map(row => new Date(row[0])), y: plotInput.map(row => row[1]) };
                
            setTimeout(() => {
                //Drow the plot for GSR data
                Plotly.purge("gsr-plot");
                Plotly.newPlot("gsr-plot", [trace], layout);
            }, 500)
           
        },

        //Get all sessions file names
        getAllImagesNames() {
            let selectedFilecopy = this.selectedFile;
            let startTime = parseInt(selectedFilecopy.replace("session_", ""), 10);

            fetch("/getAllImages", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({ startTime: startTime })

                }).then(response => response.json()
                ).then(data => {
                    this.imageList = data;
                    this.currentImageURL =  './public/no-image.jpg';
                    //this.fetchImage(this.imageList[0]);
                }).catch(error => console.error('Error:', error));
        },

        handleSelectImageOption(event) {
            this.selectedImageName = event.target.value;
          
            this.fetchImage(this.selectedImageName);
        },

        fetchImage(imageName) {
            if(this.selectedImageName) {
                fetch("/getImage", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({ imageName: imageName })
                }).then(response => response.blob()
                ).then(blob => {
                        this.currentImageURL = URL.createObjectURL(blob);
                }).catch(error => console.error('Error:', error));
                
            } else {
                this.currentImageURL =  './public/no-image.jpg';
            }
        },

        convertTime(timestamp) {
            const date = new Date(timestamp * 1000);
                    
            //Extract year, month, and day components
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
            const day = date.getDate().toString().padStart(2, '0');

            //Extract hours, minutes, and seconds components
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');

            //Return formatted date and time string (YYYY-MM-DD HH:MM:SS)
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        },

        getAllAudioFiles() {
            let selectedFilecopy = this.selectedFile;
            let startTime = parseInt(selectedFilecopy.replace("session_", ""), 10);
        

            fetch("/getAllAudioFiles", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({ startTime: startTime })

                }).then(response => response.json()
                ).then(data => {
                    this.audioList = data;
                    this.currentAudioFile =  '';

                    //fetch audio file
                }).catch(error => console.error('Error:', error));
        },

        handleSelectAudioOption(event) {
            let fileName = event.target.value;

            fetch("/getAudioFilePath", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ audioFileName: fileName })
            }).then(response => response.blob()
            ).then(blob => {
                    this.currentAudioFile = URL.createObjectURL(blob);
            }).catch(error => console.error('Error:', error));
        },

        renderCharts(inputData, labels, ref, names = []) {
            inputData.forEach((chartData, index) => {
                const plotRef = ref + (index + 1);

                const chartName = names.length ? names[index] : `Sensor ${index + 1}`;

                let trace = { 
                    type: 'scatter', 
                    mode: 'lines',  
                    line: {
                        width: 0.5
                    },
                    x: labels.map(row => moment.unix(row).format("YYYY-MM-DD HH:mm:ss.SSS")), 
                    y: chartData.data.map(row => parseInt(row))  
                };

                const layout = {
                  title: chartName,
                  yaxis: { title: 'EEG' },
                };
          
                Plotly.purge(plotRef);
                Plotly.newPlot(plotRef, [trace], layout);
            });
        },

        formatRowEEG() {
            let output = [];
            let labels = [];
            let rowEEG = this.outputSessionContent.data.eeg.row;
            

            for(let i = 0; i < 18; i++) {
                output.push({
                    data: []
                })
            }

            let counter = 3;

            rowEEG.forEach(row => {
                if(counter == 0) {
                    for(let i = 0; i < 18; i++) {
                        output[i].data.push(row.eeg[i]);
                    }
        
                    labels.push(row.time);
                    counter = 3;
                } else {
                    counter--;
                }
              
            });


            return { output, labels }
        },

        renderRowEEGCharts() {
            if(this.outputSessionContent.data.eeg?.sessionIds) {
                let { output, labels } = this.formatRowEEG();

                let reference = "row_eeg_sensor";
                this.renderCharts(output, labels, reference);
            } else {
                for(let i = 0; i < 18; i++) {
                    let reference = "row_eeg_sensor" + (i + 1);
                    Plotly.purge(reference);
                }
            }
           
        },

        formatFacialExpressions() {
            let expressions = this.outputSessionContent?.data?.eeg?.expression;
            let output = [];

            if(expressions) {
                let prevExpression = expressions[0].fac[0];
                output.push(expressions[0]);
    
                for(let i = 1; i < expressions.length; i++) {
                    if(prevExpression != expressions[i].fac[0]) {
                        prevExpression = expressions[i].fac[0];
                        output.push(expressions[i]);
                    }
                }
            }

            return output;

        },

        momentTime(time) {

            return moment.unix(time).format("YYYY-MM-DD HH:mm:ss") 
        },

        formatPerrformanceMetrics() {
            let output = [], labels = [];

            let performance = this.outputSessionContent.data.eeg.performance;
            

            for(let i = 0; i < 6; i++) {
                output.push({
                    data: []
                })
            }

            performance.forEach(row => {
                for(let i = 0; i < 7; i++) {
                    //The metrics are in the strange order
                    output[i].data.push(row.met[i]);
                }
    
                labels.push(row.time);

            
            });

            return { output, labels };
        },

        renderPerformanceCharts() {
            if(this.outputSessionContent.data.eeg?.sessionIds) {
                let { output, labels } = this.formatPerrformanceMetrics();

                let reference = "performance_metrics_chart";
                let names = ["Att", "INT", "SS", "DD", "WW", "RR"];

                this.renderCharts(output, labels, reference, names);
            } else {
                for(let i = 0; i < 6; i++) {
                    let reference = "performance_metrics_chart" + (i + 1);
                    Plotly.purge(reference);
                }
            }
           
        }
    }
})




