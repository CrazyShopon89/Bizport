import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { DollarSign, Euro, PoundSterling, IndianRupee, JapaneseYen, AlertCircle, CheckCircle, Clock, Globe, ArrowRight, Calendar, TrendingUp } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DB } from '../services/db';
import { Status, PaymentStatus, Client, DomainClient, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type TimeFilter = 'month' | 'year' | 'all';
type RevenueTypeFilter = 'all' | 'hosting' | 'domain';

const Dashboard: React.FC = () => {
  const { user, formatCurrency, settings } = useAuth();
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [domains, setDomains] = useState<DomainClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [revTimeFilter, setRevTimeFilter] = useState<TimeFilter>('year');
  const [chartTypeFilter, setChartTypeFilter] = useState<RevenueTypeFilter>('all');

  useEffect(() => {
    // Initial Load
    refreshDashboardData();

    // Setup listener for storage changes to auto-update (basic implementation)
    const handleStorageChange = () => refreshDashboardData();
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll every 5 seconds to catch local updates if not triggered by event
    const interval = setInterval(refreshDashboardData, 5000);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
    };
  }, []);

  const refreshDashboardData = () => {
    setClients(DB.getClients());
    setDomains(DB.getDomains());
    setInvoices(DB.getInvoices());
  };

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

  // 3. Pending Payments Logic
  const pendingStats = useMemo(() => {
    const pendingList = invoices.filter(inv => 
        inv.status === 'Unpaid' || inv.status === 'Pending'
    );
    const amount = pendingList.reduce((sum, inv) => sum + inv.amount, 0);
    return { count: pendingList.length, amount };
  }, [invoices]);

  // 4. Overdue Logic
  const overdueStats = useMemo(() => {
    const today = new Date();
    // Definition: Status is Overdue OR (Status is Unpaid AND Due Date > 30 days ago)
    const overdueList = invoices.filter(inv => {
        if (inv.status === 'Overdue') return true;
        if (inv.status === 'Unpaid') {
            const dueDate = new Date(inv.dueDate);
            const diffTime = Math.abs(today.getTime() - dueDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            // Check if due date is in the past by 30+ days
            return dueDate < today && diffDays > 30;
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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500">Real-time business intelligence and analytics.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
           Live Updates
        </div>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
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
                className="text-xs border-none bg-transparent text-slate-500 focus:ring-0 cursor-pointer font-medium p-0 pr-1"
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
          icon={<CheckCircle size={24} className="text-green-600" />}
          trend="neutral"
          trendValue="Live Count"
          colorClass="bg-green-100"
        />

        {/* Pending Payments */}
        <StatCard 
          label="Pending Payments" 
          value={formatCurrency(pendingStats.amount)}
          subValue={`${pendingStats.count} Pending Invoices`}
          icon={<Clock size={24} className="text-orange-600" />}
          trend="down"
          trendValue="Needs Action"
          colorClass="bg-orange-100"
        />

        {/* Overdue */}
        <StatCard 
          label="Overdue (>30 Days)" 
          value={formatCurrency(overdueStats.amount)}
          subValue={`${overdueStats.count} Overdue Invoices`}
          icon={<AlertCircle size={24} className="text-red-600" />}
          trend="up"
          trendValue="Critical"
          colorClass="bg-red-100"
        />
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Revenue Overview Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900">Revenue Trends ({new Date().getFullYear()})</h3>
                <p className="text-xs text-slate-500">Monthly breakdown of paid invoices</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'hosting', 'domain'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setChartTypeFilter(type)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            chartTypeFilter === type 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${settings.currencySymbol}${value}`} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                    dataKey="amount" 
                    fill={settings.primaryColor} 
                    radius={[4, 4, 0, 0]} 
                    barSize={32}
                    activeBar={{ fill: settings.secondaryColor }} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Status Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Service Health</h3>
          <p className="text-xs text-slate-500 mb-6">Combined status of Hosting & Domains</p>
          
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value, entry: any) => <span className="text-xs font-medium text-slate-600 ml-1">{value} ({entry.payload.value})</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                    <span className="text-2xl font-bold text-slate-800">{clients.length + domains.length}</span>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Services</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Domain Updates Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Expiring Soon */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-orange-50/50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock size={16} className="text-orange-500" />
                    Expiring Soon
                 </h3>
                 <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{domainWidgets.expiring.length}</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.expiring.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No domains expiring within 15 days.</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {domainWidgets.expiring.map(domain => (
                            <div key={domain.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div>
                                    <div className="font-medium text-slate-800 text-sm">{domain.domainName}</div>
                                    <div className="text-xs text-slate-500">{domain.clientName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-orange-600">{domain.expiryDate}</div>
                                    <button 
                                        onClick={() => navigate('/domains')}
                                        className="text-[10px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Renew
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Recently Added */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Globe size={16} className="text-blue-500" />
                    Recently Added
                 </h3>
                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{domainWidgets.recent.length}</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.recent.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new domains in last 30 days.</div>
                ) : (
                    <div className="divide-y divide-slate-50">
                         {domainWidgets.recent.map(domain => (
                            <div key={domain.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                        {domain.domainName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800 text-sm">{domain.domainName}</div>
                                        <div className="text-xs text-slate-500">Reg: {domain.purchaseDate}</div>
                                    </div>
                                </div>
                                <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                    New
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Overdue Alert */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-red-50/50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    Overdue Renewals
                 </h3>
                 <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{domainWidgets.overdueRenewals.length}</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {domainWidgets.overdueRenewals.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                        <CheckCircle size={32} className="text-green-400 mb-2 opacity-50" />
                        <span>All domains are up to date!</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {domainWidgets.overdueRenewals.map(domain => (
                            <div key={domain.id} className="p-4 bg-red-50/30 hover:bg-red-50 transition-colors flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-slate-800 text-sm">{domain.domainName}</div>
                                    <div className="text-xs text-red-500 font-medium">Expired: {domain.expiryDate}</div>
                                </div>
                                <button 
                                    onClick={() => navigate('/domains')}
                                    className="text-xs bg-white border border-slate-200 shadow-sm px-3 py-1 rounded hover:text-primary transition-colors"
                                >
                                    Fix
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