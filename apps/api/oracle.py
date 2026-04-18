import chromadb
import sqlite3
import litellm
import os
from embedding_service import get_embeddings
from database import get_db_connection

CHROMA_DATA_PATH = "chroma_db"
COLLECTION_NAME = "finance_categories"

client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
collection = client.get_or_create_collection(name=COLLECTION_NAME)

def index_all_categories():
    """
    Indexes all unique category and group combinations from SQLite into ChromaDB.
    """
    print("Indexing categories for AI search...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get unique (group, category) pairs to build a semantic map
    cursor.execute("SELECT DISTINCT group_name, category FROM transactions")
    unique_pairs = cursor.fetchall()
    
    docs = []
    metadata = []
    ids = []
    
    for row in unique_pairs:
        group = row['group_name'] or "General"
        cat = row['category']
        text = f"{group}: {cat}"
        
        docs.append(text)
        metadata.append({"group": group, "category": cat})
        ids.append(f"{group}_{cat}".replace(" ", "_"))

    if docs:
        # Batch embed using our Ollama service
        embeddings = get_embeddings(docs)
        if embeddings:
            collection.add(
                embeddings=embeddings,
                documents=docs,
                metadatas=metadata,
                ids=ids
            )
            print(f"Indexed {len(docs)} unique category patterns.")
    
    conn.close()

async def query_financial_data(user_query: str):
    """
    A Simple RAG Oracle using SQLite for data and ChromaDB for category matching.
    """
    print(f"Oracle investigating: {user_query}")
    
    from llm_provider import async_chat_complete
    from routers.stocks import get_stocks
    from sheet_parser import get_all_time_stats, get_year_data, SHEET_IDS
    
    # 1. Intent Detection
    year_match = None
    for y in range(2021, 2027):
        if str(y) in user_query:
            year_match = y
            break
    
    # 2. Structured Data Fetch (from Google Sheets)
    data_summary = ""
    if year_match and str(year_match) in SHEET_IDS:
        try:
            # We can run this in a thread since it's sync
            import asyncio
            year_data = await asyncio.to_thread(get_year_data, str(year_match))
            
            # Aggregate totals for the year
            exp_lines = []
            for grp, grp_data in year_data["expenses"].items():
                yearly_total = sum(grp_data["total"].values())
                if yearly_total > 0:
                    exp_lines.append(f"  - {grp}: ₹{yearly_total:,.2f}")
                    
            inc_lines = []
            for grp, grp_data in year_data["income"].items():
                yearly_total = sum(grp_data["total"].values())
                if yearly_total > 0:
                    inc_lines.append(f"  - {grp}: ₹{yearly_total:,.2f}")
                    
            data_summary = f"[Data for {year_match}]\nIncome:\n" + "\n".join(inc_lines) + "\n\nExpenses:\n" + "\n".join(exp_lines)
        except Exception as e:
            data_summary = f"Error fetching data for {year_match}: {e}"
    
    # Fetch Portfolio and Summary Data
    portfolio = []
    summary_stats = {}
    try:
        # Run these in threads to avoid blocking
        import asyncio
        portfolio, summary_stats = await asyncio.gather(
            asyncio.to_thread(get_stocks),
            asyncio.to_thread(get_all_time_stats)
        )
    except Exception as e:
        print(f"Error gathering stats: {e}")
    
    portfolio_summary = "\n".join([
        f"- {s['ticker']}: {s['shares']} shares @ avg ₹{s['avg_price_paid']}, Current: ₹{s['current_price']}, Value: ₹{s['current_value']:,.2f} ({s['percent_change']:.2f}%)"
        for s in portfolio
    ])
    
    global_summary = f"""
    - Net Savings: ₹{summary_stats.get('net_savings', 0):,.2f}
    - Total Income: ₹{summary_stats.get('total_income', 0):,.2f}
    - Total Expenses: ₹{summary_stats.get('total_expenses', 0):,.2f}
    - Investments: ₹{summary_stats.get('investments', 0):,.2f}
    """

    # 4. Final LLM Response
    prompt = f"""
    The user is asking: '{user_query}'
    
    Here is the relevant data retrieved from their personal financial spreadsheets (2021-2026):
    
    [Transaction Matches]
    {data_summary if data_summary else "No exact matches found for this category/year."}
    
    [Stock Portfolio Holdings]
    {portfolio_summary if portfolio_summary else "No stock holdings found."}
    
    [All-Time Global Summary]
    {global_summary}
    
    Please provide a helpful, concise answer. ALWAYS base your answer strictly on the provided data. Show the math/calculations you use to arrive at your answer so the user trusts it. If no data was found to answer their question, explicitly acknowledge that.
    """
    
    response_text = await async_chat_complete(
        system="You are the Wealth Intelligence Assistant, a professional financial advisor AI.",
        user=prompt
    )
    
    return response_text

if __name__ == "__main__":
    # Index first
    index_all_categories()
    
    # Test queries
    print("\n--- Test Query 1 ---")
    print(query_financial_data("How much did I spend on restaurants in 2024?"))
    
    print("\n--- Test Query 2 ---")
    print(query_financial_data("What was my total income in 2021?"))
