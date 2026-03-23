from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol
from urllib import request

from app.schemas.job import HighlightItemRead


SYSTEM_PROMPT = (
    "You select interview highlights from transcript chunks only. "
    "Return JSON with a top-level 'highlights' array."
)


@dataclass(frozen=True)
class HighlightSelectionRequest:
    base_url: str
    api_key: str
    model: str
    transcript_chunks: list[list[dict]]
    target_duration_seconds: int


class ChatCompletionClient(Protocol):
    def create_chat_completion(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str,
        response_format: dict[str, str],
        messages: list[dict[str, str]],
    ) -> dict[str, Any]:
        ...


class OpenAICompatibleClient:
    def create_chat_completion(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str,
        response_format: dict[str, str],
        messages: list[dict[str, str]],
    ) -> dict[str, Any]:
        payload = json.dumps(
            {
                "model": model,
                "response_format": response_format,
                "messages": messages,
            }
        ).encode("utf-8")
        endpoint = f"{base_url.rstrip('/')}/chat/completions"
        http_request = request.Request(
            endpoint,
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with request.urlopen(http_request) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        return json.loads(content) if isinstance(content, str) else content


def _format_chunk(index: int, chunk: list[dict]) -> str:
    lines = [f"Chunk {index + 1}:"]
    for segment in chunk:
        speaker = segment.get("speaker", "unknown")
        lines.append(
            f"[{segment.get('start', 0)}-{segment.get('end', 0)}] {speaker}: {segment.get('text', '')}"
        )
    return "\n".join(lines)


def parse_highlight_response(payload: dict[str, Any]) -> list[HighlightItemRead]:
    return [
        HighlightItemRead(
            start=int(item["start"]),
            end=int(item["end"]),
            star_label=str(item["star_label"]),
            summary=str(item["summary"]),
            reason=str(item["reason"]),
            score=float(item["score"]),
        )
        for item in payload.get("highlights", [])
    ]


def select_highlights(
    selection_request: HighlightSelectionRequest,
    client: ChatCompletionClient | None = None,
) -> list[HighlightItemRead]:
    completion_client = client or OpenAICompatibleClient()
    transcript_text = "\n\n".join(
        _format_chunk(index, chunk)
        for index, chunk in enumerate(selection_request.transcript_chunks)
    )
    response = completion_client.create_chat_completion(
        base_url=selection_request.base_url,
        api_key=selection_request.api_key,
        model=selection_request.model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Select the strongest interview highlights from these transcript chunks. "
                    f"Target duration: {selection_request.target_duration_seconds} seconds.\n\n"
                    f"{transcript_text}"
                ),
            },
        ],
    )
    return parse_highlight_response(response)
