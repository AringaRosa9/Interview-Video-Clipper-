from __future__ import annotations

from collections import Counter


QUESTION_MARKERS = ("?", "？", "请", "能否", "可以", "为什么", "吗")


def _is_obvious_question(segment: dict) -> bool:
    text = str(segment.get("text", "")).strip()
    if not text:
        return False
    if text.endswith(("?", "？")):
        return True
    return any(marker in text for marker in QUESTION_MARKERS)


def filter_candidate_segments(segments: list[dict]) -> list[dict]:
    question_counts = Counter(
        str(segment.get("speaker", ""))
        for segment in segments
        if _is_obvious_question(segment)
    )
    interviewer_speaker = question_counts.most_common(1)[0][0] if question_counts else None

    ranked_segments = []
    for segment in segments:
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        score = len(text)
        if _is_obvious_question(segment):
            score -= 100
        if interviewer_speaker and segment.get("speaker") == interviewer_speaker:
            score -= 50
        ranked_segments.append((score, segment))

    kept = [segment for score, segment in ranked_segments if score > 0]
    return kept if kept else [segment for _, segment in ranked_segments]


def chunk_transcript_segments(segments: list[dict], max_chars: int = 4000) -> list[list[dict]]:
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")

    chunks: list[list[dict]] = []
    current_chunk: list[dict] = []
    current_size = 0

    for segment in segments:
        segment_size = len(str(segment.get("text", "")))
        if current_chunk and current_size + segment_size > max_chars:
            chunks.append(current_chunk)
            current_chunk = []
            current_size = 0
        current_chunk.append(segment)
        current_size += segment_size

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
