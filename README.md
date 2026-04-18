# Finetra

An intelligent financial intelligence platform to track assets, calculate FIRE progress, and optimize tax intelligence.

## Structure

- `apps/web`: Next.js dashboard
- `apps/api`: Python backend with AI Oracle
- `apps/mobile`: Expo mobile application
- `packages/`: Shared logic and components

## Getting Started

Follow these steps to get the Finetra stack running locally.

### 1. Prerequisites
- **Node.js**: v18+ (for the dashboard)
- **Python**: v3.10+ (for the AI Oracle API)
- **Turbo**: `npm install -g turbo` (optional, for monorepo management)

### 2. Environment Setup
Navigate to the API directory and set up your keys:
```bash
cd apps/api
cp .env.example .env
```
Edit `apps/api/.env` and add your `GITHUB_TOKEN` (for primary inference) or `GROQ_API_KEY` (for fallback).

### 3. Backend Setup (AI Oracle)
We recommend using a virtual environment:
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
The API will be available at `http://localhost:8000`.

### 4. Frontend Setup (Dashboard)
From the root directory:
```bash
npm install
npm run dev
```
The dashboard will be available at `http://localhost:3002`.

### 5. Unified Development
If you have dependencies installed in both layers, you can start everything at once from the root:
```bash
npm run dev
```

---
*Note: The AI Oracle supports Ollama (local), GitHub Models, and Groq Cloud. Configure your preference in `.env`.*
