"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft,
  MessageSquare, Sparkles, History, LayoutDashboard,
  BarChart3, Activity, Send, ChevronDown,
  Banknote, Landmark, Radar, Calculator, Flame
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, BarChart, Bar,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { DetailedTable } from "../components/DetailedTable";
import { AssetsDashboard } from "../components/AssetsDashboard";
import { PortfolioCommandCenter } from "../components/PortfolioCommandCenter";
import { CashflowPageSkeleton } from "../components/Skeleton";
import { TaxIntelligence } from "../components/TaxIntelligence";
import { FireNavigator } from "../components/FireNavigator";

type ActiveTab = 'cashflow' | 'assets' | 'portfolio' | 'tax' | 'fire';

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'cashflow',  label: 'Cashflow',    icon: <Banknote size={16} /> },
  { id: 'assets',   label: 'Assets',      icon: <Landmark size={16} /> },
  { id: 'portfolio',label: 'Portfolio',   icon: <Radar size={16} /> },
  { id: 'tax',      label: 'Tax Intel',   icon: <Calculator size={16} /> },
  { id: 'fire',     label: 'FIRE',        icon: <Flame size={16} /> },
];

const BAR_COLORS = ['#7c5cfc','#00d68f','#38bdf8','#fb923c','#ff5370','#fbbf24','#a855f7','#06b6d4'];

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
    setFetching(true); setError(null);
    if (selectedYear) {
      fetch(`http://localhost:8000/stats/detailed?year=${selectedYear}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { setDetailedData(d); if (d.summary) setStats(d.summary); setFetching(false); })
        .catch(() => { setError("Failed to load yearly breakdown."); setFetching(false); });
    } else {
      fetch("http://localhost:8000/stats")
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { setStats(d); setDetailedData(null); setFetching(false); })
        .catch(() => { setError("Failed to load all-time summary."); setFetching(false); });
    }
  }, [selectedYear]);

  const handleChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    const msg = query; setQuery(""); setLoading(true);
    setChatHistory(p => [...p, { role: 'user', content: msg }]);
    try {
      const res = await fetch("http://localhost:8000/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
      const data = await res.json();
      setChatHistory(p => [...p, { role: 'ai', content: data.answer }]);
    } catch { setChatHistory(p => [...p, { role: 'ai', content: "Sorry, couldn't reach the Intelligence Assistant." }]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); }
  };

  const getCategories = (type: "Income" | "Expense") => {
    if (!detailedData) return [];
    const cats = new Set<string>();
    Object.values(detailedData.months).forEach((m: any) => { if (m.categories[type]) Object.keys(m.categories[type]).forEach(c => cats.add(c)); });
    return Array.from(cats).sort();
  };

  const getCategoryChartData = () => {
    if (!detailedData) return [];
    const totals: Record<string, number> = {};
    Object.values(detailedData.months).forEach((m: any) => {
      if (m.groups?.["Expense"]) Object.entries(m.groups["Expense"]).forEach(([g, v]) => { totals[g] = (totals[g] || 0) + (v as number); });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const savingsRate = stats.total_income > 0 ? ((stats.net_savings / stats.total_income) * 100).toFixed(1) : 0;
  const investRate  = stats.total_income > 0 ? ((stats.investments / stats.total_income) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ color: 'var(--text-primary)' }}>
      {/* ── HEADER ── */}
      <header className="max-w-7xl mx-auto flex flex-wrap justify-between items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Finetra" className="w-12 h-12 object-contain rounded-[14px]" />
          <div>
            <h1 className="text-3xl font-black leading-tight text-gradient-violet title-font">Finetra</h1>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Wealth Intelligence Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              id="year-select"
              value={selectedYear || ""}
              onChange={e => setSelectedYear(e.target.value || null)}
              className="input-dark pr-8 text-sm font-semibold cursor-pointer appearance-none"
              style={{ paddingRight: 36 }}
            >
              <option value="">All-Time Summary</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="badge-emerald flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-current pulse-glow inline-block" />
            Live Sync
          </div>
        </div>
      </header>

      {/* ── TAB NAV ── */}
      <nav className="max-w-7xl mx-auto flex gap-2 mb-10 overflow-x-auto pb-1 custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? (tab.id === 'cashflow' ? 'active-emerald' : 'active') : ''}`}
          >
            <span className="shrink-0">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto space-y-10">
        {error && (
          <div className="card flex items-center gap-3 p-4" style={{ borderColor: 'var(--accent-rose)', background: 'var(--accent-rose-dim)' }}>
            <History size={16} style={{ color: 'var(--accent-rose)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-rose)' }}>{error}</span>
          </div>
        )}

        {/* ── CASHFLOW TAB ── */}
        {activeTab === 'cashflow' && (fetching ? <CashflowPageSkeleton /> : (
          <>
            {/* Stat Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Net Savings */}
              <div className="card stat-card stat-card-emerald p-6" style={{ background: 'linear-gradient(135deg, rgba(0, 214, 143, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' }}>
                <div className="icon-orb icon-orb-emerald mb-5"><Wallet size={26} /></div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Net Savings</p>
                <h2 className={`text-2xl font-bold font-mono-data ${stats.net_savings >= 0 ? 'text-gradient-emerald' : ''}`} style={stats.net_savings < 0 ? { color: 'var(--accent-rose)' } : {}}>
                  ₹{(stats.net_savings || 0).toLocaleString()}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stats.transaction_count} months tracked</p>
              </div>
              {/* Income */}
              <div className="card stat-card stat-card-sky p-6" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' }}>
                <div className="icon-orb icon-orb-sky mb-5"><ArrowUpRight size={26} /></div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total Income</p>
                <h2 className="text-2xl font-bold font-mono-data" style={{ color: 'var(--accent-sky)' }}>₹{(stats.total_income || 0).toLocaleString()}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Savings rate {savingsRate}%</p>
              </div>
              {/* Expenses */}
              <div className="card stat-card stat-card-rose p-6" style={{ background: 'linear-gradient(135deg, rgba(255, 83, 112, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' }}>
                <div className="icon-orb icon-orb-rose mb-5"><ArrowDownLeft size={26} /></div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Actual Expenses</p>
                <h2 className="text-2xl font-bold font-mono-data" style={{ color: 'var(--accent-rose)' }}>₹{(stats.actual_expenses || 0).toLocaleString()}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Excl. investments</p>
              </div>
              {/* Invested */}
              <div className="card stat-card stat-card-violet p-6" style={{ background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' }}>
                <div className="icon-orb icon-orb-violet mb-5"><TrendingUp size={26} /></div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Invested</p>
                <h2 className="text-2xl font-bold font-mono-data text-gradient-violet">₹{(stats.investments || 0).toLocaleString()}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{investRate}% of income</p>
              </div>
            </section>

            {/* AI Insights Card */}
            <div className="card card-glow-violet p-8 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 opacity-5"><Sparkles size={160} /></div>
              <div className="flex items-center gap-3 mb-5">
                <div className="icon-orb icon-orb-violet" style={{ width: 44, height: 44 }}><Sparkles size={20} /></div>
                <div>
                  <h3 className="font-bold text-base">Intelligent Performance Wrap</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-powered summary for {selectedYear || 'all-time'}</p>
                </div>
              </div>
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your savings rate is <strong style={{ color: 'var(--accent-emerald)' }}>{savingsRate}%</strong> {stats.net_savings > 0 ? "— a healthy surplus being built month-over-month. Keep compounding." : "— consider reviewing non-essential expenses to improve your cushion."}
                </p>
              </div>
            </div>

            {/* Yearly Drilldown */}
            {selectedYear && detailedData && (
              <section className="space-y-8 animate-in">
                <div className="flex items-center gap-3">
                  <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><LayoutDashboard size={18} /></div>
                  <div>
                    <h2 className="text-xl font-bold">Yearly Drill-down: {selectedYear}</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monthly breakdown & category analysis</p>
                  </div>
                </div>

                <DetailedTable title="Summary" data={detailedData.months} rows={["Income", "Expenses", "Actual Expenses", "Net savings", "Ending balance"]} colorClass="text-indigo-400" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cashflow Efficiency */}
                  <div className="card p-7">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp size={16} style={{ color: 'var(--accent-emerald)' }} />
                      <h3 className="font-bold text-sm">Cashflow Efficiency</h3>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MONTHS.map(m => ({ name: m, income: detailedData.months[m]?.["Income"] || 0, actual_expenses: detailedData.months[m]?.["Actual Expenses"] || 0, invest: detailedData.months[m]?.["Investments"] || 0 }))}>
                          <defs>
                            <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00d68f" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#00d68f" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} dy={8} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} />
                          <Area type="monotone" dataKey="income" stroke="#00d68f" strokeWidth={2.5} fill="url(#incG)" name="Income" />
                          <Area type="monotone" dataKey="actual_expenses" stroke="#ff5370" strokeWidth={2} fill="transparent" name="Expenses" />
                          <Area type="monotone" dataKey="invest" stroke="#7c5cfc" strokeWidth={2} fill="transparent" name="Investment" strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Wealth Trajectory */}
                  <div className="card p-7">
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 size={16} style={{ color: 'var(--accent-violet)' }} />
                      <h3 className="font-bold text-sm">Wealth Trajectory</h3>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MONTHS.map(m => ({ name: m, value: detailedData.months[m]?.["Ending balance"] || 0 }))}>
                          <defs>
                            <linearGradient id="balG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.18}/>
                              <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} dy={8} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} />
                          <Area type="monotone" dataKey="value" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#balG)" name="Balance" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Category Bar Chart */}
                <div className="card p-7">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 size={16} style={{ color: 'var(--accent-amber)' }} />
                    <h3 className="font-bold text-sm">Average Spent per Category</h3>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={60} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Avg Spent"]} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                          {getCategoryChartData().map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <DetailedTable title="Income"   data={detailedData.months} rows={getCategories("Income")}  colorClass="text-emerald-400" />
                  <DetailedTable title="Expenses" categoryKey="Expense" data={detailedData.months} rows={getCategories("Expense")} colorClass="text-rose-400" />
                </div>
              </section>
            )}
          </>
        ))}

        {activeTab === 'assets'    && <AssetsDashboard />}
        {activeTab === 'portfolio' && <PortfolioCommandCenter />}
        {activeTab === 'tax'       && <TaxIntelligence />}
        {activeTab === 'fire'      && <FireNavigator />}
      </main>

      {/* ── FOOTER ── */}
      <footer className="max-w-7xl mx-auto mt-20 pt-6 flex justify-between items-center text-xs font-semibold uppercase tracking-widest pb-24" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <div className="flex gap-6">
          <span>Powered by Qwen 3.5</span>
          <span>Local SQLite Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ background: 'var(--accent-emerald)' }} />
          <span>Encrypted Instance</span>
        </div>
      </footer>

      {/* ── FLOATING AI CHAT ── */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden shadow-2xl transition-all duration-500 glass-dark ${isChatOpen ? 'w-[420px] h-[640px] rounded-[32px]' : 'w-16 h-16 rounded-full hover:scale-110'}`}
           style={{ 
             boxShadow: isChatOpen ? '0 30px 90px rgba(0,0,0,0.2), 0 0 0 1px rgba(139,92,246,0.15)' : '0 10px 40px rgba(139,92,246,0.3)',
             transformOrigin: 'bottom right'
           }}>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex items-center justify-center cursor-pointer transition-all duration-300 ${isChatOpen ? 'p-5 w-full justify-between shrink-0' : 'w-full h-full'}`}
          style={{ background: isChatOpen ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent-violet), #6d28d9)', color: isChatOpen ? 'inherit' : '#fff' }}
        >
          {isChatOpen ? (
            <>
              <div className="flex items-center gap-3">
                <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><Sparkles size={18} /></div>
                <span className="font-bold text-base title-font">Finetra Oracle</span>
              </div>
              <ChevronDown size={20} className="text-muted" />
            </>
          ) : (
            <Sparkles size={28} className="animate-pulse" />
          )}
        </button>

        {isChatOpen && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatHistory.length === 0 ? (
                <p className="text-xs text-center mt-10 px-6 font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Ask about your portfolio, cashflow, or FIRE timeline...
                </p>
              ) : chatHistory.map((m, i) => (
                <div key={i} className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'ml-8' : 'mr-8'}`}
                  style={m.role === 'user'
                    ? { background: 'var(--accent-violet)', color: '#fff' }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {m.role === 'ai' ? <div className="prose prose-sm max-w-none prose-p:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div> : m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-8 p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full pulse-glow" style={{ background: 'var(--accent-violet)', animationDelay: `${i*0.2}s` }} />)}
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChat} className="p-3 shrink-0 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… (Shift+Enter for new line)"
                className="flex-1 input-dark resize-none text-sm"
                rows={1}
                style={{ minHeight: 44, maxHeight: 120 }}
              />
              <button type="submit" aria-label="Send" className="icon-orb icon-orb-violet shrink-0 cursor-pointer hover:opacity-80 transition-opacity" style={{ width: 44, height: 44, borderRadius: 12 }}>
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
