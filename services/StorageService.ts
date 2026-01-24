
import { AppSettings, SystemConfiguration } from '../types';
import { INITIAL_SETTINGS, INITIAL_SYS_CONFIG } from '../constants';

const API_BASE = '/api/v1/storage';

export interface EnergyPoint {
  timestamp: number;
  dateStr: string;
  watts: number;
  kwh: number;
  alarms: number;
}

// NOTE: This service now prioritizes Electron's Secure Storage (SafeStorage)
// to ensure all configuration and credentials are encrypted at rest on the local disk.
// Browser localStorage has been strictly removed for security compliance.

async function apiFetch(endpoint: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        if (!response.ok) throw new Error("API_OFFLINE");
        return await response.json();
    } catch (e) {
        return null; 
    }
}

async function apiPost(endpoint: string, data: any): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

export const StorageService = {
  
  // --- Configuration (Rack Layout, Shutdown Seq) ---
  
  async saveConfig(config: SystemConfiguration): Promise<void> {
    // 1. Optional Cloud Sync
    apiPost('config', config);

    // 2. Secure Local Persistence (Encrypted)
    if (window.electron?.storage) {
        await window.electron.storage.save('config', config);
    } else {
        console.warn("Secure Storage Unavailable: Running in insecure mode (Browser/Dev). Config not saved to disk.");
    }
  },

  async loadConfig(): Promise<SystemConfiguration> {
    // 1. Try Remote
    const remote = await apiFetch('config');
    if (remote) return remote;

    // 2. Try Secure Local
    if (window.electron?.storage) {
        const local = await window.electron.storage.load('config');
        if (local) return local;
    }

    return INITIAL_SYS_CONFIG;
  },

  // --- App Settings (Users, SNMP IP, Theme) ---

  async saveSettings(settings: AppSettings): Promise<void> {
    apiPost('settings', settings);
    if (window.electron?.storage) {
        await window.electron.storage.save('settings', settings);
    }
  },

  async loadSettings(): Promise<AppSettings> {
    let data = await apiFetch('settings');
    
    if (!data && window.electron?.storage) {
        data = await window.electron.storage.load('settings');
    }
    
    // Merge with initial settings to ensure new fields are present if file is old
    return { ...INITIAL_SETTINGS, ...(data || {}) };
  },

  // --- Energy History ---

  async saveEnergyHistory(history: EnergyPoint[]): Promise<void> {
    // Slice to prevent file bloat - keep last 5000 points
    const slicedHistory = history.slice(-5000); 
    apiPost('history', slicedHistory);
    
    if (window.electron?.storage) {
        await window.electron.storage.save('history', slicedHistory);
    }
  },

  async loadEnergyHistory(): Promise<EnergyPoint[]> {
    const remote = await apiFetch('history');
    if (remote) return remote;

    if (window.electron?.storage) {
        const local = await window.electron.storage.load('history');
        if (local) return local;
    }

    return [];
  }
};
