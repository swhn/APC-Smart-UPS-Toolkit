
import { useState, useEffect } from 'react';
import { SystemConfiguration, AppSettings, LogEntry, TabId } from '../types';
import { INITIAL_SYS_CONFIG, INITIAL_SETTINGS } from '../constants';
import { StorageService } from '../services/StorageService';

export const useSystemData = () => {
    // Persistent State
    const [sysConfig, setSysConfig] = useState<SystemConfiguration>(INITIAL_SYS_CONFIG);
    const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
    
    // Volatile UI State
    const [eventLogs, setEventLogs] = useState<LogEntry[]>([
        { id: 'l1', timestamp: new Date().toLocaleTimeString(), message: 'System Initialized.', severity: 'INFO', source: 'SYSTEM' }
    ]);
    const [protocolLog, setProtocolLog] = useState<string[]>([]);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [hasNewLogs, setHasNewLogs] = useState(false);

    // Secure Action Modal
    const [secureActionState, setSecureActionState] = useState<{
        isOpen: boolean;
        actionCallback: (() => void) | null;
        description: string;
    }>({ isOpen: false, actionCallback: null, description: '' });

    // --- Loading ---
    useEffect(() => {
        const load = async () => {
            const c = await StorageService.loadConfig();
            const s = await StorageService.loadSettings();
            
            // Validate Registry
            if (!s.upsRegistry || s.upsRegistry.length === 0) {
                s.upsRegistry = INITIAL_SETTINGS.upsRegistry;
            }
            
            setSysConfig(c);
            setSettings(s);
        };
        load();
    }, []);

    // --- Actions ---
    const addEvent = (message: string, severity: LogEntry['severity'] = 'INFO', source: LogEntry['source'] = 'SYSTEM') => {
        const timestamp = new Date().toLocaleTimeString();
        const newLog: LogEntry = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp,
            message,
            severity,
            source
        };
        setEventLogs(prev => [newLog, ...prev]);
        setProtocolLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
        if (!isLogOpen && severity !== 'INFO') setHasNewLogs(true);
    };

    const handleUpdateConfig = (newConfig: SystemConfiguration, persist: boolean = true) => {
        setSysConfig(newConfig);
        if (persist) {
            StorageService.saveConfig(newConfig);
        }
    };

    const handleUpdateSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        StorageService.saveSettings(newSettings);
    };

    const requestSecureAction = (actionCallback: () => void, description: string = "Execute critical system change") => {
        setSecureActionState({ isOpen: true, actionCallback, description });
    };

    // Helper to reload from disk (discarding memory-only changes like simulation)
    const reloadConfigFromStorage = async () => {
        const c = await StorageService.loadConfig();
        setSysConfig(c);
        return c;
    };

    return {
        sysConfig,
        settings,
        eventLogs,
        protocolLog,
        isLogOpen,
        hasNewLogs,
        secureActionState,
        setSecureActionState,
        setEventLogs,
        setProtocolLog,
        setIsLogOpen,
        setHasNewLogs,
        addEvent,
        handleUpdateConfig,
        handleUpdateSettings,
        requestSecureAction,
        reloadConfigFromStorage
    };
};
