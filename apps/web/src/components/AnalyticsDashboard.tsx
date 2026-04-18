"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  BarChart4, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface SectorData { name: string; value: number; percent: number; }
interface PerformanceData { portfolio_cagr: number; nifty_1y_return: number; status: string; }
interface RiskData { alerts: { ticker: string; pct: number; severity: string }[]; max_position_pct: number; hhi: number; diversification_status: string; }

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#06b6d4', '#ec4899'];

export function AnalyticsDashboard() {
  const [allocation, setAllocation] = useState<{ sectors: SectorData[]; total_equity_value: number } | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [allocRes, perfRes, riskRes] = await Promise.all([
        fetch('http://localhost:8000/analytics/allocation'),
        fetch('http://localhost:8000/analytics/performance'),
        fetch('http://localhost:8000/analytics/risk')
      ]);
      setAllocation(await allocRes.json());
      setPerformance(await perfRes.json());
      setRisk(await riskRes.json());
    } catch (err) { console.error("Error fetching analytics:", err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse gap-4">
        <div className="icon-orb icon-orb-violet" style={{ width: 64, height: 64, borderRadius: 20 }}><BarChart4 size={28}/></div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Crunching Portfolio Data...</p>
      </div>
    );
  }

  const benchmarkData = performance ? [
    { name: 'Your Portfolio', value: performance.portfolio_cagr },
    { name: 'Nifty 50', value: performance.nifty_1y_return }
  ] : [];

  return (
    <div className="space-y-12 animate-in pb-20">
      {/* Risk Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="card stat-card stat-card-emerald p-6 flex items-center gap-4">
            <div className={`icon-orb ${risk?.hhi && risk.hhi < 2000 ? 'icon-orb-emerald' : 'icon-orb-amber'}`} style={{ width: 48, height: 48 }}>
               <ShieldAlert size={20} />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Diversification Score</p>
               <h4 className="font-black uppercase" style={{ color: 'var(--text-primary)' }}>{risk?.diversification_status}</h4>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>HHI Index: <span className="font-mono-data">{risk?.hhi}</span></p>
            </div>
         </div>
         <div className="card stat-card stat-card-violet p-6 flex items-center gap-4">
            <div className="icon-orb icon-orb-violet" style={{ width: 48, height: 48 }}>
               <TrendingUp size={20} />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Performance Alpha</p>
               <h4 className={`font-black uppercase`} style={{ color: performance?.status === 'Outperforming' ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>{performance?.status}</h4>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>vs Nifty 50 Index</p>
            </div>
         </div>
         <div className="card stat-card stat-card-rose p-6 flex items-center gap-4">
            <div className={`icon-orb ${risk?.max_position_pct && risk.max_position_pct > 15 ? 'icon-orb-rose' : 'icon-orb-sky'}`} style={{ width: 48, height: 48 }}>
               <AlertTriangle size={20} />
            </div>
            <div>
               <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Max Concentration</p>
               <h4 className="font-black font-mono-data" style={{ color: 'var(--text-primary)' }}>{risk?.max_position_pct}%</h4>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Single Asset Limit: 15%</p>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Sector Allocation */}
         <div className="card p-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="icon-orb icon-orb-sky" style={{ width: 40, height: 40, borderRadius: 12 }}><PieChartIcon size={18} /></div>
               <h3 className="font-bold tracking-tight">Sector Distribution (Equity)</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                     <Pie data={allocation?.sectors} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {allocation?.sectors.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                     </Pie>
                     <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }} formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Benchmark Performance */}
         <div className="card p-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><BarChart4 size={18} /></div>
               <h3 className="font-bold tracking-tight">The Alpha Comparison (CAGR vs Nifty)</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={benchmarkData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} unit="%" />
                     <Tooltip cursor={{ fill: 'var(--bg-surface)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                     <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                        {benchmarkData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-violet)' : 'var(--border-strong)'} />)}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 rounded-2xl flex items-start gap-3" style={{ background: 'var(--accent-violet-dim)' }}>
               <Info size={16} style={{ color: 'var(--accent-violet)' }} className="mt-0.5 shrink-0" />
               <p className="text-[10px] font-medium leading-relaxed" style={{ color: 'var(--accent-violet)' }}>
                  Benchmarking against Nifty 50 allows you to track true "Alpha". If your portfolio CAGR is consistently higher than the index, your stock selection strategy is effectively adding value over passive investing.
               </p>
            </div>
         </div>
      </div>

      {/* Risk Concentration Alerts */}
      <section>
         <div className="flex items-center gap-3 mb-6">
            <div className="icon-orb icon-orb-rose" style={{ width: 40, height: 40, borderRadius: 12 }}><ShieldAlert size={18} /></div>
            <h3 className="font-bold tracking-tight">Active Concentration Risk</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {risk?.alerts && risk.alerts.length > 0 ? risk.alerts.map((alert, idx) => (
               <div key={idx} className="card p-6 stat-card stat-card-rose hover:border-[var(--accent-rose)] transition-colors">
                  <div className="flex justify-between items-start mb-4">
                     <h5 className="font-black text-lg">{alert.ticker}</h5>
                     <span className="badge-rose px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-widest">{alert.severity} Risk</span>
                  </div>
                  <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>This holding accounts for <span className="font-bold" style={{ color: 'var(--accent-rose)' }}>{alert.pct}%</span> of your entire equity wallet, exceeding the 15% safety threshold.</p>
                  <button className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all" style={{ color: 'var(--accent-violet)' }}>
                     View Rebalance Trimming Options <ChevronRight size={12} />
                  </button>
               </div>
            )) : (
               <div className="lg:col-span-3 card py-16 text-center" style={{ border: '2px dashed var(--accent-emerald)', background: 'var(--accent-emerald-dim)' }}>
                  <div className="icon-orb icon-orb-emerald mx-auto mb-4" style={{ width: 64, height: 64, borderRadius: 20 }}>
                     <ShieldAlert size={28} />
                  </div>
                  <h4 className="font-bold text-lg mb-1" style={{ color: 'var(--accent-emerald)' }}>Portfolio Structure Healthy</h4>
                  <p className="text-xs" style={{ color: 'var(--accent-emerald)' }}>No individual stock currently exceeds the 15% concentration threshold.</p>
               </div>
            )}
         </div>
      </section>
    </div>
  );
}
