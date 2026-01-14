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
  colorClass = "bg-indigo-50 text-indigo-600",
  action 
}) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/60 shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden h-full flex flex-col">
      {/* Decorative gradient blob */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl ${colorClass.replace('bg-', 'bg-').split(' ')[0]}`}></div>

      <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
        <div className={`p-2 sm:p-2.5 rounded-lg ${colorClass} bg-opacity-10 shadow-sm ring-1 ring-inset ring-black/5`}>
           {icon}
        </div>
        {action && <div>{action}</div>}
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">{value}</h3>
        </div>
        
        {(subValue || trendValue) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {trend && trendValue && (
                    <span className={`font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded whitespace-nowrap ${
                        trend === 'up' ? 'text-emerald-700 bg-emerald-50' : 
                        trend === 'down' ? 'text-rose-700 bg-rose-50' : 
                        'text-slate-600 bg-slate-100'
                    }`}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
                    </span>
                )}
                {subValue && (
                    <span className="text-slate-400 font-medium truncate max-w-full block" title={subValue}>{subValue}</span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;