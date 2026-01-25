import React, { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { EmailLog } from '../types';
import { Activity, Search, Trash2, CheckCircle, AlertCircle, RefreshCw, Terminal, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filter, setFilter] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(DB.getEmailLogs());
  };

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all email logs?")) {
        DB.clearEmailLogs();
        loadLogs();
    }
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(filter.toLowerCase()) || 
    log.subject.toLowerCase().includes(filter.toLowerCase())
  );

  if (user?.role !== 'Admin' && user?.role !== 'Super Admin') {
      return <div className="p-8 text-center text-slate-500">Access Denied</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-indigo-600" />
            Email Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track system email delivery and errors.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={loadLogs} 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
            >
                <RefreshCw size={18} />
            </button>
            <button 
                onClick={handleClearLogs}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            >
                <Trash2 size={16} />
                Clear Logs
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
         {/* Toolbar */}
         <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search recipient or subject..." 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="text-xs text-slate-400">
                Showing {filteredLogs.length} records
            </div>
         </div>

         {/* Table */}
         <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 font-semibold text-slate-500">Status</th>
                        <th className="p-3 font-semibold text-slate-500">Time</th>
                        <th className="p-3 font-semibold text-slate-500">Recipient</th>
                        <th className="p-3 font-semibold text-slate-500">Subject</th>
                        <th className="p-3 font-semibold text-slate-500">Provider</th>
                        <th className="p-3 font-semibold text-slate-500">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                No logs found.
                            </td>
                        </tr>
                    ) : (
                        filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 group">
                                <td className="p-3">
                                    {log.status === 'success' ? (
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                            <CheckCircle size={12} /> Success
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full w-fit">
                                            <AlertCircle size={12} /> Failed
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-slate-500 whitespace-nowrap text-xs">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-3 font-medium text-slate-700">
                                    {log.recipient}
                                </td>
                                <td className="p-3 text-slate-600">
                                    {log.subject}
                                </td>
                                <td className="p-3">
                                    <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${(log.provider as string) === 'emailjs' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {(log.provider as string) === 'emailjs' ? <Zap size={10}/> : <Terminal size={10}/>}
                                        {log.provider}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-500 text-xs max-w-xs truncate" title={log.error || 'OK'}>
                                    {log.error ? <span className="text-red-500">{log.error}</span> : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default EmailLogs;