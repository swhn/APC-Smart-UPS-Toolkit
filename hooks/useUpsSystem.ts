
import { useState, useEffect, useRef } from 'react';
import { UPSData, AppSettings, SystemConfiguration, LogEntry, UserProfile, LayoutType } from '../types';
import { INITIAL_DATA } from '../constants';
import { SnmpManager } from '../services/snmpManager';
import { StorageService, EnergyPoint } from '../services/StorageService';

// Helper for Layout Detection
const detectLayoutFromModel = (model: string): LayoutType | null => {
    if (!model) return null;
    const m = model.toUpperCase();
    if (m.includes('SRT') && (m.includes('10000') || m.includes('10K'))) return 'SRT_10000';
    if (m.includes('SRT') && (m.includes('8000') || m.includes('8K'))) return 'SRT_8000';
    if (m.includes('SRT') && (m.includes('5000') || m.includes('5K'))) return 'SRT_5000';
    if (m.includes('SRT') && m.includes('3000')) return 'SRT_3000';
    if (m.includes('RM') || m.includes('RACK') || m.includes('2U') || m.includes('1U')) {
        if (m.includes('3U') || m.includes('5000')) return 'RACK_3U_10';
        if (m.includes('3000') || m.includes('2200')) return 'RACK_2U_8';
        if (m.includes('1500') || m.includes('1000')) return 'RACK_2U_6';
        if (m.includes('SC450')) return 'RACK_1U_4';
        return 'RACK_2U_8';
    }
    if (m.includes('TOWER') || !m.includes('RACK')) {
         if (m.includes('2200') || m.includes('3000')) return 'TOWER_10';
         if (m.includes('1000') || m.includes('1500')) return 'TOWER_8';
         if (m.includes('750')) return 'TOWER_6';
    }
    return null;
};

interface UpsSystemProps {
    settings: AppSettings;
    sysConfig: SystemConfiguration;
    currentUser: UserProfile | null;
    handleUpdateConfig: (c: SystemConfiguration) => void;
    addEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    notify: (n: any) => void;
}

const DISCONNECTED_DATA: UPSData = {
    ...INITIAL_DATA,
    status: 'UNKNOWN',
    modelName: 'Searching...',
    firmwareVersion: '---',
    inputVoltage: 0,
    outputVoltage: 0,
    inputFrequency: 0,
    batteryCapacity: 0,
    loadPercentage: 0,
    runtimeRemaining: 0,
    batteryTemp: 0,
    outputAmps: 0,
    realPowerW: 0,
    apparentPowerVA: 0,
    batteryVoltage: 0
};

export const useUpsSystem = ({ settings, sysConfig, currentUser, handleUpdateConfig, addEvent, notify }: UpsSystemProps) => {
    const [activeUpsId, setActiveUpsId] = useState<string>(''); 
    const [allUpsData, setAllUpsData] = useState<Record<string, UPSData>>({});
    const [energyHistory, setEnergyHistory] = useState<EnergyPoint[]>([]);
    const [isUpsSimulating, setIsUpsSimulating] = useState(false);
    
    const snmpManagersRef = useRef<Map<string, SnmpManager>>(new Map());
    
    // Derived
    const currentUpsData = allUpsData[activeUpsId] || INITIAL_DATA;

    // --- INITIAL LOAD ---
    useEffect(() => {
        // Set initial active UPS
        if (settings.upsRegistry.length > 0 && !activeUpsId) {
            setActiveUpsId(settings.upsRegistry[0].id);
        }
        
        const loadEnergy = async () => {
            const loaded = await StorageService.loadEnergyHistory();
            if (loaded.length === 0) {
                const backfill = generateBackfillData();
                setEnergyHistory(backfill);
                StorageService.saveEnergyHistory(backfill);
            } else {
                setEnergyHistory(loaded);
            }
        };
        loadEnergy();
    }, [settings.upsRegistry]);

    // --- SNMP POLLING ---
    useEffect(() => {
        // Stop Polling if UPS Simulation is ON or logged out
        if (isUpsSimulating || !currentUser) {
            snmpManagersRef.current.forEach(m => m.stopPolling());
            snmpManagersRef.current.clear();
            return;
        }

        // If Simulation was just turned OFF, reset data to "Connecting" state
        // to avoid showing stale simulated data while waiting for real connection
        setAllUpsData(prev => {
            const resetState: Record<string, UPSData> = {};
            settings.upsRegistry.forEach(ups => {
                // If we have previous data that WASN'T simulated, we might want to keep it?
                // But detecting that is hard. Safer to reset to show we are switching modes.
                resetState[ups.id] = { ...DISCONNECTED_DATA, modelName: 'Connecting...' };
            });
            return resetState;
        });

        const activeRegistryIds = new Set(settings.upsRegistry.map((u: any) => u.id));
        
        // Cleanup old managers
        for (const [id, manager] of snmpManagersRef.current.entries()) {
            if (!activeRegistryIds.has(id)) {
                manager.stopPolling();
                snmpManagersRef.current.delete(id);
                setAllUpsData(prev => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                });
            }
        }

        // Init new managers
        settings.upsRegistry.forEach(upsConf => {
            let manager = snmpManagersRef.current.get(upsConf.id);
            
            if (!manager) {
                manager = new SnmpManager(upsConf.targetIp, upsConf.community, upsConf.pollingInterval);
                
                manager.subscribe((newData) => {
                    setAllUpsData(prev => {
                        const existing = prev[upsConf.id] || INITIAL_DATA;
                        if (newData.status && newData.status !== existing.status) {
                            addEvent(`[${upsConf.name}] Status changed to ${newData.status}`, 'WARNING', 'SYSTEM');
                            if (newData.status !== 'ONLINE') {
                                notify({ type: 'WARNING', title: 'STATUS CHANGE', message: `${upsConf.name} is ${newData.status}`});
                            }
                        }
                        return {
                            ...prev,
                            [upsConf.id]: { ...existing, ...newData }
                        };
                    });
                });

                manager.connect();
                snmpManagersRef.current.set(upsConf.id, manager);
            }
        });
    }, [settings.upsRegistry, isUpsSimulating, currentUser]);

    // --- LAYOUT DETECTION ---
    useEffect(() => {
        const model = currentUpsData.modelName;
        if (model && model !== 'Loading...' && model !== 'Unknown' && model !== 'Connecting...' && model !== 'Searching...') {
            const detected = detectLayoutFromModel(model);
            if (detected && detected !== sysConfig.virtualRack.layoutType) {
                 const newConfig = {
                     ...sysConfig,
                     virtualRack: { ...sysConfig.virtualRack, layoutType: detected }
                 };
                 handleUpdateConfig(newConfig); 
                 addEvent(`Auto-detected UPS Model: ${model}. Switched layout to ${detected}.`, 'SUCCESS', 'SYSTEM');
                 notify({ type: 'INFO', message: `Rack Layout adapted for ${model}` });
            }
        }
    }, [currentUpsData.modelName]);

    // --- SIMULATION PHYSICS ---
    useEffect(() => {
        if (!isUpsSimulating || !currentUser) return;
        const interval = setInterval(() => {
            setAllUpsData(prevAll => {
                const current = prevAll[activeUpsId] || INITIAL_DATA;
                const updated = {
                    ...current,
                    status: current.status === 'UNKNOWN' ? 'ONLINE' : current.status, // Ensure sim starts online
                    modelName: current.modelName === 'Connecting...' ? 'SMART-UPS 3000 (SIM)' : current.modelName,
                    loadPercentage: Math.min(100, Math.max(0, current.loadPercentage + (Math.random() - 5) * 5)),
                    outputAmps: Math.max(0, current.outputAmps + (Math.random() - 0.5)),
                    realPowerW: Math.max(800, current.realPowerW + (Math.random() - 0.5) * 10),
                    batteryCapacity: current.status === 'ON_BATTERY' ? Math.max(0, current.batteryCapacity - 0.5) : current.batteryCapacity
                };
                
                // Initialize clean data if we switched from Disconnected state
                if (current.inputVoltage === 0) {
                    updated.inputVoltage = 120;
                    updated.outputVoltage = 120;
                    updated.inputFrequency = 60;
                    updated.batteryCapacity = 100;
                    updated.loadPercentage = 45;
                    updated.batteryTemp = 28;
                    updated.batteryVoltage = 27.4;
                    updated.runtimeRemaining = 3400;
                }

                return { ...prevAll, [activeUpsId]: updated };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isUpsSimulating, currentUser, activeUpsId]);

    // --- ENERGY RECORDING ---
    useEffect(() => {
        if(!currentUser) return;
        const recordInterval = setInterval(() => {
            setEnergyHistory(currentHistory => {
                const now = new Date();
                const newPoint: EnergyPoint = {
                    timestamp: now.getTime(),
                    dateStr: now.toISOString(),
                    watts: currentUpsData.realPowerW,
                    kwh: (currentUpsData.realPowerW / 1000) * (10/3600), 
                    alarms: (currentUpsData.status !== 'ONLINE') ? 1 : 0
                };
                const updatedHistory = [...currentHistory, newPoint];
                StorageService.saveEnergyHistory(updatedHistory);
                return updatedHistory;
            });
        }, 10000); 
        return () => clearInterval(recordInterval);
    }, [currentUpsData, currentUser]);

    // Helper
    const generateBackfillData = () => {
        const history: EnergyPoint[] = [];
        const now = Date.now();
        for(let i=100; i>=0; i--) {
            const t = now - (i * 30 * 60 * 1000); 
            history.push({
                timestamp: t,
                dateStr: new Date(t).toISOString(),
                watts: 800 + Math.random() * 200,
                kwh: Math.random() * 0.5,
                alarms: Math.random() > 0.95 ? 1 : 0
            });
        }
        return history;
    };

    const handleResetEnergy = () => {
        setAllUpsData(prev => ({
            ...prev,
            [activeUpsId]: { ...prev[activeUpsId], energyUsageKWh: 0 }
        }));
        setEnergyHistory([]);
        StorageService.saveEnergyHistory([]);
        addEvent('Lifetime Energy Counter Reset by User.', 'INFO', 'USER');
        notify({ type: 'SUCCESS', message: 'Energy Metrics Reset.' });
    };

    // Helper to manually set data (for Diagnostics/Simulation UI)
    const setSingleUpsData = (updater: any) => {
        setAllUpsData(prev => {
            const current = prev[activeUpsId] || INITIAL_DATA;
            const newVal = typeof updater === 'function' ? (updater as any)(current) : updater;
            return { ...prev, [activeUpsId]: newVal };
        });
    };

    return {
        activeUpsId,
        setActiveUpsId,
        allUpsData,
        currentUpsData,
        setSingleUpsData,
        energyHistory,
        isUpsSimulating,
        setIsUpsSimulating,
        handleResetEnergy
    };
};
