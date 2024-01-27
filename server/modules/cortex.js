import WebSocket from 'ws';

//Headset responses code
const WARNING_CODE_HEADSET_DISCOVERY_COMPLETE = 142;
const WARNING_CODE_HEADSET_CONNECTED = 104;


//EEG Headset controler
export class Cortex {
    constructor(user, socketUrl) {
        //Data web-socket
        this.socket = new WebSocket(socketUrl, { rejectUnauthorized: false });

        //Start settings
        this.user = user
        this.isHeadsetConnected = false
    }

    //Sumscript to the data, get data from the headset
    sub(streams){
        this.socket.on('open',async ()=>{
            //Check the authentification 
            await this.checkGrantAccessAndQuerySessionInfo()

            this.subRequest(streams, this.authToken, this.sessionId)

            this.socket.on('message', (data)=>{
                //Log stream data to file or console here
                console.log(data)
            })
        })
    }

    //Refresh headset list /scaning the available devices
    refreshHeadsetList() {
        const REFRESH_HEADSET_LIST_ID = 14;

        const refreshHeadsetListRequest = {
            "jsonrpc": "2.0",
            "id": REFRESH_HEADSET_LIST_ID,
            "method": "controlDevice",
            "params": {
                "command": "refresh"
            }
        };

        console.log('Refresh the headset list');
        socket.send(JSON.stringify(refreshHeadsetListRequest));
    }

    //Query headset
    queryHeadsetId() {
        return new Promise((resolve, reject) => {
            const QUERY_HEADSET_ID = 2;
            let socket = this.socket;
            let queryHeadsetRequest = {
                "jsonrpc": "2.0",
                "id": QUERY_HEADSET_ID,
                "method": "queryHeadsets",
                "params": {}
            };
            const sendQueryRequest = () => {
                console.log('queryHeadsetRequest');
                socket.send(JSON.stringify(queryHeadsetRequest));
            };
            
            sendQueryRequest();
    
            socket.on('message', (data) => {
                try {
                    if(JSON.parse(data)['id']==QUERY_HEADSET_ID){
                        if(JSON.parse(data)['result'].length > 0){
                            JSON.parse(data)['result'].forEach(headset => {
                                if (headset['status'] === 'connected') {
                                    this.isHeadsetConnected = true;
                                }
                            });
                            resolve(JSON.parse(data))
                        } else {
                            console.log('No have any headset, please connect headset with your pc.')
                            this.isHeadsetConnected = false
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            });
    
            //Schedule subsequent requests every 1 minute
            setInterval(sendQueryRequest, 60000);
        });
    }

    //Request acces to the api/headset
    requestAccess(){
        let socket = this.socket
        let user = this.user
        return new Promise(function(resolve, reject){
            const REQUEST_ACCESS_ID = 1
            let requestAccessRequest = {
                "jsonrpc": "2.0", 
                "method": "requestAccess", 
                "params": { 
                    "clientId": user.clientId, 
                    "clientSecret": user.clientSecret
                },
                "id": REQUEST_ACCESS_ID
            }

            console.log('start send request: ',requestAccessRequest)
            socket.send(JSON.stringify(requestAccessRequest));

            socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id']==REQUEST_ACCESS_ID){
                        resolve(data)
                    }
                } catch (error) {}
            })
        })
    }

    //Control hadset
    controlDevice(headsetId){
        let socket = this.socket
        const CONTROL_DEVICE_ID = 3

        let controlDeviceRequest = {
            "jsonrpc": "2.0",
            "id": CONTROL_DEVICE_ID,
            "method": "controlDevice",
            "params": {
                "command": "connect",
                "headset": headsetId
            }
        }
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(controlDeviceRequest));
            console.log('control device request: ', controlDeviceRequest)
            socket.on('message', (data)=>{
                try {
                    let response = JSON.parse(data);
                    if(response['id'] == CONTROL_DEVICE_ID){
                        if(response.error) {
                            console.log(response.error.message);
                            setTimeout(() => {
                                socket.send(JSON.stringify(controlDeviceRequest));
                            }, 10000);
                        } else {
                            resolve(response);
                        }
                    }
                } catch (error) {}
            })
        }) 
    }

    //Authorize user
    authorize(){
        let socket = this.socket
        let user = this.user

        return new Promise(function(resolve, reject){
            const AUTHORIZE_ID = 4

            let authorizeRequest = { 
                "jsonrpc": "2.0", "method": "authorize", 
                "params": { 
                    "clientId": user.clientId, 
                    "clientSecret": user.clientSecret, 
                    "license": user.license,
                    "debit": user.debit
                },
                "id": AUTHORIZE_ID
            }

            socket.send(JSON.stringify(authorizeRequest))

            socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id']==AUTHORIZE_ID){
                        let cortexToken = JSON.parse(data)['result']['cortexToken']
                        resolve(cortexToken)
                        //Call controlDevice("refresh") when authorization is successful
                        this.refreshHeadsetList();
                    }
                } catch (error) {}
            })
        })
    }

    //Create session
    createSession(authToken, headsetId) {
        const CREATE_SESSION_ID = 5;

        return new Promise(async (resolve, reject) => {
            let socket = this.socket;
            let sessionId;

            const checkHeadsetId = async () => {
                const response = await this.queryHeadsetId();

                const found = response["result"].find(item => String(item["id"]) === String(headsetId) && item["status"] === "connected");
                if (found) {
                    clearInterval(queryInterval);

                    let createSessionRequest = {
                        "jsonrpc": "2.0",
                        "id": CREATE_SESSION_ID,
                        "method": "createSession",
                        "params": {
                            "cortexToken": authToken,
                            "headset": headsetId,
                            "status": "active"
                        }
                    };

                    socket.send(JSON.stringify(createSessionRequest));
    
                    socket.on('message', (data) => {
                        let parsedData = JSON.parse(data);

                        if (parsedData.id === CREATE_SESSION_ID) {
                            sessionId = parsedData['result']['id'];
                            resolve(sessionId);
                        }
                    });
                }
            };
            const queryInterval = setInterval(checkHeadsetId, 30000);
            checkHeadsetId();
        });
    }

    //Subrequest
    subRequest(stream, authToken, sessionId){
        let socket = this.socket
        const SUB_REQUEST_ID = 6 

        let subRequest = { 
            "jsonrpc": "2.0", 
            "method": "subscribe", 
            "params": { 
                "cortexToken": authToken,
                "session": sessionId,
                "streams": stream
            }, 
            "id": SUB_REQUEST_ID
        }

       // console.log('sub eeg request: ', subRequest)
        socket.send(JSON.stringify(subRequest))

        socket.on('message', (data)=>{
            try {
                //if(JSON.parse(data)['id']==SUB_REQUEST_ID){
                    console.log('SUB REQUEST RESULT --------------------------------')
                    console.log(data.toString('utf8'))
                    console.log('\r\n')
                 //}
            } catch (error) {}
        })
    }

    /**
     * - query headset infor
     * - connect to headset with control device request
     * - authentication and get back auth token
     * - create session and get back session id
     */
    async querySessionInfo(){
        let qhResult = "", headsetId = "", ctResult = "", authToken = "", sessionId = ""

        //Query headset id
        await this.queryHeadsetId().then((result)=>{qhResult = result})
        this.qhResult = qhResult
        this.headsetId = qhResult['result'][0]['id']

        //Control device
        await this.controlDevice(this.headsetId).then((result)=>{ctResult=result})
        this.ctResult = ctResult
        console.log(ctResult)

        //Authorize session
        await this.authorize().then((auth)=>{authToken = auth})
        this.authToken = authToken

        //Create session
        await this.createSession(authToken, this.headsetId).then((result)=>{sessionId=result})
        this.sessionId = sessionId

        //Print results
        console.log('HEADSET ID -----------------------------------' + this.headsetId + '\r\n')
        console.log('CONNECT STATUS -------------------------------' + this.ctResult + '\r\n')
        console.log('AUTH TOKEN -----------------------------------' + this.authToken + '\r\n')
        console.log('SESSION ID -----------------------------------' + this.sessionId + '\r\n')
    }

    /**
     * - check if user logined
     * - check if app is granted for access
     * - query session info to prepare for sub and train
    */
    async checkGrantAccessAndQuerySessionInfo(){
        let requestAccessResult = ""

        //Request acces
        await this.requestAccess().then((result)=>{requestAccessResult=result})

        //Acces status
        let accessGranted = JSON.parse(requestAccessResult)
    
        //Check if user is logged in CortexUI
        if ("error" in accessGranted){
            console.log('You must login on CortexUI before request for grant access then rerun')
            throw new Error('You must login on CortexUI before request for grant access')
        }else{
            console.log(accessGranted['result']['message'])
            // console.log(accessGranted['result'])
            if(accessGranted['result']['accessGranted']){
                await this.querySessionInfo()
            }
            else{
                console.log('You must accept access request from this app on CortexUI then rerun')
                throw new Error('You must accept access request from this app on CortexUI')
            }
        }   
    }

    //Listend the socket warnings
    listenForWarnings() {
        this.socket.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                if (message.warning) {
                    console.log('Warning Received Code:', message.warning.code);
                    console.log('Message:', message.warning.message);
                    console.log('--------------------------------------');

                    if (message.warning.code === WARNING_CODE_HEADSET_CONNECTED) {
                        this.isHeadsetConnected = true;
                    }

                    // After headset scanning finishes, if no headset is connected yet, the app should call the controlDevice("refresh") again
                    if (message.warning.code === WARNING_CODE_HEADSET_DISCOVERY_COMPLETE && !this.isHeadsetConnected) {
                        this.refreshHeadsetList();
                    }
                } 
            } catch (error) {}
        });
    }

    handleData(receivedData) {
        let type = Object.keys(receivedData)[0];

        if(type == "eeg") {
            //Row EEG data
            insertDataToJsonl("row_eeg.jsonl", receivedData);
        } else if(type == "fac") {
            //Facial Expresions
            insertDataToJsonl("facial_expressions.jsonl", receivedData);
        } else if(type == "pow") {
            //Performance metrics
            insertDataToJsonl("performance_metrics.jsonl", receivedData);
        } else if(type == "pow") {
            //Performance metrics
            insertDataToJsonl("performance_metrics.jsonl", receivedData);
        }
    }

    run() {
        this.listenForWarnings();

        /*
            Have six kind of stream data ['fac', 'pow', 'eeg', 'mot', 'met', 'com']

            eeg - The raw EEG data from the headset
            fac - The results of the facial expressions detection
            met - The results of the performance metrics detection (Attention level, Stress level, etc)

            mot - The motion data from the headset
            pow - The band power of each EEG sensor. It includes the alpha, low beta, high beta, gamma, and theta bands
            com - The results of the mental commands detection. 
        */
        let streams = ['eeg', 'fac', 'met']

        this.sub(streams);
    }
    
}








