
import { UPSData } from '../types';
import { INITIAL_DATA, OID_MAP } from '../constants';

// Define the Window interface extension
declare global {
  interface Window {
    electronAPI?: {
      getUpsStatus: (ip: string, community: string, oids: string[]) => Promise<any>;
      shutdownTarget: (device: any) => Promise<any>;
      getConfig: (key: string) => Promise<any>;
      saveConfig: (key: string, data: any) => Promise<any>;
    };
  }
}

type SNMPCallback = (data: Partial<UPSData>) => void;

export class SnmpManager {
  private targetIp: string;
  private community: string;
  private intervalId: any = null;
  private pollingInterval: number;
  private listeners: SNMPCallback[] = [];
  
  private simState: Partial<UPSData> = { ...INITIAL_DATA };

  constructor(ip: string, community: string = 'public', pollingInterval: number = 5000) {
    this.targetIp = ip;
    this.community = community;
    this.pollingInterval = pollingInterval;
  }

  // --- Connection Test ---
  public static async testConnection(ip: string, community: string): Promise<{ success: boolean; model?: string; serial?: string; error?: string }> {
      // 1. Electron Mode
      if (window.electronAPI) {
          const oids = [OID_MAP.identModel, OID_MAP.identSerialNumber];
          const raw = await window.electronAPI.getUpsStatus(ip, community, oids);
          
          if (raw.error) return { success: false, error: raw.error };
          
          // Check if we got valid data back for the requested OIDs
          const model = raw[OID_MAP.identModel];
          if (!model) return { success: false, error: "Device unreachable or OID missing" };

          return {
              success: true,
              model: model.toString(),
              serial: raw[OID_MAP.identSerialNumber] ? raw[OID_MAP.identSerialNumber].toString() : 'Unknown'
          };
      }

      // 2. Browser/Sim Mode (Fallback)
      return new Promise((resolve) => {
          setTimeout(() => {
              if (ip === '10.0.0.99') {
                  resolve({ success: false, error: "Host Unreachable (Sim)" });
              } else {
                  resolve({ success: true, model: 'APC Smart-UPS 3000 (Sim)', serial: 'SIM-001' });
              }
          }, 1000);
      });
  }

  public connect(): void {
    if (window.electronAPI) {
        console.log(`[SNMP] Electron IPC Link Active: ${this.targetIp}`);
    } else {
        console.warn(`[SNMP] Browser Mode. Using internal simulation.`);
    }
    this.startPolling();
  }

  public subscribe(callback: SNMPCallback): void {
    this.listeners.push(callback);
  }

  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public startPolling(): void {
    if (this.intervalId) return;
    this.poll();
    this.intervalId = setInterval(() => this.poll(), this.pollingInterval);
  }

  private async poll(): Promise<void> {
    
    // --- MODE 1: ELECTRON IPC (Production) ---
    if (window.electronAPI) {
        const oids = Object.values(OID_MAP) as string[];
        const raw = await window.electronAPI.getUpsStatus(this.targetIp, this.community, oids);
        
        if (raw.error) {
            console.error("[SNMP] Polling Error:", raw.error);
            // Could dispatch an offline status here
            return;
        }

        const data = this.parseRawData(raw);
        this.notifyListeners(data);
        return;
    }

    // --- MODE 2: BROWSER SIMULATION ---
    this.runSimulation();
  }

  private parseRawData(raw: any): Partial<UPSData> {
      const data: Partial<UPSData> = {};

      // Helper to grab value by Key Name -> OID -> Value
      const getVal = (key: keyof typeof OID_MAP) => {
          const oid = OID_MAP[key];
          return raw[oid];
      };

      const parseNum = (val: any) => (val ? parseInt(val.toString()) : 0);
      const getString = (val: any) => (val ? val.toString() : 'Unknown');

      // Status Logic
      const rawStatus = parseNum(getVal('upsBasicOutputStatus'));
      const battStatus = parseNum(getVal('batteryStatus'));
      
      if (rawStatus === 3) data.status = battStatus === 3 ? 'LOW_BATTERY' : 'ON_BATTERY';
      else if (rawStatus === 2) data.status = 'ONLINE';
      else if (rawStatus === 4) data.status = 'CALIBRATING';
      else if (rawStatus === 10) data.status = 'OVERLOAD';
      else data.status = 'ONLINE';

      data.inputVoltage = parseNum(getVal('inputVoltage'));
      data.outputVoltage = parseNum(getVal('outputVoltage'));
      data.batteryCapacity = parseNum(getVal('batteryCapacity'));
      data.loadPercentage = parseNum(getVal('outputLoad'));
      data.batteryTemp = parseNum(getVal('batteryTemperature'));
      
      let freq = parseNum(getVal('inputFrequency'));
      data.inputFrequency = freq > 100 ? freq / 10 : freq;

      data.modelName = getString(getVal('identModel'));
      data.firmwareVersion = getString(getVal('firmwareVersion'));
      data.batteryReplaceDate = getString(getVal('batteryReplaceDate'));

      const rt = parseNum(getVal('runtimeRemaining'));
      data.runtimeRemaining = rt > 0 ? Math.floor(rt / 100) : 0;

      data.outputAmps = parseNum(getVal('outputAmps'));
      const bv = parseNum(getVal('batteryVoltage'));
      data.batteryVoltage = bv > 0 ? bv / 10 : 0;

      data.batteryNeedsReplacement = parseNum(getVal('batteryReplaceIndicator')) === 2;
      
      const ext = parseNum(getVal('externalBatteryCount'));
      data.batteryPackCount = 1 + (isNaN(ext) ? 0 : ext);

      // Heuristics for Nominal Voltage
      const v = data.batteryVoltage || 24;
      if (v > 160) data.batteryNominalVoltage = 192;
      else if (v > 80) data.batteryNominalVoltage = 96;
      else if (v > 40) data.batteryNominalVoltage = 48;
      else data.batteryNominalVoltage = 24;

      const estVA = (data.loadPercentage || 0) * 15; // Rough estimate
      data.apparentPowerVA = estVA;
      data.realPowerW = estVA * 0.9;

      return data;
  }

  private runSimulation() {
    const now = Date.now();
    const baseVoltage = 120;
    const voltNoise = (Math.sin(now / 2000) * 1.5) + (Math.random() * 0.5);
    const loadNoise = (Math.sin(now / 5000) * 5) + (Math.random() * 2);
    
    this.simState = {
        ...this.simState,
        status: 'ONLINE',
        inputVoltage: Number((baseVoltage + voltNoise).toFixed(1)),
        outputVoltage: Number((baseVoltage + voltNoise * 0.9).toFixed(1)),
        inputFrequency: Number((60 + (Math.random() * 0.1 - 0.05)).toFixed(1)),
        loadPercentage: Number((45 + loadNoise).toFixed(1)),
        batteryCapacity: 100,
        batteryTemp: Number((28 + (Math.random() * 0.5)).toFixed(1)),
        runtimeRemaining: 3400 + Math.floor(Math.random() * 100),
        outputAmps: Number((8.5 + (loadNoise / 10)).toFixed(2)),
        realPowerW: Number((950 + (loadNoise * 20)).toFixed(0)),
        apparentPowerVA: Number((1020 + (loadNoise * 22)).toFixed(0)),
        modelName: 'APC Smart-UPS 3000 (Simulated)',
        firmwareVersion: 'v4.1.0-sim',
        batteryReplaceDate: '2026-10-15'
    };
    this.notifyListeners(this.simState);
  }

  private notifyListeners(data: Partial<UPSData>): void {
    this.listeners.forEach(cb => cb(data));
  }
}
