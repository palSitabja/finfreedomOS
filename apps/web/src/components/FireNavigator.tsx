"use client";

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Zap, Plus, Trash2, RefreshCcw, Sparkles, Milestone, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface GoalBuffer { name: string; amount: number; years_from_now: number; }
interface FireStatus { current_corpus: number; annual_expenses: number; avg_monthly_savings: number; fi_number_25x: number; fi_number_33x: number; progress_pct: number; status: string; }
interface ProjectionYear { year: number; age: number; corpus: number; expenses: number; target: number; is_fi: boolean; event?: string; }

export function FireNavigator() {
  const [status, setStatus] = useState<FireStatus | null>(null);
  const [projection, setProjection] = useState<{ timeline: ProjectionYear[]; fi_year: number | null } | null>(null);
  const [goals, setGoals] = useState<GoalBuffer[]>([]);
  const [newGoal, setNewGoal] = useState<GoalBuffer>({ name: '', amount: 0, years_from_now: 5 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ 
    return: 10, inflation: 6, savings: 0, 
    currentAge: 30, retirementAge: '', expectedCorpus: '', 
    insuranceCover: 500000, enableStressTest: false 
  });

  useEffect(() => { fetchInitial(); }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const data = await (await fetch('http://localhost:8000/fire/status')).json();
      setStatus(data); setParams(p => ({ ...p, savings: data.avg_monthly_savings }));
      runProjection(data.avg_monthly_savings, []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const runProjection = async (savingsValue: number, activeGoals: GoalBuffer[], p = params) => {
    try {
      const payload: any = { 
        expected_return: p.return, 
        inflation_rate: p.inflation, 
        monthly_savings: savingsValue, 
        goal_buffers: activeGoals,
        current_age: p.currentAge,
        insurance_cover: p.insuranceCover,
        enable_stress_test: p.enableStressTest
      };
      if (p.retirementAge) payload.retirement_age = parseInt(p.retirementAge as string);
      if (p.expectedCorpus) payload.expected_corpus = parseFloat(p.expectedCorpus as string);

      const res = await fetch('http://localhost:8000/fire/projection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setProjection(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleParamChange = (key: string, val: any) => {
    const newParams = { ...params, [key]: val };
    setParams(newParams);
    runProjection(newParams.savings, goals, newParams);
  };

  const addGoal = () => {
    if (newGoal.name && newGoal.amount > 0) {
      const updated = [...goals, newGoal]; setGoals(updated);
      setNewGoal({ name: '', amount: 0, years_from_now: 5 }); runProjection(params.savings, updated);
    }
  };
  const removeGoal = (idx: number) => {
    const updated = goals.filter((_, i) => i !== idx); setGoals(updated); runProjection(params.savings, updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="icon-orb icon-orb-orange animate-pulse" style={{ width: 72, height: 72, borderRadius: 24 }}><Target size={32}/></div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Calculating Retirement Runway…</p>
      </div>
    );
  }

  const pct = status?.progress_pct || 0;

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Hero — FI Progress */}
      <section className="card relative overflow-hidden p-8 lg:p-10">
        <div className="absolute -top-16 -right-16 opacity-[0.04]"><Sparkles size={240}/></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest" style={{ background: 'var(--accent-orange-dim)', color: 'var(--accent-orange)', border: '1px solid rgba(251,146,60,0.25)' }}>
                {status?.status}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Financial Independence Audit</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">
              <span className="text-gradient-orange">You are {pct}%</span>
            </h1>
            <h2 className="text-xl font-bold mb-8" style={{ color: 'var(--text-muted)' }}>Towards your FI Goal.</h2>

            <div className="progress-track mb-6">
              <div className="progress-fill-orange" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: 'var(--accent-orange-dim)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-orange)' }}>Target Corpus (25×)</p>
                <p className="text-lg font-black font-mono-data">₹{status?.fi_number_25x.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Current Runway</p>
                <p className="text-lg font-black font-mono-data" style={{ color: 'var(--accent-emerald)' }}>₹{status?.current_corpus.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Dark panel — projections */}
          <div className="rounded-[28px] p-7" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-strong)' }}>
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Projected FI Age</p>
                <h3 className="text-5xl font-black text-gradient-violet">{projection?.fi_age || '—'}</h3>
              </div>
              <div className="icon-orb icon-orb-orange" style={{ width: 52, height: 52, borderRadius: 16 }}><Zap size={24}/></div>
            </div>
            <div className="space-y-4 text-sm">
              {[
                { label: 'Monthly Savings', value: `₹${(status?.avg_monthly_savings||0).toLocaleString()}` },
                { label: 'Est. Growth Rate', value: `${params.return}%` },
                { label: 'Inflation Rate',   value: `${params.inflation}%` },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span className="font-bold font-mono-data">{r.value}</span>
                </div>
              ))}
              <div className="progress-track mt-2"><div className="progress-fill-orange" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{pct}% Complete</p>
            </div>
          </div>
        </div>
      </section>

      {/* Assumptions & Scenarios */}
      <section className="card p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="icon-orb icon-orb-sky" style={{ width: 40, height: 40, borderRadius: 12 }}><Sparkles size={18}/></div>
          <div>
            <h3 className="font-bold text-base">Assumptions & Stress Testing</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tweak variables to simulate scenarios</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Current Age</label>
            <input type="number" value={params.currentAge} onChange={e => handleParamChange('currentAge', Number(e.target.value))} className="input-dark text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Retire Age (Opt)</label>
            <input type="number" value={params.retirementAge} onChange={e => handleParamChange('retirementAge', e.target.value)} placeholder="e.g. 45" className="input-dark text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Target Corpus (Opt)</label>
            <input type="number" value={params.expectedCorpus} onChange={e => handleParamChange('expectedCorpus', e.target.value)} placeholder="Override 25x rule" className="input-dark text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Ins. Cover (₹)</label>
            <input type="number" value={params.insuranceCover} onChange={e => handleParamChange('insuranceCover', Number(e.target.value))} className="input-dark text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Exp. Return (%)</label>
            <input type="number" value={params.return} onChange={e => handleParamChange('return', Number(e.target.value))} className="input-dark text-sm w-full" />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer group mt-6">
              <div className={`w-12 h-6 rounded-full transition-colors relative ${params.enableStressTest ? 'bg-rose-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${params.enableStressTest ? 'translate-x-6' : ''}`} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest group-hover:text-rose-400 transition-colors" style={{ color: params.enableStressTest ? 'var(--accent-rose)' : 'var(--text-muted)' }}>Stress Test</span>
            </label>
            <input type="checkbox" className="hidden" checked={params.enableStressTest} onChange={e => handleParamChange('enableStressTest', e.target.checked)} />
          </div>
        </div>
      </section>

      {/* Chart + Goals */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><Calendar size={18}/></div>
              <h3 className="font-bold text-base">Financial Independence Runway</h3>
            </div>
            <div className="flex gap-4 text-xs">
              {[{ color: 'var(--accent-violet)', label: 'Corpus' }, { color: 'var(--accent-rose)', label: 'Target Line' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }}/>
                  <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection?.timeline || []}>
                <defs>
                  <linearGradient id="corpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} tickFormatter={v => `Age ${v}`} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 shadow-xl rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}>
                          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Age {data.age} ({data.year})</p>
                          <p className="text-sm font-mono-data mb-1"><span style={{ color: '#7c5cfc' }}>Corpus:</span> ₹{data.corpus.toLocaleString()}</p>
                          <p className="text-sm font-mono-data"><span style={{ color: '#ff5370' }}>Target:</span> ₹{data.target.toLocaleString()}</p>
                          {data.event && <div className="mt-2 pt-2 border-t border-rose-500/20"><span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">{data.event}</span></div>}
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
                <Area type="monotone" dataKey="corpus" stroke="#7c5cfc" strokeWidth={3} fillOpacity={1} fill="url(#corpGrad)" name="Corpus" />
                <Area type="monotone" dataKey="target" stroke="#ff5370" strokeWidth={2} strokeDasharray="5 5" fill="none" name="Target" />
                {projection?.fi_age && (
                  <ReferenceLine x={projection.fi_age} stroke="#00d68f" strokeDasharray="3 3" label={{ position: 'top', value: '🎯 FREEDOM', fill: '#00d68f', fontSize: 10, fontWeight: 900 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goals Hub */}
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-orb icon-orb-violet" style={{ width: 36, height: 36, borderRadius: 10 }}><Plus size={16}/></div>
              <h3 className="font-bold text-sm">Add Life Milestone</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Milestone Name</label>
                <input type="text" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} placeholder="e.g. Higher Education" className="input-dark text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Amount (₹)</label>
                  <input type="number" value={newGoal.amount} onChange={e => setNewGoal({...newGoal, amount: Number(e.target.value)})} className="input-dark text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Years Out</label>
                  <input type="number" value={newGoal.years_from_now} onChange={e => setNewGoal({...newGoal, years_from_now: Number(e.target.value)})} className="input-dark text-sm" />
                </div>
              </div>
              <button onClick={addGoal} className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-opacity hover:opacity-90" style={{ background: 'var(--accent-violet)', color: '#fff' }}>
                <Plus size={14}/> Update Projection
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
            {goals.length === 0 ? (
              <div className="card py-8 text-center" style={{ border: '2px dashed var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No Milestones Added</p>
              </div>
            ) : goals.map((g, idx) => (
              <div key={idx} className="card p-4 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="icon-orb icon-orb-rose" style={{ width: 36, height: 36, borderRadius: 10 }}><Milestone size={16}/></div>
                  <div>
                    <h4 className="text-sm font-bold">{g.name}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{g.amount.toLocaleString()} in {g.years_from_now}y</p>
                  </div>
                </div>
                <button onClick={() => removeGoal(idx)} aria-label="Remove" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg" style={{ color: 'var(--accent-rose)' }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SWR Bar */}
      <section className="relative overflow-hidden rounded-[28px] p-8 flex flex-wrap items-center justify-between gap-6"
               style={{ background: 'linear-gradient(135deg, #fb923c22 0%, #7c5cfc22 100%)', border: '1px solid rgba(251,146,60,0.2)' }}>
        <div className="absolute -top-10 -right-10 opacity-5"><TrendingUp size={180}/></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="icon-orb icon-orb-orange" style={{ width: 56, height: 56, borderRadius: 18 }}><Zap size={26}/></div>
          <div>
            <h4 className="text-lg font-black uppercase tracking-tight mb-1">The 4% Rule (Safe Withdrawal)</h4>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
              At this scale, you can withdraw{' '}
              <strong style={{ color: 'var(--accent-orange)' }}>
                ₹{(((status?.current_corpus || 0) * 0.04) / 12).toLocaleString()} per month
              </strong>{' '}
              indefinitely without touching your principal — the gold standard for financial freedom.
            </p>
          </div>
        </div>
        <button className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-colors group"
                style={{ background: 'var(--accent-orange)', color: '#fff' }}>
          Learn More <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
        </button>
      </section>
    </div>
  );
}
