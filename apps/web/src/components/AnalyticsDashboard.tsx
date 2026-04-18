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

interface SectorData {
  name: string;
  value: number;
  percent: number;
}

interface PerformanceData {
  portfolio_cagr: number;
  nifty_1y_return: number;
  status: string;
}

interface RiskData {
  alerts: { ticker: string; pct: number; severity: string }[];
  max_position_pct: number;
  hhi: number;
  diversification_status: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function AnalyticsDashboard() {
  const [allocation, setAllocation] = useState<{ sectors: SectorData[]; total_equity_value: number } | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Crunching Portfolio Data...</p>
      </div>
    );
  }

  const benchmarkData = performance ? [
    { name: 'Your Portfolio', value: performance.portfolio_cagr },
    { name: 'Nifty 50', value: performance.nifty_1y_return }
  ] : [];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Risk Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${risk?.hhi && risk.hhi < 2000 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
               <ShieldAlert size={24} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diversification Score</p>
               <h4 className="font-black text-slate-900 uppercase underline decoration-emerald-500/30">{risk?.diversification_status}</h4>
               <p className="text-[10px] text-slate-400">HHI Index: {risk?.hhi}</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
               <TrendingUp size={24} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance alpha</p>
               <h4 className={`font-black uppercase ${performance?.status === 'Outperforming' ? 'text-emerald-500' : 'text-slate-900'}`}>{performance?.status}</h4>
               <p className="text-[10px] text-slate-400">vs Nifty 50 Index</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${risk?.max_position_pct && risk.max_position_pct > 15 ? 'bg-rose-50 text-rose-600 font-bold' : 'bg-slate-50 text-slate-600'}`}>
               <AlertTriangle size={24} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Concentration</p>
               <h4 className="font-black text-slate-900">{risk?.max_position_pct}%</h4>
               <p className="text-[10px] text-slate-400">Single Asset Limit: 15%</p>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Sector Allocation */}
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="bg-slate-900 p-2 rounded-lg text-white"><PieChartIcon size={18} /></div>
               <h3 className="font-bold tracking-tight">Sector Distribution (Equity)</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                     <Pie
                        data={allocation?.sectors}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {allocation?.sectors.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                        formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em'}} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Benchmark Performance */}
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="bg-slate-900 p-2 rounded-lg text-white"><BarChart4 size={18} /></div>
               <h3 className="font-bold tracking-tight">The Alpha Comparison (CAGR vs Nifty)</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={benchmarkData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} unit="%" />
                     <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                     <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                        {benchmarkData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#e2e8f0'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
               <Info size={16} className="text-indigo-600 mt-0.5" />
               <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Benchmarking against Nifty 50 allows you to track true "Alpha". If your portfolio CAGR is consistently higher than the index, your stock selection strategy is effectively adding value over passive investing.
               </p>
            </div>
         </div>
      </div>

      {/* Risk Concentration Alerts */}
      <section>
         <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><ShieldAlert size={18} /></div>
            <h3 className="font-bold tracking-tight">Active Concentration Risk</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {risk?.alerts && risk.alerts.length > 0 ? risk.alerts.map((alert, idx) => (
               <div key={idx} className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm border-l-4 border-l-rose-500">
                  <div className="flex justify-between items-start mb-2">
                     <h5 className="font-black text-slate-900">{alert.ticker}</h5>
                     <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black rounded uppercase">{alert.severity} Risk</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">This holding accounts for <span className="font-bold text-rose-600">{alert.pct}%</span> of your entire equity wallet, exceeding the 15% safety threshold.</p>
                  <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                     View Rebalance Trimming Options <ChevronRight size={12} />
                  </button>
               </div>
            )) : (
               <div className="lg:col-span-3 py-16 text-center bg-emerald-50/30 rounded-3xl border border-dashed border-emerald-100">
                  <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                     <ShieldAlert size={24} />
                  </div>
                  <h4 className="font-bold text-slate-900">Portfolio Structure Healthy</h4>
                  <p className="text-xs text-slate-500">No individual stock currently exceeds the 15% concentration threshold.</p>
               </div>
            )}
         </div>
      </section>
    </div>
  );
}
