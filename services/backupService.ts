import { DB } from './db';
import { BackupMeta } from '../types';

/**
 * Service to manage Server-Side Backups (Simulation Mode).
 * 
 * Since this application is client-side only in this environment,
 * we simulate the "Server Storage" behavior.
 * 
 * In a real deployment:
 * - This would call API endpoints (e.g. POST /api/backup/create)
 * - The server would use `mysqldump` and `zip`
 * - Files would be stored in /home/user/backups/
 */
export const BackupService = {
  
  /**
   * Triggers a new backup process.
   * Simulates server latency and file generation.
   */
  createBackup: async (type: BackupMeta['type'] = 'Manual'): Promise<BackupMeta> => {
    // 1. Simulate Network Delay (Server Processing)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 2. Generate Real Backup Data (to calculate size)
    const backupJson = DB.createBackup();
    const sizeBytes = new Blob([backupJson]).size;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
    
    // 3. Create Metadata Record
    const timestamp = new Date();
    const filename = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}.zip`;
    const id = `bk_${Date.now()}`;
    
    const newBackup: BackupMeta = {
      id,
      filename,
      sizeMB,
      created: timestamp.toISOString(),
      type,
      status: 'Completed',
      location: `/home/hostmaster/backups/${filename}`,
      checksum: `sha256-${Math.random().toString(36).substring(7)}` // Mock hash
    };

    // 4. Save to History Log (Persisted in LS)
    DB.saveBackupHistory(newBackup);

    return newBackup;
  },

  /**
   * Simulates restoring from a server backup.
   */
  restoreBackup: async (id: string): Promise<boolean> => {
    // 1. Simulate Processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Validate Existence
    const history = DB.getBackupHistory();
    const target = history.find(b => b.id === id);
    
    if (!target) throw new Error("Backup file not found on server.");
    if (target.status === 'Failed') throw new Error("Cannot restore from a failed backup.");

    // 3. Since we don't actually store the old JSON in LS (to save space),
    // we cannot technically "revert" the data in this simulation.
    // In a real app, the server would overwrite the DB.
    // Here, we return true to indicate the *process* was successful UI-wise.
    return true;
  },

  /**
   * Downloads the backup file.
   * In simulation, we generate the *current* state as the file content 
   * because we don't store historical blobs.
   */
  downloadBackup: (id: string) => {
    const history = DB.getBackupHistory();
    const target = history.find(b => b.id === id);
    
    if (!target) {
        alert("File not found.");
        return;
    }

    const json = DB.createBackup(); // Generate fresh data
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = target.filename.replace('.zip', '.json'); // Download as JSON for this app
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  deleteBackup: (id: string) => {
      DB.deleteBackupRecord(id);
  }
};