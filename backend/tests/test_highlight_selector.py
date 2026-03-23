from app.services.highlight_selector import (
    HighlightSelectionRequest,
    parse_highlight_response,
    select_highlights,
)


def test_selector_returns_star_tagged_highlights():
    llm_output = {
        "highlights": [
            {
                "start": 5,
                "end": 18,
                "star_label": "Action+Result",
                "summary": "优化支付系统并提升成功率",
                "reason": "体现明确动作和量化结果",
                "score": 0.92,
            }
        ]
    }

    result = parse_highlight_response(llm_output)

    assert result[0].star_label == "Action+Result"


def test_selector_preserves_fractional_timestamps():
    llm_output = {
        "highlights": [
            {
                "start": 5.25,
                "end": 18.75,
                "star_label": "Action+Result",
                "summary": "优化支付系统并提升成功率",
                "reason": "体现明确动作和量化结果",
                "score": 0.92,
            }
        ]
    }

    result = parse_highlight_response(llm_output)

    assert result[0].start == 5.25
    assert result[0].end == 18.75


def test_select_highlights_calls_configured_endpoint_with_transcript_chunks():
    class FakeOpenAIClient:
        def __init__(self):
            self.calls = []

        def create_chat_completion(self, *, base_url, api_key, model, response_format, messages):
            self.calls.append(
                {
                    "base_url": base_url,
                    "api_key": api_key,
                    "model": model,
                    "response_format": response_format,
                    "messages": messages,
                }
            )
            return {
                "highlights": [
                    {
                        "start": 5,
                        "end": 18,
                        "star_label": "Action+Result",
                        "summary": "优化支付系统并提升成功率",
                        "reason": "体现明确动作和量化结果",
                        "score": 0.92,
                    }
                ]
            }

    client = FakeOpenAIClient()
    request = HighlightSelectionRequest(
        base_url="https://llm.example.com/v1",
        api_key="sk-test",
        model="gpt-test",
        transcript_chunks=[
            [
                {"text": "请先做个自我介绍。", "start": 0, "end": 4, "speaker": "speaker_0"},
                {
                    "text": "我负责搭建支付系统，并把成功率提升到99.9%。",
                    "start": 5,
                    "end": 12,
                    "speaker": "speaker_1",
                },
            ]
        ],
        target_duration_seconds=45,
    )

    highlights = select_highlights(request, client=client)

    assert len(client.calls) == 1
    assert client.calls[0]["base_url"] == "https://llm.example.com/v1"
    assert client.calls[0]["response_format"] == {"type": "json_object"}
    assert "支付系统" in client.calls[0]["messages"][1]["content"]
    assert "video.mp4" not in client.calls[0]["messages"][1]["content"]
    assert highlights[0].summary == "优化支付系统并提升成功率"
