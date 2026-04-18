"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  TrendingUp, TrendingDown, Activity, Newspaper, Zap, Sparkles,
  ArrowUpRight, RefreshCcw, Globe, ExternalLink,
  Coins, Bitcoin, Droplets, LineChart, Landmark, DollarSign
} from 'lucide-react';
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface MacroSignal { name: string; ticker: string; value: number; change: number; change_pct: number; trend: number[]; }
interface NewsItem { ticker: string; title: string; publisher: string; link: string; provider_publish_time: number; thumbnail?: string; sentiment: string; impact: string; score: number; action: string; target: string; }
interface AIInsight { analysis: string; status: string; risk_level: string; timestamp: string; cached?: boolean; }

const MACRO_COLORS = ['#7c5cfc','#00d68f','#38bdf8','#fbbf24','#fb923c','#ff5370'];

const Sparkline = ({ data, color }: { data: number[]; color: string }) => (
  <div className="w-full h-10">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={data.map((val, i) => ({ val, i }))}>
        <defs>
          <linearGradient id={`spk-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <YAxis hide domain={['auto','auto']} />
        <Area type="monotone" dataKey="val" stroke={color} fill={`url(#spk-${color.replace('#','')})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export function PortfolioCommandCenter() {
  const [macro, setMacro] = useState<MacroSignal[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<'pulse' | 'analytics'>('pulse');

  useEffect(() => { fetchData(); loadInsight(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mr, nr] = await Promise.all([fetch('http://localhost:8000/macro'), fetch('http://localhost:8000/news')]);
      setMacro(await mr.json()); setNews(await nr.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadInsight = async () => {
    try { const r = await fetch('http://localhost:8000/portfolio/analysis'); setInsight(await r.json()); }
    catch (e) { console.error(e); }
  };

  const regenerateInsights = async () => {
    setGenerating(true);
    try {
      await fetch('http://localhost:8000/portfolio/cache', { method: 'DELETE' });
      const r = await fetch('http://localhost:8000/portfolio/analysis?force=true');
      setInsight(await r.json());
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading && macro.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="icon-orb icon-orb-violet animate-pulse" style={{ width: 64, height: 64, borderRadius: 20 }}><Activity size={28}/></div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Synchronizing Market Pulse…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-orb icon-orb-sky" style={{ width: 44, height: 44, borderRadius: 14 }}><Globe size={20}/></div>
            <div>
              <h2 className="text-xl font-bold">Intelligence Module</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Live markets · AI commentary · News feed</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {(['pulse', 'analytics'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${view === v ? '' : 'opacity-40'}`}
                style={view === v ? { background: 'var(--accent-violet)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                {v === 'pulse' ? 'Live Pulse' : 'Deep Analysis'}
              </button>
            ))}
          </div>
        </div>
        {view === 'pulse' && (
          <button onClick={fetchData} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {view === 'pulse' ? (
        <>
          {/* Macro Index Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {macro.map((m, i) => {
              const color = MACRO_COLORS[i % MACRO_COLORS.length];
              const up = m.change >= 0;
              
              // Map icons based on ticker or name
              const getIcon = () => {
                const name = m.name.toLowerCase();
                const ticker = m.ticker.toLowerCase();
                if (name.includes('gold')) return <Coins size={14} />;
                if (name.includes('silver')) return <Coins size={14} />;
                if (name.includes('bitcoin') || ticker.includes('btc')) return <Bitcoin size={14} />;
                if (name.includes('oil') || ticker.includes('cl=')) return <Droplets size={14} />;
                if (name.includes('nifty') || ticker.includes('nsei')) return <LineChart size={14} />;
                if (name.includes('usd') || name.includes('inr')) return <DollarSign size={14} />;
                return <Activity size={14} />;
              };

              // Map subtle gradients based on asset class
              const getGradient = () => {
                const name = m.name.toLowerCase();
                if (name.includes('gold')) return 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, rgba(255,255,255,0) 100%)';
                if (name.includes('silver')) return 'linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(255,255,255,0) 100%)';
                if (name.includes('bitcoin')) return 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(255,255,255,0) 100%)';
                if (name.includes('oil')) return 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(255,255,255,0) 100%)';
                if (name.includes('nifty')) return 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(255,255,255,0) 100%)';
                return 'none';
              };

              return (
                <div key={m.ticker} className="card card-glow-violet p-5 hover:scale-[1.02] transition-transform cursor-default" 
                     style={{ background: getGradient() }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="icon-orb" style={{ 
                        width: 32, height: 32, borderRadius: 10, 
                        background: `${color}15`, color: color,
                        flexShrink: 0 
                      }}>
                        {getIcon()}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>{m.name}</p>
                        <h3 className="text-lg font-bold font-mono-data leading-none">{m.value.toLocaleString()}</h3>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${up ? 'badge-emerald' : 'badge-rose'}`}
                         style={up ? {} : { background: 'var(--accent-rose-dim)', color: 'var(--accent-rose)', border: '1px solid rgba(255,83,112,0.2)' }}>
                      {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                      {m.change_pct}%
                    </div>
                  </div>
                  <Sparkline data={m.trend} color={up ? '#00d68f' : '#ff5370'} />
                </div>
              );
            })}
          </div>

          {/* AI Commentary */}
          <div className="card card-glow-violet p-7 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-5 rotate-12"><Sparkles size={180}/></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="icon-orb icon-orb-violet" style={{ width: 44, height: 44 }}><Sparkles size={20}/></div>
                <div>
                  <h3 className="font-bold text-base">AI Portfolio Commentary</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Wealth Intelligence Oracle {insight?.cached && <span style={{ color: 'var(--accent-emerald)' }}>● Cached</span>}
                  </p>
                </div>
              </div>
              <button onClick={regenerateInsights} disabled={generating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent-violet-dim)', color: 'var(--accent-violet)', border: '1px solid rgba(124,92,252,0.25)' }}>
                {generating ? <RefreshCcw size={12} className="animate-spin"/> : <Zap size={12}/>}
                {generating ? 'Processing…' : 'Recalibrate'}
              </button>
            </div>

            {insight ? (
              <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                  <ReactMarkdown>{insight.analysis}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center rounded-2xl mb-5" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-strong)' }}>
                <button onClick={regenerateInsights} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-transform hover:scale-105" style={{ color: 'var(--accent-violet)' }}>
                  <Zap size={14}/> Generate Insights
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                {[
                  { label: 'Portfolio Health', value: insight?.status || 'Monitoring', color: insight?.status === 'Excellent' ? 'var(--accent-emerald)' : insight?.status === 'Stable' ? 'var(--accent-sky)' : 'var(--accent-rose)' },
                  { label: 'Risk Level', value: insight?.risk_level || 'Calculating…', color: ['High','Aggressive'].includes(insight?.risk_level||'') ? 'var(--accent-rose)' : insight?.risk_level === 'Moderate' ? 'var(--accent-amber)' : 'var(--accent-emerald)' },
                ].map(b => (
                  <div key={b.label} className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                    <span className="text-sm font-black uppercase" style={{ color: b.color }}>{b.value}</span>
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Updated: {insight ? new Date(insight.timestamp).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* Intelligence Feed */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-orb icon-orb-amber" style={{ width: 40, height: 40, borderRadius: 12 }}><Newspaper size={18}/></div>
              <div>
                <h3 className="font-bold text-base">Intelligence Feed</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Portfolio-matched headlines · {news.length > 0 ? `${news.length} articles` : 'Loading…'}
                  {news.length > 0 && <span style={{ color: 'var(--accent-emerald)', marginLeft: 8 }}>● Cached 6h</span>}
                </p>
              </div>
            </div>

            {news.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {news.map((item, idx) => {
                  const sentColor = item.sentiment === 'Bullish' ? 'var(--accent-emerald)' : item.sentiment === 'Bearish' ? 'var(--accent-rose)' : 'var(--text-muted)';
                  const actColor  = item.action === 'Buy' ? 'var(--accent-emerald)' : item.action === 'Sell' ? 'var(--accent-rose)' : 'var(--accent-amber)';
                  return (
                    <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer"
                       className="card flex flex-col overflow-hidden group hover:scale-[1.015] transition-transform cursor-pointer">
                      {item.thumbnail ? (
                        <div className="h-36 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                               onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-card))' }}>
                          <Newspaper size={28} style={{ color: 'var(--border-strong)' }}/>
                        </div>
                      )}
                      <div className="flex flex-col flex-1 p-5">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{item.ticker}</span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ color: sentColor, background: `${sentColor}18` }}>{item.sentiment || 'Neutral'}</span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ color: actColor, background: `${actColor}18` }}>{item.action || 'Hold'}</span>
                        </div>
                        <h4 className="text-xs font-bold leading-snug flex-1 line-clamp-3 mb-2 group-hover:text-[color:var(--accent-violet)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        {item.impact && <p className="text-xs italic line-clamp-2 mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.impact}</p>}
                        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.publisher}</span>
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <span className="text-xs">{formatTime(item.provider_publish_time)}</span>
                            <ExternalLink size={10}/>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="card py-20 text-center" style={{ border: '2px dashed var(--border)' }}>
                <Newspaper size={32} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }}/>
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Scanning portfolio for latest updates…</p>
              </div>
            )}
          </div>
        </>
      ) : <AnalyticsDashboard />}
    </div>
  );
}
