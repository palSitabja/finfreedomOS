import asyncio
import json
import re
import yfinance as yf
from llm_provider import async_chat_complete
from routers.stocks import get_stocks
from routers.tax import get_tax_summary
from sheet_parser import get_all_time_stats, get_year_data, SHEET_IDS

# --- TOOLS ---
from tools import TOOLS, SYSTEM_PROMPT

async def compact_history(history: list, max_turns=5):
    """Compacts the history to reduce token cost. Summarizes older context and appends recent turns."""
    if not history:
        return ""
    
    total_messages = len(history)
    cutoff_index = max(0, total_messages - (max_turns * 2))
    
    older_messages = history[:cutoff_index]
    recent_messages = history[cutoff_index:]
    
    summary = ""
    if older_messages:
        # Generate summary of older messages
        older_text = "\n".join([f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content')}" for m in older_messages])
        summary_prompt = f"Please provide a concise summary of the key facts and context from this conversation history. Ignore pleasantries:\n\n{older_text}"
        summary = await async_chat_complete(
            system="You are a helpful assistant that summarizes conversation context to retain memory.",
            user=summary_prompt
        )
        summary = f"[Summary of older conversation: {summary}]\n\n"
        
    formatted = []
    for msg in recent_messages:
        role = "User" if msg.get("role") == "user" else "Assistant"
        formatted.append(f"{role}: {msg.get('content')}")
        
    return summary + "\n".join(formatted)

async def query_financial_data(user_query: str, history: list = None):
    print(f"Oracle Agent starting for: {user_query}")
    
    thoughts = []
    context = await compact_history(history)
    
    conversation_str = ""
    if context:
        conversation_str = f"Previous Conversation Context:\n{context}\n\n"
        
    conversation_str += f"Current Query: {user_query}"
    
    max_steps = 4
    current_prompt = conversation_str
    
    for step in range(max_steps):
        # 1. Call LLM
        response_text = await async_chat_complete(
            system=SYSTEM_PROMPT,
            user=current_prompt
        )
        
        # 2. Parse LLM Response
        thought_match = re.search(r"Thought:\s*(.*?)(?=\nAction|\nFinal Answer|$)", response_text, re.DOTALL | re.IGNORECASE)
        action_match = re.search(r"Action:\s*(.*?)\n", response_text, re.IGNORECASE)
        input_match = re.search(r"Action Input:\s*(.*?)(?=\n|$)", response_text, re.IGNORECASE)
        final_match = re.search(r"Final Answer:\s*(.*)", response_text, re.DOTALL | re.IGNORECASE)
        
        if thought_match:
            thought_text = thought_match.group(1).strip()
            thoughts.append(thought_text)
            print(f"Thought: {thought_text}")
            
        if final_match:
            # We reached the end
            final_answer = final_match.group(1).strip()
            return final_answer, thoughts
            
        elif action_match:
            action = action_match.group(1).strip()
            action_input = ""
            if input_match:
                action_input = input_match.group(1).strip()
                if action_input.lower() == "none":
                    action_input = ""
                    
            thoughts.append(f"Calling tool: {action}({action_input})")
            print(f"Action: {action}({action_input})")
            
            tool_result = ""
            if action in TOOLS:
                try:
                    if action_input:
                        tool_result = await TOOLS[action](action_input)
                    else:
                        tool_result = await TOOLS[action]()
                except Exception as e:
                    tool_result = f"Error executing tool: {e}"
            else:
                tool_result = f"Unknown tool: {action}"
                
            # Append to prompt to continue the loop
            current_prompt += f"\n\n{response_text}\nTool Result:\n{tool_result}\n\nAnalyze the tool result and continue."
            thoughts.append(f"Got result from {action}.")
            
        else:
            # LLM didn't follow formatting, just return whatever it said as final answer
            return response_text.strip(), thoughts

    return "Agent loop hit maximum steps without concluding. Try rephrasing your query.", thoughts

if __name__ == "__main__":
    # Test script
    async def run_test():
        ans, th = await query_financial_data("What is the current PE ratio of AAPL?")
        print(f"\nThoughts:\n{th}")
        print(f"\nAnswer:\n{ans}")
        
    asyncio.run(run_test())
