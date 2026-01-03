import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass?: string;
  action?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  subValue, 
  icon, 
  trend, 
  trendValue, 
  colorClass = "bg-blue-500",
  action 
}) => {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 relative group">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase text-[11px]">{label}</p>
        {action && <div className="z-10 relative">{action}</div>}
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subValue && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100 mb-1 group-hover:scale-110 transition-transform duration-300`}>
           <div className="text-slate-700">{icon}</div>
        </div>
      </div>

      {(trend && trendValue) && (
        <div className="mt-5 flex items-center text-sm border-t border-slate-50 pt-3">
          <span className={`font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
            trend === 'up' ? 'text-green-700 bg-green-50' : trend === 'down' ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-50'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </span>
          <span className="text-slate-400 ml-2 text-xs font-medium">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;