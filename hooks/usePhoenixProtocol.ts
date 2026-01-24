
import { useState, useEffect, useRef } from 'react';
import { Device, DeviceStatusMap, SequenceCountdownMap, SystemConfiguration, AppSettings, UPSData, LogEntry, UserProfile } from '../types';
import { DeviceControlService } from '../services/DeviceControlService';

interface ProtocolProps {
    sysConfig: SystemConfiguration;
    settings: AppSettings;
    currentUpsData: UPSData;
    currentUser: UserProfile | null;
    activeUpsId: string;
    addEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    notify: (n: any) => void;
}

export const usePhoenixProtocol = ({ sysConfig, settings, currentUpsData, currentUser, activeUpsId, addEvent, notify }: ProtocolProps) => {
    const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatusMap>({});
    const [activeCountdowns, setActiveCountdowns] = useState<SequenceCountdownMap>({});
    const [outageStartTime, setOutageStartTime] = useState<number | null>(null);
    const [shutdownTriggered, setShutdownTriggered] = useState(false);
    const [isDeviceSimulating, setIsDeviceSimulating] = useState(false);

    const triggeredDevicesRef = useRef<Set<string>>(new Set());
    const latestUpsDataRef = useRef(currentUpsData);

    // Keep ref sync
    useEffect(() => {
        latestUpsDataRef.current = currentUpsData;
    }, [currentUpsData]);

    // --- HEARTBEAT MONITOR ---
    useEffect(() => {
        if (!currentUser) return;

        const checkHeartbeats = async () => {
            const allDevices = [
                ...sysConfig.virtualRack.unassignedDevices,
                ...(Object.values(sysConfig.virtualRack.outlets) as Device[][]).flat()
            ];

            if (allDevices.length === 0) return;

            const updates: DeviceStatusMap = {};

            if (isDeviceSimulating) {
                allDevices.forEach(d => {
                    updates[d.id] = Math.random() > 0.98 ? 'OFFLINE' : 'ONLINE';
                });
                setDeviceStatuses(prev => ({ ...prev, ...updates }));
                return;
            }

            await Promise.all(allDevices.map(async (d) => {
                 // Only check connectivity if not already shutting down or offline from trigger
                 if (!triggeredDevicesRef.current.has(d.id)) {
                     setDeviceStatuses(prev => ({ ...prev, [d.id]: 'CHECKING' }));
                     const isOnline = await DeviceControlService.verifyConnection(d);
                     updates[d.id] = isOnline ? 'ONLINE' : 'OFFLINE';
                 }
            }));

            setDeviceStatuses(prev => ({ ...prev, ...updates }));
        };

        const interval = setInterval(checkHeartbeats, 10000); 
        checkHeartbeats(); 

        return () => clearInterval(interval);
    }, [currentUser, sysConfig.virtualRack, isDeviceSimulating]);

    // --- PROTOCOL LOGIC ---
    useEffect(() => {
        if (!currentUser) return;

        const isOnBattery = currentUpsData.status === 'ON_BATTERY' || currentUpsData.status === 'LOW_BATTERY';
        
        // START OUTAGE TIMER
        if (isOnBattery && !outageStartTime) {
            setOutageStartTime(Date.now());
            triggeredDevicesRef.current.clear(); // Reset on new outage
            addEvent(`POWER LOSS DETECTED. UPS on Battery. Load Shedding Rules Active.`, 'WARNING', 'SYSTEM');
        } 
        // RESET ON RESTORE
        else if (!isOnBattery && outageStartTime) {
            setOutageStartTime(null);
            triggeredDevicesRef.current.clear();
            setActiveCountdowns({});
            setShutdownTriggered(false);
            addEvent(`POWER RESTORED. Resuming Normal Operations.`, 'SUCCESS', 'SYSTEM');
        }

        // EVALUATE RULES LOOP
        if (isOnBattery) {
            const interval = setInterval(() => evaluateShutdownRules(), 1000);
            return () => clearInterval(interval);
        }

    }, [currentUpsData.status, outageStartTime, currentUser]); 

    const evaluateShutdownRules = () => {
        if (!outageStartTime) return;

        const now = Date.now();
        const secondsSinceOutage = Math.floor((now - outageStartTime) / 1000);
        const currentCapacity = latestUpsDataRef.current.batteryCapacity;

        // 1. Check Global Failsafe
        if (currentCapacity < sysConfig.phoenixProtocol.shutdownThreshold && !shutdownTriggered) {
            setShutdownTriggered(true);
            addEvent('GLOBAL FAILSAFE THRESHOLD REACHED. Initiating Emergency Protocols.', 'CRITICAL', 'PHOENIX');
        }

        // 2. Iterate Configured Rules
        const rules = sysConfig.phoenixProtocol.shutdownSequence;
        const nextActiveCountdowns: SequenceCountdownMap = {};

        rules.forEach(rule => {
            if (triggeredDevicesRef.current.has(rule.deviceId)) return;

            let isMet = false;
            let value = 0;

            if (rule.type === 'TIMER') {
                isMet = secondsSinceOutage >= rule.threshold;
                value = Math.max(0, rule.threshold - secondsSinceOutage);
            } else {
                isMet = currentCapacity <= rule.threshold;
                value = currentCapacity;
            }

            if (isMet) {
                triggeredDevicesRef.current.add(rule.deviceId);
                executeDeviceShutdown(rule.deviceId, rule.type);
            } else {
                nextActiveCountdowns[rule.deviceId] = {
                    rule: rule,
                    currentValue: value,
                    isMet: false
                };
            }
        });

        setActiveCountdowns(nextActiveCountdowns);
    };

    const executeDeviceShutdown = async (deviceId: string, triggerReason: string) => {
        let device: any = sysConfig.virtualRack.unassignedDevices.find(d => d.id === deviceId);
        if (!device) {
            const allOutletDevices = (Object.values(sysConfig.virtualRack.outlets) as Device[][]).flat();
            device = allOutletDevices.find(d => d.id === deviceId);
        }
        
        // Handle Hard Cut Entities
        if (!device && deviceId.startsWith('OUTLET_GRP_')) {
            const outletId = parseInt(deviceId.replace('OUTLET_GRP_', ''));
            const activeUpsConfig = settings.upsRegistry.find(u => u.id === activeUpsId);
            device = {
               id: deviceId,
               name: `OUTLET BANK #${outletId}`,
               type: 'OUTLET',
               shutdownMethod: 'HARD_CUT',
               assignedOutlet: outletId,
               ipAddress: activeUpsConfig?.targetIp 
            };
        }

        if (device) {
            const reasonText = triggerReason === 'TIMER' ? 'Timer Expired' : 'Battery Threshold Met';
            const isHardCut = device.shutdownMethod === 'HARD_CUT';
            
            addEvent(`TRIGGER (${reasonText}): ${isHardCut ? 'HARD CUT' : 'SHUTDOWN'} -> ${device.name}`, 'CRITICAL', 'PHOENIX');
            
            if (isDeviceSimulating) {
                setTimeout(() => {
                    addEvent(`[SIMULATION] ${device.name} shutdown command sent.`, 'SUCCESS', 'PHOENIX');
                    setDeviceStatuses(prev => ({ ...prev, [deviceId]: 'OFFLINE' }));
                    notify({ type: 'SUCCESS', message: `[SIM] Load Shed: ${device.name}` });
                }, 1000);
            } else {
                const success = await DeviceControlService.shutdownDevice(device);
                if (success) {
                    addEvent(`${device.name} command SUCCESS.`, 'SUCCESS', 'PHOENIX');
                    setDeviceStatuses(prev => ({ ...prev, [deviceId]: 'OFFLINE' }));
                    notify({ type: 'SUCCESS', message: `Load Shed: ${device.name}` });
                } else {
                    addEvent(`${device.name} command FAILED.`, 'CRITICAL', 'PHOENIX');
                    notify({ type: 'ERROR', message: `Shutdown Failed: ${device.name}` });
                }
            }
        }
    };

    return {
        deviceStatuses,
        activeCountdowns,
        shutdownTriggered,
        isDeviceSimulating,
        setIsDeviceSimulating,
        setShutdownTriggered
    };
};
