import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Euro, PoundSterling, IndianRupee, JapaneseYen, AlertCircle, CheckCircle, Clock, Globe, Sparkles, Loader2, ArrowUpRight, Plus, AlertTriangle, Wallet } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { analyzeClientData } from '../services/geminiService';

type TimeFilter = 'month' | 'year' | 'all';
type RevenueTypeFilter = 'all' | 'hosting' | 'domain';

const Dashboard: React.FC = () => {
  const { formatCurrency, settings } = useAuth();
  const { clients, domains, invoices } = useData();
  const navigate = useNavigate();
  
  const [revTimeFilter, setRevTimeFilter] = useState<TimeFilter>('year');
  const [chartTypeFilter, setChartTypeFilter] = useState<RevenueTypeFilter>('all');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Stats Logic (Optimized for readability)
  const revenueStats = useMemo(() => {
    const now = new Date();
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    let filtered = paidInvoices;
    
    if (revTimeFilter === 'month') {
        filtered = paidInvoices.filter(inv => {
            const d = new Date(inv.issueDate);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
    } else if (revTimeFilter === 'year') {
        filtered = paidInvoices.filter(inv => new Date(inv.issueDate).getFullYear() === now.getFullYear());
    }
    return { 
        total: filtered.reduce((sum, inv) => sum + inv.amount, 0), 
        count: filtered.length 
    };
  }, [invoices, revTimeFilter]);

  const activeStats = useMemo(() => {
    const activeHosting = clients.filter(c => c.status === 'Active').length;
    const activeDomains = domains.filter(d => d.status === 'Active').length;
    return { total: activeHosting + activeDomains, hosting: activeHosting, domains: activeDomains };
  }, [clients, domains]);

  const pendingStats = useMemo(() => {
    const pendingList = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Pending');
    return { count: pendingList.length, amount: pendingList.reduce((sum, inv) => sum + inv.amount, 0) };
  }, [invoices]);

  const overdueStats = useMemo(() => {
    const overdueList = invoices.filter(inv => inv.status === 'Overdue' || (inv.status === 'Unpaid' && new Date(inv.dueDate) < new Date()));
    return { count: overdueList.length, amount: overdueList.reduce((sum, inv) => sum + inv.amount, 0) };
  }, [invoices]);

  // Chart Data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(m => dataMap.set(m, 0));
    
    const currentYear = new Date().getFullYear();
    invoices.forEach(inv => {
        if (inv.status !== 'Paid') return;
        if (chartTypeFilter === 'hosting' && inv.type !== 'Hosting Renew') return;
        if (chartTypeFilter === 'domain' && inv.type !== 'Domain Renew') return;
        
        const date = new Date(inv.issueDate);
        if (date.getFullYear() === currentYear) {
            const monthName = months[date.getMonth()];
            dataMap.set(monthName, (dataMap.get(monthName) || 0) + inv.amount);
        }
    });
    return Array.from(dataMap).map(([name, amount]) => ({ name, amount }));
  }, [invoices, chartTypeFilter]);

  const statusDistribution = useMemo(() => {
    const stats = { Active: 0, Suspended: 0, Expired: 0, Pending: 0 };
    const normalize = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === 'active') return 'Active';
        if (lower === 'suspended') return 'Suspended';
        if (lower === 'expired') return 'Expired';
        return 'Pending';
    };
    clients.forEach(c => stats[normalize(c.status)]++);
    domains.forEach(d => stats[normalize(d.status)]++);
    return [
        { name: 'Active', value: stats.Active, color: '#10b981' },
        { name: 'Suspended', value: stats.Suspended, color: '#f59e0b' },
        { name: 'Expired', value: stats.Expired, color: '#ef4444' },
        { name: 'Pending', value: stats.Pending, color: '#6366f1' },
    ].filter(item => item.value > 0);
  }, [clients, domains]);

  // Dashboard Lists Logic
  const dashboardLists = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next15Days = new Date(today);
    next15Days.setDate(today.getDate() + 15);

    const mapItem = (item: any, type: 'Hosting' | 'Domain') => ({
        id: item.id,
        title: type === 'Hosting' ? item.website : item.domainName,
        subtitle: item.clientName,
        date: type === 'Hosting' ? item.nextRenewalDate : item.expiryDate,
        created: type === 'Hosting' ? item.setupDate : item.purchaseDate,
        status: item.status,
        type
    });

    const combined = [
        ...clients.map(c => mapItem(c, 'Hosting')),
        ...domains.map(d => mapItem(d, 'Domain'))
    ];

    // 1. Expiring Soon (Active, 0 to 15 days out)
    const expiring = combined
        .filter(i => i.status === 'Active' && new Date(i.date) >= today && new Date(i.date) <= next15Days)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Overdue (Past date)
    const overdue = combined
        .filter(i => (i.status === 'Active' || i.status === 'Pending' || i.status === 'Overdue') && new Date(i.date) < today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Recently Added (Newest first)
    const recent = combined
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, 5);

    return { expiring, overdue, recent };
  }, [clients, domains]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeClientData(clients, domains);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm animate-fade-in-up">
           <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
           </div>
           Live Updates
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(revenueStats.total)}
          subValue={`${revenueStats.count} Paid Invoices`}
          icon={<Wallet size={22} className="text-indigo-600" />}
          trend="up"
          trendValue={revTimeFilter === 'year' ? 'This Year' : 'This Month'}
          colorClass="bg-indigo-50 text-indigo-600"
          action={
            <select 
                className="text-[10px] bg-transparent text-slate-400 font-bold uppercase cursor-pointer outline-none hover:text-indigo-600 transition-colors"
                value={revTimeFilter}
                onChange={(e) => setRevTimeFilter(e.target.value as TimeFilter)}
            >
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="all">All</option>
            </select>
          }
        />
        <StatCard 
          label="Active Services" 
          value={activeStats.total} 
          subValue={`${activeStats.hosting} Hosting • ${activeStats.domains} Domain`}
          icon={<CheckCircle size={22} />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          label="Pending Payments" 
          value={formatCurrency(pendingStats.amount)}
          subValue={`${pendingStats.count} Invoices`}
          icon={<Clock size={22} />}
          trend="down"
          trendValue="Waiting"
          colorClass="bg-amber-50 text-amber-600"
        />
        <StatCard 
          label="Overdue Amount" 
          value={formatCurrency(overdueStats.amount)}
          subValue={`${overdueStats.count} Invoices`}
          icon={<AlertCircle size={22} />}
          trend="up"
          trendValue="Action Needed"
          colorClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-soft flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="font-bold text-slate-800 text-lg">Financial Performance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Monthly revenue breakdown</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                {(['all', 'hosting', 'domain'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setChartTypeFilter(type)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            chartTypeFilter === type 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '8px 12px', fontSize: '12px' }}
                />
                <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-soft flex flex-col">
          <h3 className="font-bold text-slate-800 text-lg mb-1">Service Health</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution by status</p>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={5}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                    <span className="text-3xl font-extrabold text-slate-800">{clients.length + domains.length}</span>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Items</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles size={20} className="text-yellow-300" />
                      AI Intelligence
                  </h3>
                  <p className="text-indigo-100 text-xs mt-1 opacity-80">Generate actionable growth insights based on your client data.</p>
              </div>
              <button 
                  onClick={handleAiAnalysis}
                  disabled={isAnalyzing}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : 'Generate Report'}
              </button>
          </div>
          {aiInsight && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-sm leading-relaxed text-indigo-50 animate-fade-in-up max-h-40 overflow-y-auto custom-scrollbar">
                  <div dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
          )}
      </div>

      {/* Critical Monitoring Widgets (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. Expiring Soon */}
          <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-soft flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Clock size={20} className="text-amber-500" />
                   Expiring Soon
                </h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">
                   {dashboardLists.expiring.length} ITEMS
                </span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar max-h-64 pr-2 space-y-3">
                {dashboardLists.expiring.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8 text-center">
                        <CheckCircle size={32} className="mb-2 opacity-20 text-emerald-500" />
                        No items expiring within 15 days.
                    </div>
                ) : (
                    dashboardLists.expiring.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 hover:bg-amber-50 transition-colors group">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                                <p className="text-xs text-amber-700 font-medium">Expires: {item.date}</p>
                            </div>
                            <button onClick={() => navigate(item.type === 'Hosting' ? '/clients' : '/domains')} className="text-amber-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                                <ArrowUpRight size={16}/>
                            </button>
                        </div>
                    ))
                )}
             </div>
          </div>

          {/* 2. Recently Added */}
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-soft flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Globe size={20} className="text-blue-500" />
                   Recently Added
                </h3>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                   {dashboardLists.recent.length} NEW
                </span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar max-h-64 pr-2 space-y-3">
                {dashboardLists.recent.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8 text-center">
                        <Plus size={32} className="mb-2 opacity-20" />
                        No recent activity.
                    </div>
                ) : (
                    dashboardLists.recent.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-blue-50/30 rounded-xl border border-blue-100/50 hover:bg-blue-50 transition-colors group">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {item.title.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                                    <p className="text-xs text-slate-500">Reg: {item.created}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                NEW
                            </span>
                        </div>
                    ))
                )}
             </div>
          </div>

          {/* 3. Overdue Renewals */}
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-soft flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <AlertTriangle size={20} className="text-rose-500" />
                   Overdue Renewals
                </h3>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded-full border border-rose-100">
                   {dashboardLists.overdue.length} ALERT
                </span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar max-h-64 pr-2 space-y-3">
                {dashboardLists.overdue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8 text-center">
                        <CheckCircle size={32} className="mb-2 opacity-30 text-emerald-500" />
                        All domains are up to date!
                    </div>
                ) : (
                    dashboardLists.overdue.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100 hover:bg-rose-100/50 transition-colors group">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                                <p className="text-xs text-rose-600 font-medium">Due: {item.date}</p>
                            </div>
                            <button onClick={() => navigate(item.type === 'Hosting' ? '/clients' : '/domains')} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 transition-colors">
                                <ArrowUpRight size={16}/>
                            </button>
                        </div>
                    ))
                )}
             </div>
          </div>

       </div>
    </div>
  );
};

export default Dashboard;