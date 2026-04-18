"""
llm_provider.py — Centralized LLM inference abstraction.

Supported providers (set via INFERENCE_PROVIDER env var):
  - ollama   : Local Ollama instance (default)
  - github   : GitHub Models via azure-ai-inference SDK

Usage:
    from llm_provider import chat_complete

    response_text = chat_complete(
        system="You are a helpful assistant.",
        user="What is the capital of France?",
    )
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Provider selection ─────────────────────────────────────────────────────────
INFERENCE_PROVIDER = os.environ.get("INFERENCE_PROVIDER", "ollama").lower().strip()

# ── Provider-specific defaults ─────────────────────────────────────────────────
OLLAMA_MODEL   = os.environ.get("OLLAMA_MODEL",  "qwen3.5:9b")
OLLAMA_API_BASE = os.environ.get("OLLAMA_API_BASE", "http://localhost:11434")

GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN", "")
GITHUB_MODEL   = os.environ.get("GITHUB_MODEL", "openai/gpt-4o-mini")
GITHUB_ENDPOINT = "https://models.github.ai/inference"

# ── Timeout ────────────────────────────────────────────────────────────────────
LLM_TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "30"))


def _call_ollama(system: str, user: str) -> str:
    """Call local Ollama via LiteLLM."""
    from litellm import completion
    response = completion(
        model=f"ollama/{OLLAMA_MODEL}",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        api_base=OLLAMA_API_BASE,
        timeout=LLM_TIMEOUT,
    )
    return response.choices[0].message.content


def _call_github(system: str, user: str) -> str:
    """Call GitHub Models via azure-ai-inference SDK."""
    try:
        from azure.ai.inference import ChatCompletionsClient
        from azure.ai.inference.models import SystemMessage, UserMessage
        from azure.core.credentials import AzureKeyCredential
    except ImportError as exc:
        raise RuntimeError(
            "azure-ai-inference is not installed. "
            "Run: pip install azure-ai-inference"
        ) from exc

    if not GITHUB_TOKEN:
        raise RuntimeError(
            "GITHUB_TOKEN is not set. "
            "Add it to your .env file: GITHUB_TOKEN=your_token_here"
        )

    client = ChatCompletionsClient(
        endpoint=GITHUB_ENDPOINT,
        credential=AzureKeyCredential(GITHUB_TOKEN),
    )
    response = client.complete(
        messages=[
            SystemMessage(system),
            UserMessage(user),
        ],
        model=GITHUB_MODEL,
    )
    return response.choices[0].message.content


def chat_complete(system: str, user: str) -> str:
    """
    Route a chat completion request to the configured provider.

    Args:
        system: System-role prompt (instructions / persona).
        user:   User-role prompt (the actual question).

    Returns:
        The model's text response as a plain string.

    Raises:
        RuntimeError: If the provider is misconfigured.
        Exception:    Propagates provider-level errors to callers.
    """
    if INFERENCE_PROVIDER == "github":
        return _call_github(system, user)
    elif INFERENCE_PROVIDER == "ollama":
        return _call_ollama(system, user)
    else:
        raise RuntimeError(
            f"Unknown INFERENCE_PROVIDER='{INFERENCE_PROVIDER}'. "
            "Valid values: ollama, github"
        )
