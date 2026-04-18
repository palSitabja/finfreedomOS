import React from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface DetailedTableProps {
  title: string;
  data: Record<string, any>;
  rows: string[];
  colorClass?: string;
  categoryKey?: string;
}

export const DetailedTable = ({ title, data, rows, colorClass, categoryKey }: DetailedTableProps) => {
  return (
    <div className="card overflow-hidden mb-8">
      <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'var(--bg-card)' }}>
        <h3 className={`font-bold ${colorClass || 'text-[var(--text-primary)]'}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm data-table border-collapse">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th className="p-4 font-bold uppercase tracking-widest text-[10px] min-w-[150px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Row</th>
              {MONTHS.map(m => (
                <th key={m} className="p-4 font-bold uppercase tracking-widest text-[10px] text-center min-w-[100px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{m}</th>
              ))}
              <th className="p-4 font-bold uppercase tracking-widest text-[10px] text-center min-w-[120px]" style={{ color: 'var(--accent-emerald)', borderBottom: '1px solid var(--border)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rowKey, idx) => {
              let yearlyTotal = 0;
              const lookupKey = categoryKey || title;
              return (
                <tr key={rowKey} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td className="p-4 font-bold" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{rowKey}</td>
                  {MONTHS.map(m => {
                    const value = data[m]?.[rowKey] || data[m]?.categories?.[lookupKey]?.[rowKey] || 0;
                    yearlyTotal += value;
                    return (
                      <td key={m} className="p-4 text-center font-mono-data" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: value < 0 ? 'var(--accent-rose)' : value > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {value !== 0 ? `₹${value.toLocaleString()}` : "₹0"}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center font-bold font-mono-data" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}>
                    ₹{yearlyTotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
