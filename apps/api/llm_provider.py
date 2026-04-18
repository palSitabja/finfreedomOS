"""
llm_provider.py — Centralized LLM inference abstraction.

Supported providers (set via INFERENCE_PROVIDER env var):
  - ollama   : Local Ollama instance (default)
  - github   : GitHub Models via azure-ai-inference SDK (Fallback: Groq)
  - groq     : Groq Cloud via litellm

Usage:
    from llm_provider import chat_complete

    response_text = chat_complete(
        system="You are a helpful assistant.",
        user="What is the capital of France?",
    )
"""

import os
from typing import Optional
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

GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL     = os.environ.get("GROQ_MODEL", "groq/qwen-2.5-32b") # Defaulting to Qwen 32B as requested

# ── Timeout ────────────────────────────────────────────────────────────────────
LLM_TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "30"))


async def _acall_ollama(system: str, user: str) -> str:
    """Call local Ollama via LiteLLM (async)."""
    from litellm import acompletion
    response = await acompletion(
        model=f"ollama/{OLLAMA_MODEL}",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        api_base=OLLAMA_API_BASE,
        timeout=LLM_TIMEOUT,
    )
    return response.choices[0].message.content


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


async def _acall_github(system: str, user: str) -> str:
    """Call GitHub Models via LiteLLM (async)."""
    if not GITHUB_TOKEN:
        raise RuntimeError("GITHUB_TOKEN is not set.")
    
    from litellm import acompletion
    response = await acompletion(
        model=f"github/{GITHUB_MODEL}",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        api_key=GITHUB_TOKEN,
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


async def _acall_groq(system: str, user: str) -> str:
    """Call Groq Cloud via LiteLLM (async)."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set.")
    
    from litellm import acompletion
    response = await acompletion(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        api_key=GROQ_API_KEY,
        timeout=LLM_TIMEOUT,
    )
    return response.choices[0].message.content


def _call_groq(system: str, user: str) -> str:
    """Call Groq Cloud via LiteLLM."""
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Add it to your .env file: GROQ_API_KEY=your_key_here"
        )
    
    from litellm import completion
    response = completion(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        api_key=GROQ_API_KEY,
        timeout=LLM_TIMEOUT,
    )
    return response.choices[0].message.content


async def async_chat_complete(system: str, user: str, provider: Optional[str] = None) -> str:
    """
    Route an ASYNC chat completion request to the configured provider.
    """
    target = provider or INFERENCE_PROVIDER

    if target == "github":
        try:
            return await _acall_github(system, user)
        except Exception as e:
            print(f"⚠️ GitHub Async failed: {e}. Falling back to Groq...")
            return await _acall_groq(system, user)
    elif target == "groq":
        return await _acall_groq(system, user)
    elif target == "ollama":
        return await _acall_ollama(system, user)
    else:
        raise RuntimeError(f"Unknown provider: {target}")


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
        try:
            return _call_github(system, user)
        except Exception as e:
            print(f"⚠️ GitHub Inference failed: {e}. Falling back to Groq...")
            return _call_groq(system, user)
    elif INFERENCE_PROVIDER == "groq":
        return _call_groq(system, user)
    elif INFERENCE_PROVIDER == "ollama":
        return _call_ollama(system, user)
    else:
        raise RuntimeError(
            f"Unknown INFERENCE_PROVIDER='{INFERENCE_PROVIDER}'. "
            "Valid values: ollama, github, groq"
        )
