# Homework Answer Agent

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Frameworks](https://img.shields.io/badge/Flask-Next.js-orange.svg)](#)

AI assistant that extracts and answers homework questions from text or images. The platform combines a Flask backend (which performs OCR, question detection, and answer generation using an LLM + vector search) with a Next.js frontend for interacting with sources.

## Quick overview

- Backend: Flask API in `backend/` that exposes endpoints to upload images/text, run OCR, detect questions, and answer them using NVIDIA LLMs + FAISS.
- Frontend: Next.js app in `frontend/` that provides UI components for sources, chat, and structured answers.

## Features

- OCR processing of image uploads (multiple images supported).
- Batched question detection that avoids duplicates and preserves order.
- Answer generation per-section using a vector store (FAISS) and an LLM (NVIDIA endpoint).
- Chat history per-source with endpoints to list and clear history.
- Returns structured JSON and Markdown outputs (ready for display or download).

## Project layout (important files)

- `backend/app.py` – Flask application and static uploads route `/uploads/<path:filename>`.
- `backend/config.py` – Environment variables used by the backend.
- `backend/routes/assistant.py` – Primary assistant endpoints (detect/answer/ask/history/clear_history).
- `backend/services/assistant.py` – Core assistant logic (knowledge base, detection, answering, markdown conversion).
- `backend/services/ocr.py` – OCR helpers (used to extract text from images).
- `frontend/` – Next.js frontend (UI and components).

## Backend dependencies

A minimal set is in `backend/requirements.txt`. Key libraries include:

- flask, flask-cors
- langchain
- langchain-nvidia-ai-endpoints
- faiss-cpu
- ocrspace

Install in a virtual environment before running.

## Run locally (recommended)

1. Backend:

```powershell
cd .\backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

2. Frontend (Node.js + npm):

```powershell
cd .\frontend
npm install
npm run dev
```

## Environment

Create a `.env` or set these variables in your shell. `backend/config.py` reads them.

```env
PORT=5000
OCR_SPACE_API_KEY=your_ocr_key
NVIDIA_API_KEY=your_nvidia_key
```