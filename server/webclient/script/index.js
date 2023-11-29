const vueApp = new Vue({
    el: '#app',
    data: {
        pageContent: 'settings',        //Page content manager
        graphInterval: null,            //Graph update interval
        rigActive: false,               //Rig status
        statusText: 'OFFLINE',          //Rig status label
        startTime: '0000.00.00 00:00',  //Rig start time
        tempColorGray: false,           //Temp button colors status
        emotionsList: [],               //GSR Emotions list from the server
        isUserMenuDisplayed: true,      //To display the user menu or not
        userName: '',                   //Current user name
        oldUsername: '',                //Old user name
        audioData: null,                //Recorded Audio data
        recording: false,               //Audio Recording status
        recordingTimer: 15,             //Audio Recording timer
        hideAudioRecording: true,       //Show/hide audio recording menu
        isRunDisabled: true,            //Disable the Start button

        //Rig image configurations
        imageSettings: {
            frequence: undefined,
            framerate: undefined,
            host: '',
            size_x: undefined,
            size_y: undefined
        },

        //Rig audio configurations
        audioSettings: {
            frequence: undefined,
            sampleRate: undefined,
            chunk: undefined,
            host: undefined
        },

        //Rig GSR configurationss
        gsrSettings: {
            frequence: undefined,
            host: undefined
        },

        //Rig connection configurations
        connectionSettings: {
            host: undefined
        }
    },

    mounted() {
        this.getGSREmotions();

        //Check the Rig Status in interval of time
        setInterval(()=> {
            this.getRigStatus() 
        },1000)

        this.readConfigFile();  //Get the config file data

        //Clear the GSR updating interval on page change
        if(this.pageContent =='data') {
            this.getGSRdata();
        } else {
            clearInterval(this.graphInterval);
        } 
    },

    watch: {
        //Control the page content
        pageContent: function(newPage, oldPage) {
            //Control the GSR graph updates
            if(oldPage == 'data'){
                clearInterval(this.graphInterval);
            }

            //Start the GSR grpath updating
            if(newPage == 'data') {
                this.getGSRdata();

                this.graphInterval = setInterval(()=> {
                    this.getGSRdata()
                },1000)
            } 
        },

        //Manage rig status interface
        rigActive: function(newStatus, oldStatus) {
            if(newStatus == true) {
                this.statusText = 'ONLINE';
                this.startTime = '2023.15.11 23:32';
            } else {
                this.statusText = 'OFFLINE';
                this.startTime = '0000.00.00 00:00';
            }
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
                })
                .catch(error => console.error('Error geting config file:', error));
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
              })
                .then(response => response.json())
                .then(responseData => {
                  console.log('Server response:', responseData);
                })
                .catch(error => {
                  console.error('Error:', error);
                });
        },

        //Get the rig status
        getRigStatus() {
            fetch("/rigStatus")
                .then(response => response.json())
                .then(data => {
                    //Update the local rig status 
                    this.rigActive = data.active;
                })
                .catch(error => {
                  console.error('Error:', error);
                });
        },

        //Start the rig
        startRig() {
            this.tempColorGray = true;

            setTimeout(() => {
              this.tempColorGray = false;
            }, 1000);

            fetch("/rigStart")
                .then(response => response.json())
                .then(data => {
                    this.rigActive = data.active; //Update the local status
                })
                .catch(error => {
                  console.error('Error:', error);
            });
            
        },

        //Stop the rig
        stopRig() {
            fetch("/rigStop")
                .then(response => response.json())
                .then(data => {
                    //Set the status
                    this.rigActive = data.active; 
                })
                .catch(error => {
                console.error('Error:', error);
        });

       
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
                })
                .catch(error => console.error('Error fetching GSR data:', error));
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
                })
                .catch(error => console.error('Error fetching GSR Emotions:', error));
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
        setNewUser: function() {
            this.isUserMenuDisplayed = false;

            if(this.userName != this.oldUsername) {
                fetch("/setNewUserName", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({ userName: this.userName })
                })
            }

            this.hideAudioRecording = false;

            this.continueRecording();
        },

        //Ccontinue with the same user
        continueRecording: function() {
            this.isUserMenuDisplayed = false;

            fetch('/getUserName')
                .then(res => res.json())
                .then(data => {
                    this.userName = data.currentUser;
                    this.oldUsername = data.currentUser;
                    this.startTime = data.sessionStart;

                    this.isRunDisabled = false;
                })
                .catch(error => console.error('Error fetching GSR Emotions:', error));
        },

        //Start audio recording
        startRecording: function() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.recording = true;
                    this.audioData = null;

                    // Create an audio context and a recorder
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.recorder = new Recorder(audioContext.createMediaStreamSource(stream));

                    // Start recording
                    this.recorder.record();

                    this.recordingTimer = 15; 
                    this.recordingTimerInterval = setInterval(() => {
                        if (this.recordingTimer > 0) {
                            this.recordingTimer--;
                        } else {
                            this.stopRecording(); 
                        }
                    }, 1000);
                   
                }).catch(error => {
                    console.error('Error accessing microphone:', error);
                });

           
        },

        //Stop audio recording
        stopRecording: function() {
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

                fetch("/saveAudioIntro", {
                    method: 'POST',
                    body: formData,
                }).then(response => response.json()
                ).then(data => {
                    console.log('Server response:', data);
                    this.isRunDisabled = false;
                }).catch(error => {
                    console.error('Error sending data to server:', error);
                });
            }
            this.continueRecording();
            this.hideAudioRecording = true;
        }

    }
})



