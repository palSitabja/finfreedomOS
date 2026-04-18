import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft,
  Plus, Trash2, Edit2, Check,
  Briefcase, Landmark, Coins, LineChart, PieChart as PieChartIcon
} from "lucide-react";
import { 
  BarChart, Bar, CartesianGrid, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart as RechartsPieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { TableSkeleton, ChartCardSkeleton } from './Skeleton';

const COLORS = ['#7c5cfc', '#00d68f', '#38bdf8', '#fbbf24', '#f43f5e', '#a855f7', '#10b981', '#f97316', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#eab308'];

const getAssetStyle = (name: string, index?: number) => {
  const n = name.toLowerCase();
  
  let icon = <PieChartIcon size={20}/>;
  let label = 'Other';

  if (n.includes('fund') || n.includes('mutual')) { icon = <TrendingUp size={20}/>; label = 'Mutual Funds'; }
  else if (n.includes('epf') || n.includes('ppf') || n.includes('provident')) { icon = <Landmark size={20}/>; label = 'Provident Fund'; }
  else if (n.includes('stock') || n.includes('equity')) { icon = <LineChart size={20}/>; label = 'Equities'; }
  else if (n.includes('gold') || n.includes('sgb')) { icon = <Coins size={20}/>; label = 'Gold'; }
  else if (n.includes('fd') || n.includes('deposit') || n.includes('bank') || n.includes('fixed income') || n.includes('bond')) { icon = <Briefcase size={20}/>; label = 'Fixed Income'; }
  else if (n.includes('crypto')) { icon = <Wallet size={20}/>; label = 'Crypto'; }
  else if (n.includes('silver')) { icon = <Coins size={20}/>; label = 'Silver'; }
  else if (n.includes('ulip') || n.includes('policy')) { icon = <Briefcase size={20}/>; label = 'Insurance'; }

  const baseColor = typeof index === 'number' ? COLORS[index % COLORS.length] : '#94a3b8';

  return { color: baseColor, dim: `${baseColor}22`, icon, label };
};

const Sparkline = ({ data }: { data: number[] }) => {
  const chartData = data.map((val, i) => ({ val, i }));
  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis hide domain={['auto','auto']} />
          <Area type="monotone" dataKey="val" stroke="#38bdf8" strokeWidth={1.5} fill="url(#spkGrad)" dot={false} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AssetsDashboard = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editAvgPrice, setEditAvgPrice] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ar, sr] = await Promise.all([fetch("http://localhost:8000/assets"), fetch("http://localhost:8000/stocks")]);
      setAssets(await ar.json()); setStocks(await sr.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleAddStock = async () => {
    if (!newTicker || !newShares || !newAvgPrice) return;
    await fetch("http://localhost:8000/stocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: newTicker.toUpperCase(), avg_price_paid: parseFloat(newAvgPrice), shares: parseFloat(newShares) }) });
    setIsAdding(false); setNewTicker(""); setNewShares(""); setNewAvgPrice("");
    fetch("http://localhost:8000/news/cache", { method: "DELETE" }).catch(() => {});
    fetchData();
  };

  const handleUpdateStock = async (id: number) => {
    const stock = stocks.find(s => s.id === id); if (!stock) return;
    await fetch(`http://localhost:8000/stocks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: stock.ticker, avg_price_paid: parseFloat(editAvgPrice), shares: parseFloat(editShares) }) });
    setEditingId(null); fetchData();
  };

  const handleDeleteStock = async (id: number) => {
    await fetch(`http://localhost:8000/stocks/${id}`, { method: "DELETE" });
    fetch("http://localhost:8000/news/cache", { method: "DELETE" }).catch(() => {});
    fetchData();
  };

  const totalInvested = assets.reduce((s, a) => s + (a.invested_amount || 0), 0);
  const totalCurrent  = assets.reduce((s, a) => s + (a.current_amount  || 0), 0);
  const totalGain     = totalCurrent - totalInvested;
  const gainPct       = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : '0';

  const pieData  = assets.map((a, i) => ({ name: a.name, value: a.current_amount || 0, fill: getAssetStyle(a.name, i).color }));
  const barData  = assets.map((a, i) => {
    const style = getAssetStyle(a.name, i);
    return { 
      name: a.name, 
      Invested: a.invested_amount || 0, 
      Current: a.current_amount || 0, 
      investedFill: style.color, 
      currentFill: style.color 
    };
  });

  return (
    <div className="space-y-8 animate-in">
      {/* Summary Hero */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString()}`, color: 'var(--accent-sky)',     orbClass: 'icon-orb-sky',     icon: <Wallet size={24}/>, gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' },
          { label: 'Current Value',  value: `₹${totalCurrent.toLocaleString()}`,  color: 'var(--accent-emerald)', orbClass: 'icon-orb-emerald', icon: <TrendingUp size={24}/>, gradient: 'linear-gradient(135deg, rgba(0, 214, 143, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' },
          { label: 'Total Gain',     value: `${totalGain >= 0 ? '+' : ''}₹${totalGain.toLocaleString()} (${gainPct}%)`, color: totalGain >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', orbClass: totalGain >= 0 ? 'icon-orb-emerald' : 'icon-orb-rose', icon: totalGain >= 0 ? <ArrowUpRight size={24}/> : <ArrowDownLeft size={24}/>, gradient: totalGain >= 0 ? 'linear-gradient(135deg, rgba(0, 214, 143, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' : 'linear-gradient(135deg, rgba(255, 83, 112, 0.05) 0%, rgba(255, 255, 255, 0) 100%)' },
        ].map((s, i) => (
          <div key={i} className="card p-6" style={{ background: s.gradient }}>
            <div className={`icon-orb ${s.orbClass} mb-4`}>{s.icon}</div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <h2 className="text-xl font-bold font-mono-data" style={{ color: s.color }}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* Asset Classes Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-7 pb-5">
          <div className="icon-orb icon-orb-violet" style={{ width: 40, height: 40, borderRadius: 12 }}><Wallet size={18}/></div>
          <h3 className="font-bold text-base">High-Level Asset Classes</h3>
        </div>
        {loading ? (
          <div className="p-7"><TableSkeleton rows={6} cols={6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm data-table">
              <thead>
                <tr>
                  <th>Investment</th><th className="text-right">Invested</th><th className="text-right">Current</th>
                  <th className="text-right">Return %</th><th className="text-center">XIRR %</th><th className="text-center">Tenure</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => {
                  const style = getAssetStyle(asset.name, i);
                  const ret = asset.absolute_return || 0;
                  return (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: style.dim, color: style.color }}>{style.icon}</div>
                          <div>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{style.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-mono-data" style={{ color: 'var(--text-secondary)' }}>₹{(asset.invested_amount||0).toLocaleString()}</td>
                      <td className="text-right font-bold font-mono-data" style={{ color: 'var(--text-primary)' }}>₹{(asset.current_amount||0).toLocaleString()}</td>
                      <td className="text-right font-bold font-mono-data" style={{ color: ret >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{ret}%</td>
                      <td className="text-center font-mono-data" style={{ color: 'var(--accent-violet)' }}>{asset.xirr||0}%</td>
                      <td className="text-center" style={{ color: 'var(--text-muted)' }}>{asset.tenure_years||0}y</td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'rgba(0,214,143,0.06)', borderTop: '1px solid rgba(0,214,143,0.15)' }}>
                  <td className="font-bold" style={{ color: 'var(--accent-emerald)' }}>Total Portfolio</td>
                  <td className="text-right font-bold font-mono-data" style={{ color: 'var(--accent-emerald)' }}>₹{totalInvested.toLocaleString()}</td>
                  <td className="text-right font-bold font-mono-data" style={{ color: 'var(--accent-emerald)' }}>₹{totalCurrent.toLocaleString()}</td>
                  <td colSpan={3} className="text-right font-bold" style={{ color: totalGain >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {totalGain >= 0 ? '+' : ''}₹{totalGain.toLocaleString()} ({gainPct}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardSkeleton height="h-[300px]" /><ChartCardSkeleton height="h-[300px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-7">
            <h3 className="font-bold text-sm mb-1">Invested vs Current Value</h3>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Comparison across asset classes</p>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <RechartsTooltip cursor={{ fill: 'var(--bg-surface)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} />
                  <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 20, color: '#94a3b8' }} />
                  <Bar dataKey="Invested" radius={[4,4,0,0]} barSize={20} fillOpacity={0.35}>
                    {barData.map((e, i) => <Cell key={i} fill={e.investedFill} />)}
                  </Bar>
                  <Bar dataKey="Current" radius={[4,4,0,0]} barSize={20} fillOpacity={1}>
                    {barData.map((e, i) => <Cell key={i} fill={e.currentFill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-7 relative">
            <h3 className="font-bold text-sm mb-1">Asset Allocation</h3>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Distribution by current value</p>
            <div style={{ height: 280, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <RechartsPieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={115} dataKey="value" paddingAngle={4} stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#94a3b8' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: -20 }}>
                <span className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total</span>
                <span className="text-xl font-bold font-mono-data" style={{ color: 'var(--accent-emerald)' }}>
                  ₹{assets.length > 0 ? (totalCurrent / 100000).toFixed(1) : 0}L
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Holdings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="icon-orb icon-orb-sky" style={{ width: 40, height: 40, borderRadius: 12 }}><LineChart size={18}/></div>
            <div>
              <h3 className="font-bold text-base">Stock Holdings</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Live NSE/BSE equity positions</p>
            </div>
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors" style={{ background: 'var(--accent-violet)', color: '#fff' }}>
            <Plus size={14} /> Add Stock
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th>Ticker</th><th className="text-center">Trend</th><th className="text-right">Avg Price</th>
                <th className="text-center">Shares</th><th className="text-right">Live Price</th>
                <th className="text-right">Invested</th><th className="text-right">Value</th>
                <th className="text-right">Gain/Loss</th><th className="text-right">Change %</th><th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr style={{ background: 'rgba(124,92,252,0.06)' }}>
                  <td><input autoFocus placeholder="e.g. NSE:BDL" value={newTicker} onChange={e => setNewTicker(e.target.value)} className="input-dark text-xs py-2" /></td>
                  <td><input type="number" placeholder="Avg Price" value={newAvgPrice} onChange={e => setNewAvgPrice(e.target.value)} className="input-dark text-xs py-2 text-right" /></td>
                  <td><input type="number" placeholder="Qty" value={newShares} onChange={e => setNewShares(e.target.value)} className="input-dark text-xs py-2 text-center" /></td>
                  <td colSpan={5} className="text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>Live data fetches on save</td>
                  <td className="text-center">
                    <button onClick={handleAddStock} aria-label="Save stock" className="p-2 rounded-lg" style={{ background: 'var(--accent-emerald-dim)', color: 'var(--accent-emerald)' }}><Check size={16}/></button>
                  </td>
                </tr>
              )}
              {loading && stocks.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading live tickers…</td></tr>
              ) : stocks.length === 0 && !isAdding ? (
                <tr><td colSpan={10} className="p-10 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>No holdings. Add a stock to get started.</td></tr>
              ) : stocks.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="font-bold">{s.ticker}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Equities / NSE</div>
                  </td>
                  <td><Sparkline data={s.trend || []} /></td>
                  <td className="text-right font-mono-data">
                    {editingId === s.id ? <input type="number" value={editAvgPrice} onChange={e => setEditAvgPrice(e.target.value)} className="input-dark text-xs py-1 w-24 text-right" /> : <span style={{ color: 'var(--text-secondary)' }}>₹{s.avg_price_paid.toLocaleString()}</span>}
                  </td>
                  <td className="text-center font-mono-data font-bold">
                    {editingId === s.id ? <input type="number" value={editShares} onChange={e => setEditShares(e.target.value)} className="input-dark text-xs py-1 w-16 text-center" /> : s.shares}
                  </td>
                  <td className="text-right font-bold font-mono-data" style={{ color: 'var(--accent-sky)' }}>₹{(s.current_price||0).toLocaleString()}</td>
                  <td className="text-right font-mono-data" style={{ color: 'var(--text-muted)' }}>₹{s.money_invested.toLocaleString()}</td>
                  <td className="text-right font-bold font-mono-data">₹{s.current_value.toLocaleString()}</td>
                  <td className="text-right font-bold font-mono-data" style={{ color: s.gain_loss >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {s.gain_loss >= 0 ? '+' : ''}₹{s.gain_loss.toLocaleString()}
                  </td>
                  <td className="text-right">
                    <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono-data" style={{ background: s.percent_change >= 0 ? 'var(--accent-emerald-dim)' : 'var(--accent-rose-dim)', color: s.percent_change >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {s.percent_change >= 0 ? '+' : ''}{s.percent_change.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === s.id
                        ? <button aria-label="Save" onClick={() => handleUpdateStock(s.id)} className="p-2 rounded-lg" style={{ background: 'var(--accent-emerald-dim)', color: 'var(--accent-emerald)' }}><Check size={15}/></button>
                        : <button aria-label="Edit" onClick={() => { setEditingId(s.id); setEditShares(s.shares.toString()); setEditAvgPrice(s.avg_price_paid.toString()); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><Edit2 size={15}/></button>
                      }
                      <button aria-label="Delete" onClick={() => handleDeleteStock(s.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
