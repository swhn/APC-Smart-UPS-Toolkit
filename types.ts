
export interface UPSData {
  inputVoltage: number;
  outputVoltage: number;
  inputFrequency: number; // Hz
  batteryCapacity: number; // Percentage
  loadPercentage: number;
  // Fix: Added 'LOW_BATTERY' to status type to resolve type errors in comparisons
  status: 'ONLINE' | 'ON_BATTERY' | 'CALIBRATING' | 'OVERLOAD' | 'LOW_BATTERY';
  runtimeRemaining: number; // Seconds
  batteryTemp: number; // Celsius
  outputAmps: number;
  realPowerW: number;
  apparentPowerVA: number;
  energyUsageKWh: number;
  modelName: string; // Fetched from SNMP identModel
  firmwareVersion: string;
  batteryReplaceDate: string;
  batteryVoltage: number; // Volts
  batteryNeedsReplacement: boolean;
  batteryPackCount: number; // 1 (Internal) + N (External)
  batteryNominalVoltage: number; // e.g. 24, 48, 192 (Used to calc cells)
}

export type ShutdownMethod = 
  | 'SSH'           // Generic Linux/Unix
  | 'HTTP_POST'     // Generic Webhook
  | 'SNMP_SET'      // Network Gear
  | 'VMWARE_REST'   // ESXi / vCenter
  | 'SYNOLOGY_API'  // Synology NAS
  | 'QNAP_API'      // QNAP NAS
  | 'NUT_CLIENT'    // Network UPS Tools
  | 'AGENT_WIN'     // Custom Windows Agent
  | 'AGENT_LINUX'   // Custom Linux Agent
  | 'HARD_CUT';     // PDU/Outlet Cut

export interface DeviceAuth {
    username?: string;
    password?: string;
    community?: string; // SNMP
    secretKey?: string; // Agents / Webhooks
}

export interface Device {
  id: string;
  name: string;
  type: 'SERVER' | 'NETWORK' | 'STORAGE' | 'OTHER';
  ipAddress?: string; // New field for connection
  shutdownMethod: ShutdownMethod; // Protocol used to shut down
  auth?: DeviceAuth; // Target device credentials
  status?: 'ONLINE' | 'OFFLINE' | 'SHUTTING_DOWN'; // Track status
  connectionStatus?: 'VERIFIED' | 'FAILED' | 'UNKNOWN'; // Network status
  assignedOutlet?: number;
  powerDraw?: number; // Estimated Watts
}

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
    source: 'SYSTEM' | 'USER' | 'PHOENIX';
}

// Rack Layout Definitions
export type LayoutType = 
    | 'TOWER_6' 
    | 'TOWER_8' 
    | 'TOWER_10'
    | 'RACK_1U_4'
    | 'RACK_1U_6'
    | 'RACK_2U_4'
    | 'RACK_2U_6'
    | 'RACK_2U_8'
    | 'RACK_2U_8_GROUPED'
    | 'RACK_3U_10'
    | 'SRT_3000'
    | 'SRT_5000'
    | 'SRT_8000'
    | 'SRT_10000'
    | 'CUSTOM';

export interface LayoutDef {
    name: string;
    type: 'RACK' | 'TOWER';
    outlets: number;
    groups: number[]; // How many outlets per visual bank
    gridCols: number; // Columns per bank
    controlType?: 'INDIVIDUAL' | 'GROUP';
}

export interface ShutdownRule {
    deviceId: string;
    type: 'TIMER' | 'BATTERY'; // Timer = seconds after outage, Battery = capacity % threshold
    threshold: number; 
}

// Configuration Schema for "Virtual Rack" and "Phoenix Protocol"
export interface SystemConfiguration {
  virtualRack: {
    // Defines physical appearance - expanded list
    layoutType: LayoutType;
    customLayout?: LayoutDef; // Stores the user-defined layout if type is CUSTOM
    outlets: {
      [outletId: number]: Device[]; // Updated to Device[] to support PDUs/VMs
    };
    unassignedDevices: Device[];
  };
  phoenixProtocol: {
    timeline: {
      deviceId: string;
      delaySeconds: number; // Seconds after power restore
      action: 'POWER_ON' | 'WOL' | 'PING_CHECK';
    }[];
    shutdownSequence: ShutdownRule[]; // Updated to new rule structure
    shutdownThreshold: number; // Global fail-safe threshold (usually hard cut)
  };
  breakerLimitAmps: number;
  batteryConfigOverride?: {
      enabled: boolean;
      nominalVoltage: number;
      manualExternalPacks: number;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  password?: string; // Added password field (optional for existing types, but used in logic)
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  lastLogin: string;
}

export interface SecuritySettings {
    enableIdleTimeout: boolean;
    idleTimeoutMinutes: number;
    enableBruteForceProtection: boolean;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number; // New field for cooldown
    enforceStrongPasswords: boolean;
    requireTwoFactor: boolean; // Placeholder for future UI
}

export interface UPSConfig {
    id: string;
    name: string; // User friendly name e.g. "Server Room Main"
    targetIp: string;
    community: string;
    port: number;
    timeout: number;
    pollingInterval: number;
}

export interface AppSettings {
  // Registry of all monitored UPS units
  upsRegistry: UPSConfig[];
  
  users: UserProfile[];
  system: {
    refreshRate: number;
    enableAudibleAlarms: boolean;
    themeMode: 'CYBER' | 'MINIMAL' | 'CLEAN';
  };
  host: {
    serverPort: number;
    bindAddress: string; // e.g. 0.0.0.0 for LAN access
    dataRetentionDays: number;
    apiKey?: string; // For securing the API if exposed
  };
  security: SecuritySettings;
}

// Helper maps for the App
export type DeviceStatusMap = Record<string, 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'UNKNOWN'>;

// Updated to support mixed display types (Timer vs Percentage status)
export interface ActiveTriggerInfo {
    rule: ShutdownRule;
    currentValue: number; // Seconds elapsed or Current Battery %
    isMet: boolean;
}
export type SequenceCountdownMap = Record<string, ActiveTriggerInfo>;

export enum TabId {
  COMMAND_DECK = 'COMMAND_DECK',
  VIRTUAL_RACK = 'VIRTUAL_RACK',
  SHUTDOWN_SEQUENCER = 'SHUTDOWN_SEQUENCER',
  DIAGNOSTICS = 'DIAGNOSTICS',
  ENERGY_MONITOR = 'ENERGY_MONITOR',
  SIMULATION = 'SIMULATION', 
  EVENTS_LOGS = 'EVENTS_LOGS',
  SETTINGS = 'SETTINGS',
  HELP = 'HELP', // New Tab
}

export type SystemNode = 'GRID' | 'UPS' | 'LOAD' | 'BATTERY';

export enum AIModelType {
  CHAT = 'gemini-3-flash-preview',
  IMAGE = 'gemini-3-pro-image-preview'
}
