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


def test_chunk_transcript_segments_splits_single_oversize_segment():
    segments = [
        {"text": "abcdefghij", "start": 0.0, "end": 10.0, "speaker": "speaker_1"},
    ]

    chunks = chunk_transcript_segments(segments, max_chars=4)

    assert chunks == [
        [{"text": "abcd", "start": 0.0, "end": 4.0, "speaker": "speaker_1"}],
        [{"text": "efgh", "start": 4.0, "end": 8.0, "speaker": "speaker_1"}],
        [{"text": "ij", "start": 8.0, "end": 10.0, "speaker": "speaker_1"}],
    ]


def test_filter_prioritizes_longer_candidate_answers_first():
    segments = [
        {"text": "请介绍一个最有挑战的项目？", "start": 0, "end": 3, "speaker": "speaker_0"},
        {"text": "我负责重构支付链路。", "start": 3.2, "end": 7.1, "speaker": "speaker_1"},
        {
            "text": "我主导了支付系统重构，拆分核心链路并建立监控告警，最终把成功率提升到99.9%，同时把故障恢复时间缩短到5分钟内。",
            "start": 7.3,
            "end": 22.8,
            "speaker": "speaker_1",
        },
    ]

    filtered = filter_candidate_segments(segments)

    assert [segment["text"] for segment in filtered] == [
        "我主导了支付系统重构，拆分核心链路并建立监控告警，最终把成功率提升到99.9%，同时把故障恢复时间缩短到5分钟内。",
        "我负责重构支付链路。",
    ]


def test_filter_does_not_treat_candidate_answer_with_question_markers_as_interviewer_prompt():
    segments = [
        {"text": "可以介绍一下你做过的高并发项目吗？", "start": 0, "end": 4, "speaker": "speaker_0"},
        {
            "text": "可以。我主导过支付链路改造，把成功率提升到99.9%。",
            "start": 4.5,
            "end": 13.2,
            "speaker": "speaker_1",
        },
        {
            "text": "后来我又补齐了监控告警和自动化恢复能力。",
            "start": 13.4,
            "end": 18.6,
            "speaker": "speaker_1",
        },
    ]

    filtered = filter_candidate_segments(segments)

    assert [segment["speaker"] for segment in filtered] == ["speaker_1", "speaker_1"]
    assert filtered[0]["text"].startswith("可以。我主导过支付链路改造")


def test_filter_still_demotes_interviewer_prompt_with_leading_filler_words():
    segments = [
        {"text": "那请介绍一下你做过的高并发项目。", "start": 0, "end": 4, "speaker": "speaker_0"},
        {
            "text": "我主导过支付链路改造，把成功率提升到99.9%。",
            "start": 4.5,
            "end": 13.2,
            "speaker": "speaker_1",
        },
    ]

    filtered = filter_candidate_segments(segments)

    assert [segment["speaker"] for segment in filtered] == ["speaker_1"]
