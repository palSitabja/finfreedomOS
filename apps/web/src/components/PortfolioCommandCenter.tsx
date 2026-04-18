"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Newspaper, 
  Zap, 
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  RefreshCcw,
  Globe,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { DetailedTable } from "./DetailedTable";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';

interface MacroSignal {
  name: string;
  ticker: string;
  value: number;
  change: number;
  change_pct: number;
  trend: number[];
}

interface NewsItem {
  ticker: string;
  title: string;
  publisher: string;
  link: string;
  provider_publish_time: number;
  thumbnail?: string;
  sentiment: string;
  impact: string;
  score: number;
  action: string;
  target: string;
}

interface AIInsight {
  analysis: string;
  status: string;
  risk_level: string;
  timestamp: string;
}

export function PortfolioCommandCenter() {
  const [macro, setMacro] = useState<MacroSignal[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<'pulse' | 'analytics'>('pulse');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetchData();
    loadInsight(); // Auto-load cached insight on mount
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [macroRes, newsRes] = await Promise.all([
        fetch('http://localhost:8000/macro'),
        fetch('http://localhost:8000/news')
      ]);

      const [macroData, newsData] = await Promise.all([
        macroRes.json(),
        newsRes.json()
      ]);

      setMacro(macroData);
      setNews(newsData);
    } catch (err) {
      console.error("Error fetching command center data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadInsight = async () => {
    try {
      const res = await fetch('http://localhost:8000/portfolio/analysis');
      const data = await res.json();
      setInsight(data);
    } catch (err) {
      console.error("Error loading insight:", err);
    }
  };

  const regenerateInsights = async () => {
    setGenerating(true);
    try {
      // Clear server cache first, then force fresh generation
      await fetch('http://localhost:8000/portfolio/cache', { method: 'DELETE' });
      const res = await fetch('http://localhost:8000/portfolio/analysis?force=true');
      const data = await res.json();
      setInsight(data);
    } catch (err) {
      console.error("Error regenerating insights:", err);
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    const chartData = data.map((val, i) => ({ val, i }));
    return (
      <div className="w-full h-8">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData}>
            <YAxis hide domain={['auto', 'auto']} />
            <Area type="monotone" dataKey="val" stroke={color} fill="transparent" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (loading && macro.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Activity size={32} className="text-slate-300" />
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Market Pulse...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Section 1: Market Pulse */}
      <section>
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                 <div className="bg-slate-900 p-2 rounded-lg text-white"><Globe size={18} /></div>
                 <h2 className="text-xl font-bold tracking-tight">Intelligence Module</h2>
              </div>
              
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                 <button 
                    onClick={() => setView('pulse')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'pulse' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    Live Pulse
                 </button>
                 <button 
                    onClick={() => setView('analytics')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    Deep Analysis
                 </button>
              </div>
           </div>
           
           {view === 'pulse' && (
              <button onClick={fetchData} className="text-slate-400 hover:text-slate-900 transition-colors">
                 <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
           )}
        </div>
      </section>

      {view === 'pulse' ? (
           <>
              {/* Market Index Pulse Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                 {macro.map((m) => (
                    <div key={m.ticker} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.name}</span>
                          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${m.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                             {m.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                             {m.change_pct}%
                          </div>
                       </div>
                       <h3 className="text-xl font-black mb-4">₹{m.value.toLocaleString()}</h3>
                       <Sparkline data={m.trend} color={m.change >= 0 ? '#10b981' : '#f43f5e'} />
                    </div>
                 ))}
              </div>

              {/* AI Portfolio Commentary — full width */}
              <div className="relative group mb-12">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                 <div className="relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                             <Sparkles size={18} />
                          </div>
                          <div>
                             <h3 className="font-bold text-lg italic tracking-tight">AI Portfolio Commentary</h3>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Wealth Intelligence Oracle
                                {insight?.cached && <span className="ml-2 text-emerald-500">● Cached</span>}
                             </p>
                          </div>
                       </div>
                       <button 
                          onClick={regenerateInsights} 
                          disabled={generating}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-colors disabled:opacity-50"
                       >
                          {generating ? <RefreshCcw size={12} className="animate-spin" /> : <Zap size={12} />}
                          {generating ? 'Processing...' : 'Recalibrate'}
                       </button>
                    </div>

                    <div className="space-y-4">
                       {insight ? (
                           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[120px]">
                              <div className="text-sm text-slate-600 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                                 <ReactMarkdown>{insight.analysis}</ReactMarkdown>
                              </div>
                           </div>
                       ) : (
                          <div className="h-32 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <button 
                                onClick={regenerateInsights}
                                className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                             >
                                <Zap size={14} /> Generate Insights
                             </button>
                          </div>
                       )}
                       
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-6">
                             <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Portfolio Health</span>
                                <span className={`text-xs font-black uppercase ${
                                   insight?.status === 'Excellent' ? 'text-emerald-500' : 
                                   insight?.status === 'Stable' ? 'text-indigo-500' : 'text-rose-500'
                                }`}>
                                   {insight?.status || 'Monitoring'}
                                </span>
                             </div>
                             <div className="flex flex-col border-l border-slate-100 pl-6">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Calculated Risk</span>
                                <span className={`text-xs font-black uppercase ${
                                   insight?.risk_level === 'High' || insight?.risk_level === 'Aggressive' ? 'text-rose-500' : 
                                   insight?.risk_level === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'
                                }`}>
                                   {insight?.risk_level || 'Calculating...'}
                                </span>
                             </div>
                          </div>
                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Last Updated: {insight ? new Date(insight.timestamp).toLocaleTimeString() : 'N/A'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Intelligence Feed — full width card grid */}
              <section>
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="bg-slate-900 p-2 rounded-lg text-white"><Newspaper size={18} /></div>
                       <div>
                          <h3 className="font-bold tracking-tight">Intelligence Feed</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                             Portfolio-matched headlines • {news.length > 0 ? `${news.length} articles` : 'Loading...'}
                             {news.length > 0 && <span className="ml-2 text-emerald-500">● Cached 6h</span>}
                          </p>
                       </div>
                    </div>
                 </div>

                 {news.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {news.map((item, idx) => (
                          <a
                            key={idx}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all overflow-hidden"
                          >
                             {/* Thumbnail */}
                             {item.thumbnail ? (
                                <div className="h-36 overflow-hidden bg-slate-100">
                                   <img
                                      src={item.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                   />
                                </div>
                             ) : (
                                <div className="h-20 bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center">
                                   <Newspaper size={28} className="text-slate-200" />
                                </div>
                             )}

                             {/* Content */}
                             <div className="flex flex-col flex-1 p-5">
                                {/* Badges */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                   <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-md uppercase tracking-widest">{item.ticker}</span>
                                   <span className={`px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-widest ${
                                      item.sentiment === 'Bullish' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      item.sentiment === 'Bearish' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                      'bg-slate-50 text-slate-400 border border-slate-100'
                                   }`}>{item.sentiment || 'Neutral'}</span>
                                   <span className={`px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-widest ${
                                      item.action === 'Buy' ? 'bg-emerald-100 text-emerald-700' :
                                      item.action === 'Sell' ? 'bg-rose-100 text-rose-700' :
                                      'bg-amber-50 text-amber-600'
                                   }`}>{item.action || 'Hold'}</span>
                                </div>

                                {/* Headline */}
                                <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-3 mb-2 flex-1">
                                   {item.title}
                                </h4>

                                {/* AI Impact */}
                                {item.impact && (
                                   <p className="text-[10px] text-slate-400 italic line-clamp-2 mb-3 leading-relaxed">
                                      {item.impact}
                                   </p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                   <span className="text-[9px] text-slate-400 font-medium">{item.publisher}</span>
                                   <span className="text-[9px] text-slate-400">{formatTime(item.provider_publish_time)}</span>
                                </div>
                             </div>
                          </a>
                       ))}
                    </div>
                 ) : (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                       <Newspaper size={32} className="text-slate-200 mx-auto mb-3" />
                       <p className="text-slate-400 text-xs italic">Scanning portfolio for latest updates...</p>
                    </div>
                 )}
              </section>
           </>
        ) : (
           <AnalyticsDashboard />
        )}

     </div>
  );
}
