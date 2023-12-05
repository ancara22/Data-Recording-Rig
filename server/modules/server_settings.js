
const FILE_PATHS = {
    ROW_AUDIO_FOLDER_PATH: "./data/audio/row_audio/",
    AUDIO_TEXT_FILE_PATH:'./data/audio/audio_text.json',
    CLIENT_EMOTIONS_FILE_PATH: './data/gsr/client_graph/client_emotions.csv',
    CLIENT_GSR_GRAPH_FILE_PATH: './data/gsr/client_graph/gsr_graph.csv',
    CONFIG_FILE_PATH: '../config.ini',
    USER_FILE_PATH:'./data/user/user.json',
    GSR_SECTIONS_JSON_PATH: './data/gsr/gsr_sections.json',
    CLIENT_EMOTIONS_PATH: `./data/gsr/client_graph/client_emotions.csv`,
    GSR_TRAINING_FILE_PATH: "./data/gsr/gsr_training_data/gsr_training.csv",
    SESSION_OUTPUT_FILE_PATH: './data/recording_output.json',
    IMAGE_TEXT_FILE_PATH:'./data/images/image_text/image_text.csv',
    USER_INTRO_AUDIO_PATH: "./data/user/userIntro.wav",
}

const EXPERIENCE_START_KEYWORDS = "Start Recording";     //Experience start words
const EXPERIENCE_END_KEYWORDS = "Stop Recording";        //Experience end words
const EXPERIENCE_AUTO_LENGTH = 100;                      //if no end words. Record 100 words and stop



export { FILE_PATHS, EXPERIENCE_START_KEYWORDS, EXPERIENCE_END_KEYWORDS, EXPERIENCE_AUTO_LENGTH }