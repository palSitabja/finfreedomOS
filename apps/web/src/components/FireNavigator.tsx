"use client";

import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Plus, 
  Trash2, 
  RefreshCcw,
  Sparkles,
  Milestone,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface GoalBuffer {
  name: string;
  amount: number;
  years_from_now: number;
}

interface FireStatus {
  current_corpus: number;
  annual_expenses: number;
  avg_monthly_savings: number;
  fi_number_25x: number;
  fi_number_33x: number;
  progress_pct: number;
  status: string;
}

interface ProjectionYear {
  year: number;
  corpus: number;
  expenses: number;
  target: number;
  is_fi: boolean;
}

export function FireNavigator() {
  const [status, setStatus] = useState<FireStatus | null>(null);
  const [projection, setProjection] = useState<{ timeline: ProjectionYear[]; fi_year: number | null } | null>(null);
  const [goals, setGoals] = useState<GoalBuffer[]>([]);
  const [newGoal, setNewGoal] = useState<GoalBuffer>({ name: '', amount: 0, years_from_now: 5 });
  const [loading, setLoading] = useState(true);

  // Simulation Params
  const [params, setParams] = useState({ return: 10, inflation: 6, savings: 0 });

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/fire/status');
      const data = await res.json();
      setStatus(data);
      setParams(prev => ({ ...prev, savings: data.avg_monthly_savings }));
      runProjection(data.avg_monthly_savings, []);
    } catch (err) {
      console.error("Error fetching FIRE status:", err);
    } finally {
      setLoading(false);
    }
  };

  const runProjection = async (savingsValue: number, activeGoals: GoalBuffer[]) => {
    try {
      const res = await fetch('http://localhost:8000/fire/projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_return: params.return,
          inflation_rate: params.inflation,
          monthly_savings: savingsValue,
          goal_buffers: activeGoals
        })
      });
      setProjection(await res.json());
    } catch (err) {
      console.error("Error running projection:", err);
    }
  };

  const addGoal = () => {
    if (newGoal.name && newGoal.amount > 0) {
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      setNewGoal({ name: '', amount: 0, years_from_now: 5 });
      runProjection(params.savings, updatedGoals);
    }
  };

  const removeGoal = (idx: number) => {
    const updatedGoals = goals.filter((_, i) => i !== idx);
    setGoals(updatedGoals);
    runProjection(params.savings, updatedGoals);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-center space-y-4">
        <div className="bg-indigo-50 p-4 rounded-full text-indigo-400 rotate-12 transition-transform duration-1000">
           <Target size={40} />
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Calculating Retirement Runway...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Hero: Progress Meter */}
      <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 text-indigo-50/50 group-hover:scale-110 transition-transform duration-700">
            <Sparkles size={160} />
         </div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
               <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full italic">Status: {status?.status}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Independence Audit</span>
               </div>
               <h1 className="text-5xl font-black tracking-tighter mb-4 italic">You are {status?.progress_pct}%</h1>
               <h2 className="text-2xl font-bold text-slate-400 mb-8 italic">Towards your FI Goal.</h2>
               
               <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                     <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Target Corpus (25x)</p>
                     <p className="text-lg font-black text-slate-900 italic">₹{status?.fi_number_25x.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Runway</p>
                     <p className="text-lg font-black text-slate-900 italic">₹{status?.current_corpus.toLocaleString()}</p>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[32px] text-white">
               <div className="flex justify-between items-start mb-12">
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Projected Retirement</p>
                     <h3 className="text-4xl font-black italic">{projection?.fi_year || 'Predicting...'}</h3>
                  </div>
                  <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-900/50">
                     <Zap size={24} />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-400">Monthly Savings Baseline</span>
                     <span className="font-bold">₹{status?.avg_monthly_savings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-400">Est. Growth Rate</span>
                     <span className="font-bold">{params.return}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${status?.progress_pct}%` }}></div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Runway Visualization */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="bg-slate-900 p-2 rounded-lg text-white"><Calendar size={18} /></div>
                  <h3 className="font-bold tracking-tight">Financial Independence Runway</h3>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                     <span className="text-[10px] font-bold uppercase text-slate-400">Corpus</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-sm ring-1 ring-rose-200"></div>
                     <span className="text-[10px] font-bold uppercase text-slate-400">Target Line</span>
                  </div>
               </div>
            </div>

            <div className="h-[400px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={projection?.timeline}>
                     <defs>
                        <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                        formatter={(val: any) => `₹${Number(val).toLocaleString()}`}
                     />
                     <Area type="monotone" dataKey="corpus" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCorpus)" />
                     <Area type="monotone" dataKey="target" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                     {projection?.fi_year && (
                        <ReferenceLine x={projection.fi_year} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'FREEDOM', fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                     )}
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Goals & Buffers Hub */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-600 p-2 rounded-lg text-white"><Plus size={18} /></div>
                  <h3 className="font-bold tracking-tight">Add Life Milestone</h3>
               </div>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Milestone Name</label>
                     <input 
                        type="text" 
                        value={newGoal.name}
                        onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                        placeholder="e.g. Higher Education" 
                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Amount (₹)</label>
                        <input 
                           type="number" 
                           value={newGoal.amount}
                           onChange={(e) => setNewGoal({...newGoal, amount: Number(e.target.value)})}
                           className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" 
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Years Out</label>
                        <input 
                           type="number" 
                           value={newGoal.years_from_now}
                           onChange={(e) => setNewGoal({...newGoal, years_from_now: Number(e.target.value)})}
                           className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" 
                        />
                     </div>
                  </div>
                  <button 
                     onClick={addGoal}
                     className="w-full py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                     <Plus size={16} /> Update Projection
                  </button>
               </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {goals.map((goal, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center group">
                     <div className="flex items-center gap-4">
                        <div className="bg-rose-50 p-2 rounded-xl text-rose-500">
                           <Milestone size={18} />
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-slate-900 italic">{goal.name}</h4>
                           <p className="text-[10px] text-slate-400">₹{goal.amount.toLocaleString()} in {goal.years_from_now} Years</p>
                        </div>
                     </div>
                     <button onClick={() => removeGoal(idx)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                        <Trash2 size={16} />
                     </button>
                  </div>
               ))}
               
               {goals.length === 0 && (
                  <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white">
                     <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Life Milestones Added</p>
                  </div>
               )}
            </div>
         </div>
      </section>

      {/* SWR Wisdom Bar */}
      <section className="bg-indigo-600 p-8 rounded-[32px] flex items-center justify-between text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
            <TrendingUp size={120} />
         </div>
         <div className="relative z-10 flex items-center gap-8">
            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
               <Zap size={32} />
            </div>
            <div className="max-w-xl">
               <h4 className="text-xl font-black italic tracking-tight mb-2 uppercase">The 4% Rule (Safe Withdrawal)</h4>
               <p className="text-xs text-indigo-100 leading-relaxed italic">
                  At this scale, you can withdraw <span className="font-bold text-white">₹{( (status?.current_corpus || 0) * 0.04 / 12 ).toLocaleString()} per month</span> indefinitely without ever touching your principal capital. This is the gold standard for financial freedom.
               </p>
            </div>
         </div>
         <button className="relative z-10 group px-8 py-3 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm shadow-xl shadow-indigo-900/40">
            Learn More <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
         </button>
      </section>
    </div>
  );
}
