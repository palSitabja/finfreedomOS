import asyncio
import yfinance as yf
from routers.stocks import get_stocks
from routers.tax import get_tax_summary
from sheet_parser import get_all_time_stats, get_year_data, SHEET_IDS

async def tool_fetch_tax_info() -> str:
    """Returns the user's tax summary including new/old regime comparison, capital gains tax, deductions, and tax-loss harvesting recommendations."""
    try:
        tax_data = await asyncio.to_thread(get_tax_summary)
        
        income = tax_data.get('income_details', {})
        deductions = tax_data.get('deductions', {})
        cap_gains = tax_data.get('capital_gains', {})
        regimes = tax_data.get('regimes', {})
        recommendation = tax_data.get('recommendation', '')
        savings = tax_data.get('potential_savings', 0)
        harvesting = tax_data.get('harvesting_recommendations', [])
        
        harvesting_str = "No recommendations"
        if harvesting:
            harvesting_str = "\n".join([f"  - Sell {h['ticker']} to harvest ₹{h['unrealized_loss']:,.2f} loss (saves ~₹{h['potential_tax_saving']:,.2f} tax)" for h in harvesting])
            
        return f"""
Tax Profile Summary:
Gross Salary: ₹{income.get('gross_salary', 0):,.2f}
Total Deductions: ₹{deductions.get('total', 0):,.2f}
Realized STCG: ₹{cap_gains.get('realized_stcg', 0):,.2f}
Realized LTCG: ₹{cap_gains.get('realized_ltcg', 0):,.2f}

Regime Comparison:
New Regime Tax Liability: ₹{regimes.get('new', {}).get('tax_liability', 0):,.2f} (Effective Rate: {regimes.get('new', {}).get('effective_rate', 0)}%)
Old Regime Tax Liability: ₹{regimes.get('old', {}).get('tax_liability', 0):,.2f} (Effective Rate: {regimes.get('old', {}).get('effective_rate', 0)}%)
Recommendation: Opt for {recommendation} to save ₹{savings:,.2f}

Tax-Loss Harvesting Opportunities:
{harvesting_str}
        """.strip()
    except Exception as e:
        return f"Error fetching tax info: {e}"

async def tool_fetch_stock_holdings() -> str:
    """Returns the user's current liquid stock portfolio."""
    try:
        portfolio = await asyncio.to_thread(get_stocks)
        if not portfolio:
            return "No stock holdings found."
            
        summary = "\n".join([
            f"- {s['ticker']}: {s['shares']} shares @ avg ₹{s['avg_price_paid']}, Current: ₹{s['current_price']}, Value: ₹{s['current_value']:,.2f} ({s['percent_change']:.2f}%)"
            for s in portfolio
        ])
        return f"Liquid Stock Holdings:\n{summary}"
    except Exception as e:
        return f"Error fetching stock holdings: {e}"

async def tool_fetch_assets() -> str:
    """Returns the user's total investments and assets (less liquid)."""
    try:
        latest_year = sorted(SHEET_IDS.keys())[-1]
        latest_data = await asyncio.to_thread(get_year_data, latest_year)
        
        assets = latest_data.get("assets", [])
        if not assets:
            return "No assets found."
            
        summary = "\n".join([
            f"- {a['name']}: Invested: ₹{a['invested_amount']:,.2f}, Current: ₹{a['current_amount']:,.2f}, Return: {a['absolute_return']}%, XIRR: {a['xirr']}%, CAGR: {a['cagr']}%"
            for a in assets
        ])
        return f"Total Assets & Investments (Illiquid - All-Time Global Assets):\n{summary}"
    except Exception as e:
        return f"Error fetching assets: {e}"

async def tool_fetch_financial_summary() -> str:
    """Returns global financial summary and current liquid bank balance."""
    try:
        summary_stats = await asyncio.to_thread(get_all_time_stats)
        latest_year = sorted(SHEET_IDS.keys())[-1]
        latest_data = await asyncio.to_thread(get_year_data, latest_year)
        
        # Calculate monthly averages separately for income and expenses
        months_with_income = [m for m, md in latest_data["months"].items() if md["Income"] > 0]
        months_with_expenses = [m for m, md in latest_data["months"].items() if md["Expenses"] > 0]
        
        num_months_inc = len(months_with_income) if months_with_income else 1
        num_months_exp = len(months_with_expenses) if months_with_expenses else 1
        
        current_year_income = sum(md["Income"] for md in latest_data["months"].values())
        current_year_expenses = sum(md["Expenses"] for md in latest_data["months"].values())
        
        avg_monthly_income = current_year_income / num_months_inc
        avg_monthly_expenses = current_year_expenses / num_months_exp

        # Use the actual number of months with data from global stats
        total_months_tracked = summary_stats.get('transaction_count', 0)

        return f"""
        Liquid Bank Balance: ₹{summary_stats.get('bank_balance', 0):,.2f}
        
        Recent Cashflow ({latest_year} Average):
        Avg Monthly Income: ₹{avg_monthly_income:,.2f}
        Avg Monthly Expenses: ₹{avg_monthly_expenses:,.2f}
        
        All-Time Global Stats (Tracked over {total_months_tracked} months):
        Total Net Savings: ₹{summary_stats.get('net_savings', 0):,.2f}
        Total Income: ₹{summary_stats.get('total_income', 0):,.2f}
        Total Expenses: ₹{summary_stats.get('total_expenses', 0):,.2f}
        Total Investments: ₹{summary_stats.get('investments', 0):,.2f}
        """
    except Exception as e:
        return f"Error fetching financial summary: {e}"

async def tool_fetch_yearly_cashflow(year: str) -> str:
    """Returns the income and expense breakdown for a specific year."""
    if year not in SHEET_IDS:
        return f"No data found for year {year}. Available years: {', '.join(SHEET_IDS.keys())}"
    try:
        year_data = await asyncio.to_thread(get_year_data, year)
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
                
        return f"Data for {year}:\nIncome:\n" + "\n".join(inc_lines) + "\n\nExpenses:\n" + "\n".join(exp_lines)
    except Exception as e:
        return f"Error fetching cashflow for {year}: {e}"

async def tool_fetch_live_stock_data(ticker: str) -> str:
    """Fetches live stock price, PE ratio, and summary from Yahoo Finance."""
    try:
        def fetch_yf(tkr):
            stock = yf.Ticker(tkr)
            info = stock.info
            price = info.get('currentPrice', info.get('regularMarketPrice', 'N/A'))
            pe = info.get('trailingPE', 'N/A')
            forward_pe = info.get('forwardPE', 'N/A')
            market_cap = info.get('marketCap', 'N/A')
            summary = info.get('longBusinessSummary', 'No summary available.')
            return f"Ticker: {tkr}\nPrice: {price}\nPE Ratio: {pe}\nForward PE: {forward_pe}\nMarket Cap: {market_cap}\nSummary: {summary[:500]}..."
        
        return await asyncio.to_thread(fetch_yf, ticker)
    except Exception as e:
        return f"Error fetching stock data for {ticker}: {e}"

TOOLS = {
    "get_stock_holdings": tool_fetch_stock_holdings,
    "get_assets": tool_fetch_assets,
    "get_financial_summary": tool_fetch_financial_summary,
    "get_cashflow": tool_fetch_yearly_cashflow,
    "get_stock_data": tool_fetch_live_stock_data,
    "get_tax_info": tool_fetch_tax_info,
}

SYSTEM_PROMPT = """You are the Wealth Intelligence Assistant, an elite financial advisor AI with access to real-time tools.
You have access to the following tools:
1. get_stock_holdings: Returns the user's current liquid stock portfolio from the equity tracker. No arguments needed. Use this for easily accessible liquid funds.
2. get_assets: Returns the user's total investments and assets (mutual funds, EPF, real estate, etc) from the latest Google Sheet. No arguments needed. WARNING: These assets are illiquid and cannot be used directly for recent large spending or emergency cash.
3. get_financial_summary: Returns the user's liquid Bank Balance, average monthly income/expenses, and all-time global stats. No arguments needed. Use this to check liquid cash available for downpayments, loans, or emergencies.
4. get_cashflow: Returns the detailed income and expense breakdown for a specific year. Argument: year (e.g. '2026' for current state/future forecasting, '2025' or older for understanding past trends).
5. get_stock_data: Fetches live market data (price, PE ratio, summary) for a given stock ticker from Yahoo Finance. Argument: ticker symbol (e.g. 'AAPL', 'RELIANCE.NS').
6. get_tax_info: Returns the user's tax profile, new/old regime comparison, capital gains, deductions, and tax-loss harvesting recommendations. No arguments needed.

To use a tool, you MUST respond EXACTLY in this format:
Thought: I need to check the user's portfolio.
Action: get_stock_holdings
Action Input: none

OR

Thought: I need to check AAPL stock.
Action: get_stock_data
Action Input: AAPL

When you have gathered enough information to answer the user's question, respond in this format:
Thought: I have the information needed to answer.
Final Answer: <your final markdown-formatted answer here>

Important Rules:
- Only use tools if you need them to fetch data. If you already have the data in the conversation history or general knowledge is enough, go straight to Final Answer.
- You can make up to 4 tool calls per turn.
- Make sure to format your Final Answer beautifully using standard Markdown.
- DO NOT use LaTeX math formatting (like \\[ \\] or \\text{} or \\frac{}). Use plain text arithmetic (e.g., 4292606 / 6377613) and standard markdown.
"""
