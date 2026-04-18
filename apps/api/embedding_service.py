import litellm
import os
from typing import List

# LiteLLM configuration for Local Ollama
# Assuming Ollama is running on localhost:11434 (default)
OLLAMA_API_BASE = os.getenv("OLLAMA_API_BASE", "http://localhost:11434")

def get_embeddings(texts: List[str], model: str = "ollama/nomic-embed-text") -> List[List[float]]:
    """
    Fetches embeddings from local Ollama via LiteLLM.
    """
    try:
        response = litellm.embedding(
            model=model,
            input=texts,
            api_base=OLLAMA_API_BASE
        )
        # Extract embeddings from response
        return [item['embedding'] for item in response['data']]
    except Exception as e:
        print(f"Error fetching embeddings: {e}")
        return []

if __name__ == "__main__":
    # Test
    test_text = "Restaurants and Dining"
    emb = get_embeddings([test_text])
    if emb:
        print(f"Successfully fetched embedding for '{test_text}'. Dimension: {len(emb[0])}")
    else:
        print("Failed to fetch embedding. Check if Ollama is running.")
