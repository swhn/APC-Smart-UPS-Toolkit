
import { useState, useEffect } from 'react';
import { UPSData, AppSettings, SystemConfiguration, LogEntry, UserProfile, LayoutType, EnergyPoint } from '../types';
import { INITIAL_DATA } from '../constants';

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

export const useUpsSystem = ({ settings, sysConfig, currentUser, handleUpdateConfig, addEvent, notify }: UpsSystemProps) => {
    const [activeUpsId, setActiveUpsId] = useState<string>(''); 
    const [allUpsData, setAllUpsData] = useState<Record<string, UPSData>>({});
    const [energyHistory, setEnergyHistory] = useState<EnergyPoint[]>([]);
    
    // UI state for Simulation Lab controls
    const [isUpsSimulating, setIsUpsSimulating] = useState(false);
    
    // Derived
    const currentUpsData = allUpsData[activeUpsId] || INITIAL_DATA;

    // --- INITIALIZATION ---
    useEffect(() => {
        // Set initial active UPS
        if (settings.upsRegistry.length > 0 && !activeUpsId) {
            setActiveUpsId(settings.upsRegistry[0].id);
        }
    }, [settings.upsRegistry]);

    // --- BACKEND EVENT SUBSCRIPTION ---
    useEffect(() => {
        if (!window.electronAPI) {
            console.warn("Electron API missing. Backend updates disabled.");
            return;
        }

        // Subscribe to System State Updates (UPS Data + Energy History)
        const unsubscribe = window.electronAPI.onSystemStateUpdate((payload) => {
            // If simulation mode is active in UI, we ignore backend updates for UPS Data
            // to allow the user to manually manipulate the gauge values in SimulationLab.
            if (!isUpsSimulating) {
                setAllUpsData(payload.upsData);
                if (payload.energyHistory) {
                    setEnergyHistory(payload.energyHistory);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [isUpsSimulating]); // Re-subscribe if simulation state changes logic

    // --- LAYOUT DETECTION (Reactive to Data) ---
    useEffect(() => {
        // Only run auto-detect if NOT simulating
        if (isUpsSimulating) return;

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
    }, [currentUpsData.modelName, isUpsSimulating]);

    const handleResetEnergy = () => {
        // This is a request to the backend, implemented via a Secure Action usually.
        // For now, we optimistically clear the local view.
        setEnergyHistory([]);
        addEvent('Lifetime Energy Counter Reset Request Sent.', 'INFO', 'USER');
        notify({ type: 'SUCCESS', message: 'Energy Metrics Reset.' });
    };

    // Helper to manually set data (for SimulationLab overrides)
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
