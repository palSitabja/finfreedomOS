#!/usr/bin/env python3
"""
test_inference.py — Connectivity test for configured LLM provider(s).

Usage:
    # Test active provider (from .env):
    python scratch/test_inference.py

    # Test a specific provider regardless of .env:
    python scratch/test_inference.py --provider ollama
    python scratch/test_inference.py --provider github

    # Test BOTH providers:
    python scratch/test_inference.py --provider all
"""

import os
import sys
import time
import argparse

# Load .env from parent api/ directory
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SYSTEM_PROMPT = "You are a helpful assistant. Keep responses very brief."
USER_PROMPT   = "What is the capital of France? Reply in one sentence."

PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "


def test_ollama() -> bool:
    model    = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
    api_base = os.environ.get("OLLAMA_API_BASE", "http://localhost:11434")
    print(f"\n{'─'*50}")
    print(f"  Provider : Ollama")
    print(f"  Model    : {model}")
    print(f"  Endpoint : {api_base}")
    print(f"{'─'*50}")

    try:
        from litellm import completion
        t0 = time.time()
        response = completion(
            model=f"ollama/{model}",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": USER_PROMPT},
            ],
            api_base=api_base,
            timeout=20,
        )
        elapsed = time.time() - t0
        text = response.choices[0].message.content.strip()
        print(f"  {PASS} Response ({elapsed:.1f}s): {text}")
        return True
    except Exception as e:
        print(f"  {FAIL} Failed: {e}")
        return False


def test_github() -> bool:
    token    = os.environ.get("GITHUB_TOKEN", "")
    model    = os.environ.get("GITHUB_MODEL", "openai/gpt-4o-mini")
    endpoint = "https://models.github.ai/inference"

    print(f"\n{'─'*50}")
    print(f"  Provider : GitHub Models")
    print(f"  Model    : {model}")
    print(f"  Endpoint : {endpoint}")
    print(f"  Token    : {'SET (' + token[:8] + '...)' if token else 'NOT SET'}")
    print(f"{'─'*50}")

    if not token:
        print(f"  {WARN} GITHUB_TOKEN is not set.")
        print(f"       Add it to apps/api/.env:  GITHUB_TOKEN=ghp_your_token_here")
        return False

    try:
        from azure.ai.inference import ChatCompletionsClient
        from azure.ai.inference.models import SystemMessage, UserMessage
        from azure.core.credentials import AzureKeyCredential
    except ImportError:
        print(f"  {FAIL} azure-ai-inference not installed.")
        print(f"       Run: pip install azure-ai-inference")
        return False

    try:
        client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(token),
        )
        t0 = time.time()
        response = client.complete(
            messages=[
                SystemMessage(SYSTEM_PROMPT),
                UserMessage(USER_PROMPT),
            ],
            model=model,
        )
        elapsed = time.time() - t0
        text = response.choices[0].message.content.strip()
        print(f"  {PASS} Response ({elapsed:.1f}s): {text}")
        return True
    except Exception as e:
        print(f"  {FAIL} Failed: {e}")
        if "401" in str(e) or "Unauthorized" in str(e):
            print(f"       {WARN} Token may be missing 'models:read' permission.")
        elif "404" in str(e) or "NotFound" in str(e):
            print(f"       {WARN} Model '{model}' not found. Check GITHUB_MODEL in .env.")
        return False


def main():
    parser = argparse.ArgumentParser(description="Test LLM provider connectivity")
    parser.add_argument(
        "--provider",
        choices=["ollama", "github", "all", "auto"],
        default="auto",
        help="Which provider to test (default: read from INFERENCE_PROVIDER env var)",
    )
    args = parser.parse_args()

    active = os.environ.get("INFERENCE_PROVIDER", "ollama").lower().strip()
    provider = args.provider if args.provider != "auto" else active

    print(f"\n🔍 Financial Freedom OS — LLM Provider Connectivity Test")
    print(f"   Active provider in .env: {active.upper()}")

    results = {}

    if provider in ("ollama", "all"):
        results["ollama"] = test_ollama()

    if provider in ("github", "all"):
        results["github"] = test_github()

    # Summary
    print(f"\n{'═'*50}")
    print("  Summary")
    print(f"{'═'*50}")
    all_passed = True
    for name, ok in results.items():
        status = PASS if ok else FAIL
        print(f"  {status} {name.capitalize()}")
        if not ok:
            all_passed = False

    if not results:
        print(f"  {WARN} No providers tested. Use --provider ollama|github|all")

    print()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
