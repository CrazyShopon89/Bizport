import React, { useState, useEffect } from 'react';
import { DB } from '../services/db';
import { BackupMeta } from '../types';
import { BackupService } from '../services/backupService';
import { Database, Download, RefreshCw, Trash2, Clock, CheckCircle, AlertTriangle, Shield, HardDrive, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmationModal from '../components/ConfirmationModal';

const Backups: React.FC = () => {
  const [history, setHistory] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{status: string, percent: number} | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<{status: string, percent: number} | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'disabled'>('disabled');
  
  const { settings, updateCompanySettings } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    loadHistory();
    if (settings.backupSchedule) {
        setSchedule(settings.backupSchedule);
    }
  }, [settings]);

  const loadHistory = () => {
    setHistory(DB.getBackupHistory());
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    // Simulate Steps
    setBackupProgress({ status: 'Connecting to database...', percent: 10 });
    
    setTimeout(() => setBackupProgress({ status: 'Dumping MySQL Tables...', percent: 40 }), 800);
    setTimeout(() => setBackupProgress({ status: 'Archiving Uploads...', percent: 70 }), 1500);
    setTimeout(() => setBackupProgress({ status: 'Encrypting & Storing...', percent: 90 }), 2000);

    try {
        const result = await BackupService.createBackup('Manual');
        setTimeout(() => {
            setBackupProgress(null);
            setLoading(false);
            loadHistory();
            addNotification('Backup Created', `System backup ${result.filename} created successfully.`, 'system');
        }, 2500);
    } catch (e) {
        setLoading(false);
        setBackupProgress(null);
        addNotification('Backup Failed', 'An error occurred during the backup process.', 'system');
    }
  };

  const handleRestore = async () => {
      if (!confirmRestore.id) return;
      
      setConfirmRestore({ isOpen: false, id: null });
      setLoading(true);
      
      setRestoreProgress({ status: 'Verifying Integrity...', percent: 20 });
      setTimeout(() => setRestoreProgress({ status: 'Extracting Archive...', percent: 50 }), 1000);
      setTimeout(() => setRestoreProgress({ status: 'Restoring Database...', percent: 80 }), 2000);
      
      try {
          await BackupService.restoreBackup(confirmRestore.id);
          setTimeout(() => {
              setRestoreProgress(null);
              setLoading(false);
              addNotification('System Restored', 'The system has been successfully restored.', 'system');
              window.location.reload(); // Reload to show "new" state
          }, 3000);
      } catch (e: any) {
          setLoading(false);
          setRestoreProgress(null);
          addNotification('Restore Failed', e.message, 'system');
      }
  };

  const handleScheduleChange = (val: string) => {
      const newSchedule = val as 'daily' | 'weekly' | 'monthly' | 'disabled';
      setSchedule(newSchedule);
      updateCompanySettings({ backupSchedule: newSchedule });
      addNotification('Schedule Updated', `Backup schedule set to: ${val}`, 'system');
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to delete this backup? This file will be removed from the server.")) {
          BackupService.deleteBackup(id);
          loadHistory();
      }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-indigo-600" />
            Backup & Recovery
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage secure server-side backups and system restoration.</p>
        </div>
        <button 
            onClick={handleCreateBackup}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <HardDrive size={18} />}
            Create Full Backup
        </button>
      </div>

      {/* Progress Overlays */}
      {(backupProgress || restoreProgress) && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
                  <div className="mb-4 flex justify-center">
                      <div className="relative w-16 h-16">
                          <svg className="w-full h-full transform -rotate-90">
                              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-600 transition-all duration-500 ease-out" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * ((backupProgress?.percent || restoreProgress?.percent || 0) / 100))} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {backupProgress?.percent || restoreProgress?.percent}%
                          </div>
                      </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                      {backupProgress ? 'Creating Backup...' : 'Restoring System...'}
                  </h3>
                  <p className="text-sm text-slate-500 animate-pulse">
                      {backupProgress?.status || restoreProgress?.status}
                  </p>
                  <p className="text-xs text-red-400 mt-4 font-medium">Do not close this window.</p>
              </div>
          </div>
      )}

      {/* Stats & Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <Clock size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Backup</p>
                  <p className="text-lg font-semibold text-slate-900">
                      {history.length > 0 ? new Date(history[0].created).toLocaleDateString() : 'Never'}
                  </p>
              </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-full">
                  <Shield size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Safety Status</p>
                  <p className="text-lg font-semibold text-slate-900">
                      {history.length > 0 ? 'Protected' : 'At Risk'}
                  </p>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Auto-Schedule</p>
                      <select 
                        value={schedule}
                        onChange={(e) => handleScheduleChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-2.5 py-1.5 focus:ring-primary focus:border-primary outline-none"
                      >
                          <option value="disabled">Disabled</option>
                          <option value="daily">Daily (Midnight)</option>
                          <option value="weekly">Weekly (Sundays)</option>
                          <option value="monthly">Monthly (1st)</option>
                      </select>
                  </div>
                  <div className="p-2 text-slate-400">
                      <Calendar size={20} />
                  </div>
              </div>
          </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <HardDrive size={18} className="text-slate-500" />
                Backup History
            </h3>
            <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                Server Storage: {history.length} / 20 Slots
            </span>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="p-4 font-semibold text-slate-500">Date & Time</th>
                        <th className="p-4 font-semibold text-slate-500">Filename</th>
                        <th className="p-4 font-semibold text-slate-500">Type</th>
                        <th className="p-4 font-semibold text-slate-500">Size</th>
                        <th className="p-4 font-semibold text-slate-500">Status</th>
                        <th className="p-4 font-semibold text-slate-500 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {history.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                No backups found on server. Create one to get started.
                            </td>
                        </tr>
                    ) : (
                        history.map(backup => (
                            <tr key={backup.id} className="hover:bg-slate-50 group">
                                <td className="p-4 text-slate-700 font-medium">
                                    {new Date(backup.created).toLocaleString()}
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs">
                                    {backup.filename}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                                        backup.type === 'Manual' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                                    }`}>
                                        {backup.type}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600">
                                    {backup.sizeMB}
                                </td>
                                <td className="p-4">
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                        <CheckCircle size={14} /> Completed
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => BackupService.downloadBackup(backup.id)}
                                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setConfirmRestore({ isOpen: true, id: backup.id })}
                                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                            title="Restore"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(backup.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
      </div>

      <ConfirmationModal
        isOpen={confirmRestore.isOpen}
        title="⚠️ Critical System Restore"
        message="You are about to overwrite the current system data with an older version. This action is destructive and cannot be undone. All changes made since this backup will be lost. Are you sure?"
        confirmLabel="YES, OVERWRITE DATA"
        isDangerous={true}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Backups;