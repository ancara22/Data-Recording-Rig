from pyannote.audio import Pipeline
import sys


file_path_input = sys.argv[1]
file_path = "./data/audio/row_audio/" + file_path_input

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


