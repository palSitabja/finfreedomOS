"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare, 
  Sparkles,
  PieChart,
  History,
  LayoutDashboard,
  BarChart3,
  Activity
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  BarChart,
  Bar,
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DetailedTable } from "../components/DetailedTable";
import { AssetsDashboard } from "../components/AssetsDashboard";
import { PortfolioCommandCenter } from "../components/PortfolioCommandCenter";
import { CashflowPageSkeleton } from "../components/Skeleton";
import { TaxIntelligence } from "../components/TaxIntelligence";
import { FireNavigator } from "../components/FireNavigator";

type ActiveTab = 'cashflow' | 'assets' | 'portfolio' | 'tax' | 'fire';

export default function Home() {
  const [stats, setStats] = useState({ net_savings: 0, total_income: 0, total_expenses: 0, actual_expenses: 0, investments: 0, transaction_count: 0, period: "All-Time" });
  const [detailedData, setDetailedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashflow');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = ["2021", "2022", "2023", "2024", "2025", "2026"];

  useEffect(() => {
    const statsUrl = selectedYear 
      ? `http://localhost:8000/stats?year=${selectedYear}` 
      : "http://localhost:8000/stats";

    setFetching(true);
    setError(null);
    
    if (selectedYear) {
      // Fetch detailed data which now includes the summary for that year
      fetch(`http://localhost:8000/stats/detailed?year=${selectedYear}`)
        .then(res => {
          if (!res.ok) throw new Error("Detailed data unavailable");
          return res.json();
        })
        .then(data => {
          setDetailedData(data);
          // Sync the top cards stats with the year's summary
          if (data.summary) {
            setStats(data.summary);
          }
          setFetching(false);
        })
        .catch(err => {
          console.error("Error fetching detailed stats:", err);
          setError("Failed to load yearly breakdown.");
          setFetching(false);
        });
    } else {
      // All-Time Summary
      fetch("http://localhost:8000/stats")
        .then(res => {
          if (!res.ok) throw new Error("Stats unavailable");
          return res.json();
        })
        .then(data => {
          setStats(data);
          setDetailedData(null);
          setFetching(false);
        })
        .catch(err => {
          console.error("Error fetching all-time stats:", err);
          setError("Failed to load all-time summary.");
          setFetching(false);
        });
    }
  }, [selectedYear]);

  const handleChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    const userMsg = query;
    setQuery("");
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't reach the Intelligence Assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  const getCategories = (type: "Income" | "Expense") => {
    if (!detailedData) return [];
    const cats = new Set<string>();
    Object.values(detailedData.months).forEach((m: any) => {
      if (m.categories[type]) {
        Object.keys(m.categories[type]).forEach(c => cats.add(c));
      }
    });
    return Array.from(cats).sort();
  };

  const getCategoryChartData = () => {
    if (!detailedData) return [];
    const totals: Record<string, number> = {};
    Object.values(detailedData.months).forEach((m: any) => {
      if (m.groups && m.groups["Expense"]) {
        Object.entries(m.groups["Expense"]).forEach(([grp, val]) => {
          totals[grp] = (totals[grp] || 0) + (val as number);
        });
      }
    });

    // Match original spreadsheet ordering loosely or alphabetically 
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); 
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-xl text-white">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Financial Freedom OS</h1>
            <p className="text-sm text-slate-500 font-medium">Wealth Intelligence v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Year View</label>
            <select 
              id="year-select"
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(e.target.value || null)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-sans"
            >
              <option value="">All-Time Summary</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 font-bold text-[10px] text-emerald-700 uppercase tracking-widest">
            <Sparkles size={12} /> Live Sync
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="max-w-7xl mx-auto flex gap-4 mb-8 border-b border-slate-100">
         <button onClick={() => setActiveTab('cashflow')} className={`pb-4 px-2 font-bold text-sm tracking-widest uppercase transition-all border-b-2 ${activeTab === 'cashflow' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Cashflow Summary</button>
         <button onClick={() => setActiveTab('assets')} className={`pb-4 px-2 font-bold text-sm tracking-widest uppercase transition-all border-b-2 ${activeTab === 'assets' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Assets & Portfolio</button>
         <button onClick={() => setActiveTab('portfolio')} className={`pb-4 px-2 font-bold text-sm tracking-widest uppercase transition-all border-b-2 ${activeTab === 'portfolio' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Portfolio Intelligence</button>
         <button onClick={() => setActiveTab('tax')} className={`pb-4 px-2 font-bold text-sm tracking-widest uppercase transition-all border-b-2 ${activeTab === 'tax' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tax Optimizer</button>
         <button onClick={() => setActiveTab('fire')} className={`pb-4 px-2 font-bold text-sm tracking-widest uppercase transition-all border-b-2 ${activeTab === 'fire' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>FIRE Navigator</button>
      </nav>

      <main className="max-w-7xl mx-auto space-y-12">
        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-3 animate-pulse">
            <div className="bg-rose-100 p-1.5 rounded-full"><History size={16} /></div>
            {error}
          </div>
        )}
        
        {/* Cashflow Content */}
        {activeTab === 'cashflow' && (fetching ? (
          <CashflowPageSkeleton />
        ) : (
          <>
            {/* Top Cards Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Wallet size={20} /></div>
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded uppercase">{stats.transaction_count} months</span>
                 </div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Net Savings</p>
                 <h2 className={`text-2xl font-bold italic ${stats.net_savings >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>₹{(stats.net_savings || 0).toLocaleString()}</h2>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div className="bg-blue-100 w-fit p-2 rounded-lg text-blue-600 mb-4"><ArrowUpRight size={20} /></div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Income</p>
                 <h2 className="text-2xl font-bold">₹{(stats.total_income || 0).toLocaleString()}</h2>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div className="bg-rose-100 w-fit p-2 rounded-lg text-rose-600 mb-4"><ArrowDownLeft size={20} /></div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actual Expenses</p>
                 <h2 className="text-2xl font-bold">₹{(stats.actual_expenses || 0).toLocaleString()}</h2>
                 <p className="text-[10px] text-slate-400 mt-1">Excl. investments</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div className="bg-indigo-100 w-fit p-2 rounded-lg text-indigo-600 mb-4"><TrendingUp size={20} /></div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Invested</p>
                 <h2 className="text-2xl font-bold text-indigo-600">₹{(stats.investments || 0).toLocaleString()}</h2>
                 <p className="text-[10px] text-slate-400 mt-1">{stats.total_income > 0 ? ((stats.investments / stats.total_income) * 100).toFixed(1) : 0}% of income</p>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Sparkles size={20} /></div>
                   <h3 className="font-bold text-lg italic tracking-tight">Intelligent Performance Wrap</h3>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <p className="text-sm text-slate-600 leading-relaxed italic">
                      "Your savings rate in {selectedYear || 'all-time'} is <strong>{stats.total_income > 0 ? ((stats.net_savings / stats.total_income) * 100).toFixed(1) : 0}%</strong>. 
                      {stats.net_savings > 0 ? " This represents a healthy cash surplus being built month-over-month." : " Analysis suggests reviewing non-essential expenses."}"
                   </p>
                </div>
            </div>
          </div>
        </section>
        {/* Detailed Drills - Only shown when a year is selected */}
        {selectedYear && detailedData && (
          <section className="space-y-12 animate-in fade-in duration-700 mt-12">
            <div className="flex items-center gap-3 mb-8">
               <div className="bg-slate-900 p-2 rounded-lg text-white"><LayoutDashboard size={20} /></div>
               <div>
                  <h2 className="text-2xl font-bold tracking-tight">Yearly Drill-down: {selectedYear}</h2>
                  <p className="text-sm text-slate-500">Detailed monthly breakdown and category analysis</p>
               </div>
            </div>

            {/* Summary Matrix Table */}
            <DetailedTable 
              title="Summary" 
              data={detailedData.months} 
              rows={["Income", "Expenses", "Actual Expenses", "Net savings", "Ending balance"]} 
              colorClass="text-indigo-600"
            />

            {/* Top Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Income vs Expense vs Investment Plot */}
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-8">
                     <TrendingUp size={18} className="text-slate-400" />
                     <h3 className="font-bold tracking-tight">Cashflow Efficiency</h3>
                  </div>
                  <div className="h-[260px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MONTHS.map(m => ({ 
                            name: m, 
                            income: detailedData.months[m]["Income"], 
                            actual_expenses: detailedData.months[m]["Actual Expenses"],
                            invest: detailedData.months[m]["Investments"]
                        }))}>
                           <defs>
                              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                           <YAxis hide />
                           <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                           <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#incomeGrad)" name="Income" />
                           <Area type="monotone" dataKey="actual_expenses" stroke="#f43f5e" strokeWidth={2} fill="transparent" name="Actual Expenses" />
                           <Area type="monotone" dataKey="invest" stroke="#6366f1" strokeWidth={3} fill="transparent" name="Investment" strokeDasharray="5 5" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Ending Balance Trajectory */}
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" />
                        <h3 className="font-bold tracking-tight">Wealth Trajectory (Ending Balance)</h3>
                     </div>
                     <div className="flex gap-2">
                        <button aria-label="View Monthly Analysis" className="text-[10px] font-bold px-3 py-1.5 bg-slate-900 text-white rounded-lg uppercase tracking-widest leading-none">Monthly View</button>
                     </div>
                  </div>
                  <div className="h-[260px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MONTHS.map(m => ({ name: m, value: detailedData.months[m]["Ending balance"] }))}>
                           <defs>
                              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                 <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                           <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fill="url(#balanceGrad)" name="Ending Balance" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Expenditure by Category Bar Chart (Full Width) */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 mb-8">
                  <BarChart3 size={18} className="text-slate-400" />
                  <h3 className="font-bold tracking-tight">Average spent per category</h3>
               </div>
               <div className="h-[350px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getCategoryChartData()}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} width={60} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                       <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Average Spent"]} />
                       <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} fill="#e27a67" />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Income & Expense Breakdown Tables */}
            <div className="grid grid-cols-1 gap-8">
               <DetailedTable 
                 title="Income" 
                 data={detailedData.months} 
                 rows={getCategories("Income")} 
                 colorClass="text-emerald-600"
               />
               <DetailedTable 
                 title="Expenses" 
                 categoryKey="Expense"
                 data={detailedData.months} 
                 rows={getCategories("Expense")} 
                 colorClass="text-rose-600"
               />
            </div>
          </section>
        )}
          </>
        ))}

        {/* Detailed Drills - Assets Tab Full View */}
        {activeTab === 'assets' && (
           <AssetsDashboard />
        )}

        {/* Portfolio Command Center Tab */}
        {activeTab === 'portfolio' && (
           <PortfolioCommandCenter />
        )}

        {/* Tax Intelligence Tab */}
        {activeTab === 'tax' && (
           <TaxIntelligence />
        )}

        {/* FIRE Navigator Tab */}
        {activeTab === 'fire' && (
           <FireNavigator />
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-24 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-300 pb-20">
         <div className="flex gap-6">
            <span>Powered by Qwen 3.5</span>
            <span>Local SQLite Node Active</span>
         </div>
         <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>Encrypted Individual Instance</span>
         </div>
      </footer>

      {/* Floating Global AI Oracle Chat */}
      <div className={`fixed bottom-6 right-6 z-50 w-[450px] bg-slate-50 rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isChatOpen ? 'h-[600px]' : 'h-[60px]'}`}>
         <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer w-full text-left">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <MessageSquare size={16} />
               </div>
               <span className="font-bold text-sm tracking-tight text-slate-800">Wealth Intelligence Assistant</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
         </button>
         
         {isChatOpen && (
           <>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                {chatHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center mt-12 px-8 uppercase tracking-widest font-bold">Local AI Engine Ready to assist. Try asking about your portfolio or cashflow.</p>
                ) : chatHistory.map((m, i) => (
                   <div key={i} className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white ml-8 shadow-sm' : 'bg-white border border-slate-200 shadow-sm mr-8 prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0'}`}>
                      {m.role === 'ai' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                   </div>
                ))}
             </div>
             <form onSubmit={handleChat} className="p-4 bg-white border-t border-slate-200 relative shrink-0">
                 <textarea 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    onKeyDown={handleKeyDown}
                    placeholder="Type a query... (Shift+Enter for new line)" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all font-medium resize-none min-h-[50px] max-h-[150px] custom-scrollbar"
                    rows={1}
                 />
                 <button type="submit" aria-label="Send query to Assistant" className="absolute right-7 bottom-[26px] text-indigo-600 hover:text-indigo-800 transition-colors"><ArrowUpRight size={18} /></button>
             </form>
           </>
         )}
      </div>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
