"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Calculator, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  TrendingDown,
  Info,
  ArrowRight
} from 'lucide-react';

interface TaxSummary {
  income_details: {
    gross_salary: number;
    dividends: number;
    is_from_document: boolean;
  };
  processed_files: string[];
  deductions: {
    total: number;
    breakdown: { "80c": number; "80d": number; "hra": number; "other": number; };
  };
  capital_gains: {
    realized_stcg: number;
    realized_ltcg: number;
    estimated_tax: number;
  };
  regimes: {
    new: { tax_liability: number; effective_rate: number };
    old: { tax_liability: number; effective_rate: number };
  };
  harvesting_recommendations: Array<{
    ticker: string;
    name: string;
    unrealized_loss: number;
    potential_tax_saving: number;
  }>;
  recommendation: string;
  potential_savings: number;
}

export function TaxIntelligence() {
  const [data, setData] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lastAction, setLastAction] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/tax/summary');
      setData(await res.json());
    } catch (err) {
      console.error("Error fetching tax summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/tax/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setLastAction({ message: `${file.name} processed successfully`, type: 'success' });
        await fetchSummary();
        setTimeout(() => setLastAction(null), 5000);
      } else {
        setLastAction({ message: `Failed to process ${file.name}`, type: 'error' });
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setLastAction({ message: "Network error during upload", type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Simulating Tax Regimes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Hero Section */}
      <section className="bg-slate-900 p-10 rounded-[40px] text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-10">
            <Calculator size={200} />
         </div>
         <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
               <span className="px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-full">FY 2024-25</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Post-Budget Revision</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4 italic">Tax Intelligence Engine</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
               Our AI analyzes your salary (Form 16), brokerage reports (P&L), and spreadsheet data to recommend the most optimized tax regime. Upload your documents to begin high-fidelity calculation.
            </p>
            <div className="flex items-center gap-4">
               <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Regime</p>
                  <p className="text-xl font-black text-emerald-400">{data?.recommendation}</p>
               </div>
               <div className="bg-emerald-500/20 px-6 py-3 rounded-2xl border border-emerald-500/20 text-emerald-400">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Estimated Total Savings</p>
                  <p className="text-xl font-black font-mono">₹{data?.potential_savings.toLocaleString()}</p>
               </div>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Document Hub */}
         <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 p-2 rounded-lg text-white"><FileText size={18} /></div>
               <h3 className="font-bold tracking-tight">Intelligence Hub</h3>
            </div>

            <div 
               onDragEnter={onDrag}
               onDragLeave={onDrag}
               onDragOver={onDrag}
               onDrop={onDrop}
               className={`relative group bg-white border-2 border-dashed rounded-3xl p-8 transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
            >
               {uploading ? (
                  <div className="text-center py-10 space-y-4">
                     <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Ingesting Document...</p>
                  </div>
               ) : lastAction?.type === 'success' ? (
                  <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in duration-500">
                     <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 text-emerald-600">
                        <CheckCircle2 size={32} />
                     </div>
                     <h4 className="font-bold text-slate-900">Analysis Complete!</h4>
                     <p className="text-[10px] text-slate-400 font-medium">{lastAction.message}</p>
                     <button onClick={() => setLastAction(null)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline mt-2">Upload More</button>
                  </div>
               ) : (
                  <div className="text-center py-10">
                     <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                     </div>
                     <h4 className="font-bold text-slate-900 mb-2">Upload Tax Assets</h4>
                     <p className="text-[10px] text-slate-400 font-medium px-4">Supports Form 16 (PDF) or Broker P&L (XLSX)</p>
                     <input 
                        type="file" 
                        accept=".pdf,.xlsx"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                     />
                  </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Tax Extraction Radar</h4>
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className={data?.income_details.is_from_document ? "text-emerald-500" : "text-slate-300"} />
                        <span className="text-xs font-bold text-slate-700">Salary Identified</span>
                     </div>
                     <span className="text-xs font-black text-slate-900">₹{data?.income_details.gross_salary.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-emerald-500">
                        <Calculator size={14} />
                        <span className="text-xs font-bold text-slate-700">Dividends Recognized</span>
                     </div>
                     <span className="text-xs font-black text-slate-900">₹{data?.income_details.dividends.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        {data?.deductions.breakdown["80c"] ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Info size={14} className="text-slate-300" />}
                        <span className="text-xs font-bold text-slate-700">Chapter VI-A Deductions</span>
                     </div>
                     <span className="text-xs font-black text-slate-900">₹{data?.deductions.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className={data?.capital_gains.realized_stcg || data?.capital_gains.realized_ltcg ? "text-emerald-500" : "text-slate-300"} />
                        <span className="text-xs font-bold text-slate-700">Realized Gains (P&L)</span>
                     </div>
                     <span className="text-xs font-black text-indigo-600">₹{( (data?.capital_gains.realized_stcg || 0) + (data?.capital_gains.realized_ltcg || 0) ).toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* Processed Assets List */}
            {data?.processed_files && data.processed_files.length > 0 && (
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingested Assets</h4>
                  <div className="space-y-2">
                     {data.processed_files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group hover:border-indigo-200 transition-all">
                           <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                                 <FileText size={14} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 truncate">{file}</span>
                           </div>
                           <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Regime Comparison */}
         <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 p-2 rounded-lg text-white"><Calculator size={18} /></div>
               <h3 className="font-bold tracking-tight">Regime Audit (FY 24-25)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* New Regime Card */}
               <div className={`relative p-8 rounded-[32px] border-2 transition-all ${data?.recommendation === 'New Regime' ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-50' : 'border-slate-100 bg-slate-50 opacity-80'}`}>
                  {data?.recommendation === 'New Regime' && (
                     <div className="absolute -top-3 right-8 bg-emerald-500 text-white text-[8px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">Recommended</div>
                  )}
                  <div className="space-y-6">
                     <div>
                        <h4 className="text-lg font-black text-slate-900 mb-1 italic underline decoration-emerald-500/40">New Regime</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Direct Tax Optimization</p>
                     </div>
                     <div className="py-8 border-y border-slate-100 italic">
                        <p className="text-[10px] text-slate-400 mb-1">Estimated Tax Liability</p>
                        <h3 className="text-3xl font-black text-slate-900">₹{data?.regimes.new.tax_liability.toLocaleString()}</h3>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <p className="text-[10px] text-slate-400 mb-1 font-bold">Effective Rate</p>
                           <p className="text-xs font-black text-slate-900">{data?.regimes.new.effective_rate}%</p>
                        </div>
                        <div>
                           <p className="text-[10px] text-slate-400 mb-1 font-bold">Std. Deduction</p>
                           <p className="text-xs font-black text-slate-900">₹75,000</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Old Regime Card */}
               <div className={`relative p-8 rounded-[32px] border-2 transition-all ${data?.recommendation === 'Old Regime' ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-50' : 'border-slate-100 bg-slate-50 opacity-80'}`}>
                  {data?.recommendation === 'Old Regime' && (
                     <div className="absolute -top-3 right-8 bg-emerald-500 text-white text-[8px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">Recommended</div>
                  )}
                  <div className="space-y-6">
                     <div>
                        <h4 className="text-lg font-black text-slate-900 mb-1 italic underline decoration-indigo-500/40">Old Regime</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Deduction-Based Wealth</p>
                     </div>
                     <div className="py-8 border-y border-slate-100 italic">
                        <p className="text-[10px] text-slate-400 mb-1">Estimated Tax Liability</p>
                        <h3 className="text-3xl font-black text-slate-900">₹{data?.regimes.old.tax_liability.toLocaleString()}</h3>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <p className="text-[10px] text-slate-400 mb-1 font-bold">Effective Rate</p>
                           <p className="text-xs font-black text-slate-900">{data?.regimes.old.effective_rate}%</p>
                        </div>
                        <div>
                           <p className="text-[10px] text-slate-400 mb-1 font-bold">Total Deductions</p>
                           <p className="text-xs font-black text-indigo-600">₹{data?.deductions.total.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Deduction Tracker */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mt-8">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="font-bold tracking-tight">Tax-Saving Pillars (Section 80C)</h4>
                  <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full tracking-widest italic flex items-center gap-1">
                    ₹{data?.deductions.breakdown["80c"].toLocaleString()} / ₹1,50,000 used
                  </span>
               </div>
               <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-8">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (data?.deductions.breakdown["80c"] || 0) / 150000 * 100)}%` }}
                  ></div>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.entries(data?.deductions.breakdown || {}).map(([key, val]) => (
                     <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                        <p className="text-xs font-black text-slate-900 italic">₹{Number(val).toLocaleString()}</p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Realized Gains Summary */}
            <div className="bg-slate-900 p-8 rounded-[32px] mt-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Calculator size={100} />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="bg-emerald-500 p-2 rounded-lg text-white"><TrendingDown size={18} /></div>
                     <h3 className="font-bold tracking-tight">Realized Gains (P&L Audit)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Short Term (STCG)</p>
                        <p className="text-xl font-black italic">₹{data?.capital_gains.realized_stcg.toLocaleString()}</p>
                        <p className="text-[8px] text-emerald-400 font-bold uppercase mt-1">Taxed @ 20%</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Long Term (LTCG)</p>
                        <p className="text-xl font-black italic">₹{data?.capital_gains.realized_ltcg.toLocaleString()}</p>
                        <p className="text-[8px] text-emerald-400 font-bold uppercase mt-1">Taxed @ 12.5%*</p>
                     </div>
                     <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CG Tax Liability</p>
                        <p className="text-xl font-black text-emerald-400">₹{data?.capital_gains.estimated_tax.toLocaleString()}</p>
                     </div>
                  </div>
                  <p className="text-[8px] text-slate-500 italic">* LTCG exemption of ₹1.25L applied across total portfolio gains.</p>
               </div>
            </div>
         </div>
      </div>

      {/* Tax-Loss Harvesting Section */}
      <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
         <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-4">
               <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-200">
                  <Zap size={24} />
               </div>
               <div>
                  <h4 className="text-xl font-black tracking-tight italic">Tax-Loss Harvesting Radar</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Offset realized gains with unrealized red</p>
               </div>
            </div>
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Max Potential Savings</p>
               <p className="text-xl font-black text-slate-900">
                  ₹{data?.harvesting_recommendations.reduce((sum, item) => sum + item.potential_tax_saving, 0).toLocaleString()}
               </p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.harvesting_recommendations.map((item) => (
               <div key={item.ticker} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-emerald-500 hover:bg-white transition-all duration-500">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded uppercase tracking-widest">{item.ticker}</span>
                        <h5 className="font-bold text-slate-800 text-sm mt-1 line-clamp-1 italic">{item.name}</h5>
                     </div>
                     <TrendingDown size={14} className="text-rose-500" />
                  </div>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unrealized Loss</p>
                        <p className="text-lg font-black text-rose-500 italic">₹{item.unrealized_loss.toLocaleString()}</p>
                     </div>
                     <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tax Offset Value</p>
                        <p className="text-sm font-black text-emerald-600 italic">₹{item.potential_tax_saving.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            ))}
            {data?.harvesting_recommendations.length === 0 && (
               <div className="col-span-3 py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-slate-400 text-xs italic">No significant harvesting opportunities found.</p>
               </div>
            )}
         </div>
      </section>
    </div>
  );
}
