import React from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface DetailedTableProps {
  title: string;
  data: Record<string, any>;
  rows: string[];
  colorClass?: string;
  categoryKey?: string;
}

export const DetailedTable = ({ title, data, rows, colorClass = "text-slate-900", categoryKey }: DetailedTableProps) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <h3 className={`font-bold ${colorClass}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 min-w-[150px]">Row</th>
              {MONTHS.map(m => (
                <th key={m} className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 text-center min-w-[100px]">{m}</th>
              ))}
              <th className="p-4 font-bold text-emerald-600 uppercase tracking-widest text-[10px] border-b border-slate-100 text-center min-w-[120px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rowKey, idx) => {
              let yearlyTotal = 0;
              const lookupKey = categoryKey || title;
              return (
                <tr key={rowKey} className={`hover:bg-slate-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                  <td className="p-4 font-bold text-slate-700 border-b border-slate-50">{rowKey}</td>
                  {MONTHS.map(m => {
                    const value = data[m]?.[rowKey] || data[m]?.categories?.[lookupKey]?.[rowKey] || 0;
                    yearlyTotal += value;
                    return (
                      <td key={m} className={`p-4 text-center border-b border-slate-50 font-medium ${value < 0 ? 'text-rose-500' : value > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                        {value !== 0 ? `₹${value.toLocaleString()}` : "₹0"}
                      </td>
                    );
                  })}
                  <td className="p-4 text-center border-b border-slate-50 font-bold bg-slate-50/50">
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
