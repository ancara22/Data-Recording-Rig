/**
 * The Cortex EEG headset Module.
 * @module CortexEEGHeadset
 */

import WebSocket from 'ws';
import fs from "fs";
import ini from "ini";

const settingsFilePath = "../config.ini";

//Headset responses code
const WARNING_CODE_HEADSET_DISCOVERY_COMPLETE = 142;
const WARNING_CODE_HEADSET_CONNECTED = 104;

let streams = []
/**
 * Class representing the EEG Headset controller using the Cortex API.
 */
export class Cortex {
    /**
     * Creates an instance of the Cortex class.
     * @memberof module:CortexEEGHeadset
     * @param {object} user - The user credentials for authentication.
     * @param {string} socketUrl - The URL of the WebSocket for data communication.
     */
    constructor(user, socketUrl) {
        //Data web-socket
        this.socket = new WebSocket(socketUrl, { rejectUnauthorized: false });

        //Start settings
        this.user = user
        this.isHeadsetConnected = false
    }

    /**
     * Subscribes to the specified streams for EEG data.
     * @memberof module:CortexEEGHeadset
     * @param {string[]} streams - An array of streams to subscribe to (e.g., ['eeg', 'fac', 'met']).
     * @returns {void}
     */
    sub(streams){
        this.socket.on('open',async ()=>{
            //Check the authentification 
            await this.checkGrantAccessAndQuerySessionInfo()

            //Run the subbscription to the data
            this.subRequest(streams, this.authToken, this.sessionId)
        })
    }

    /**
     * Unsubscribes to the specified streams for EEG data.
     * @memberof module:CortexEEGHeadset
     * @param {string[]} streams - An array of streams to unsubscribe to (e.g., ['eeg', 'fac', 'met']).
     * @returns {void}
     */
    unsub(streams){
        this.socket.on('open',async ()=>{
            //Check the authentification 
            await this.checkGrantAccessAndQuerySessionInfo()

            //Run the subbscription to the data
            this.subRequestUnsubscribe(streams, this.authToken, this.sessionId)
        })
    }

    /**
     * Refreshes the list of connected headsets by sending a controlDevice command with 'refresh'.
     * @memberof module:CortexEEGHeadset
     * @returns {void}
     */
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

        //Send the command to refresh the bluetooth scanner
        socket.send(JSON.stringify(refreshHeadsetListRequest));
    }

     /**
     * Queries the headset ID and checks if the headset is connected.
     * @memberof module:CortexEEGHeadset
     * @returns {Promise<object>} - A promise that resolves with the query result.
     */
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
                socket.send(JSON.stringify(queryHeadsetRequest));
            };
            
            sendQueryRequest();
    
            //Check headset availability/ manage response message
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

    /**
     * Requests access to the Cortex API using the provided user credentials.
     * @module CortexEEGHeadset
     * @returns {Promise<string>} - A promise that resolves with the access request result.
     */
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

            //Request acces
            socket.send(JSON.stringify(requestAccessRequest));

            //Handle request acces response
            socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id'] == REQUEST_ACCESS_ID) resolve(data);
                } catch (error) {}
            })
        })
    }

     /**
     * Controls the specified headset, attempting to connect to it.
     * @param {string} headsetId - The ID of the headset to control.
     * @module CortexEEGHeadset
     * @returns {Promise<object>} - A promise that resolves with the controlDevice result.
     */
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

    /**
     * Authorizes the user, obtaining the Cortex token, and calls refreshHeadsetList upon success.
     * @module CortexEEGHeadset
     * @returns {Promise<string>} - A promise that resolves with the Cortex token.
     */
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

    /**
     * Creates a session with the specified headset.
     * @module CortexEEGHeadset
     * @param {string} authToken - The Cortex token obtained during authorization.
     * @param {string} headsetId - The ID of the headset to create a session with.
     * @returns {Promise<string>} - A promise that resolves with the session ID.
     */
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
                        try {
                            let parsedData = JSON.parse(data);

                            if (parsedData.id === CREATE_SESSION_ID) {

                                sessionId = parsedData['result']['id'];
                            // sessionId = parsedData.id;
                                resolve(sessionId);
                            }
                        } catch(err) {
                            console.log('EEG headset error: ', err)
                        }
                        
                    });
                }
            };
            const queryInterval = setInterval(checkHeadsetId, 30000);
            checkHeadsetId();
        });
    }

    /**
     * Sends a subscription request for EEG data to the Cortex API and handles the result.
     * @module CortexEEGHeadset
     * @param {string[]} streams - An array of streams to subscribe to (e.g., ['eeg', 'fac', 'met']).
     * @param {string} authToken - The authentication token obtained during authorization.
     * @param {string} sessionId - The session ID associated with the EEG headset.
     * @returns {void}
     */ 
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

        socket.send(JSON.stringify(subRequest))

        //Handle data receiving
        socket.on('message', (data)=>{
            try {
                let parsedData = JSON.parse(data.toString('utf8')); //Received data from the headsetr
                //console.log(parsedData + '\r\n'));

                this.handleData(parsedData); //Format data and save
            } catch (error) {}
        })
    }

     /**
     * Sends a unsubscription request for EEG data to the Cortex API and handles the result.
     * @module CortexEEGHeadset
     * @param {string[]} streams - An array of streams to unsubscribe to (e.g., ['eeg', 'fac', 'met']).
     * @param {string} authToken - The authentication token obtained during authorization.
     * @param {string} sessionId - The session ID associated with the EEG headset.
     * @returns {void}
     */ 
    subRequestUnsubscribe(stream, authToken, sessionId){
        let socket = this.socket
        const SUB_REQUEST_ID = 6 

        let subRequestUnsubscribe = { 
            "jsonrpc": "2.0", 
            "method": "unsubscribe", 
            "params": { 
                "cortexToken": authToken,
                "session": sessionId,
                "streams": stream
            }, 
            "id": SUB_REQUEST_ID
        }

        socket.send(JSON.stringify(subRequestUnsubscribe))

        //Handle data receiving
        socket.on('message', (data)=>{
            try {
                let parsedData = JSON.parse(data.toString('utf8')); //Received data from the headsetr
                console.log(parsedData + '\r\n');

            } catch (error) {}
        })
    }

    /**
     * Queries the session information, including headset ID, control device, authorization, and session creation.
     * @module CortexEEGHeadset
     * @returns {Promise<void>} - A promise that resolves when session information is queried successfully.
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
    }

    /**
     * Checks if the user is logged in, if the app is granted access, and queries session information.
     * @module CortexEEGHeadset
     * @returns {Promise<void>} - A promise that resolves when access is granted, and session information is queried.
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

    /**
     * Listens for warnings from the socket and takes appropriate actions based on the warning codes.
     * @module CortexEEGHeadset
     * @returns {void}
     */
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

    /**
     * Handles the received data based on the data type (e.g., 'eeg', 'fac', 'pow').
     * @module CortexEEGHeadset
     * @param {object} receivedData - The data received from the EEG headset.
     * @returns {void}
     */
    handleData(receivedData) {
        let type = Object.keys(receivedData)[0];

        if(type == "eeg") {
            //Row EEG data
            this.insertDataToJsonl("raw_eeg.jsonl", receivedData);
        } else if(type == "fac") {
            //Facial Expresions
            this.insertDataToJsonl("facial_expressions.jsonl", receivedData);
        } else if(type == "pow") {
            //Performance metrics
            this.insertDataToJsonl("power_of_sensors.jsonl", receivedData);
        } else if(type == "met") {
            //Performance metrics
            this.insertDataToJsonl("performance_metrics.jsonl", receivedData);
        }
    }

    /**
     * Inserts the received data into a JSONL file with the specified file name.
     * @module CortexEEGHeadset
     * @param {string} fileName - The name of the JSONL file to insert data into.
     * @param {object} data - The data to be inserted into the JSONL file.
     * @returns {void}
     */
    insertDataToJsonl(fileName, data) {
        let jsonData = JSON.stringify(data) + "\n"; //jsonl line

        fs.appendFile("./data/eeg/" + fileName, jsonData, (error) => {
            if(error) throw error;
            
            //console.log('Data appended to', fileName);
        })

    }

    /**
     * Runs the EEG headset streaming by subscribing to the specified streams.
     * @module CortexEEGHeadset
     * @returns {void}
     */
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

        let iniFileContent = fs.readFileSync(settingsFilePath, 'utf-8');
        let settings = ini.parse(iniFileContent);

        settings.eeg.met ? streams.push('met'): '';
        settings.eeg.fac ? streams.push('fac'): '';
        settings.eeg.eeg ? streams.push('eeg'): '';
        settings.eeg.pow ? streams.push('pow'): '';

        console.log('streams', streams)

        this.sub(streams);
    }
    
    /*
     * Stop the Recording
     */
    stopRecording() {
        this.unsub(streams);
    }
}








