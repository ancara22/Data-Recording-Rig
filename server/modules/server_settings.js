//Server file paths

const AUDIO_FOLDER  = './data/audio/',
    GSR_FOLDER      = './data/gsr/',
    USER_FOLDER     = './data/user/',
    IMAGE_FOLDER    = './data/images/',
    SESSION_FOLDER  = './data/session_files/',
    CONVERTED_AUDIO = './data/audio/row_audio/converted_audio/';


const FILE_PATHS = {
    CONFIG_FILE_PATH            : '../config.ini',
    AUDIO_FOLDER                : AUDIO_FOLDER,
    CONVERTED_AUDIO             : CONVERTED_AUDIO,
    GSR_FOLDER                  : GSR_FOLDER,
    USER_FOLDER                 : USER_FOLDER,
    IMAGE_FOLDER                : IMAGE_FOLDER,
    SESSION_FOLDER              : SESSION_FOLDER,
    ROW_AUDIO_FOLDER_PATH       : AUDIO_FOLDER        + 'row_audio/',
    AUDIO_TEXT_FILE_PATH        : AUDIO_FOLDER        + 'audio_text.json',
    CLIENT_EMOTIONS_FILE_PATH   : GSR_FOLDER          + 'client_graph/client_emotions.csv',
    CLIENT_GSR_GRAPH_FILE_PATH  : GSR_FOLDER          + 'client_graph/gsr_graph.csv',
    GSR_SECTIONS_JSON_PATH      : GSR_FOLDER          + 'gsr_sections.json',
    CLIENT_EMOTIONS_PATH        : GSR_FOLDER          + 'client_graph/client_emotions.csv',
    GSR_TRAINING_FILE_PATH      : GSR_FOLDER          + 'gsr_training_data/gsr_training.csv',
    SESSION_OUTPUT_FILE_PATH    : SESSION_FOLDER      + 'recording_output.json',
    IMAGE_TEXT_FILE_PATH        : IMAGE_FOLDER        + 'image_text/image_text.csv',
    USER_INTRO_AUDIO_PATH       : USER_FOLDER         + 'userIntro.wav',
    USER_FILE_PATH              : USER_FOLDER         + 'user.json',
}

//SSH rig connection config
const RIG_CONFIG = {
    host: "raspberry.local",
    port: 22,
    username: "rig",
    password: "raspberry"
}

//Server configurations
let SERVER_CONFIG = {
    IMAGE_PROCESSOR_COMMAND     : 'python3 ./processors/image_processor.py',
    APP_RUNNING_COMMAND         : 'python3 /home/rig/Documents/App/main/app.py',
    KILL_PYTHON_APPS_COMMAND    : 'pkill -f python',
    OUTPUT_LENGTH               : 5,       //Length of the output json file (in minutes)
    current_session_file        : '',      //Current session file name
    rigActive                   : false,
    imagesNumber                : 0,
    audioNumber                 : 0,
    gsrNumber                   : 0,
    PATH: `/home/rig/Documents/App/main/config.ini`
}

const EXPERIENCE_START_KEYWORDS = "Start Recording";     //Experience start words
const EXPERIENCE_END_KEYWORDS = "Stop Recording";        //Experience end words
const EXPERIENCE_AUTO_LENGTH = 100;                      //if no end words. Record 100 words and stop


export { 
    FILE_PATHS, 
    EXPERIENCE_START_KEYWORDS, 
    EXPERIENCE_END_KEYWORDS, 
    EXPERIENCE_AUTO_LENGTH, 
    RIG_CONFIG,
    SERVER_CONFIG
}