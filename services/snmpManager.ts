
import * as snmp from 'net-snmp';
import { OID_MAP } from '../constants';
import { UPSData } from '../types';
import { Buffer } from 'buffer';

type SNMPCallback = (data: Partial<UPSData>) => void;

interface HandshakeResult {
    success: boolean;
    model?: string;
    serial?: string;
    error?: string;
}

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

  // --- Static Method for One-Off Testing (Handshake) ---
  public static async testConnection(ip: string, community: string): Promise<HandshakeResult> {
      return new Promise((resolve) => {
          // Check for Browser Environment restriction
          if (typeof window !== 'undefined' && !(window as any).process?.versions?.node) {
              // This is running in a browser, not Electron/Node. Real UDP is impossible.
              // We return a simulated failure or specific message.
              // For "Simulation" mode we might fake a success, but for "Industrial Standard" we must be honest.
              console.warn("[SNMP] Browser environment detected. Real SNMP requires Node.js/Electron.");
              
              // Simulate checking...
              setTimeout(() => {
                  // If localhost for dev, maybe mock success
                  if (ip === '127.0.0.1' || ip === 'localhost') {
                      resolve({ success: true, model: 'APC Smart-UPS 3000 (Sim)', serial: 'SIM-BROWSER-001' });
                  } else {
                      // Fail for real IPs in browser
                      resolve({ 
                          success: false, 
                          error: "Browser Security Restriction: Cannot open UDP sockets. Use Electron app or Proxy." 
                      });
                  }
              }, 1500);
              return;
          }

          try {
              const session = snmp.createSession(ip, community, {
                  version: snmp.Version2c,
                  timeout: 2000,
                  retries: 1
              });

              const oids = [OID_MAP.identModel, OID_MAP.identSerialNumber];

              session.get(oids, (error: any, varbinds: any[]) => {
                  session.close();
                  if (error) {
                      resolve({ success: false, error: error.toString() });
                  } else {
                      if (snmp.isVarbindError(varbinds[0])) {
                          resolve({ success: false, error: "OID Fetch Error: Target refused Model ID." });
                      } else {
                          const model = varbinds[0].value.toString();
                          const serial = varbinds[1] && !snmp.isVarbindError(varbinds[1]) 
                              ? varbinds[1].value.toString() 
                              : 'Unknown SN';
                          
                          resolve({ success: true, model, serial });
                      }
                  }
              });
          } catch (e: any) {
              resolve({ success: false, error: `Socket Error: ${e.message}` });
          }
      });
  }

  public connect(): void {
    try {
      // Browser Safety Check
      if (typeof window !== 'undefined' && !(window as any).process?.versions?.node) {
          console.warn("[SNMP] Real SNMP polling disabled in Browser. Use Simulation Tab.");
          return;
      }

      this.session = snmp.createSession(this.targetIp, this.community, {
        version: snmp.Version2c,
        timeout: 3000
      });
      console.log(`[SNMP] Session created for ${this.targetIp}`);
      this.startPolling();
    } catch (error: any) {
      console.error("[SNMP] Connection Initialization Failed:", error);
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
    
    // Frequency
    let freq = parseNum(getRaw('inputFrequency'));
    if (freq > 100) freq = freq / 10;
    data.inputFrequency = freq;

    // 3. Strings
    data.firmwareVersion = getString('firmwareVersion');
    data.modelName = getString('identModel');
    data.batteryReplaceDate = getString('batteryReplaceDate');

    // 4. Runtime (Timeticks -> Seconds)
    const rawRuntime = getRaw('runtimeRemaining');
    data.runtimeRemaining = rawRuntime ? Math.floor(parseNum(rawRuntime) / 100) : 0;

    // 5. Output Amps & Power
    data.outputAmps = parseNum(getRaw('outputAmps'));
    
    // 6. Battery Specifics
    const rawBattVolt = parseNum(getRaw('batteryVoltage'));
    data.batteryVoltage = rawBattVolt ? rawBattVolt / 10 : 0;

    const rawReplace = parseNum(getRaw('batteryReplaceIndicator'));
    data.batteryNeedsReplacement = rawReplace === 2;

    const extPacks = parseNum(getRaw('externalBatteryCount'));
    data.batteryPackCount = 1 + (isNaN(extPacks) ? 0 : extPacks);
    
    // Estimate Nominal Voltage if not manually set
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
