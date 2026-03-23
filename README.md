# Interview Video Clipper

Local-first, Chinese-language MVP for clipping interview videos into highlights.

## What this is

This MVP provides a small FastAPI backend for the interview clipping workflow. Task 1 only boots the API skeleton and a health check so the project can be validated locally before broader features are added.

## Backend setup

From `backend/`, install the backend dependencies and test extras:

```bash
python3 -m pip install -e ".[test]"
```

## Run the API

Start the API from `backend/`:

```bash
python3 -m uvicorn app.main:app --reload
```

## Run the health test

From `backend/`, run:

```bash
python3 -m pytest tests/test_health.py -q
```
