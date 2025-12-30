import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Euro, PoundSterling, IndianRupee, JapaneseYen, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DB } from '../services/db';
import { Status, PaymentStatus, Client } from '../types';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user, formatCurrency, settings } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(DB.getClients());
  }, []);

  // Calculate Stats
  const totalRevenue = clients.reduce((acc, curr) => acc + curr.amount, 0);
  const activeClients = clients.filter(c => c.status === Status.ACTIVE).length;
  const pendingPayments = clients.filter(c => c.paymentStatus === PaymentStatus.UNPAID || c.paymentStatus === PaymentStatus.OVERDUE).length;
  const overdueCount = clients.filter(c => c.paymentStatus === PaymentStatus.OVERDUE).length;

  const statusData = [
    { name: 'Active', value: activeClients, color: '#22c55e' },
    { name: 'Pending', value: clients.filter(c => c.status === Status.PENDING).length, color: '#eab308' },
    { name: 'Expired', value: clients.filter(c => c.status === Status.EXPIRED).length, color: '#ef4444' },
  ];

  // Placeholder revenue data - in real app would aggregate from invoices table
  const revenueData = [
    { name: 'Jan', amount: 1200 },
    { name: 'Feb', amount: 10000 },
    { name: 'Mar', amount: 2500 },
    { name: 'Apr', amount: 1800 },
    { name: 'May', amount: 500 },
    { name: 'Jun', amount: 2100 },
  ];

  const getCurrencyIcon = () => {
    const iconProps = { size: 24, className: "text-primary" };
    switch (settings.currency) {
      case 'EUR': return <Euro {...iconProps} />;
      case 'GBP': return <PoundSterling {...iconProps} />;
      case 'INR': return <IndianRupee {...iconProps} />;
      case 'JPY': return <JapaneseYen {...iconProps} />;
      case 'BDT': return <span className="text-2xl font-bold text-primary leading-none" style={{ fontFamily: 'sans-serif' }}>৳</span>;
      case 'USD':
      case 'AUD':
      case 'CAD':
      default: return <DollarSign {...iconProps} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(totalRevenue)}
          icon={getCurrencyIcon()}
          trend="up"
          trendValue="12%"
          colorClass="bg-blue-100"
        />
        <StatCard 
          label="Active Clients" 
          value={activeClients} 
          icon={<CheckCircle size={24} className="text-green-600" />}
          trend="neutral"
          trendValue="0%"
          colorClass="bg-green-100"
        />
        <StatCard 
          label="Pending Payments" 
          value={pendingPayments} 
          icon={<Clock size={24} className="text-orange-600" />}
          trend="down"
          trendValue="2%"
          colorClass="bg-orange-100"
        />
        <StatCard 
          label="Overdue" 
          value={overdueCount} 
          icon={<AlertCircle size={24} className="text-red-600" />}
          trend="up"
          trendValue="1"
          colorClass="bg-red-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Revenue Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Overview</h3>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Client Status</h3>
          <div className="h-64 sm:h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;