from pyannote.audio import Pipeline
import sys


file_path_input = sys.argv[1]
file_path = file_path_input

#Audio file direalizer, recognise the spearkers and speach timelines
def extractSpeakersTimelines(file):
    pipeline = Pipeline.from_pretrained( "pyannote/speaker-diarization-3.0", 
                                        use_auth_token="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")

    diarization = pipeline(file)

    if not diarization:
        print('false')
    else:
        print('true')

    sys.stdout.flush()

extractSpeakersTimelines(file_path)





#//Identify speech in an audio file
#const execAsync = promisify(exec);

#async function identifySpeachInAudio(audioFileName) {
#    return execAsync(`python3 ./processors/audio_transcriber.py ${audioFileName}`)
#        .then(({ stdout, stderr }) => {
#            const outputString = stdout.trim();
#            if (outputString === 'true') {
#                return true;
#            } else if (outputString === 'false') {
#                return false;
#           } else {
#                return false;
#            }
#        })
#        .catch(error => {
#            console.error(`Error: ${error.message}`);
#            return false;
#        });
#}
