from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from database import get_db_connection
from oracle import query_financial_data
import datetime

router = APIRouter(prefix="/chat", tags=["Chat"])

class Message(BaseModel):
    role: str
    content: str
    thoughts: Optional[str] = None
    created_at: Optional[str] = None

class Conversation(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM conversations ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role, content, thoughts, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conversation_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("/")
async def chat_with_history(request: ChatRequest):
    conv_id = request.conversation_id
    is_new = False
    
    if not conv_id:
        conv_id = str(uuid.uuid4())
        is_new = True
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Fetch history for context
    cursor.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv_id,))
    history_rows = cursor.fetchall()
    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]
    
    # 2. Get AI response
    try:
        answer, thoughts = await query_financial_data(request.message, history)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. Store conversation and messages
    now = datetime.datetime.now().isoformat()
    if is_new:
        # Simple title generation: first 30 chars of first message
        title = request.message[:30] + ("..." if len(request.message) > 30 else "")
        cursor.execute("INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                       (conv_id, title, now, now))
    else:
        cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))
    
    # Store User message
    cursor.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                   (conv_id, "user", request.message))
    
    # Store Assistant message
    # Ensure thoughts is a string (models like DeepSeek/O1 return it as a list sometimes)
    formatted_thoughts = "\n".join(thoughts) if isinstance(thoughts, list) else thoughts
    
    cursor.execute("INSERT INTO messages (conversation_id, role, content, thoughts) VALUES (?, ?, ?, ?)",
                   (conv_id, "assistant", answer, formatted_thoughts))
    
    conn.commit()
    conn.close()
    
    return {
        "conversation_id": conv_id,
        "answer": answer,
        "thoughts": formatted_thoughts
    }

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}
