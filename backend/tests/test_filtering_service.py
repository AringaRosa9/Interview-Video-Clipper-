from app.services.filtering_service import chunk_transcript_segments, filter_candidate_segments


def test_filter_prefers_candidate_answer_segments():
    segments = [
        {"text": "请先做个自我介绍。", "start": 0, "end": 4, "speaker": "speaker_0"},
        {
            "text": "我负责搭建支付系统，并把成功率提升到99.9%。",
            "start": 5,
            "end": 12,
            "speaker": "speaker_1",
        },
    ]

    filtered = filter_candidate_segments(segments)

    assert len(filtered) == 1
    assert "99.9%" in filtered[0]["text"]
    assert filtered[0]["start"] == 5
    assert filtered[0]["end"] == 12


def test_chunk_transcript_segments_preserves_order_and_timestamps():
    segments = [
        {"text": "第一段", "start": 0, "end": 4, "speaker": "speaker_1"},
        {"text": "第二段", "start": 5, "end": 9, "speaker": "speaker_1"},
        {"text": "第三段", "start": 10, "end": 14, "speaker": "speaker_1"},
    ]

    chunks = chunk_transcript_segments(segments, max_chars=6)

    assert chunks == [
        [segments[0], segments[1]],
        [segments[2]],
    ]
