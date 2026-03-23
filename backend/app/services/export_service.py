from pathlib import Path

from app.services import media_service


def export_job_workspace(*, workspace_path: str, clips: list[dict]) -> list[str]:
    workspace = Path(workspace_path)
    workspace.mkdir(parents=True, exist_ok=True)
    media_service.export_clips(workspace_path=workspace_path, clips=clips)
    output_path = workspace / "final.mp4"
    output_path.write_bytes(b"")
    return [str(output_path)]
