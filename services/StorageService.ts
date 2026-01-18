
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

// Internal helper to determine storage strategy
// In a real build, you might use a compile-time flag or check window location
const isBrowserEnv = typeof window !== 'undefined';

async function apiFetch(endpoint: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (e) {
        return null; // Return null to signal fallback to local storage
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
        console.warn("Storage Sync Failed:", e);
        return false;
    }
}

export const StorageService = {
  
  // --- Configuration (Rack Layout, Shutdown Seq) ---
  
  async saveConfig(config: SystemConfiguration): Promise<void> {
    const success = await apiPost('config', config);
    if (!success) {
        localStorage.setItem('ups_cmd_config', JSON.stringify(config));
    }
  },

  async loadConfig(): Promise<SystemConfiguration> {
    const remote = await apiFetch('config');
    if (remote) return remote;

    const local = localStorage.getItem('ups_cmd_config');
    return local ? JSON.parse(local) : INITIAL_SYS_CONFIG;
  },

  // --- App Settings (Users, SNMP IP, Theme) ---

  async saveSettings(settings: AppSettings): Promise<void> {
    const success = await apiPost('settings', settings);
    if (!success) {
        localStorage.setItem('ups_cmd_settings', JSON.stringify(settings));
    }
  },

  async loadSettings(): Promise<AppSettings> {
    let data = await apiFetch('settings');
    if (!data) {
        const local = localStorage.getItem('ups_cmd_settings');
        data = local ? JSON.parse(local) : null;
    }
    // Merge with initial settings to ensure new fields (like host settings) are present
    return { ...INITIAL_SETTINGS, ...(data || {}) };
  },

  // --- Energy History (The Actual Data) ---

  async saveEnergyHistory(history: EnergyPoint[]): Promise<void> {
    // For performance, we might optimize this to only send new points in a real app
    // For this implementation, we send the dataset (clipped)
    const slicedHistory = history.slice(-2000); 
    
    const success = await apiPost('history', slicedHistory);
    if (!success) {
        localStorage.setItem('ups_cmd_energy_history', JSON.stringify(slicedHistory));
    }
  },

  async loadEnergyHistory(): Promise<EnergyPoint[]> {
    const remote = await apiFetch('history');
    if (remote) return remote;

    const local = localStorage.getItem('ups_cmd_energy_history');
    return local ? JSON.parse(local) : [];
  }
};
