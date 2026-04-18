import pypdf
import json
import os
from litellm import completion
from typing import Dict, Any, Optional

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts raw text from a PDF file."""
    reader = pypdf.PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def parse_tax_document(text: str, doc_type: str = "form_16") -> Dict[str, Any]:
    """Uses LLM to parse extracted text into a structured Tax profile."""
    
    prompt = f"""
    You are a professional Indian Tax Consultant. Analyze the following extracted text from a {doc_type} and extract key financial figures for the financial year.
    
    Text:
    {text[:8000]} # Limit text length for token constraints
    
    Focus on:
    1. Gross Salary (Section 17)
    2. Total Deductions under Chapter VI-A (Section 80C, 80D, 80G, etc.)
    3. HRA Exemption
    4. Tax Payable or Refundable
    5. Period of Employment
    
    Return the result ONLY as a JSON object with the following keys:
    {{
      "gross_salary": float,
      "deductions_80c": float,
      "deductions_80d": float,
      "other_deductions": float,
      "hra_exemption": float,
      "tax_payable": float,
      "financial_year": "YYYY-YY",
      "status": "Success/Partial"
    }}
    If a value is not found, set it to 0.
    """
    
    try:
        response = completion(
            model="ollama/qwen3.5:9b", # Using available local model
            messages=[{"role": "user", "content": prompt}],
            api_base="http://localhost:11434"
        )
        content = response.choices[0].message.content
        # Clean up JSON if LLM adds markdown wrappers
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Error parsing document with AI: {e}")
        return {
            "gross_salary": 0,
            "deductions_80c": 0,
            "deductions_80d": 0,
            "other_deductions": 0,
            "hra_exemption": 0,
            "tax_payable": 0,
            "status": f"Error: {str(e)}"
        }

def save_parsed_data(file_name: str, data: Dict[str, Any]):
    """Stores the parsed result locally for retrieval."""
    json_path = os.path.join("uploads/tax_docs", f"{file_name}.json")
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

def get_latest_tax_profile() -> Optional[Dict[str, Any]]:
    """Retrieves the most recent parsed tax document data."""
    path = "uploads/tax_docs"
    files = [f for f in os.listdir(path) if f.endswith(".json") and f != "realized_gains.json"]
    if not files:
        return None
        
    # Get latest by modified time
    latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(path, f)))
    with open(os.path.join(path, latest_file), 'r') as f:
        return json.load(f)
