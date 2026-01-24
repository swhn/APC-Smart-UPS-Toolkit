
import { OID_MAP } from '../constants';
import { UPSData } from '../types';

type SNMPCallback = (data: Partial<UPSData>) => void;

export class SnmpManager {
  private targetIp: string;
  private community: string;
  private pollingInterval: number;
  
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: SNMPCallback[] = [];

  constructor(ip: string, community: string = 'public', pollingInterval: number = 5000) {
    this.targetIp = ip;
    this.community = community;
    this.pollingInterval = pollingInterval;
  }

  public static async testConnection(ip: string, community: string): Promise<{ success: boolean; model?: string; serial?: string; error?: string }> {
      if (!window.electron) return { success: false, error: 'Electron Context Missing' };

      const oids = [OID_MAP.identModel, OID_MAP.identSerialNumber];
      const result = await window.electron.snmp.get(ip, community, oids);

      if (result.success && result.data) {
          return {
              success: true,
              model: result.data[OID_MAP.identModel] || 'Unknown',
              serial: result.data[OID_MAP.identSerialNumber] || 'Unknown'
          };
      }
      return { success: false, error: result.error || 'Connection Failed' };
  }

  public connect(): void {
    console.log(`[SNMP] Starting polling for ${this.targetIp}`);
    this.startPolling();
  }

  public subscribe(callback: SNMPCallback): void {
    this.listeners.push(callback);
  }

  public startPolling(): void {
    if (this.intervalId) return;
    this.poll(); // Immediate first poll
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollingInterval);
  }

  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll(): Promise<void> {
    if (!window.electron) return;

    const oids = Object.values(OID_MAP);
    const result = await window.electron.snmp.get(this.targetIp, this.community, oids);

    if (result.success && result.data) {
        const parsedData = this.mapRawDataToUPSData(result.data);
        this.notifyListeners(parsedData);
    } else {
        console.warn(`[SNMP] Poll failed for ${this.targetIp}:`, result.error);
    }
  }

  private mapRawDataToUPSData(rawData: Record<string, any>): Partial<UPSData> {
    const data: Partial<UPSData> = {};
    
    // Helper to get value by symbolic OID key
    const getVal = (key: keyof typeof OID_MAP) => {
        const oid = OID_MAP[key];
        return rawData[oid];
    };

    const getString = (key: keyof typeof OID_MAP) => {
        const v = getVal(key);
        return v ? String(v) : 'Unknown';
    };

    const getInt = (key: keyof typeof OID_MAP) => {
        const v = getVal(key);
        return v ? parseInt(String(v), 10) : 0;
    };

    // 1. Status Mapping
    const rawStatus = getInt('upsBasicOutputStatus'); 
    const battStatus = getInt('batteryStatus');
    
    if (rawStatus === 3) {
        data.status = battStatus === 3 ? 'LOW_BATTERY' : 'ON_BATTERY';
    } else if (rawStatus === 2) {
        data.status = 'ONLINE';
    } else if (rawStatus === 4) {
        data.status = 'CALIBRATING';
    } else if (rawStatus === 10) {
        data.status = 'OVERLOAD';
    } else {
        data.status = 'ONLINE';
    }

    // 2. Numeric Conversions
    data.inputVoltage = getInt('inputVoltage');
    data.outputVoltage = getInt('outputVoltage');
    data.batteryCapacity = getInt('batteryCapacity');
    data.loadPercentage = getInt('outputLoad');
    data.batteryTemp = getInt('batteryTemperature');
    
    let freq = getInt('inputFrequency');
    if (freq > 100) freq = freq / 10;
    data.inputFrequency = freq;

    data.firmwareVersion = getString('firmwareVersion');
    data.modelName = getString('identModel');
    data.batteryReplaceDate = getString('batteryReplaceDate');

    const rawRuntime = getInt('runtimeRemaining');
    data.runtimeRemaining = rawRuntime ? Math.floor(rawRuntime / 100) : 0;

    data.outputAmps = getInt('outputAmps');
    
    const rawBattVolt = getInt('batteryVoltage');
    data.batteryVoltage = rawBattVolt ? rawBattVolt / 10 : 0;

    const rawReplace = getInt('batteryReplaceIndicator');
    data.batteryNeedsReplacement = rawReplace === 2;

    const extPacks = getInt('externalBatteryCount');
    data.batteryPackCount = 1 + (isNaN(extPacks) ? 0 : extPacks);
    
    const v = data.batteryVoltage || 24;
    if (v > 160) data.batteryNominalVoltage = 192;
    else if (v > 80) data.batteryNominalVoltage = 96;
    else if (v > 40) data.batteryNominalVoltage = 48;
    else if (v > 30) data.batteryNominalVoltage = 36;
    else data.batteryNominalVoltage = 24;

    const estimatedVA = (data.loadPercentage || 0) * 15; 
    data.apparentPowerVA = estimatedVA;
    data.realPowerW = estimatedVA * 0.9; 

    return data;
  }

  private notifyListeners(data: Partial<UPSData>): void {
    this.listeners.forEach(cb => cb(data));
  }
}
