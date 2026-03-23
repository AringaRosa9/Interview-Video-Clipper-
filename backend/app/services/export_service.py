from pathlib import Path

from app.services import media_service


def export_job_workspace(*, workspace_path: str, clips: list[dict]) -> list[str]:
    workspace = Path(workspace_path)
    workspace.mkdir(parents=True, exist_ok=True)
    exported_files = media_service.export_clips(workspace_path=workspace_path, clips=clips)
    if exported_files:
        return exported_files

    fallback_output = workspace / "final.mp4"
    if fallback_output.exists() and fallback_output.stat().st_size > 0:
        return [str(fallback_output)]

    raise RuntimeError("No export artifact generated")
