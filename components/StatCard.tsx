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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {action && <div className="z-10">{action}</div>}
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {subValue && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100 mb-1`}>
           <div className="text-slate-700">{icon}</div>
        </div>
      </div>

      {(trend && trendValue) && (
        <div className="mt-4 flex items-center text-sm border-t border-slate-50 pt-3">
          <span className={`font-medium flex items-center gap-1 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </span>
          <span className="text-slate-400 ml-2 text-xs">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;