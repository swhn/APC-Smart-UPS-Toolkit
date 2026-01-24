
import { useState, useEffect } from 'react';
import { DeviceStatusMap, SequenceCountdownMap, SystemConfiguration, AppSettings, UPSData, LogEntry, UserProfile } from '../types';

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
    const [shutdownTriggered, setShutdownTriggered] = useState(false);
    const [isDeviceSimulating, setIsDeviceSimulating] = useState(false);

    // --- BACKEND EVENT SUBSCRIPTION ---
    useEffect(() => {
        if (!window.electronAPI) {
            console.warn("Electron API missing. Phoenix Protocol updates disabled.");
            return;
        }

        // 1. Subscribe to Phoenix Protocol Updates (Countdowns & Trigger Status)
        const unsubPhoenix = window.electronAPI.onPhoenixCountdownUpdate((payload) => {
            setActiveCountdowns(payload.countdowns);
            
            // Only update triggered state if it changes to true (alerts) or backend clears it
            if (payload.shutdownTriggered !== shutdownTriggered) {
                setShutdownTriggered(payload.shutdownTriggered);
                if (payload.shutdownTriggered) {
                    addEvent('GLOBAL FAILSAFE THRESHOLD REACHED. Initiating Emergency Protocols.', 'CRITICAL', 'PHOENIX');
                }
            }
        });

        // 2. Subscribe to System State Updates (Device Connectivity Status)
        const unsubSystem = window.electronAPI.onSystemStateUpdate((payload) => {
            // In simulation mode, we might want to ignore real device statuses, 
            // but for now, we'll accept them or let the backend handle simulation data injection.
            if (payload.deviceStatuses) {
                setDeviceStatuses(payload.deviceStatuses);
            }
        });

        return () => {
            unsubPhoenix();
            unsubSystem();
        };
    }, [shutdownTriggered]); // dependency on local state used in logic if any

    // Note: The heavy lifting of checking heartbeats, evaluating shutdown rules, 
    // and executing shutdown commands has been moved to the Electron Main Process.
    // This hook now simply visualizes the state pushed by the backend.

    return {
        deviceStatuses,
        activeCountdowns,
        shutdownTriggered,
        isDeviceSimulating,
        setIsDeviceSimulating,
        setShutdownTriggered
    };
};
