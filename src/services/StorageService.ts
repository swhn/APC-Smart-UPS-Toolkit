
import { AppSettings, SystemConfiguration } from '../types';
import { INITIAL_SETTINGS, INITIAL_SYS_CONFIG } from '../constants';

const KEYS = {
    CONFIG: 'apc_toolkit_config_v1',
    SETTINGS: 'apc_toolkit_settings_v1',
    HISTORY: 'apc_toolkit_history_v1'
};

export interface EnergyPoint {
  timestamp: number;
  dateStr: string;
  watts: number;
  kwh: number;
  alarms: number;
}

export const StorageService = {
  
  // --- CONFIGURATION ---
  
  async saveConfig(config: SystemConfiguration): Promise<void> {
    if (window.electronAPI) {
        await window.electronAPI.saveConfig(KEYS.CONFIG, config);
    } else {
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
    }
  },

  async loadConfig(): Promise<SystemConfiguration> {
    let data;
    if (window.electronAPI) {
        data = await window.electronAPI.getConfig(KEYS.CONFIG);
    } else {
        const local = localStorage.getItem(KEYS.CONFIG);
        data = local ? JSON.parse(local) : null;
    }
    return data || INITIAL_SYS_CONFIG;
  },

  // --- SETTINGS ---

  async saveSettings(settings: AppSettings): Promise<void> {
    if (window.electronAPI) {
        await window.electronAPI.saveConfig(KEYS.SETTINGS, settings);
    } else {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    }
  },

  async loadSettings(): Promise<AppSettings> {
    let data;
    if (window.electronAPI) {
        data = await window.electronAPI.getConfig(KEYS.SETTINGS);
    } else {
        const local = localStorage.getItem(KEYS.SETTINGS);
        data = local ? JSON.parse(local) : null;
    }
    return { ...INITIAL_SETTINGS, ...(data || {}) };
  },

  // --- HISTORY ---

  async saveEnergyHistory(history: EnergyPoint[]): Promise<void> {
    const sliced = history.slice(-5000); // Keep more history in Desktop App
    if (window.electronAPI) {
        await window.electronAPI.saveConfig(KEYS.HISTORY, sliced);
    } else {
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(sliced.slice(-2000)));
    }
  },

  async loadEnergyHistory(): Promise<EnergyPoint[]> {
    if (window.electronAPI) {
        const data = await window.electronAPI.getConfig(KEYS.HISTORY);
        return data || [];
    } else {
        const local = localStorage.getItem(KEYS.HISTORY);
        return local ? JSON.parse(local) : [];
    }
  }
};
