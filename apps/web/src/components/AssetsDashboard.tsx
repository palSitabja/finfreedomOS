import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  PieChart,
  BarChart3,
  Plus,
  Trash2,
  RefreshCw,
  Edit2,
  Check,
  Briefcase,
  Landmark,
  Coins,
  LineChart,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  BarChart,
  Bar,
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { TableSkeleton, ChartCardSkeleton } from './Skeleton';

export const AssetsDashboard = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Stock Form
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  
  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editAvgPrice, setEditAvgPrice] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, stocksRes] = await Promise.all([
        fetch("http://localhost:8000/assets"),
        fetch("http://localhost:8000/stocks")
      ]);
      setAssets(await assetsRes.json());
      setStocks(await stocksRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStock = async () => {
    if (!newTicker || !newShares || !newAvgPrice) return;
    try {
      await fetch("http://localhost:8000/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: newTicker.toUpperCase(),
          avg_price_paid: parseFloat(newAvgPrice),
          shares: parseFloat(newShares),
        })
      });
      setIsAdding(false);
      setNewTicker("");
      setNewShares("");
      setNewAvgPrice("");
      // Invalidate news cache so Intelligence Feed reflects new holding
      fetch("http://localhost:8000/news/cache", { method: "DELETE" }).catch(() => {});
      fetchData(); // Refresh Data
    } catch (err) {
      console.error("Failed to add stock");
    }
  };

  const handleUpdateStock = async (id: number) => {
    try {
      const stock = stocks.find(s => s.id === id);
      if (!stock) return;
      
      await fetch(`http://localhost:8000/stocks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: stock.ticker,
          avg_price_paid: parseFloat(editAvgPrice),
          shares: parseFloat(editShares),
        })
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update stock");
    }
  };

  const startEditing = (s: any) => {
    setEditingId(s.id);
    setEditShares(s.shares.toString());
    setEditAvgPrice(s.avg_price_paid.toString());
  };

  const handleDeleteStock = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/stocks/${id}`, { method: "DELETE" });
      // Invalidate news cache so Intelligence Feed reflects removed holding
      fetch("http://localhost:8000/news/cache", { method: "DELETE" }).catch(() => {});
      fetchData();
    } catch (err) {
      console.error("Failed to delete stock");
    }
  };

  const getAssetStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('fund') || n.includes('mutual')) return { color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: <TrendingUp size={16}/> };
    if (n.includes('epf') || n.includes('ppf') || n.includes('provident')) return { color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: <Landmark size={16}/> };
    if (n.includes('stock') || n.includes('equity')) return { color: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', icon: <LineChart size={16}/> };
    if (n.includes('gold') || n.includes('sgb')) return { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: <Coins size={16}/> };
    if (n.includes('fd') || n.includes('deposit') || n.includes('bank')) return { color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: <Briefcase size={16}/> };
    return { color: '#64748b', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', icon: <PieChartIcon size={16}/> };
  };

  const Sparkline = ({ data }: { data: number[] }) => {
    const chartData = data.map((val, i) => ({ val, i }));
    return (
      <div className="w-24 h-10">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis hide domain={['auto', 'auto']} />
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke="#3b82f6" 
              strokeWidth={1.5} 
              fillOpacity={1} 
              fill="url(#colorTrend)" 
              dot={false}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chartData = assets.map(a => ({
      name: a.name,
      Invested: a.invested_amount || 0,
      Current: a.current_amount || 0,
      fill: getAssetStyle(a.name).color
  }));

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* Top Assets Summary Table */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="flex items-center gap-2 mb-8">
            <Wallet size={18} className="text-slate-400" />
            <h3 className="font-bold tracking-tight">High-Level Asset Classes</h3>
         </div>
         {loading ? (
           <TableSkeleton rows={8} cols={6} />
         ) : (
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
               <thead>
                  <tr className="bg-emerald-700 text-white rounded-t-xl">
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800">Investment Name</th>
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800 text-right">Invested Amount</th>
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800 text-right">Current Amount</th>
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800 text-right">Absolute Return %</th>
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800 text-center">XIRR %</th>
                     <th className="p-4 font-bold text-xs uppercase tracking-widest border-b border-emerald-800 text-center">Tenure</th>
                  </tr>
               </thead>
                <tbody>
                  {assets.map((asset, i) => {
                    const style = getAssetStyle(asset.name);
                    return (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                       <td className="p-4 border-b border-slate-50">
                         <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${style.bg} ${style.text} border ${style.border}`}>
                             {style.icon}
                           </div>
                           <span className="font-bold text-slate-800">{asset.name}</span>
                         </div>
                       </td>
                       <td className="p-4 text-right font-medium border-b border-slate-50">₹{(asset.invested_amount || 0).toLocaleString()}</td>
                       <td className="p-4 text-right font-bold border-b border-slate-50 text-slate-900">₹{(asset.current_amount || 0).toLocaleString()}</td>
                       <td className={`p-4 text-right font-medium border-b border-slate-50 ${(asset.absolute_return || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {asset.absolute_return || 0}%
                       </td>
                       <td className="p-4 text-center font-medium text-indigo-600 border-b border-slate-50">{asset.xirr || 0}%</td>
                       <td className="p-4 text-center font-medium text-slate-500 border-b border-slate-50">{asset.tenure_years || 0}y</td>
                    </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-emerald-100 font-bold">
                       <td className="p-4 text-emerald-900">Total</td>
                       <td className="p-4 text-right text-emerald-900">₹{assets.reduce((s, a) => s + (a.invested_amount||0), 0).toLocaleString()}</td>
                       <td className="p-4 text-right text-emerald-900">₹{assets.reduce((s, a) => s + (a.current_amount||0), 0).toLocaleString()}</td>
                       <td colSpan={3} className="p-4 text-right text-emerald-900">Total Return: ₹{assets.reduce((s, a) => s + ((a.current_amount||0) - (a.invested_amount||0)), 0).toLocaleString()}</td>
                  </tr>
               </tbody>
            </table>
         </div>
         )}
      </div>

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCardSkeleton height="h-[300px]" />
          <ChartCardSkeleton height="h-[300px]" />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="font-bold tracking-tight mb-4">Invested vs Current</h3>
            <p className="text-xs text-slate-500 mb-6">Comparisons across multiple asset classes</p>
            <div className="flex-1 min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                 <BarChart layout="vertical" data={chartData} margin={{top: 0, right: 30, left: 40, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `₹${val/1000}k`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} width={80} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: 12, paddingTop: 10}} />
                    <Bar dataKey="Invested" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="Current" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={12}>
                       {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="font-bold tracking-tight mb-4">Asset Allocation</h3>
            <p className="text-xs text-slate-500 mb-6">Distribution based on current values</p>
            <div className="flex-1 min-h-[300px] relative">
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                 <RechartsPieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={85} outerRadius={120} dataKey="Current" paddingAngle={4} stroke="none">
                        {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: 12, paddingTop: 10}} />
                 </RechartsPieChart>
               </ResponsiveContainer>
               {/* Center Metric */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                 <span className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Total Assets</span>
                 <span className="text-2xl font-black text-slate-800">
                    ₹{assets.length > 0 ? (assets.reduce((sum, a) => sum + (a.current_amount || 0), 0) / 100000).toFixed(1) : 0}L
                 </span>
               </div>
            </div>
         </div>
      </div>
      )}

      {/* Stock Holdings Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
               <TrendingUp size={18} className="text-slate-400" />
               <h3 className="font-bold tracking-tight">Stock Holdings Drill-down</h3>
            </div>
            <button onClick={() => setIsAdding(!isAdding)} title="Add new equity" className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
               <Plus size={14} /> Add Stock
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
               <thead>
                  <tr className="bg-indigo-50 border-y border-indigo-100">
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest">Ticker</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-center">Latest Trend</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">Avg Price Paid</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-center">Shares</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">Current Price</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">Money Invested</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">Current Value</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">Gain/Loss</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-right">% Change</th>
                     <th className="p-4 font-bold text-[10px] text-indigo-800 uppercase tracking-widest text-center">Action</th>
                  </tr>
               </thead>
               <tbody>
                  {isAdding && (
                     <tr className="bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-2">
                        <td className="p-3"><input autoFocus placeholder="e.g. NSE:BDL" value={newTicker} onChange={e => setNewTicker(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" /></td>
                        <td className="p-3"><input type="number" placeholder="Price" value={newAvgPrice} onChange={e => setNewAvgPrice(e.target.value)} className="w-full text-right bg-white border border-slate-200 rounded px-2 py-1 text-xs" /></td>
                        <td className="p-3"><input type="number" placeholder="Qty" value={newShares} onChange={e => setNewShares(e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded px-2 py-1 text-xs" /></td>
                        <td colSpan={5} className="p-3 text-xs text-slate-400 italic text-center">Live data will fetch on save</td>
                        <td className="p-3 text-center">
                           <button aria-label="Save stock entry" onClick={handleAddStock} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-lg"><Check size={16} /></button>
                        </td>
                     </tr>
                  )}
                  {loading && stocks.length === 0 ? (
                     <tr><td colSpan={10} className="p-8 text-center text-slate-400">Loading Live Tickers...</td></tr>
                  ) : stocks.length === 0 && !isAdding ? (
                     <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">No holding data found. Add a stock to get started.</td></tr>
                  ) : stocks.map(s => (
                     <tr key={s.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                        <td className="p-4">
                           <div className="font-bold text-slate-800">{s.ticker}</div>
                           <div className="text-[10px] text-slate-400 font-medium">Equities / NSE</div>
                        </td>
                        <td className="p-4">
                           <Sparkline data={s.trend || []} />
                        </td>
                        <td className="p-4 text-right">
                           {editingId === s.id ? (
                              <input 
                                 type="number" 
                                 value={editAvgPrice} 
                                 onChange={e => setEditAvgPrice(e.target.value)} 
                                 className="w-20 text-right bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-bold"
                              />
                           ) : (
                              <span className="font-medium text-slate-600">₹{s.avg_price_paid.toLocaleString()}</span>
                           )}
                        </td>
                        <td className="p-4 text-center">
                           {editingId === s.id ? (
                              <input 
                                 type="number" 
                                 value={editShares} 
                                 onChange={e => setEditShares(e.target.value)} 
                                 className="w-16 text-center bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-bold"
                              />
                           ) : (
                              <span className="font-bold text-slate-700">{s.shares}</span>
                           )}
                        </td>
                        <td className="p-4 text-right font-bold text-indigo-600">₹{(s.current_price||0).toLocaleString()}</td>
                        <td className="p-4 text-right font-medium text-slate-500">₹{s.money_invested.toLocaleString()}</td>
                        <td className="p-4 text-right font-bold">₹{s.current_value.toLocaleString()}</td>
                        <td className={`p-4 text-right font-bold ${s.gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {s.gain_loss >= 0 ? '+' : ''}₹{s.gain_loss.toLocaleString()}
                        </td>
                        <td className={`p-4 text-right font-bold ${s.percent_change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} rounded-r-lg`}>
                           {s.percent_change >= 0 ? '+' : ''}{s.percent_change.toFixed(2)}%
                        </td>
                        <td className="p-4 flex items-center justify-center gap-2">
                           {editingId === s.id ? (
                              <button aria-label="Save changes" onClick={() => handleUpdateStock(s.id)} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-lg"><Check size={16}/></button>
                           ) : (
                              <button aria-label="Edit stock" onClick={() => startEditing(s)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button>
                           )}
                           <button aria-label="Delete stock" onClick={() => handleDeleteStock(s.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}
