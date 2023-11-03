from pyannote.audio import Pipeline


def extractSpeakersTimelines():
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.0",
        use_auth_token="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")

    file = "/Users/dionisbarcari/Desktop/M1F1-int12WE-AFsp.wav"
    diarization = pipeline(file)

    # dump the diarization output
    with open("audio2.rttm", "w") as rttm:
        diarization.write_rttm(rttm)


extractSpeakersTimelines()