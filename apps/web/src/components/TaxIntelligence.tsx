"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Calculator, ChevronRight, CheckCircle2, 
  AlertCircle, Zap, TrendingDown, Info, ArrowRight, Sparkles, Scale
} from 'lucide-react';

interface TaxSummary {
  income_details: { gross_salary: number; dividends: number; is_from_document: boolean; };
  processed_files: string[];
  deductions: { total: number; breakdown: { "80c": number; "80d": number; "hra": number; "other": number; }; };
  capital_gains: { realized_stcg: number; realized_ltcg: number; estimated_tax: number; };
  regimes: { new: { tax_liability: number; effective_rate: number }; old: { tax_liability: number; effective_rate: number }; };
  harvesting_recommendations: Array<{ ticker: string; name: string; unrealized_loss: number; potential_tax_saving: number; }>;
  recommendation: string;
  potential_savings: number;
}

export function TaxIntelligence() {
  const [data, setData] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lastAction, setLastAction] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => { fetchSummary(); }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/tax/summary');
      setData(await res.json());
    } catch (err) { console.error("Error fetching tax summary:", err); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('http://localhost:8000/tax/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setLastAction({ message: `${file.name} processed successfully`, type: 'success' });
        await fetchSummary(); setTimeout(() => setLastAction(null), 5000);
      } else { setLastAction({ message: `Failed to process ${file.name}`, type: 'error' }); }
    } catch (err) { setLastAction({ message: "Network error during upload", type: 'error' }); }
    finally { setUploading(false); }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="icon-orb icon-orb-violet animate-pulse" style={{ width: 72, height: 72, borderRadius: 24 }}><Calculator size={32} /></div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Simulating Tax Regimes…</p>
      </div>
    );
  }

  const recNew = data?.recommendation === 'New Regime';
  const recOld = data?.recommendation === 'Old Regime';

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Hero Section */}
      <section className="card p-8 lg:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.03) 0%, rgba(0, 214, 143, 0.02) 100%)' }}>
        <div className="absolute top-0 right-0 p-12 opacity-5"><Scale size={240} /></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="badge-violet px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">FY 2024-25</span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Post-Budget Revision</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4 text-gradient-violet">Tax Intelligence Engine</h1>
          <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Our AI analyzes your salary (Form 16), brokerage reports (P&L), and spreadsheet data to recommend the most optimized tax regime. Upload your documents to begin high-fidelity calculation.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <div className="glass px-6 py-4 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Recommended Regime</p>
              <p className="text-2xl font-black text-gradient-emerald">{data?.recommendation}</p>
            </div>
            <div className="px-6 py-4 rounded-2xl" style={{ background: 'var(--accent-emerald-dim)', border: '1px solid rgba(0, 214, 143, 0.2)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-emerald)' }}>Estimated Total Savings</p>
              <p className="text-2xl font-black font-mono-data" style={{ color: 'var(--accent-emerald)' }}>₹{data?.potential_savings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Intelligence Hub */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3">
            <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><FileText size={18} /></div>
            <h3 className="font-bold tracking-tight text-base">Intelligence Hub</h3>
          </div>

          <div onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
               className={`card relative group p-8 transition-all ${dragActive ? 'border-[var(--accent-violet)] bg-[var(--accent-violet-dim)]' : 'hover:border-[var(--border-strong)]'}`}
               style={{ borderStyle: 'dashed', borderWidth: 2 }}>
            {uploading ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--accent-violet)', borderTopColor: 'transparent' }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>AI Ingesting Document…</p>
              </div>
            ) : lastAction?.type === 'success' ? (
              <div className="text-center py-10 space-y-4 animate-in">
                <div className="icon-orb icon-orb-emerald mx-auto mb-2" style={{ width: 64, height: 64, borderRadius: 20 }}><CheckCircle2 size={32} /></div>
                <h4 className="font-bold text-base">Analysis Complete!</h4>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{lastAction.message}</p>
                <button onClick={() => setLastAction(null)} className="text-xs font-black uppercase tracking-widest hover:underline mt-2" style={{ color: 'var(--accent-violet)' }}>Upload More</button>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="icon-orb icon-orb-violet mx-auto mb-6 group-hover:scale-110 transition-transform" style={{ width: 64, height: 64, borderRadius: 20 }}><Upload size={32} /></div>
                <h4 className="font-bold text-base mb-2">Upload Tax Assets</h4>
                <p className="text-xs font-medium px-4" style={{ color: 'var(--text-muted)' }}>Supports Form 16 (PDF) or Broker P&L (XLSX)</p>
                <input type="file" accept=".pdf,.xlsx" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            )}
          </div>

          <div className="card p-6">
            <h4 className="text-xs font-black uppercase tracking-widest mb-6 pb-4" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Tax Extraction Radar</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: data?.income_details.is_from_document ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Salary Identified</span>
                </div>
                <span className="text-sm font-black font-mono-data">₹{data?.income_details.gross_salary.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={14} style={{ color: 'var(--accent-emerald)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Dividends Recognized</span>
                </div>
                <span className="text-sm font-black font-mono-data">₹{data?.income_details.dividends.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data?.deductions.breakdown["80c"] ? <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Info size={14} style={{ color: 'var(--text-muted)' }} />}
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Chapter VI-A Deductions</span>
                </div>
                <span className="text-sm font-black font-mono-data">₹{data?.deductions.total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: (data?.capital_gains.realized_stcg || data?.capital_gains.realized_ltcg) ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Realized Gains (P&L)</span>
                </div>
                <span className="text-sm font-black font-mono-data text-gradient-violet">₹{((data?.capital_gains.realized_stcg || 0) + (data?.capital_gains.realized_ltcg || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {data?.processed_files && data.processed_files.length > 0 && (
            <div className="card p-6" style={{ background: 'var(--bg-elevated)' }}>
              <h4 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Ingested Assets</h4>
              <div className="space-y-2">
                {data.processed_files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl glass group transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 rounded-lg group-hover:text-[var(--accent-violet)] transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}><FileText size={14} /></div>
                      <span className="text-xs font-bold truncate" style={{ color: 'var(--text-secondary)' }}>{file}</span>
                    </div>
                    <CheckCircle2 size={12} style={{ color: 'var(--accent-emerald)' }} className="shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Regime Comparison */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="icon-orb icon-orb-sky" style={{ width: 40, height: 40, borderRadius: 12 }}><Calculator size={18} /></div>
            <h3 className="font-bold tracking-tight text-base">Regime Audit (FY 24-25)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`card relative p-8 transition-all ${recNew ? 'card-glow-emerald border-[var(--accent-emerald)]' : 'opacity-80'}`}>
              {recNew && <div className="absolute -top-3 right-8 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg" style={{ background: 'var(--accent-emerald)', color: '#000' }}>Recommended</div>}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-black mb-1">New Regime</h4>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Direct Tax Optimization</p>
                </div>
                <div className="py-8" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Estimated Tax Liability</p>
                  <h3 className="text-4xl font-black font-mono-data">₹{data?.regimes.new.tax_liability.toLocaleString()}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Effective Rate</p>
                    <p className="text-sm font-black font-mono-data">{data?.regimes.new.effective_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Std. Deduction</p>
                    <p className="text-sm font-black font-mono-data">₹75,000</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`card relative p-8 transition-all ${recOld ? 'card-glow-emerald border-[var(--accent-emerald)]' : 'opacity-80'}`}>
              {recOld && <div className="absolute -top-3 right-8 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg" style={{ background: 'var(--accent-emerald)', color: '#000' }}>Recommended</div>}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-black mb-1">Old Regime</h4>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Deduction-Based Wealth</p>
                </div>
                <div className="py-8" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Estimated Tax Liability</p>
                  <h3 className="text-4xl font-black font-mono-data">₹{data?.regimes.old.tax_liability.toLocaleString()}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Effective Rate</p>
                    <p className="text-sm font-black font-mono-data">{data?.regimes.old.effective_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Total Deductions</p>
                    <p className="text-sm font-black font-mono-data text-gradient-violet">₹{data?.deductions.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-8 mt-8">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-bold tracking-tight text-base">Tax-Saving Pillars (Section 80C)</h4>
              <span className="badge-violet px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest font-mono-data flex items-center gap-1">
                ₹{data?.deductions.breakdown["80c"].toLocaleString()} / ₹1,50,000 used
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden mb-8" style={{ background: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (data?.deductions.breakdown["80c"] || 0) / 150000 * 100)}%`, background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-emerald))', boxShadow: '0 0 10px rgba(124,92,252,0.5)' }}></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(data?.deductions.breakdown || {}).map(([key, val]) => (
                <div key={key} className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{key}</p>
                  <p className="text-sm font-black font-mono-data">₹{Number(val).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-8 mt-8 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)' }}>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Calculator size={100} /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="icon-orb icon-orb-emerald" style={{ width: 40, height: 40, borderRadius: 12 }}><TrendingDown size={18} /></div>
                <h3 className="font-bold tracking-tight text-base">Realized Gains (P&L Audit)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Short Term (STCG)</p>
                  <p className="text-2xl font-black font-mono-data">₹{data?.capital_gains.realized_stcg.toLocaleString()}</p>
                  <p className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--accent-emerald)' }}>Taxed @ 20%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Long Term (LTCG)</p>
                  <p className="text-2xl font-black font-mono-data">₹{data?.capital_gains.realized_ltcg.toLocaleString()}</p>
                  <p className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--accent-emerald)' }}>Taxed @ 12.5%*</p>
                </div>
                <div className="glass p-5 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>CG Tax Liability</p>
                  <p className="text-2xl font-black font-mono-data text-gradient-emerald">₹{data?.capital_gains.estimated_tax.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>* LTCG exemption of ₹1.25L applied across total portfolio gains.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="card p-8 mt-10">
        <div className="flex flex-wrap items-center justify-between mb-8 pb-6 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
            <div className="icon-orb icon-orb-rose" style={{ width: 48, height: 48, borderRadius: 16 }}><Zap size={24} /></div>
            <div>
              <h4 className="text-xl font-black tracking-tight">Tax-Loss Harvesting Radar</h4>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Offset realized gains with unrealized red</p>
            </div>
          </div>
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'var(--accent-emerald-dim)', border: '1px solid rgba(0,214,143,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-emerald)' }}>Max Potential Savings</p>
            <p className="text-xl font-black font-mono-data" style={{ color: 'var(--text-primary)' }}>
              ₹{data?.harvesting_recommendations.reduce((sum, item) => sum + item.potential_tax_saving, 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.harvesting_recommendations.map((item) => (
            <div key={item.ticker} className="card p-6 group hover:border-[var(--accent-rose)] transition-all">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{item.ticker}</span>
                  <h5 className="font-bold text-sm mt-2 line-clamp-1">{item.name}</h5>
                </div>
                <TrendingDown size={16} style={{ color: 'var(--accent-rose)' }} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Unrealized Loss</p>
                  <p className="text-xl font-black font-mono-data" style={{ color: 'var(--accent-rose)' }}>₹{item.unrealized_loss.toLocaleString()}</p>
                </div>
                <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Tax Offset Value</p>
                  <p className="text-sm font-black font-mono-data" style={{ color: 'var(--accent-emerald)' }}>₹{item.potential_tax_saving.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {data?.harvesting_recommendations.length === 0 && (
            <div className="col-span-3 py-10 text-center rounded-3xl" style={{ border: '2px dashed var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No significant harvesting opportunities found.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
