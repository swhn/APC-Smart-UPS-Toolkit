
import * as snmp from 'net-snmp';
import { OID_MAP } from '../constants';
import { UPSData } from '../types';

type SNMPCallback = (data: Partial<UPSData>) => void;

export class SnmpManager {
  private session: any; 
  private targetIp: string;
  private community: string;
  private intervalId: any = null;
  private pollingInterval: number;
  private isCrisisMode: boolean = false;
  private listeners: SNMPCallback[] = [];

  constructor(ip: string, community: string = 'public', pollingInterval: number = 5000) {
    this.targetIp = ip;
    this.community = community;
    this.pollingInterval = pollingInterval;
  }

  public connect(): void {
    try {
      // Browser Safety Check: net-snmp requires dgram (UDP) which browsers lack.
      // This try/catch prevents the app from crashing in browser previews.
      this.session = snmp.createSession(this.targetIp, this.community, {
        version: snmp.Version2c,
        timeout: 3000
      });
      console.log(`[SNMP] Session created for ${this.targetIp}`);
      this.startPolling();
    } catch (error: any) {
      console.error("[SNMP] Connection Initialization Failed:", error);
      
      // Friendly message for browser users
      if (error.message && (error.message.includes('dgram') || error.message.includes('socket'))) {
        console.warn("[SNMP] NOTE: Real SNMP over UDP is not supported in standard browsers. This code requires a Node.js/Electron environment or a WebSocket proxy.");
      }
    }
  }

  public subscribe(callback: SNMPCallback): void {
    this.listeners.push(callback);
  }

  public setCrisisMode(enabled: boolean): void {
    if (this.isCrisisMode === enabled) return;
    this.isCrisisMode = enabled;
    
    // Speed up polling in crisis (1s), slow down in normal (default settings)
    const newInterval = enabled ? 1000 : this.pollingInterval;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.poll(), newInterval);
    }
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
    if (this.session) {
        try {
            this.session.close();
        } catch (e) {
            console.warn("[SNMP] Error closing session:", e);
        }
        this.session = null;
    }
  }

  private poll(): void {
    if (!this.session) return;
    
    const oids = Object.values(OID_MAP);
    
    try {
        this.session.get(oids, (error: any, varbinds: any[]) => {
        if (error) {
            console.error("[SNMP] Fetch Error:", error);
        } else {
            const parsedData = this.mapVarbindsToUPSData(varbinds);
            this.notifyListeners(parsedData);
            
            // Auto-detect crisis state
            const isCritical = 
                parsedData.status === 'ON_BATTERY' || 
                parsedData.status === 'LOW_BATTERY' || 
                parsedData.status === 'OVERLOAD';

            if (isCritical && !this.isCrisisMode) {
                this.setCrisisMode(true);
            } else if (!isCritical && this.isCrisisMode) {
                this.setCrisisMode(false);
            }
        }
        });
    } catch (e) {
        console.error("[SNMP] Polling Error (Session likely invalid):", e);
        this.stopPolling();
    }
  }

  /**
   * Transforms raw SNMP Varbinds into strongly typed UPSData
   */
  private mapVarbindsToUPSData(varbinds: any[]): Partial<UPSData> {
    const data: Partial<UPSData> = {};
    
    // Helper to get raw value by key
    const getRaw = (key: keyof typeof OID_MAP): any => {
        const oid = OID_MAP[key];
        // Robust check handling potential leading dots difference
        const vb = varbinds.find(v => v.oid === oid || v.oid === '.' + oid || oid === '.' + v.oid);
        return vb && !snmp.isVarbindError(vb) ? vb.value : null;
    };

    const getString = (key: keyof typeof OID_MAP): string => {
        const raw = getRaw(key);
        if (Buffer.isBuffer(raw)) {
            return raw.toString();
        }
        return raw ? String(raw) : 'Unknown';
    };

    // --- PARSING LOGIC ---

    // 1. Status Mapping
    const rawStatus = getRaw('upsBasicOutputStatus'); // 2=Online, 3=OnBatt
    const battStatus = getRaw('batteryStatus'); // 2=Normal, 3=Low
    
    if (rawStatus === 3) {
        data.status = battStatus === 3 ? 'LOW_BATTERY' : 'ON_BATTERY';
    } else if (rawStatus === 2) {
        data.status = 'ONLINE';
    } else if (rawStatus === 4) {
        data.status = 'CALIBRATING'; // Actually SmartBoost, but using for visual simplification
    } else if (rawStatus === 10) {
        data.status = 'OVERLOAD'; // Hardware failure / Overload bucket
    } else {
        data.status = 'ONLINE'; // Default safe
    }

    // 2. Numeric Conversions
    const parseNum = (val: any) => (val !== null ? parseInt(val.toString()) : 0);
    
    data.inputVoltage = parseNum(getRaw('inputVoltage'));
    data.outputVoltage = parseNum(getRaw('outputVoltage'));
    data.batteryCapacity = parseNum(getRaw('batteryCapacity'));
    data.loadPercentage = parseNum(getRaw('outputLoad'));
    data.batteryTemp = parseNum(getRaw('batteryTemperature'));
    
    // Frequency: Handle Hz vs dHz (some cards return 600 for 60Hz)
    let freq = parseNum(getRaw('inputFrequency'));
    if (freq > 100) freq = freq / 10;
    data.inputFrequency = freq;

    // 3. Strings
    data.firmwareVersion = getString('firmwareVersion');
    data.modelName = getString('identModel');
    data.batteryReplaceDate = getString('batteryReplaceDate');

    // 4. Runtime (Timeticks -> Seconds)
    // APC returns timeticks (1/100th of a second)
    const rawRuntime = getRaw('runtimeRemaining');
    data.runtimeRemaining = rawRuntime ? Math.floor(parseNum(rawRuntime) / 100) : 0;

    // 5. Output Amps & Power
    data.outputAmps = parseNum(getRaw('outputAmps'));
    
    // 6. Battery Specifics
    // Voltage is in 10ths of a volt
    const rawBattVolt = parseNum(getRaw('batteryVoltage'));
    data.batteryVoltage = rawBattVolt ? rawBattVolt / 10 : 0;

    // Replace Indicator (1=No, 2=Yes)
    const rawReplace = parseNum(getRaw('batteryReplaceIndicator'));
    data.batteryNeedsReplacement = rawReplace === 2;

    // Battery Topology
    // OID returns number of EXTERNAL packs. Internal is always 1.
    const extPacks = parseNum(getRaw('externalBatteryCount'));
    data.batteryPackCount = 1 + (isNaN(extPacks) ? 0 : extPacks);
    
    // Estimate Nominal Voltage if not manually set
    // Rough heuristic: Round raw voltage to nearest standard (24, 36, 48, 96, 192)
    // This is temporary until overriden by config, but gives a decent default
    const v = data.batteryVoltage || 24;
    if (v > 160) data.batteryNominalVoltage = 192;
    else if (v > 80) data.batteryNominalVoltage = 96;
    else if (v > 40) data.batteryNominalVoltage = 48;
    else if (v > 30) data.batteryNominalVoltage = 36;
    else data.batteryNominalVoltage = 24;

    // Estimated Calculations for Power Triangle if direct OIDs aren't available/supported by specific card
    const estimatedVA = (data.loadPercentage || 0) * 15; // Rough estimate (1500VA * %)
    data.apparentPowerVA = estimatedVA;
    data.realPowerW = estimatedVA * 0.9; // 0.9 PF estimate

    return data;
  }

  private notifyListeners(data: Partial<UPSData>): void {
    this.listeners.forEach(cb => cb(data));
  }
}
