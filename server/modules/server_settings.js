/**
 * The Server Settings Module.
 * @module ServerSettings
 */


//Server file paths
const DATA_FOLDER   = './data/';
const AUDIO_FOLDER  =   DATA_FOLDER + 'audio/';      //The folder path for audio data.
const GSR_FOLDER      = DATA_FOLDER + 'gsr/';      //The folder path for GSR (Galvanic Skin Response) data.
const USER_FOLDER     = DATA_FOLDER + 'user/';     //The folder path for user-related data.
const IMAGE_FOLDER    = DATA_FOLDER + 'images/';   //The folder path for image data.
const SESSION_FOLDER  = DATA_FOLDER + 'session_files/';    //The folder path for session files.
const CONVERTED_AUDIO = DATA_FOLDER + 'audio/processed_audio/';    //The folder path for processed audio data.
const EEG_FOLDER      = DATA_FOLDER + 'eeg/';      //The folder path for EEG (Electroencephalography) data.
const FACIAL_EXPRESSIONS_FILE  = EEG_FOLDER  + 'facial_expressions.jsonl';  //The file path for facial expressions data related to EEG.
const PERFORMANCE_METRICS_FILE = EEG_FOLDER  + 'performance_metrics.jsonl'; //The file path for performance metrics data related to EEG.
const POWER_OF_SENSORS_FILE    = EEG_FOLDER  + 'power_of_sensors.jsonl';    //The file path for power of sensors data related to EEG.
const RAW_EEG_FILE             = EEG_FOLDER  + 'raw_eeg.jsonl'; //The file path for raw EEG data.
const GSR_CLIENT_GRAPH_FOLDER  = GSR_FOLDER + 'client_graph/'; //GSR Client graph folder
const GSR_TRAINING_FOLDER      = GSR_FOLDER + 'gsr_training_data/';
const IMAGE_TEXT_FOLDER        = IMAGE_FOLDER  + 'image_text/';


const AUDIO_OUTPUT_JSON     = 'audio_text.json',    //Output JSON file for audio data.
    GSR_CLIENT_EMOTIONS_CSV = 'client_emotions.csv',//CSV file for client emotions related to GSR (Galvanic Skin Response).
    GSR_GRAPH_CSV           = 'gsr_graph.csv',      //CSV file for GSR (Galvanic Skin Response) graph data.
    GSR_SECTIONS_JSON       = 'gsr_sections.json',  //JSON file for GSR (Galvanic Skin Response) sections data.
    GSR_TRAINING_CSV        = 'gsr_training.csv',   //CSV file for GSR (Galvanic Skin Response) training data.
    IMAGE_TEXT_CSV          = 'image_text.csv',     //CSV file for image text data.
    USER_INTRO_WAV          = 'userIntro.wav',      //WAV file for the user introduction.
    USER_DATA_JSON          = 'user.json';          //JSON file for user data.

/**
* Object containing various file paths.
* @typedef {Object} FILE_PATHS
* @property {string} CONFIG_FILE_PATH - Path to the configuration file.
* @property {string} EEG_FOLDER - Folder path for EEG (Electroencephalography) data.
* @property {string} AUDIO_FOLDER - Folder path for audio data.
* @property {string} CONVERTED_AUDIO - Folder path for processed audio data.
* @property {string} GSR_FOLDER - Folder path for GSR (Galvanic Skin Response) data.
* @property {string} USER_FOLDER - Folder path for user-related data.
* @property {string} IMAGE_FOLDER - Folder path for image data.
* @property {string} PROCESSED_IMAGES - Folder path for processed images.
* @property {string} SESSION_FOLDER - Folder path for session files.
* @property {string} RAW_AUDIO_FOLDER_PATH - Folder path for raw audio data.
* @property {string} CLIENT_GSR_GRAPH_FILE_PATH - File path for the client GSR graph CSV.
* @property {string} CLIENT_EMOTIONS_PATH - File path for the client emotions CSV related to GSR.
* @property {string} GSR_TRAINING_FILE_PATH - File path for GSR training data CSV.
* @property {string} IMAGE_TEXT_FILE_PATH - File path for image text data CSV.
* @property {string} AUDIO_TEXT_FILE_PATH - File path for audio text JSON.
* @property {string} GSR_SECTIONS_JSON_PATH - File path for GSR sections JSON.
* @property {string} USER_INTRO_AUDIO_PATH - File path for the user introduction audio WAV.
* @property {string} USER_FILE_PATH - File path for user data JSON.
* @property {string[]} EEG_FILES_LIST - List of file paths related to EEG (Electroencephalography) data.
*/
const FILE_PATHS = {
    DATA_FOLDER                 : DATA_FOLDER,
    CONFIG_FILE_PATH            : '../config.ini',
    GSR_CLIENT_GRAPH_FOLDER     : GSR_CLIENT_GRAPH_FOLDER,
    GSR_TRAINING_FOLDER         : GSR_TRAINING_FOLDER,
    EEG_FOLDER                  : EEG_FOLDER,
    IMAGE_TEXT_FOLDER           : IMAGE_TEXT_FOLDER,
    AUDIO_FOLDER                : AUDIO_FOLDER,
    CONVERTED_AUDIO             : CONVERTED_AUDIO,
    GSR_FOLDER                  : GSR_FOLDER,
    USER_FOLDER                 : USER_FOLDER,
    IMAGE_FOLDER                : IMAGE_FOLDER,
    PROCESSED_IMAGES            : IMAGE_FOLDER        + 'processed_images',
    SESSION_FOLDER              : SESSION_FOLDER,
    RAW_AUDIO_FOLDER_PATH       : AUDIO_FOLDER        + 'raw_audio/',
    IMAGE_LABELS_FILE_PATH     : IMAGE_TEXT_FOLDER   + 'image_labeling.json',
    CLIENT_GSR_GRAPH_FILE_PATH  : GSR_CLIENT_GRAPH_FOLDER + GSR_GRAPH_CSV,
    CLIENT_EMOTIONS_PATH        : GSR_CLIENT_GRAPH_FOLDER + GSR_CLIENT_EMOTIONS_CSV,
    GSR_TRAINING_FILE_PATH      : GSR_TRAINING_FOLDER     + GSR_TRAINING_CSV,
    IMAGE_TEXT_FILE_PATH        : IMAGE_TEXT_FOLDER   + IMAGE_TEXT_CSV,
    AUDIO_TEXT_FILE_PATH        : AUDIO_FOLDER        + AUDIO_OUTPUT_JSON,
    GSR_SECTIONS_JSON_PATH      : GSR_FOLDER          + GSR_SECTIONS_JSON,
    USER_INTRO_AUDIO_PATH       : USER_FOLDER         + USER_INTRO_WAV,
    USER_FILE_PATH              : USER_FOLDER         + USER_DATA_JSON,
    EEG_FILES_LIST              : [ FACIAL_EXPRESSIONS_FILE, PERFORMANCE_METRICS_FILE, POWER_OF_SENSORS_FILE, RAW_EEG_FILE]

}


/**
* SSH rig connection configuration.
* @typedef {Object} RIG_CONFIG
* @property {string} host - The hostname or IP address of the rig.
* @property {number} port - The SSH port of the rig.
* @property {string} username - The SSH username for connection.
* @property {string} password - The SSH password for connection.
*/
const RIG_CONFIG = {
    host: "raspberry.local",
    port: 22,
    username: "rig",
    password: "raspberry"
}


/**
* Application configuration.
* @typedef {Object} APP_CONFIG
* @property {string} IMAGE_PROCESSOR_COMMAND - Command to run the image processor.
* @property {string} APP_RUNNING_COMMAND - Command to run the main application.
* @property {string} KILL_PYTHON_APPS_COMMAND - Command to kill Python applications.
* @property {string} PATH - Path to the configuration file.
*/
const APP_CONFIG = {
    IMAGE_PROCESSOR_COMMAND     : 'python3 ./processors/image_processor.py',
    APP_RUNNING_COMMAND         : 'python3 /home/rig/Documents/App/main/app.py',
    KILL_PYTHON_APPS_COMMAND    : 'pkill -f python',
    PATH                        : '/home/rig/Documents/App/main/config.ini'
}


/**
* Server configurations.
*
* @typedef {Object} SERVER_CONFIG
* @property {number} OUTPUT_LENGTH - Length of the output JSON file (in minutes).
* @property {string} current_session_file - Current session file name.
* @property {boolean} rigActive - Flag indicating whether the rig is active.
* @property {number} imagesNumber - Number of images.
* @property {number} audioNumber - Number of audio files.
* @property {number} gsrNumber - Number of GSR (Galvanic Skin Response) readings.
*/
let SERVER_CONFIG = {
    OUTPUT_LENGTH               : 10,       //Length of the output json file (in minutes)
    current_session_file        : '',       //Current session file name
    rigActive                   : false,
    imagesNumber                : 0,
    audioNumber                 : 0,
    gsrNumber                   : 0,
}


/**
* Experience configuration.
* @typedef {Object} EXPERIENCE_CONFIG
* @property {string} EXPERIENCE_START_KEYWORDS - Keywords indicating the start of recording.
* @property {string} EXPERIENCE_END_KEYWORDS - Keywords indicating the end of recording.
* @property {number} EXPERIENCE_AUTO_LENGTH - If no end keywords, record this number of words and stop.
*/
const EXPERIENCE_CONFIG = {
    EXPERIENCE_START_KEYWORDS   : "Start Recording",     //Experience start words
    EXPERIENCE_END_KEYWORDS     : "Stop Recording",      //Experience end words
    EXPERIENCE_AUTO_LENGTH      : 100,                   //if no end words. Record 100 words and stop
}


export { 
    FILE_PATHS, 
    RIG_CONFIG,
    SERVER_CONFIG,
    APP_CONFIG,
    EXPERIENCE_CONFIG
}