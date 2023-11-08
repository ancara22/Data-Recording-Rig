from pyannote.audio import Pipeline
import sys


#IN THE PROCESSS################################################

file_path_input = sys.argv[1]
file_path = "/Users/dionisbarcari/Documents/Courseworks/raspberryPi/server/data/audio/row_audio/" + file_path_input

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

    #Save the diarization output
    #with open("data/audio/audio_direalised/conv_direalised3.rttm", "w") as rttm:
    #    diarization.write_rttm(rttm)


extractSpeakersTimelines(file_path)


