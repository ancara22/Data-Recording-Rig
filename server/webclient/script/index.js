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
        gsrTime                : '00hh 00mm',  //Gsr counter
        sessionsList           : [],           //List of sessions
        outputSessionContent   : {},           //Content of the current output session
        selectedFile           : null,         //Currently selected file
        currentImageURL        :  './public/no-image.jpg',  //Default image URL
        selectedImageName      : undefined,    //Selected image name
        imageList              : [],           //List of images
        audioList              : [],           //List of audio files
        currentAudioFile       : '',           //Currently selected audio file
        showEEGMetrics         : false,        //Show EEG metrics status
        showEEGRaw             : false,        //Show EEG raw status

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
        
        //EEG headset settings
        eegSettings: {
            met: undefined, 
            pow: undefined,
            fac: undefined,
            eeg: undefined
        }, 

        //Rig connection configurations
        connectionSettings: { host: undefined }
    },

    mounted() {
        this.getGSREmotions();  //Get GSR data 

        //Set the default gape
        const page = localStorage.getItem('page');

        //Check if the page is stored in localStorage
        if(page !== null && page !== undefined) {
            this.pageContent = page 
        } else {
            //Set 'settings' as the default page in localStorage
            localStorage.setItem('page', 'settings');
            this.pageContent = localStorage.getItem('page');
        }
        
        //Check the Rig Status in an interval of time
        setInterval(()=> this.getRigStatus(), 1000);

        //Get the config file data
        this.readConfigFile();  

        //Clear the GSR updating interval on page change                
        this.pageContent =='data' ? this.getGSRdata() : clearInterval(this.graphInterval);

        //Get all the recorded session files
        this.getAllSessionsNames();

        //Set the default image URL if not already set
        this.currentImageURL = this.currentImageURL ?   this.currentImageURL: './public/no-image.jpg';
    },

    //Watcher for reactive data changes
    watch: {
        //Control the page content
        pageContent: function(newPage, oldPage) {
            this.showEEGRaw = false;
            this.showEEGMetrics = false;

            //Control the GSR graph updates
            if(oldPage == 'data') clearInterval(this.graphInterval);

            //Set the new page in localStorage
            newPage == "data" ? localStorage.setItem('page', 'data') : localStorage.setItem('page', 'settings');
            
            //Start the GSR grpath updating
            if(newPage == 'data') {
                this.getGSRdata();
                this.getAudioText();
                this.getImageText();

                this.graphInterval = setInterval(()=> this.getGSRdata(), 1000);
            } 

            //Actions when switching to the 'history' page
            if(this.pageContent == "history") {
                this.renderGSRSEssionPlot();
                this.getAllImagesNames();
                this.getAllAudioFiles();
            }
        },

        //Manage rig status interface
        rigActive: function(newStatus, oldStatus) {
            //Update the rig status label
            newStatus == true ? this.statusText = 'ONLINE' : this.statusText = 'OFFLINE';
        }
    },

    methods: {
        /**
         * Fetch the server-side configuration file.
         * Updates the application's settings based on the retrieved configuration.
         */
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

                    //Update audio settings
                    this.audioSettings.frequence = parseFloat(audioConfig.frequence);
                    this.audioSettings.sampleRate = parseFloat(audioConfig.samp_rate);
                    this.audioSettings.chunk = parseFloat(audioConfig.chunk);
                    this.audioSettings.host = audioConfig.audio_host;

                    //Get the gsr recordign configs
                    this.gsrSettings.host = data["config"]['GSR'].gsr_host;
                    this.connectionSettings.host = data["config"]['CONNECTION'].host;

                    const eegSettings = data["config"]['eeg'];

                    //Update EEG settings
                    this.eegSettings.eeg = eegSettings.eeg;
                    this.eegSettings.pow = eegSettings.pow;
                    this.eegSettings.met = eegSettings.met;
                    this.eegSettings.fac = eegSettings.fac;
                }).catch(error => console.error('Error geting config file:', error));
        },

        /**
         * Save the configurations and send them to the server.
         * Posts the updated configuration to the server for persistence.
         */
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
                        },
                        eeg: {
                            met: this.eegSettings.met, 
                            pow: this.eegSettings.pow,
                            fac: this.eegSettings.fac,
                            eeg: this.eegSettings.eeg
                        } 
                    }
                }),
              }).then(response => response.json())
                .then(responseData => console.log('Server response:', responseData))
                .catch(error => console.error('Error:', error));
        },

        /**
         * Fetch the rig status from the server.
         * Updates local data with the rig's current status and statistics.
         */
        getRigStatus() {
            fetch("/rigStatus")
                .then(response => response.json())
                .then(data => {
                    //Update local rig status and statistics
                    this.rigActive = data.rigActive; 
                    this.imagesNumber = data.imagesNumber;
                    this.audioNumber = data.audioNumber;
                    let { hours, minutes, sec } = this.secondsToHoursMinutes(data.gsrNumber)
                    this.gsrTime = hours + "h " + minutes + "m " + sec + "s";
                
                }).catch(error => console.error('Error:', error));
        },

        /**
         * Start the rig by sending a request to the server.
         * Temporarily updates UI color during the operation.
         */
        startRig() {
            this.tempColorGray = true;

            setTimeout(() => this.tempColorGray = false, 1000);

            fetch("/rigStart")
                .then(response => response.json())
                .then(data => this.rigActive = data.active)  //Update the local status
                .catch(error => console.error('Error:', error));
        },

        /**
         * Stop the rig by sending a request to the server.
         * Updates local data with the new rig status.
         */
        stopRig() {
            fetch("/rigStop")
                .then(response => response.json())
                .then(data => this.rigActive = data.active)  //Set the status
                .catch(error => console.error('Error:', error));
        },

        /**
         * Fetches GSR data from the server-side file and updates the GSR graph on the page.
         * Also calls the 'getGSREmotions' method.
         */
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

        //Fetches GSR Emotions from the server and updates the emotions list on the page.
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

        /**
         * Renders GSR emotions on the page.
         * @param {Array} data - Array containing GSR emotion data.
         */
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

        //Sets a new user and adjusts UI elements accordingly.
        setNewUser() {
            this.isUserMenuDisplayed = false;

            if(this.userName != this.oldUsername) this.hideAudioRecording = false;
        },

        /**
         * Sends a request to set the new user name.
         * After setting the name, continues recording with the same user.
         */
        setUserName() {
            fetch("/setNewUserName", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ userName: this.userName })
            }).then(() => this.continueRecording())
        },
 
        /**
         * Continues recording with the same user by fetching user information from the server.
         * Updates local data with the fetched user information.
         */
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

        /**
         * Starts audio recording by accessing the user's microphone.
         * Sets up the recorder and starts a countdown timer.
         */
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

        /**
         * Stops audio recording.
         * Exports the recorded data as a WAV format.
         * Clears the recorder for the next recording.
         */
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

        /**
         * Sends the recorded audio to the server and saves it.
         * Enables user interaction and continues recording.
         */
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

        //Fetches audio text from the server.
        getAudioText() {
            fetch('/getAudioText')
                .then(res => res.json())
                .then(data => {
                    this.audioText = data;
                })
        },

        //Fetches image text from the server.
        getImageText() {
            fetch('/getImageText')
                .then(res => res.json())
                .then(data => this.imageText = data)

        },

        /**
         * Converts seconds to hours, minutes, and seconds.
         * @param {number} seconds - Total seconds to convert.
         * @returns {Object} - Object containing hours, minutes, and seconds.
         */
        secondsToHoursMinutes(seconds) {
            //Calculate hours and remaining seconds
            const hours = Math.floor(seconds / 3600);
            const remainingSeconds = seconds % 3600;
        
            //Calculate minutes
            const minutes = Math.floor(remainingSeconds / 60);
            const sec = Math.floor(remainingSeconds % 60);
        
            return { hours, minutes, sec };
        },

        /**
         * Fetches all session file names from the server.
         * Sets the selected file and fetches its content.
         */
        getAllSessionsNames() {
            fetch("/getAllSessions")
                .then(response => response.json())
                .then(data => {
                    this.sessionsList = data;
                    this.getFileContent(this.sessionsList[0]);
                    this.selectedFile = this.sessionsList[0];
                }).catch(error => console.error('Error:', error));
        },

        /**
         * Fetches the content of the selected session file.
         * Updates UI elements based on the selected file and page content.
         * Calls methods to render GSR plot, fetch image names, and fetch audio files.
         * @param {string} fileName - Name of the selected session file.
         */
        getFileContent(fileName) {
            this.showEEGRaw = false;
            this.showEEGMetrics = false;
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
                console.log('first', this.outputSessionContent.data) ///Remove

                if(this.pageContent == "history") {
                    Plotly.purge("gsr-plot");
                    this.renderGSRSEssionPlot();
                    this.getAllImagesNames();
                    this.getAllAudioFiles();
                }
            }).catch(error => console.error('Error:', error));
        },

        /**
         * Extracts the timestamp from a string and converts it to a formatted date-time string.
         * @param {string} fileName - Input string containing the timestamp.
         * @returns {string} - Formatted date-time string.
         */
        getTime(fileName) {
            let timestampString = fileName.replace('session_', '');
            const base = timestampString.length > 8 ? 11 : 8;

            if(timestampString.length > 11 && !fileName.includes('session_')) {
                timestampString /= 1000;
            }

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

        /**
         * Extracts the sentiment from an object or returns the original value.
         * @param {Object|string} sentiment - Input sentiment value.
         * @returns {string} - Extracted sentiment value.
         */
        getSentiment(sentiment) {
            let response = sentiment;

            if(typeof sentiment == "object") {
                response  = sentiment.Sentiment
            }

            return response;
        },

        //Renders the GSR session plot using Plotly.
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
            let trace = { type: 'scatter', mode: 'lines', x: plotInput.map(row => new Date(row[0] * 1000)), y: plotInput.map(row => row[1]) };
                
            setTimeout(() => {
                //Drow the plot for GSR data
                Plotly.purge("gsr-plot");
                Plotly.newPlot("gsr-plot", [trace], layout);
            }, 500)
           
        },

        /**
         * Fetches all image names for the selected session.
         * @param {Event} event - The change event from the select dropdown.
         */
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

        /**
         * Handles the selection of an image option from the dropdown.
         * Fetches the selected image.
         * @param {Event} event - The change event from the select dropdown.
         */
        handleSelectImageOption(event) {
            this.selectedImageName = event.target.value;
          
            this.fetchImage(this.selectedImageName);
        },

        /**
         * Fetches the image from the server based on the selected image name.
         * Updates the current image URL.
         * @param {string} imageName - Name of the selected image.
         */
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

        /**
         * Converts a timestamp to a formatted date-time string.
         * @param {number} timestamp - Timestamp to be converted.
         * @returns {string} - Formatted date-time string.
         */
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
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        },

        //Fetches all audio files for the selected session from the server.
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

        /**
         * Handles the selection of an audio option from the dropdown.
         * Fetches the selected audio file.
         * @param {Event} event - The change event from the select dropdown.
         */
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

        /**
         * Renders charts using Plotly based on the input data, labels, and reference.
         * @param {Array} inputData - Array of data for each chart.
         * @param {Array} labels - Array of labels for the x-axis.
         * @param {string} ref - Reference for the chart div.
         * @param {Array} names - Names for each chart (optional).
         * @param {string} mainLabel - Label for the y-axis.
         */
        renderCharts(inputData, labels, ref, names = [], mainLabel = "EEG") {
            let arrayOfArrays = [];
            if(typeof inputData == 'object') {
                arrayOfArrays = Object.values(inputData).map(array => [...array]);
            } else {
                arrayOfArrays = inputData;
            }

            arrayOfArrays.forEach((chartData, index) => {
                const plotRef = ref + (index + 1);
                const chartName = names.length ? names[index] : `Sensor ${index + 1}`;

                let data = (chartData.data != undefined) ? chartData.data.map(row => parseInt(row)): chartData

                let trace = { 
                    type: 'scatter', 
                    mode: 'lines',  
                    line: {
                        width: 0.5
                    },
                    x: labels.map(row => moment.unix(row).format("YYYY-MM-DD HH:mm:ss.SSS")), 
                    y: data
                };

                const layout = {
                  title: chartName,
                  yaxis: { title: mainLabel },
                };
          
                Plotly.purge(plotRef);
                Plotly.newPlot(plotRef, [trace], layout);
            });
        },

        /**
         * Formats row EEG data from the output session content.
         * @returns {Object} - Object containing formatted output and labels.
         */
        formatRawEEG(list) {
            let output = { AF3: [], F7: [], F3: [], FC5: [], T7: [], P7: [], O1: [], O2: [], P8: [], T8: [], FC6: [], F4: [], F8: [], AF4: [] };
            let labels = [];
            let rawEEG = this.outputSessionContent.data.eeg.rawEEG;
            let counter = 3;

            rawEEG.forEach(row => {
                if(counter == 0) {
                    list.forEach(el => {
                        output[el].push(row[el]);
                    });

                    labels.push(row.time);
                } else {
                    counter--;
                }
            });

            return { output, labels }
        },

        /**
         * Renders raw EEG charts using Plotly.
         * Sets a timeout to allow for proper rendering.
         */
        renderRawEEGCharts() {
            this.showEEGRaw = true;

            setTimeout(() => {
                let list = [ "AF3", "F7", "F3", "FC5", "T7", "P7", "O1", "O2", "P8", "T8", "FC6", "F4", "F8", "AF4" ];
                if(this.outputSessionContent.data.eeg?.length != 0) {
                    let { output, labels } = this.formatRawEEG(list);

                    let reference = "raw_eeg_sensor_";
                    this.renderCharts(output, labels, reference, list);
                } else {
                    for(let i = 0; i < 13; i++) {
                        let reference = "raw_eeg_sensor_" + (i + 1);
                        Plotly.purge(reference);
                    }
                }
            }, 500);
        },

        /**
         * Formats facial expressions data from the output session content.
         * @returns {Array} - Array containing formatted facial expressions data.
         */
        formatFacialExpressions() {
            let expressions = this.outputSessionContent?.data?.eeg?.expression;
            let output = [];

            if(expressions != undefined && expressions.length != 0) {
                let prevExpression1 = expressions[0].eyeAction;
                let prevExpression2 = expressions[0].upperFace.action;
                let prevExpression3 = expressions[0].lowerFace.action;

                output.push(expressions[0]);
    
                for(let i = 1; i < expressions.length; i++) {
                    if(prevExpression1 != expressions[i].eyeAction || prevExpression2 != expressions[i].upperFace.action || prevExpression3 != expressions[i].lowerFace.action) {
                        prevExpression1 = expressions[i].eyeAction;
                        prevExpression2 = expressions[i].upperFace.action;
                        prevExpression3 = expressions[i].lowerFace.action;

                        output.push(expressions[i]);
                    }
                }
            }

            return output;
        },

        /**
         * Converts a UNIX timestamp to a formatted date-time string using the Moment.js library.
         * @param {number} time - UNIX timestamp to be converted.
         * @returns {string} - Formatted date-time string (YYYY-MM-DD HH:mm:ss).
         */
        momentTime(time) {

            return moment.unix(time).format("DD-MM-YYYY HH:mm:ss") 
        },

        /**
         * Formats performance metrics data from the output session content.
         * @returns {Object} - Object containing formatted output and labels.
         */
        formatPerrformanceMetrics() {
            let labels = [];
            let performance = this.outputSessionContent.data.eeg.cognition;

            let output = {
                engagement: [],
                excitement: [],
                stress: [],
                longExcitement: [],
                relaxation: [],
                interest: [],
                focus: []
            }

            //Insert the metrics
            performance.forEach(row => {
                output.engagement.push(Math.round(row.engagement * 100));
                output.excitement.push(Math.round(row.excitement * 100));
                output.stress.push(Math.round(row.stress * 100));
                output.longExcitement.push(Math.round(row.longExcitement * 100));
                output.relaxation.push(Math.round(row.relaxation * 100));
                output.interest.push(Math.round(row.interest * 100));
                output.focus.push(Math.round(row.focus * 100));

                labels.push(row.time);
            });

            return { output, labels };
        },

        /**
         * Renders performance metrics charts using Plotly.
         * Sets a timeout to allow for proper rendering.
         */
        renderPerformanceCharts() {
            this.showEEGMetrics = true;

            setTimeout(() => {
                if(this.outputSessionContent.data.eeg.length != 0) {
                    let { output, labels } = this.formatPerrformanceMetrics();

                    console.log('output', output)
                    console.log('labels', labels)
    
                    let reference = "performance_metrics_chart";
                    let names = ["Engagement", "Excitement", "Stress", "Long Excitement", "Relaxation", "Interest", "Focus"];
    
                    this.renderCharts(output, labels, reference, names, "Metrics");
                } else {
                    for(let i = 0; i < 6; i++) {
                        let reference = "performance_metrics_chart" + (i + 1);
                        Plotly.purge(reference);
                    }
                }
            }, 500)
        },
    }
})




