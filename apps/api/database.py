import sqlite3
import os

DB_NAME = "ledger.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Stock Holdings Table (The only remaining local store)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ticker_metadata (
            ticker TEXT PRIMARY KEY,
            sector TEXT,
            industry TEXT,
            market_cap REAL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            avg_price_paid REAL DEFAULT 0,
            shares REAL DEFAULT 0,
            exit_price REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Chat History Tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            thoughts TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            year INTEGER NOT NULL,
            month TEXT NOT NULL,
            type TEXT NOT NULL,
            group_name TEXT,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            source_sheet_id TEXT,
            raw_row_index INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Sync history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sync_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spreadsheet_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Assets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            invested_amount REAL DEFAULT 0,
            current_amount REAL DEFAULT 0,
            absolute_return REAL DEFAULT 0,
            xirr REAL DEFAULT 0,
            cagr REAL DEFAULT 0,
            tenure_years REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database initialized (schema finalized).")

if __name__ == "__main__":
    init_db()
