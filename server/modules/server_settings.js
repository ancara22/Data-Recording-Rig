//Server file paths

const AUDIO_FOLDER  = './data/audio/',
    GSR_FOLDER      = './data/gsr/',
    USER_FOLDER     = './data/user/',
    IMAGE_FOLDER    = './data/images/',
    SESSION_FOLDER  = './data/session_files/',
    CONVERTED_AUDIO = './data/audio/row_audio/converted_audio/';


const AUDIO_OUTPUT_JSON     = 'audio_text.json',
    GSR_CLIENT_EMOTIONS_CSV = 'client_emotions.csv',
    GSR_GRAPH_CSV           = 'gsr_graph.csv',
    GSR_SECTIONS_JSON       = 'gsr_sections.json',
    GSR_TRAINING_CSV        = 'gsr_training.csv',
    IMAGE_TEXT_CSV          = 'image_text.csv',
    USER_INTRO_WAV          = 'userIntro.wav',
    USER_DATA_JSON          = 'user.json';


const FILE_PATHS = {
    CONFIG_FILE_PATH            : '../config.ini',
    AUDIO_FOLDER                : AUDIO_FOLDER,
    CONVERTED_AUDIO             : CONVERTED_AUDIO,
    GSR_FOLDER                  : GSR_FOLDER,
    USER_FOLDER                 : USER_FOLDER,
    IMAGE_FOLDER                : IMAGE_FOLDER,
    SESSION_FOLDER              : SESSION_FOLDER,
    ROW_AUDIO_FOLDER_PATH       : AUDIO_FOLDER        + 'row_audio/',
    CLIENT_GSR_GRAPH_FILE_PATH  : GSR_FOLDER          + 'client_graph/'         + GSR_GRAPH_CSV,
    CLIENT_EMOTIONS_PATH        : GSR_FOLDER          + 'client_graph/'         + GSR_CLIENT_EMOTIONS_CSV,
    GSR_TRAINING_FILE_PATH      : GSR_FOLDER          + 'gsr_training_data/'    + GSR_TRAINING_CSV,
    IMAGE_TEXT_FILE_PATH        : IMAGE_FOLDER        + 'image_text/'           + IMAGE_TEXT_CSV,
    AUDIO_TEXT_FILE_PATH        : AUDIO_FOLDER        + AUDIO_OUTPUT_JSON,
    GSR_SECTIONS_JSON_PATH      : GSR_FOLDER          + GSR_SECTIONS_JSON,
    USER_INTRO_AUDIO_PATH       : USER_FOLDER         + USER_INTRO_WAV,
    USER_FILE_PATH              : USER_FOLDER         + USER_DATA_JSON,
    //SESSION_OUTPUT_FILE_PATH    : SESSION_FOLDER      + 'recording_output.json',
}

//SSH rig connection config
const RIG_CONFIG = {
    host: "raspberry.local",
    port: 22,
    username: "rig",
    password: "raspberry"
}


const APP_CONFIG = {
    IMAGE_PROCESSOR_COMMAND     : 'python3 ./processors/image_processor.py',
    APP_RUNNING_COMMAND         : 'python3 /home/rig/Documents/App/main/app.py',
    KILL_PYTHON_APPS_COMMAND    : 'pkill -f python',
    PATH                        : '/home/rig/Documents/App/main/config.ini'
}

//Server configurations
let SERVER_CONFIG = {
    OUTPUT_LENGTH               : 5,       //Length of the output json file (in minutes)
    current_session_file        : '',      //Current session file name
    rigActive                   : false,
    imagesNumber                : 0,
    audioNumber                 : 0,
    gsrNumber                   : 0,
}

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