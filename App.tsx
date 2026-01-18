
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabId, UPSData, SystemConfiguration, AppSettings, UserProfile, LogEntry, LayoutType, DeviceStatusMap, SequenceCountdownMap, Device } from './types';
import { INITIAL_DATA, INITIAL_SYS_CONFIG, INITIAL_SETTINGS } from './constants';
import CommandDeck from './components/CommandDeck';
import VirtualRack from './components/VirtualRack';
import ShutdownSequencer from './components/ShutdownSequencer';
import DiagnosticsBay from './components/DiagnosticsBay';
import EnergyMonitor from './components/EnergyMonitor';
import EventsLog from './components/EventsLog';
import SettingsPanel from './components/SettingsPanel';
import SimulationLab from './components/SimulationLab';
import LoginScreen from './components/LoginScreen';
import { DeviceControlService } from './services/DeviceControlService';
import { SnmpManager } from './services/snmpManager';
import { StorageService, EnergyPoint } from './services/StorageService';

// --- Vector Icons ---
const IconDeck = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconRack = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;
const IconSequence = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconDiag = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IconEnergy = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const IconLogs = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconSettings = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconLogout = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const IconBell = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const IconLab = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 2v7.31"></path><path d="M14 2v7.31"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0V2"></path></svg>;

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Security State
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>(TabId.COMMAND_DECK);
  
  // -- PERSISTENT STATE --
  const [sysConfig, setSysConfig] = useState<SystemConfiguration>(INITIAL_SYS_CONFIG);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [energyHistory, setEnergyHistory] = useState<EnergyPoint[]>([]);
  // ----------------------

  // -- MULTI-UPS STATE --
  const [activeUpsId, setActiveUpsId] = useState<string>(''); // Currently selected UPS ID
  const [allUpsData, setAllUpsData] = useState<Record<string, UPSData>>({});
  
  // Helper to get active data, safely falling back
  const currentUpsData = allUpsData[activeUpsId] || INITIAL_DATA;

  // -- REAL-TIME STATUS STATE (Volatile) --
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatusMap>({});
  const [activeCountdowns, setActiveCountdowns] = useState<SequenceCountdownMap>({});

  const [isSimulating, setIsSimulating] = useState(false);
  
  const [shutdownTriggered, setShutdownTriggered] = useState(false);
  const [protocolLog, setProtocolLog] = useState<string[]>([]);
  const [eventLogs, setEventLogs] = useState<LogEntry[]>([
      { id: 'l1', timestamp: new Date().toLocaleTimeString(), message: 'System Initialized.', severity: 'INFO', source: 'SYSTEM' }
  ]);

  // Log UI State
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [hasNewLogs, setHasNewLogs] = useState(false);

  // Navigation Guard State
  const [isSequencerDirty, setIsSequencerDirty] = useState(false);
  const [isRackDirty, setIsRackDirty] = useState(false); 
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'TAB', payload: TabId } | { type: 'LOGOUT' } | null>(null);

  // Secure Action Modal State
  const [secureActionState, setSecureActionState] = useState<{
      isOpen: boolean;
      actionCallback: (() => void) | null;
      description: string;
  }>({ isOpen: false, actionCallback: null, description: '' });
  const [securePassword, setSecurePassword] = useState('');
  const [secureError, setSecureError] = useState('');

  // SNMP Managers Reference (Map of ID -> Manager)
  const snmpManagersRef = useRef<Map<string, SnmpManager>>(new Map());
  
  // Timers
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const protocolTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadAllData = async () => {
        const loadedConfig = await StorageService.loadConfig();
        const loadedSettings = await StorageService.loadSettings();
        const loadedEnergy = await StorageService.loadEnergyHistory();

        setSysConfig(loadedConfig);
        
        // Data Migration: If loading old settings with 'snmp' object, move to upsRegistry
        if ((loadedSettings as any).snmp && (!loadedSettings.upsRegistry || loadedSettings.upsRegistry.length === 0)) {
            const oldSnmp = (loadedSettings as any).snmp;
            loadedSettings.upsRegistry = [{
                id: 'ups_legacy',
                name: 'Main UPS',
                targetIp: oldSnmp.targetIp,
                community: oldSnmp.community,
                port: oldSnmp.port,
                timeout: oldSnmp.timeout,
                pollingInterval: oldSnmp.pollingInterval
            }];
        }
        
        // Ensure registry is valid
        if (!loadedSettings.upsRegistry || loadedSettings.upsRegistry.length === 0) {
            loadedSettings.upsRegistry = INITIAL_SETTINGS.upsRegistry;
        }

        setSettings(loadedSettings);
        
        // Set initial active UPS
        if (loadedSettings.upsRegistry.length > 0) {
            setActiveUpsId(loadedSettings.upsRegistry[0].id);
        }
        
        if (loadedEnergy.length === 0) {
            const backfill = generateBackfillData();
            setEnergyHistory(backfill);
            StorageService.saveEnergyHistory(backfill);
        } else {
            setEnergyHistory(loadedEnergy);
        }
    };
    loadAllData();
  }, []);

  // --- HEARTBEAT MONITOR ENGINE ---
  useEffect(() => {
      if (!currentUser) return;

      const checkHeartbeats = async () => {
          const allDevices = [
              ...sysConfig.virtualRack.unassignedDevices,
              ...Object.values(sysConfig.virtualRack.outlets).flat()
          ];

          if (allDevices.length === 0) return;

          const updates: DeviceStatusMap = {};

          // If simulating, randomize status occasionally for effect
          if (isSimulating) {
              allDevices.forEach(d => {
                  updates[d.id] = Math.random() > 0.95 ? 'OFFLINE' : 'ONLINE';
              });
              setDeviceStatuses(prev => ({ ...prev, ...updates }));
              return;
          }

          // Real Connection Check
          await Promise.all(allDevices.map(async (d) => {
               // Mark as checking
               setDeviceStatuses(prev => ({ ...prev, [d.id]: 'CHECKING' }));
               const isOnline = await DeviceControlService.verifyConnection(d);
               updates[d.id] = isOnline ? 'ONLINE' : 'OFFLINE';
          }));

          setDeviceStatuses(prev => ({ ...prev, ...updates }));
      };

      const interval = setInterval(checkHeartbeats, 10000); // Check every 10s
      checkHeartbeats(); // Initial check

      return () => clearInterval(interval);
  }, [currentUser, sysConfig.virtualRack, isSimulating]);


  // --- PHOENIX PROTOCOL ENGINE (SHUTDOWN LOGIC) ---
  useEffect(() => {
    // 1. Trigger Logic
    if (!currentUser || shutdownTriggered) return;
    
    // Check if current ACTIVE UPS meets threshold (Global policy based on active view, 
    // real app might want separate policies per UPS)
    if (currentUpsData.status === 'ON_BATTERY' && currentUpsData.batteryCapacity < sysConfig.phoenixProtocol.shutdownThreshold) {
        initiatePhoenixProtocol(activeUpsId);
    }
  }, [currentUpsData, sysConfig, currentUser, shutdownTriggered, activeUpsId]);

  const initiatePhoenixProtocol = async (sourceUpsId: string) => {
      setShutdownTriggered(true);
      const upsName = settings.upsRegistry.find(u => u.id === sourceUpsId)?.name || sourceUpsId;
      addEvent(`PHOENIX PROTOCOL INITIATED by ${upsName} (Critical Battery).`, 'CRITICAL', 'PHOENIX');
      
      // Initialize Countdowns based on config
      const sequence = sysConfig.phoenixProtocol.shutdownSequence;
      const initialCountdowns: SequenceCountdownMap = {};
      
      sequence.forEach(step => {
          initialCountdowns[step.deviceId] = step.delaySeconds;
      });
      
      setActiveCountdowns(initialCountdowns);

      // Start the Ticker
      if (protocolTimerRef.current) clearInterval(protocolTimerRef.current);
      
      protocolTimerRef.current = setInterval(async () => {
          setActiveCountdowns(current => {
              const next = { ...current };
              let hasActive = false;

              Object.keys(next).forEach(deviceId => {
                  if (next[deviceId] > 0) {
                      next[deviceId] -= 1;
                      hasActive = true;

                      // TRIGGER EVENT ON ZERO
                      if (next[deviceId] === 0) {
                          executeDeviceShutdown(deviceId);
                      }
                  }
              });

              if (!hasActive) {
                   if (protocolTimerRef.current) clearInterval(protocolTimerRef.current);
                   addEvent("PHOENIX PROTOCOL: All timers expired.", 'WARNING', 'PHOENIX');
              }
              return next;
          });
      }, 1000);
  };

  const executeDeviceShutdown = async (deviceId: string) => {
      // Find device config
      let device: any = sysConfig.virtualRack.unassignedDevices.find(d => d.id === deviceId);
      if (!device) {
          const allOutletDevices = Object.values(sysConfig.virtualRack.outlets).flat();
          device = allOutletDevices.find(d => d.id === deviceId);
      }
      
      // Handle Outlet Groups
      if (!device && deviceId.startsWith('OUTLET_GRP_')) {
          const outletId = parseInt(deviceId.replace('OUTLET_GRP_', ''));
          // Find Active UPS Config to get IP for hard cut
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
          const isHardCut = device.shutdownMethod === 'HARD_CUT';
          addEvent(`EXECUTING: ${isHardCut ? 'HARD CUT' : 'SHUTDOWN'} -> ${device.name}`, 'CRITICAL', 'PHOENIX');
          
          const success = await DeviceControlService.shutdownDevice(device);
          if (success) {
              addEvent(`${device.name} command SUCCESS.`, 'SUCCESS', 'PHOENIX');
              setDeviceStatuses(prev => ({ ...prev, [deviceId]: 'OFFLINE' }));
          } else {
              addEvent(`${device.name} command FAILED.`, 'CRITICAL', 'PHOENIX');
          }
      }
  };


  // --- SECURITY: IDLE MONITOR ---
  useEffect(() => {
      if (!currentUser || !settings.security.enableIdleTimeout) {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          return;
      }
      const resetIdleTimer = () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => {
              addEvent("Session Terminated: Idle Timeout exceeded.", 'WARNING', 'SYSTEM');
              handleLogout();
          }, settings.security.idleTimeoutMinutes * 60 * 1000);
      };
      resetIdleTimer();
      window.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('keydown', resetIdleTimer);
      window.addEventListener('click', resetIdleTimer);
      return () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          window.removeEventListener('mousemove', resetIdleTimer);
          window.removeEventListener('keydown', resetIdleTimer);
          window.removeEventListener('click', resetIdleTimer);
      };
  }, [currentUser, settings.security]);

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

  const handleUpdateConfig = (newConfig: SystemConfiguration) => {
      setSysConfig(newConfig);
      StorageService.saveConfig(newConfig);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      StorageService.saveSettings(newSettings);
  };

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

  // --- MULTI-UPS SNMP MANAGEMENT ---
  useEffect(() => {
    if (isSimulating || !currentUser) {
        // Clear all managers if simulating or logged out
        snmpManagersRef.current.forEach(m => m.stopPolling());
        snmpManagersRef.current.clear();
        return;
    }

    const activeRegistryIds = new Set(settings.upsRegistry.map(u => u.id));
    
    // 1. Remove Managers for deleted UPSs
    for (const [id, manager] of snmpManagersRef.current.entries()) {
        if (!activeRegistryIds.has(id)) {
            manager.stopPolling();
            snmpManagersRef.current.delete(id);
            // Also clean up data
            setAllUpsData(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        }
    }

    // 2. Add/Update Managers for active UPSs
    settings.upsRegistry.forEach(upsConf => {
        let manager = snmpManagersRef.current.get(upsConf.id);
        
        // Ideally we check if config changed to recreate, but for simplicity we recreate if missing
        if (!manager) {
            manager = new SnmpManager(upsConf.targetIp, upsConf.community, upsConf.pollingInterval);
            
            manager.subscribe((newData) => {
                setAllUpsData(prev => {
                    const existing = prev[upsConf.id] || INITIAL_DATA;
                    // Detect status change for logging
                    if (newData.status && newData.status !== existing.status) {
                        addEvent(`[${upsConf.name}] Status changed to ${newData.status}`, 'WARNING', 'SYSTEM');
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

    return () => {
        // Cleanup on unmount handled by logic above or ref persistence
    };
  }, [settings.upsRegistry, isSimulating, currentUser]);

  // Auto-detect layout
  useEffect(() => {
    const model = currentUpsData.modelName;
    if (model && model !== 'Loading...' && model !== 'Unknown') {
        const detected = detectLayoutFromModel(model);
        if (detected && detected !== sysConfig.virtualRack.layoutType) {
             const newConfig = {
                 ...sysConfig,
                 virtualRack: { ...sysConfig.virtualRack, layoutType: detected }
             };
             handleUpdateConfig(newConfig); 
             addEvent(`Auto-detected UPS Model: ${model}. Switched layout to ${detected}.`, 'SUCCESS', 'SYSTEM');
        }
    }
  }, [currentUpsData.modelName]); 

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
      if (!isLogOpen) setHasNewLogs(true);
  };

  const toggleLog = () => {
      setIsLogOpen(!isLogOpen);
      if (!isLogOpen) setHasNewLogs(false);
  };

  // Simulation Loop - Applies to ACTIVE UPS only for demo purposes
  useEffect(() => {
    if (!isSimulating || !currentUser) return;
    const interval = setInterval(() => {
        setAllUpsData(prevAll => {
            const current = prevAll[activeUpsId] || INITIAL_DATA;
            const updated = {
                ...current,
                loadPercentage: Math.min(100, Math.max(0, current.loadPercentage + (Math.random() - 5) * 5)),
                outputAmps: Math.max(0, current.outputAmps + (Math.random() - 0.5)),
                realPowerW: Math.max(800, current.realPowerW + (Math.random() - 0.5) * 10),
                batteryCapacity: current.status === 'ON_BATTERY' ? Math.max(0, current.batteryCapacity - 0.5) : current.batteryCapacity
            };
            return { ...prevAll, [activeUpsId]: updated };
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulating, currentUser, activeUpsId]);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    if (lockoutEndTime && Date.now() < lockoutEndTime) return false;
    if (lockoutEndTime && Date.now() >= lockoutEndTime) setLockoutEndTime(null);

    const user = settings.users.find(u => u.username === username);
    if (user && user.password === password) {
        setFailedLoginAttempts(0);
        setLockoutEndTime(null);
        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        const newSettings = { ...settings, users: settings.users.map(u => u.id === user.id ? updatedUser : u) };
        handleUpdateSettings(newSettings); 
        setCurrentUser(updatedUser);
        setActiveTab(TabId.COMMAND_DECK);
        addEvent(`User ${username} logged in.`, 'INFO', 'USER');
        return true;
    }
    
    if (settings.security.enableBruteForceProtection) {
        const newCount = failedLoginAttempts + 1;
        if (newCount >= settings.security.maxLoginAttempts) {
            const cooldownMs = settings.security.lockoutDurationMinutes * 60 * 1000;
            setLockoutEndTime(Date.now() + cooldownMs);
            setFailedLoginAttempts(0); 
            addEvent(`System Locked: Too many failed login attempts for ${username}. Cooldown active.`, 'CRITICAL', 'SYSTEM');
        } else {
            setFailedLoginAttempts(newCount);
        }
    }
    return false;
  };

  const handleLogout = () => {
      if (currentUser) addEvent(`User ${currentUser?.username} logged out.`, 'INFO', 'USER');
      setCurrentUser(null);
  };

  const handleResetEnergy = () => {
      // Reset only for active UPS in memory (real logic would need per-ups persistence clearing)
      setAllUpsData(prev => ({
          ...prev,
          [activeUpsId]: { ...prev[activeUpsId], energyUsageKWh: 0 }
      }));
      setEnergyHistory([]);
      StorageService.saveEnergyHistory([]);
      addEvent('Lifetime Energy Counter Reset by User.', 'INFO', 'USER');
  };

  const requestSecureAction = (actionCallback: () => void, description: string = "Execute critical system change") => {
      setSecurePassword('');
      setSecureError('');
      setSecureActionState({ isOpen: true, actionCallback, description });
  };

  const confirmSecureAction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      if (securePassword === currentUser.password) {
          if (secureActionState.actionCallback) {
              secureActionState.actionCallback();
              addEvent('Secure Action Authorized & Executed.', 'SUCCESS', 'USER');
          }
          setSecureActionState({ isOpen: false, actionCallback: null, description: '' });
      } else {
          setSecureError('Invalid Password. Access Denied.');
          addEvent('Failed Security Verification for critical action.', 'WARNING', 'USER');
      }
  };

  const cancelSecureAction = () => {
      setSecureActionState({ isOpen: false, actionCallback: null, description: '' });
  };

  const handleNavigation = (target: TabId | 'LOGOUT') => {
      if (activeTab === TabId.SHUTDOWN_SEQUENCER && isSequencerDirty) {
          if (target === TabId.SHUTDOWN_SEQUENCER) return;
          setPendingAction(target === 'LOGOUT' ? { type: 'LOGOUT' } : { type: 'TAB', payload: target });
          setShowUnsavedModal(true);
          return;
      }
      if (activeTab === TabId.VIRTUAL_RACK && isRackDirty) {
          if (target === TabId.VIRTUAL_RACK) return;
          setPendingAction(target === 'LOGOUT' ? { type: 'LOGOUT' } : { type: 'TAB', payload: target });
          setShowUnsavedModal(true);
          return;
      }
      performNavigation(target);
  };

  const performNavigation = (target: TabId | 'LOGOUT') => {
      if (activeTab === TabId.SHUTDOWN_SEQUENCER) setIsSequencerDirty(false);
      if (activeTab === TabId.VIRTUAL_RACK) setIsRackDirty(false);
      if (target === 'LOGOUT') { handleLogout(); } else { setActiveTab(target); }
  };

  const confirmDiscard = () => {
      if (pendingAction) {
          if (pendingAction.type === 'LOGOUT') performNavigation('LOGOUT');
          else performNavigation(pendingAction.payload);
      }
      setShowUnsavedModal(false);
      setPendingAction(null);
  };

  const cancelNavigation = () => {
      setShowUnsavedModal(false);
      setPendingAction(null);
  };

  // Helper to update Active UPS data specifically (for simulation/diagnostics)
  const setSingleUpsData = (updater: React.SetStateAction<UPSData>) => {
      setAllUpsData(prev => {
          const current = prev[activeUpsId] || INITIAL_DATA;
          const newVal = typeof updater === 'function' ? (updater as any)(current) : updater;
          return { ...prev, [activeUpsId]: newVal };
      });
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabId.COMMAND_DECK: 
        return <CommandDeck data={currentUpsData} enableAudibleAlarms={settings.system.enableAudibleAlarms} />;
      case TabId.VIRTUAL_RACK: 
        return (
            <VirtualRack 
                config={sysConfig} 
                onUpdateConfig={handleUpdateConfig} 
                onRequestSecureAction={requestSecureAction} 
                onDirtyChange={setIsRackDirty}
                deviceStatuses={deviceStatuses} // Pass real-time status
            />
        );
      case TabId.SHUTDOWN_SEQUENCER:
        return (
            <ShutdownSequencer 
                config={sysConfig} 
                onUpdateConfig={handleUpdateConfig} 
                onDirtyChange={setIsSequencerDirty}
                deviceStatuses={deviceStatuses}
                activeCountdowns={activeCountdowns} // Pass real-time countdowns
            />
        );
      case TabId.DIAGNOSTICS: 
        return <DiagnosticsBay data={currentUpsData} config={sysConfig} setStatus={(status) => { setSingleUpsData(prev => ({ ...prev, status })); addEvent(`System status changed to ${status}`, status === 'ONLINE' ? 'SUCCESS' : 'WARNING'); }} />;
      case TabId.ENERGY_MONITOR: 
        return <EnergyMonitor data={currentUpsData} history={energyHistory} />;
      case TabId.SIMULATION:
          return <SimulationLab upsData={currentUpsData} setUpsData={setSingleUpsData} setIsSimulating={setIsSimulating} config={sysConfig} onUpdateConfig={handleUpdateConfig} />;
      case TabId.EVENTS_LOGS:
        return <EventsLog logs={eventLogs} onClearLogs={() => setEventLogs([])} />;
      case TabId.SETTINGS: 
        return <SettingsPanel settings={settings} onUpdateSettings={handleUpdateSettings} config={sysConfig} onUpdateConfig={handleUpdateConfig} upsData={currentUpsData} currentUser={currentUser} onRequestSecureAction={requestSecureAction} onResetEnergy={handleResetEnergy} />;
      default: return <CommandDeck data={currentUpsData} enableAudibleAlarms={settings.system.enableAudibleAlarms} />;
    }
  };

  const getThemeClass = () => {
      switch (settings.system.themeMode) {
          case 'MINIMAL': return 'grayscale brightness-125 contrast-125';
          case 'CLEAN': return 'theme-clean invert hue-rotate-180 brightness-105'; 
          default: return '';
      }
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} lockoutEndTime={lockoutEndTime} remainingAttempts={settings.security.maxLoginAttempts - failedLoginAttempts} />;
  }

  return (
    <>
      <style>{`
        .theme-clean img, .theme-clean video { filter: invert(1) hue-rotate(180deg); }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
      `}</style>
      <div className={`h-screen w-screen bg-charcoal text-white flex overflow-hidden font-mono select-none transition-all duration-500 ${getThemeClass()}`}>
        
        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:flex w-20 hover:w-64 bg-black border-r border-gray-800 flex-col items-start py-6 z-40 transition-all duration-300 ease-in-out group shadow-2xl">
          <div className="w-full flex items-center h-12 mb-8 px-2 overflow-hidden">
              <div className="w-16 flex-shrink-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-gray-900 border border-neon-cyan/30 rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                  </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center whitespace-nowrap">
                  <span className="text-neon-cyan font-bold font-mono text-lg tracking-widest leading-none">APC TOOLKIT</span>
                  <span className="text-[9px] text-gray-500 font-mono tracking-widest">COMMAND CORE</span>
              </div>
          </div>
          
          {/* UPS Selector */}
          <div className="w-full px-2 mb-6">
              <div className="text-[9px] text-gray-500 mb-1 pl-2 font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">ACTIVE UPS</div>
              <div className="bg-gray-900 border border-gray-700 rounded p-1">
                  {settings.upsRegistry.map(ups => (
                      <button
                        key={ups.id}
                        onClick={() => setActiveUpsId(ups.id)}
                        className={`w-full text-left px-2 py-2 mb-1 last:mb-0 rounded flex items-center gap-2 transition-all ${
                            activeUpsId === ups.id 
                                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                          <div className={`w-2 h-2 rounded-full ${allUpsData[ups.id]?.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                          <div className="overflow-hidden">
                              <div className="text-[10px] font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity delay-75">{ups.name}</div>
                              {activeUpsId === ups.id && <div className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity delay-75">{ups.targetIp}</div>}
                          </div>
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
              <NavButton label="COMMAND DECK" active={activeTab === TabId.COMMAND_DECK} onClick={() => handleNavigation(TabId.COMMAND_DECK)} icon={<IconDeck />} />
              <NavButton label="VIRTUAL RACK" active={activeTab === TabId.VIRTUAL_RACK} onClick={() => handleNavigation(TabId.VIRTUAL_RACK)} icon={<IconRack />} />
              <NavButton label="SHUTDOWN SEQ" active={activeTab === TabId.SHUTDOWN_SEQUENCER} onClick={() => handleNavigation(TabId.SHUTDOWN_SEQUENCER)} icon={<IconSequence />} />
              <NavButton label="DIAGNOSTICS" active={activeTab === TabId.DIAGNOSTICS} onClick={() => handleNavigation(TabId.DIAGNOSTICS)} icon={<IconDiag />} />
              <NavButton label="ENERGY STATS" active={activeTab === TabId.ENERGY_MONITOR} onClick={() => handleNavigation(TabId.ENERGY_MONITOR)} icon={<IconEnergy />} />
              <NavButton label="SIMULATION" active={activeTab === TabId.SIMULATION} onClick={() => handleNavigation(TabId.SIMULATION)} icon={<IconLab />} />
              <NavButton label="EVENT LOGS" active={activeTab === TabId.EVENTS_LOGS} onClick={() => handleNavigation(TabId.EVENTS_LOGS)} icon={<IconLogs />} />
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-2 w-full pb-4">
              <NavButton label="SETTINGS" active={activeTab === TabId.SETTINGS} onClick={() => handleNavigation(TabId.SETTINGS)} icon={<IconSettings />} color="text-gray-400" borderColor="border-gray-600" />
              <NavButton label="LOGOUT" active={false} onClick={() => handleNavigation('LOGOUT')} icon={<IconLogout />} color="text-red-500" borderColor="border-red-900" />
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden flex flex-col h-full">
          <header className="h-14 bg-black/50 border-b border-gray-800 flex items-center px-4 md:px-6 justify-between shrink-0">
              <h1 className="text-xs md:text-sm text-gray-400 tracking-[0.2em] uppercase">
                  {settings.upsRegistry.find(u => u.id === activeUpsId)?.name || 'UPS SYSTEM'} 
                  <span className="text-gray-600 mx-2">|</span> 
                  {activeTab.replace('_', ' ')}
              </h1>
              <div className="hidden md:flex gap-4 text-xs">
                  {isSimulating && <span className="text-neon-orange animate-pulse font-bold">[SIMULATION MODE ACTIVE]</span>}
                  <span className="text-green-500">SNMP: {settings.upsRegistry.find(u => u.id === activeUpsId)?.targetIp}</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-neon-cyan">USER: {currentUser.username} [{currentUser.role}]</span>
              </div>
              <div className="md:hidden flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentUpsData.status === 'ONLINE' ? 'bg-neon-green' : 'bg-neon-orange animate-pulse'}`}></div>
                  <span className="text-[10px] text-neon-cyan">{currentUpsData.status}</span>
                  <button onClick={() => handleNavigation('LOGOUT')} className="ml-2 text-red-500 text-xs border border-red-900 px-1 rounded">EXIT</button>
              </div>
          </header>

          {/* Protocol Notification Overlay */}
          {shutdownTriggered && (
              <div className="bg-red-900/90 text-white text-xs font-mono p-2 flex justify-between items-center border-b border-red-500 animate-pulse">
                  <span>⚠ PHOENIX PROTOCOL ACTIVE: SYSTEM SHUTDOWN IMMINENT</span>
                  <button onClick={() => setShutdownTriggered(false)} className="border border-white px-2 hover:bg-white hover:text-red-900">DISMISS</button>
              </div>
          )}

          <div className="flex-1 overflow-auto bg-charcoal pb-20 md:pb-0 relative">
              {renderContent()}

              {/* Expandable Live Log Notification Icon */}
              {activeTab !== TabId.EVENTS_LOGS && (hasNewLogs || isLogOpen) && (
                  <div className="absolute bottom-20 md:bottom-6 right-4 z-50 flex flex-col items-end">
                      {isLogOpen && (
                          <div className="mb-2 w-64 md:w-80 max-h-48 bg-black/95 border border-neon-cyan/50 rounded p-2 overflow-y-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-sm animate-fade-in-up">
                              <div className="flex justify-between items-center border-b border-gray-800 mb-1 pb-1">
                                  <span className="text-[10px] text-neon-cyan font-bold font-mono">LIVE FEED</span>
                                  <button onClick={() => setProtocolLog([])} className="text-[9px] text-gray-500 hover:text-white">CLEAR</button>
                              </div>
                              {protocolLog.length === 0 && <div className="text-[9px] text-gray-600 italic">No recent events.</div>}
                              {protocolLog.map((log, i) => (
                                  <div key={i} className="text-[9px] font-mono text-gray-300 mb-0.5 border-l-2 border-transparent hover:border-neon-cyan pl-1 transition-colors break-words">
                                      {log}
                                  </div>
                              ))}
                          </div>
                      )}
                      <button 
                          onClick={toggleLog}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all shadow-lg relative
                              ${isLogOpen ? 'bg-neon-cyan text-black border-neon-cyan' : 'bg-black text-neon-cyan border-gray-700 hover:border-neon-cyan'}
                          `}
                      >
                          <IconBell className="w-5 h-5" />
                          {hasNewLogs && !isLogOpen && (
                              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black"></span>
                          )}
                      </button>
                  </div>
              )}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur border-t border-gray-800 flex justify-around items-center z-50 px-2">
           <NavButton mobile label="DASH" active={activeTab === TabId.COMMAND_DECK} onClick={() => handleNavigation(TabId.COMMAND_DECK)} icon={<IconDeck />} />
           <NavButton mobile label="RACK" active={activeTab === TabId.VIRTUAL_RACK} onClick={() => handleNavigation(TabId.VIRTUAL_RACK)} icon={<IconRack />} />
           <NavButton mobile label="SEQ" active={activeTab === TabId.SHUTDOWN_SEQUENCER} onClick={() => handleNavigation(TabId.SHUTDOWN_SEQUENCER)} icon={<IconSequence />} />
           <NavButton mobile label="DIAG" active={activeTab === TabId.DIAGNOSTICS} onClick={() => handleNavigation(TabId.DIAGNOSTICS)} icon={<IconDiag />} />
           <NavButton mobile label="PWR" active={activeTab === TabId.ENERGY_MONITOR} onClick={() => handleNavigation(TabId.ENERGY_MONITOR)} icon={<IconEnergy />} />
           <NavButton mobile label="SIM" active={activeTab === TabId.SIMULATION} onClick={() => handleNavigation(TabId.SIMULATION)} icon={<IconLab />} />
           <NavButton mobile label="LOGS" active={activeTab === TabId.EVENTS_LOGS} onClick={() => handleNavigation(TabId.EVENTS_LOGS)} icon={<IconLogs />} />
           <NavButton mobile label="SET" active={activeTab === TabId.SETTINGS} onClick={() => handleNavigation(TabId.SETTINGS)} icon={<IconSettings />} />
        </nav>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121212] border border-neon-orange rounded-lg shadow-[0_0_30px_rgba(255,153,0,0.2)] max-w-sm w-full p-6 animate-fade-in-up relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-neon-orange"></div>
                <h3 className="text-neon-orange font-mono text-lg font-bold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    UNSAVED CHANGES
                </h3>
                <p className="text-gray-300 font-mono text-xs mb-6 leading-relaxed">
                    You have pending modifications in the {activeTab === TabId.SHUTDOWN_SEQUENCER ? 'Shutdown Sequence protocol' : 'Virtual Rack topology'}. 
                    Leaving this page will discard all changes.
                </p>
                <div className="flex flex-col gap-3">
                    <button onClick={cancelNavigation} className="w-full py-2 bg-gray-800 text-white font-mono text-xs border border-transparent hover:border-gray-500 rounded transition-colors">CANCEL (STAY)</button>
                    <button onClick={confirmDiscard} className="w-full py-2 bg-transparent text-red-500 font-mono text-xs border border-red-900 hover:bg-red-900/20 rounded transition-colors">DISCARD & LEAVE</button>
                </div>
            </div>
        </div>
      )}

      {secureActionState.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-[#0f0f0f] border border-neon-cyan rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.15)] max-w-sm w-full p-8 animate-fade-in-up relative overflow-hidden">
                  <div className="text-center mb-6">
                      <div className="inline-block p-3 rounded-full bg-neon-cyan/10 border border-neon-cyan mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <h3 className="text-neon-cyan font-mono text-lg font-bold tracking-wider">SECURITY VERIFICATION</h3>
                      <p className="text-gray-400 text-xs mt-2 font-mono">{secureActionState.description}</p>
                      <p className="text-red-400 text-[10px] mt-1 font-mono uppercase">Destructive Action Warning</p>
                  </div>
                  <form onSubmit={confirmSecureAction} className="space-y-4">
                      <div>
                          <label className="text-[10px] text-gray-500 font-mono block mb-1">ENTER PASSWORD FOR: {currentUser?.username}</label>
                          <input type="password" value={securePassword} onChange={e => { setSecurePassword(e.target.value); setSecureError(''); }} className="w-full bg-black border border-gray-700 p-2 text-white text-center tracking-widest focus:border-neon-cyan focus:outline-none transition-colors" autoFocus />
                      </div>
                      {secureError && <div className="text-red-500 text-xs font-mono text-center bg-red-900/10 py-1 border border-red-900/50 rounded">{secureError}</div>}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                          <button type="button" onClick={cancelSecureAction} className="py-2 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white font-mono text-xs transition-colors">CANCEL</button>
                          <button type="submit" className="py-2 bg-neon-cyan text-black font-bold font-mono text-xs hover:bg-white transition-colors">AUTHORIZE</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </>
  );
};

// Detect Layout Helper
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
    if (m.includes('3000')) return 'RACK_2U_8';
    if (m.includes('1500')) return 'TOWER_8';
    if (m.includes('750')) return 'TOWER_6';
    return null;
};

const NavButton: React.FC<{ label: string, active: boolean, onClick: () => void, icon: React.ReactNode, color?: string, borderColor?: string, mobile?: boolean }> = ({ label, active, onClick, icon, color = 'text-neon-cyan', borderColor = 'border-neon-cyan', mobile = false }) => {
    if (mobile) {
        return (
            <button onClick={onClick} className={`w-10 h-10 rounded flex items-center justify-center transition-all duration-300 ${active ? `bg-gray-900 border ${borderColor} ${color} shadow-[0_0_10px_rgba(0,240,255,0.2)]` : 'bg-transparent border border-transparent text-gray-600 hover:text-gray-300 hover:border-gray-700'} ${color !== 'text-neon-cyan' && !active ? color : ''}`}>
                {React.cloneElement(icon as React.ReactElement<any>, { width: 18, height: 18 })}
            </button>
        );
    }
    return (
        <button onClick={onClick} className={`relative flex items-center h-12 w-[calc(100%-1rem)] mx-2 px-3 rounded-md transition-all duration-200 overflow-hidden group/btn ${active ? `bg-gray-900 border ${borderColor} ${color} shadow-[0_0_15px_rgba(0,240,255,0.15)]` : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-200 hover:bg-gray-900/40'} ${color !== 'text-neon-cyan' && !active ? color : ''}`}>
            <div className="flex-shrink-0 flex items-center justify-center w-6">{React.cloneElement(icon as React.ReactElement<any>, { width: 20, height: 20 })}</div>
            <span className={`ml-3 font-mono text-xs font-bold tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0 ${active ? color : 'text-gray-400 group-hover/btn:text-gray-200'}`}>{label}</span>
            {active && <div className={`absolute left-0 top-2 bottom-2 w-0.5 ${color.replace('text-', 'bg-')}`}></div>}
        </button>
    );
};

export default App;
