from pyannote.audio import Pipeline


#IN THE PROCESSS################################################

file_path = "/Users/dionisbarcari/Desktop/M1F1-int12WE-AFsp.wav"

#Audio file direalizer, recognise the spearkers and speach timelines
def extractSpeakersTimelines(file):
    pipeline = Pipeline.from_pretrained( "pyannote/speaker-diarization-3.0", 
                                        use_auth_token="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")

    diarization = pipeline(file)

    #Save the diarization output
    with open("data/audio/audio_direalised/conv_direalised3.rttm", "w") as rttm:
        diarization.write_rttm(rttm)


extractSpeakersTimelines(file_path)


