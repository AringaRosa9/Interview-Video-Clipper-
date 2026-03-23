from pathlib import Path


def download_video(video_url: str, workspace_path: str) -> str:
    workspace = Path(workspace_path)
    return str(workspace / Path(video_url).name)


def probe_video(video_path: str) -> dict:
    return {"video_path": video_path}


def extract_audio(video_path: str, workspace_path: str) -> str:
    workspace = Path(workspace_path)
    video_name = Path(video_path).stem or "audio"
    return str(workspace / f"{video_name}.wav")


def export_clips(*, workspace_path: str, clips: list[dict]) -> list[str]:
    _ = workspace_path, clips
    return []
