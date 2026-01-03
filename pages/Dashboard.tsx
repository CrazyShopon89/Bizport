import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Euro, PoundSterling, IndianRupee, JapaneseYen, AlertCircle, CheckCircle, Clock, Globe } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

type TimeFilter = 'month' | 'year' | 'all';
type RevenueTypeFilter = 'all' | 'hosting' | 'domain';

const Dashboard: React.FC = () => {
  const { formatCurrency, settings } = useAuth();
  const { clients, domains, invoices } = useData();
  const navigate = useNavigate();
  
  const [revTimeFilter, setRevTimeFilter] = useState<TimeFilter>('year');
  const [chartTypeFilter, setChartTypeFilter] = useState<RevenueTypeFilter>('all');

  // --- ANALYTICS LOGIC ---

  // 1. Total Revenue Card Logic
  const revenueStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');

    let filtered = paidInvoices;
    if (revTimeFilter === 'month') {
        filtered = paidInvoices.filter(inv => {
            const d = new Date(inv.issueDate); // Approximation: using issueDate as payment date fallback
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
    } else if (revTimeFilter === 'year') {
        filtered = paidInvoices.filter(inv => {
            const d = new Date(inv.issueDate);
            return d.getFullYear() === currentYear;
        });
    }

    const total = filtered.reduce((sum, inv) => sum + inv.amount, 0);
    return { total, count: filtered.length };
  }, [invoices, revTimeFilter]);

  // 2. Active Clients Logic
  const activeStats = useMemo(() => {
    const activeHosting = clients.filter(c => c.status === 'Active').length;
    const activeDomains = domains.filter(d => d.status === 'Active').length;
    return {
        total: activeHosting + activeDomains,
        hosting: activeHosting,
        domains: activeDomains
    };
  }, [clients, domains]);

  // 3. Pending Payments Logic (Only Unpaid Invoices)
  const pendingStats = useMemo(() => {
    // Specifically looking for status 'Unpaid' or 'Pending'
    const pendingList = invoices.filter(inv => 
        inv.status === 'Unpaid' || inv.status === 'Pending'
    );
    const amount = pendingList.reduce((sum, inv) => sum + inv.amount, 0);
    return { count: pendingList.length, amount };
  }, [invoices]);

  // 4. Overdue Logic
  const overdueStats = useMemo(() => {
    const today = new Date();
    // Definition: Status is Overdue OR (Status is Unpaid AND Due Date is Past)
    const overdueList = invoices.filter(inv => {
        if (inv.status === 'Overdue') return true;
        if (inv.status === 'Unpaid') {
            const dueDate = new Date(inv.dueDate);
            // Simple check: if due date < today, consider it potentially overdue
            // The system auto-generates with 'Unpaid', but if date passes it becomes overdue conceptually
            return dueDate < today;
        }
        return false;
    });

    const amount = overdueList.reduce((sum, inv) => sum + inv.amount, 0);
    return { count: overdueList.length, amount };
  }, [invoices]);

  // 5. Revenue Chart Data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize current year months
    months.forEach(m => dataMap.set(m, 0));

    const currentYear = new Date().getFullYear();
    
    invoices.forEach(inv => {
        if (inv.status !== 'Paid') return;
        
        // Filter by Type
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

  // 6. Client Status Distribution
  const statusDistribution = useMemo(() => {
    const stats = { Active: 0, Suspended: 0, Expired: 0, Pending: 0 };
    
    // Helper to normalize status strings
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
        { name: 'Active', value: stats.Active, color: '#22c55e' },
        { name: 'Suspended', value: stats.Suspended, color: '#f97316' },
        { name: 'Expired', value: stats.Expired, color: '#ef4444' },
        { name: 'Pending', value: stats.Pending, color: '#eab308' },
    ].filter(item => item.value > 0);
  }, [clients, domains]);

  // 7. Domain Updates Widgets
  const domainWidgets = useMemo(() => {
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + 15); // 15 days threshold

    // Expiring Soon
    const expiring = domains.filter(d => {
        if (d.status !== 'Active') return false;
        const expiry = new Date(d.expiryDate);
        return expiry >= today && expiry <= warningDate;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    // Overdue Renewals
    const overdueRenewals = domains.filter(d => {
        const expiry = new Date(d.expiryDate);
        return d.status === 'Active' && expiry < today; // Active but past expiry
    });

    // Recently Added (last 30 days purchase)
    const recentThreshold = new Date();
    recentThreshold.setDate(today.getDate() - 30);
    const recent = domains.filter(d => new Date(d.purchaseDate) >= recentThreshold)
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
        .slice(0, 5);

    return { expiring, overdueRenewals, recent };
  }, [domains]);


  // Helper for currency icon
  const getCurrencyIcon = () => {
    const iconProps = { size: 24, className: "text-primary" };
    switch (settings.currency) {
      case 'EUR': return <Euro {...iconProps} />;
      case 'GBP': return <PoundSterling {...iconProps} />;
      case 'INR': return <IndianRupee {...iconProps} />;
      case 'JPY': return <JapaneseYen {...iconProps} />;
      case 'BDT': return <span className="text-2xl font-bold text-primary leading-none" style={{ fontFamily: 'sans-serif' }}>৳</span>;
      default: return <DollarSign {...iconProps} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 font-medium">Real-time business intelligence and analytics.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           Live Updates
        </div>
      </div>

      {/* 1. Summary Cards - Optimized for XL screens (Laptop) and MD (Tablets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Revenue */}
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(revenueStats.total)}
          subValue={`${revenueStats.count} Paid Invoices`}
          icon={getCurrencyIcon()}
          trend="up"
          trendValue={revTimeFilter === 'all' ? 'Lifetime' : revTimeFilter === 'year' ? 'This Year' : 'This Month'}
          colorClass="bg-blue-100"
          action={
            <select 
                className="text-xs border-none bg-transparent text-slate-500 focus:ring-0 cursor-pointer font-bold p-0 pr-1 outline-none"
                value={revTimeFilter}
                onChange={(e) => setRevTimeFilter(e.target.value as TimeFilter)}
            >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
                <option value="all">All-Time</option>
            </select>
          }
        />

        {/* Active Clients */}
        <StatCard 
          label="Active Clients" 
          value={activeStats.total} 
          subValue={`${activeStats.hosting} Hosting • ${activeStats.domains} Domain`}
          icon={<CheckCircle size={24} className="text-emerald-600" />}
          trend="neutral"
          trendValue="Live Count"
          colorClass="bg-emerald-100"
        />

        {/* Pending Payments */}
        <StatCard 
          label="Pending Payments" 
          value={formatCurrency(pendingStats.amount)}
          subValue={`${pendingStats.count} Pending Invoices`}
          icon={<Clock size={24} className="text-amber-600" />}
          trend="down"
          trendValue="Needs Action"
          colorClass="bg-amber-100"
        />

        {/* Overdue */}
        <StatCard 
          label="Overdue (Past Due)" 
          value={formatCurrency(overdueStats.amount)}
          subValue={`${overdueStats.count} Overdue Invoices`}
          icon={<AlertCircle size={24} className="text-rose-600" />}
          trend="up"
          trendValue="Critical"
          colorClass="bg-rose-100"
        />
      </div>

      {/* 2. Charts Section - Optimized layout logic */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Revenue Overview Chart */}
        <div className="xl:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <div>
                <h3 className="text-lg font-bold text-slate-900">Revenue Trends ({new Date().getFullYear()})</h3>
                <p className="text-xs text-slate-500 font-medium">Monthly breakdown of paid invoices</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                {(['all', 'hosting', 'domain'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setChartTypeFilter(type)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            chartTypeFilter === type 
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${settings.currencySymbol}${value}`} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 500}} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Bar 
                    dataKey="amount" 
                    fill={settings.primaryColor} 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                    activeBar={{ fill: settings.secondaryColor }} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Status Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Service Health</h3>
          <p className="text-xs text-slate-500 mb-6 font-medium">Combined status of Hosting & Domains</p>
          
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value, entry: any) => <span className="text-xs font-semibold text-slate-600 ml-1">{value} ({entry.payload.value})</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{clients.length + domains.length}</span>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Services</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Domain Updates Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Expiring Soon */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
             <div className="p-4 border-b border-slate-50 bg-amber-50/40 flex justify-between items-center backdrop-blur-sm">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Clock size={18} className="text-amber-500" />
                    Expiring Soon
                 </h3>
                 <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">{domainWidgets.expiring.length} ITEMS</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.expiring.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No domains expiring within 15 days.</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {domainWidgets.expiring.map(domain => (
                            <div key={domain.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm mb-0.5">{domain.domainName}</div>
                                    <div className="text-xs text-slate-500">{domain.clientName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md mb-1">{domain.expiryDate}</div>
                                    <button 
                                        onClick={() => navigate('/domains')}
                                        className="text-[10px] font-semibold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Renew Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Recently Added */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
             <div className="p-4 border-b border-slate-50 bg-blue-50/40 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Globe size={18} className="text-blue-500" />
                    Recently Added
                 </h3>
                 <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">{domainWidgets.recent.length} NEW</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.recent.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new domains in last 30 days.</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                         {domainWidgets.recent.map(domain => (
                            <div key={domain.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
                                        {domain.domainName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm mb-0.5">{domain.domainName}</div>
                                        <div className="text-xs text-slate-500 font-medium">Reg: {domain.purchaseDate}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">
                                    New
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Overdue Alert */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
             <div className="p-4 border-b border-slate-50 bg-rose-50/40 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <AlertCircle size={18} className="text-rose-500" />
                    Overdue Renewals
                 </h3>
                 <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">{domainWidgets.overdueRenewals.length} ALERT</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.overdueRenewals.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                        <CheckCircle size={40} className="text-emerald-400 mb-3 opacity-50" />
                        <span className="font-medium">All domains are up to date!</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {domainWidgets.overdueRenewals.map(domain => (
                            <div key={domain.id} className="p-4 bg-rose-50/20 hover:bg-rose-50/50 transition-colors flex justify-between items-center group">
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm mb-0.5">{domain.domainName}</div>
                                    <div className="text-xs text-rose-500 font-bold flex items-center gap-1">
                                        Expired: {domain.expiryDate}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/domains')}
                                    className="text-xs bg-white border border-rose-200 shadow-sm px-3 py-1.5 rounded-lg hover:text-white hover:bg-rose-500 transition-all font-medium"
                                >
                                    Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

      </div>
    </div>
  );
};

export default Dashboard;