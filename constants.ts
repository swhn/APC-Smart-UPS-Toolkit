
import { Device, SystemConfiguration, AppSettings, LayoutType, LayoutDef } from './types';

export const APP_NAME = "APC SMART UPS TOOLKIT";

export const COLORS = {
  bg: '#121212',
  cyan: '#00F0FF',
  orange: '#FF9900',
  red: '#FF003C',
  green: '#39FF14',
  gray: '#333333'
};

export const NETWORK_TIMEOUTS = {
    PING: 2000,
    SNMP: 3000,
    SSH_HANDSHAKE: 5000
};

// Hardware Layout Definitions
export const RACK_LAYOUTS: Record<LayoutType, LayoutDef> = {
    // --- TOWER MODELS ---
    'TOWER_6': { 
        name: 'Smart-UPS 750 (SMT750) Tower', 
        type: 'TOWER', outlets: 6, groups: [6], gridCols: 2, controlType: 'GROUP'
    },
    'TOWER_8': { 
        name: 'Smart-UPS 1000/1500 (SMT1000/1500) Tower', 
        type: 'TOWER', outlets: 8, groups: [4, 4], gridCols: 2, controlType: 'GROUP'
    },
    'TOWER_10': { 
        name: 'Smart-UPS 2200/3000 (SMT2200/3000) Tower', 
        type: 'TOWER', outlets: 10, groups: [5, 5], gridCols: 2, controlType: 'GROUP'
    },

    // --- 1U RACK MODELS ---
    'RACK_1U_4': { 
        name: 'Smart-UPS SC 450 (SC450RM1U)', 
        type: 'RACK', outlets: 4, groups: [4], gridCols: 4, controlType: 'INDIVIDUAL'
    },
    'RACK_1U_6': { 
        name: 'Smart-UPS 750/1000 (SMT750RM1U)', 
        type: 'RACK', outlets: 6, groups: [6], gridCols: 6, controlType: 'INDIVIDUAL'
    },

    // --- 2U RACK MODELS ---
    'RACK_2U_4': {
        name: 'Smart-UPS 450 (Legacy RM)',
        type: 'RACK', outlets: 4, groups: [4], gridCols: 2, controlType: 'GROUP'
    },
    'RACK_2U_6': { 
        name: 'Smart-UPS 750/1000/1500 (SMT1500RM2U)', 
        type: 'RACK', outlets: 6, groups: [6], gridCols: 3, controlType: 'INDIVIDUAL'
    },
    'RACK_2U_8': { 
        name: 'Smart-UPS 2200/3000 (SMT3000RM2U)', 
        type: 'RACK', outlets: 8, groups: [4, 4], gridCols: 4, controlType: 'INDIVIDUAL'
    },
    'RACK_2U_8_GROUPED': { 
        name: 'Smart-UPS X 2000/3000 (Switched Groups)', 
        type: 'RACK', outlets: 8, groups: [4, 2, 2], gridCols: 2, controlType: 'GROUP'
    },

    // --- 3U/4U/LARGE MODELS ---
    'RACK_3U_10': {
        name: 'Smart-UPS 5000/RT (High Density)',
        type: 'RACK', outlets: 10, groups: [4, 4, 2], gridCols: 2, controlType: 'INDIVIDUAL'
    },

    // --- SRT (ON-LINE) MODELS ---
    'SRT_3000': {
        name: 'Smart-UPS SRT 3000 (SRT3000)',
        type: 'RACK', outlets: 9, groups: [4, 4, 1], gridCols: 2, controlType: 'GROUP'
    },
    'SRT_5000': {
        name: 'Smart-UPS SRT 5000 (SRT5K)',
        type: 'RACK', outlets: 10, groups: [6, 4], gridCols: 2, controlType: 'GROUP'
    },
    'SRT_8000': {
        name: 'Smart-UPS SRT 8000 (SRT8K)',
        type: 'RACK', outlets: 8, groups: [4, 4], gridCols: 2, controlType: 'GROUP'
    },
    'SRT_10000': {
        name: 'Smart-UPS SRT 10000 (SRT10K)',
        type: 'RACK', outlets: 8, groups: [3, 3, 2], gridCols: 3, controlType: 'GROUP'
    },

    // --- CUSTOM ---
    'CUSTOM': {
        name: 'Custom Configuration',
        type: 'RACK', outlets: 8, groups: [8], gridCols: 4, controlType: 'INDIVIDUAL'
    }
};

// APC MIB OIDs
export const OID_MAP = {
  identModel: '1.3.6.1.4.1.318.1.1.1.1.1.1.0',
  identSerialNumber: '1.3.6.1.4.1.318.1.1.1.1.2.3.0', // NEW: Serial Number
  upsBasicOutputStatus: '1.3.6.1.4.1.318.1.1.1.4.1.1.0', 
  batteryStatus: '1.3.6.1.4.1.318.1.1.1.2.1.1.0', 
  secondsOnBattery: '1.3.6.1.4.1.318.1.1.1.2.1.2.0',
  batteryCapacity: '1.3.6.1.4.1.318.1.1.1.2.2.1.0', 
  batteryTemperature: '1.3.6.1.4.1.318.1.1.1.2.2.2.0', 
  runtimeRemaining: '1.3.6.1.4.1.318.1.1.1.2.2.3.0', 
  inputVoltage: '1.3.6.1.4.1.318.1.1.1.3.2.1.0',
  inputFrequency: '1.3.6.1.4.1.318.1.1.1.3.2.4.0', 
  outputVoltage: '1.3.6.1.4.1.318.1.1.1.4.2.1.0',
  outputLoad: '1.3.6.1.4.1.318.1.1.1.4.2.3.0', 
  outputAmps: '1.3.6.1.4.1.318.1.1.1.4.2.4.0',
  firmwareVersion: '1.3.6.1.4.1.318.1.1.1.1.2.1.0', 
  batteryReplaceDate: '1.3.6.1.4.1.318.1.1.1.2.1.3.0', 
  batteryVoltage: '1.3.6.1.4.1.318.1.1.1.2.2.8.0', 
  batteryReplaceIndicator: '1.3.6.1.4.1.318.1.1.1.2.2.4.0', 
  externalBatteryCount: '1.3.6.1.4.1.318.1.1.1.2.2.5.0'
};

// Mock data for initial render
export const INITIAL_DATA: any = {
  inputVoltage: 120,
  inputFrequency: 60,
  outputVoltage: 120,
  batteryCapacity: 100,
  loadPercentage: 45,
  status: 'ONLINE',
  runtimeRemaining: 3400,
  batteryTemp: 28,
  outputAmps: 8.5,
  realPowerW: 950,
  apparentPowerVA: 1020,
  energyUsageKWh: 14502.5,
  modelName: 'Loading...',
  serialNumber: '---', // Initial state
  firmwareVersion: 'Loading...',
  batteryReplaceDate: 'Loading...',
  batteryVoltage: 27.4,
  batteryNeedsReplacement: false,
  batteryPackCount: 1,
  batteryNominalVoltage: 24
};

// Start with NO devices for production readiness
export const INITIAL_DEVICES: Device[] = [];

export const INITIAL_SYS_CONFIG: SystemConfiguration = {
  virtualRack: { 
      layoutType: 'RACK_2U_8', 
      outlets: {}, 
      unassignedDevices: INITIAL_DEVICES 
  },
  phoenixProtocol: { 
      timeline: [], 
      shutdownSequence: [], 
      shutdownThreshold: 10 // Global Hard Cut / Failsafe
  },
  breakerLimitAmps: 15,
  batteryConfigOverride: {
      enabled: false,
      nominalVoltage: 24, 
      manualExternalPacks: 0
  }
};

export const INITIAL_SETTINGS: AppSettings = {
  upsRegistry: [
      {
          id: 'ups_primary',
          name: 'Primary Rack UPS',
          targetIp: '192.168.1.50',
          community: 'public',
          port: 161,
          timeout: 3000,
          pollingInterval: 5000
      }
  ],
  users: [
    { id: 'u1', username: 'admin', password: 'password123', role: 'ADMIN', lastLogin: '2023-10-27 09:00:00' },
    { id: 'u2', username: 'operator_1', password: 'op', role: 'OPERATOR', lastLogin: '2023-10-26 14:30:00' }
  ],
  system: {
    refreshRate: 2000,
    enableAudibleAlarms: true,
    themeMode: 'CYBER'
  },
  host: {
    serverPort: 3000,
    bindAddress: '0.0.0.0',
    dataRetentionDays: 90
  },
  security: {
      enableIdleTimeout: true,
      idleTimeoutMinutes: 15,
      enableBruteForceProtection: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 5,
      enforceStrongPasswords: false,
      requireTwoFactor: false
  }
};
