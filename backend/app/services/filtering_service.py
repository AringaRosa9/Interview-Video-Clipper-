from __future__ import annotations

from collections import Counter


LEADING_FILLERS = ("那", "那么", "然后", "接着", "再", "请问", "请问一下")
QUESTION_PREFIXES = (
    "请",
    "能否",
    "可否",
    "为什么",
    "如何",
    "介绍一下",
    "讲讲",
    "说说",
)


def _strip_leading_fillers(text: str) -> str:
    normalized = text.lstrip("，,。.!！？?：:；;、 ")
    changed = True
    while normalized and changed:
        changed = False
        for filler in LEADING_FILLERS:
            if normalized.startswith(filler):
                normalized = normalized[len(filler) :].lstrip("，,。.!！？?：:；;、 ")
                changed = True
                break
    return normalized


def _is_obvious_question(segment: dict) -> bool:
    text = str(segment.get("text", "")).strip()
    if not text:
        return False
    if text.endswith(("?", "？")):
        return True
    normalized = _strip_leading_fillers(text)
    return any(normalized.startswith(prefix) for prefix in QUESTION_PREFIXES)


def _split_segment(segment: dict, max_chars: int) -> list[dict]:
    text = str(segment.get("text", ""))
    if len(text) <= max_chars:
        return [segment]

    start = float(segment.get("start", 0))
    end = float(segment.get("end", start))
    total_chars = len(text)
    duration = max(end - start, 0.0)
    split_segments = []

    for offset in range(0, total_chars, max_chars):
        chunk_text = text[offset : offset + max_chars]
        chunk_start = start + duration * (offset / total_chars)
        chunk_end = start + duration * ((offset + len(chunk_text)) / total_chars)
        split_segments.append(
            {
                **segment,
                "text": chunk_text,
                "start": chunk_start,
                "end": chunk_end,
            }
        )

    return split_segments


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

    prioritized_segments = sorted(ranked_segments, key=lambda item: item[0], reverse=True)
    kept = [segment for score, segment in prioritized_segments if score > 0]
    return kept if kept else [segment for _, segment in prioritized_segments]


def chunk_transcript_segments(segments: list[dict], max_chars: int = 4000) -> list[list[dict]]:
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")

    chunks: list[list[dict]] = []
    current_chunk: list[dict] = []
    current_size = 0

    for segment in segments:
        for split_segment in _split_segment(segment, max_chars):
            segment_size = len(str(split_segment.get("text", "")))
            if current_chunk and current_size + segment_size > max_chars:
                chunks.append(current_chunk)
                current_chunk = []
                current_size = 0
            current_chunk.append(split_segment)
            current_size += segment_size

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
