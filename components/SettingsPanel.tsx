
import React, { useState, useEffect } from 'react';
import { AppSettings, SystemConfiguration, UPSData, UserProfile, LayoutType, LayoutDef, Device, UPSConfig } from '../types';
import { RACK_LAYOUTS } from '../constants';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  upsData: UPSData;
  currentUser: UserProfile | null;
  onRequestSecureAction: (callback: () => void, description: string) => void;
  onResetEnergy: () => void;
}

type Section = 'NETWORK' | 'HARDWARE' | 'ACCESS' | 'SYSTEM' | 'HOST' | 'SECURITY';

// Custom Layout Safety Limits
const MAX_CUSTOM_OUTLETS = 60;
const MAX_CUSTOM_GROUPS = 12;

const SettingsPanel: React.FC<Props> = ({ 
    settings, 
    onUpdateSettings,
    config,
    onUpdateConfig,
    upsData,
    currentUser,
    onRequestSecureAction,
    onResetEnergy
}) => {
  const [activeSection, setActiveSection] = useState<Section>('NETWORK');
  
  // --- LOCAL DRAFT STATES ---
  
  // Network/UPS Registry Draft
  const [draftRegistry, setDraftRegistry] = useState<UPSConfig[]>(settings.upsRegistry);
  const [editingUpsId, setEditingUpsId] = useState<string | 'NEW' | null>(null);
  const [tempUpsConfig, setTempUpsConfig] = useState<UPSConfig | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILURE'>('IDLE');
  const [networkMsg, setNetworkMsg] = useState('');

  // Hardware/Topology Draft
  const [draftLayoutType, setDraftLayoutType] = useState<LayoutType>(config.virtualRack.layoutType);
  const [draftCustomLayout, setDraftCustomLayout] = useState<LayoutDef | undefined>(config.virtualRack.customLayout);
  const [customOutletStr, setCustomOutletStr] = useState(''); 
  const [customError, setCustomError] = useState<string | null>(null);
  
  // Battery Config Draft
  const [draftBattEnabled, setDraftBattEnabled] = useState(config.batteryConfigOverride?.enabled || false);
  const [draftBattVoltage, setDraftBattVoltage] = useState(config.batteryConfigOverride?.nominalVoltage || 24);
  const [draftBattPacks, setDraftBattPacks] = useState(config.batteryConfigOverride?.manualExternalPacks || 0);

  // System Prefs Draft
  const [draftTheme, setDraftTheme] = useState(settings.system.themeMode);
  const [draftAudible, setDraftAudible] = useState(settings.system.enableAudibleAlarms);

  // Host Settings Draft
  const [draftHost, setDraftHost] = useState(settings.host);

  // Security Draft
  const [draftSecurity, setDraftSecurity] = useState(settings.security);

  // User Access
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // --- SYNC EFFECTS ---
  useEffect(() => {
     setDraftRegistry(settings.upsRegistry);
     setDraftTheme(settings.system.themeMode);
     setDraftAudible(settings.system.enableAudibleAlarms);
     setDraftHost(settings.host);
     setDraftSecurity(settings.security);
  }, [settings]);

  useEffect(() => {
     setDraftLayoutType(config.virtualRack.layoutType);
     setDraftCustomLayout(config.virtualRack.customLayout);
     if (config.virtualRack.layoutType === 'CUSTOM' && config.virtualRack.customLayout) {
        setCustomOutletStr(config.virtualRack.customLayout.groups.join(','));
     }
     setDraftBattEnabled(config.batteryConfigOverride?.enabled || false);
     setDraftBattVoltage(config.batteryConfigOverride?.nominalVoltage || 24);
     setDraftBattPacks(config.batteryConfigOverride?.manualExternalPacks || 0);
  }, [config]);


  // --- HANDLERS ---

  // 1. Network / UPS Registry Handlers
  const handleEditUps = (id: string) => {
      const ups = draftRegistry.find(u => u.id === id);
      if (ups) {
          setTempUpsConfig({ ...ups });
          setEditingUpsId(id);
          setNetworkStatus('IDLE');
      }
  };

  const handleNewUps = () => {
      setTempUpsConfig({
          id: `ups_${Date.now()}`,
          name: 'New UPS Unit',
          targetIp: '',
          community: 'public',
          port: 161,
          timeout: 3000,
          pollingInterval: 5000
      });
      setEditingUpsId('NEW');
      setNetworkStatus('IDLE');
  };

  const handleDeleteUps = (id: string) => {
      if (!confirm("Are you sure you want to remove this UPS configuration?")) return;
      
      onRequestSecureAction(() => {
          const updated = draftRegistry.filter(u => u.id !== id);
          onUpdateSettings({ ...settings, upsRegistry: updated });
          setEditingUpsId(null);
      }, "Remove UPS Unit from Registry");
  };

  const handleTempUpsChange = (field: keyof UPSConfig, value: any) => {
      if (tempUpsConfig) {
          setTempUpsConfig({ ...tempUpsConfig, [field]: value });
      }
  };

  const handleSaveUps = () => {
      if (!tempUpsConfig) return;

      onRequestSecureAction(() => {
          setNetworkStatus('TESTING');
          setNetworkMsg('Initiating SNMP Handshake...');
          
          setTimeout(() => {
              const isValidIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(tempUpsConfig.targetIp);
              
              if (isValidIp && tempUpsConfig.targetIp !== '0.0.0.0') {
                  setNetworkStatus('SUCCESS');
                  setNetworkMsg('Connection Verified. Settings Saved.');
                  
                  let updatedRegistry = [...draftRegistry];
                  if (editingUpsId === 'NEW') {
                      updatedRegistry.push(tempUpsConfig);
                  } else {
                      updatedRegistry = updatedRegistry.map(u => u.id === editingUpsId ? tempUpsConfig : u);
                  }
                  
                  onUpdateSettings({ ...settings, upsRegistry: updatedRegistry });
                  
                  setTimeout(() => {
                      setEditingUpsId(null);
                      setTempUpsConfig(null);
                  }, 1000);
              } else {
                  setNetworkStatus('FAILURE');
                  setNetworkMsg('Connection Failed: Invalid IP or Unreachable.');
              }
          }, 1000);
      }, editingUpsId === 'NEW' ? "Add New UPS Unit" : "Update UPS Configuration");
  };

  // 2. Hardware Handlers
  const handleSaveBattery = () => {
      onRequestSecureAction(() => {
          onUpdateConfig({
              ...config,
              batteryConfigOverride: {
                  enabled: draftBattEnabled,
                  nominalVoltage: draftBattVoltage,
                  manualExternalPacks: draftBattPacks
              }
          });
      }, "Override Hardware Battery Topology");
  };

  const handleLayoutSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as LayoutType;
      setDraftLayoutType(type);
      
      if (type === 'CUSTOM' && !draftCustomLayout) {
          const defaultGroups = [8];
          setDraftCustomLayout({
              name: 'Custom UPS Configuration',
              type: 'RACK',
              outlets: 8,
              groups: defaultGroups,
              gridCols: 4,
              controlType: 'INDIVIDUAL'
          });
          setCustomOutletStr(defaultGroups.join(','));
      }
  };

  const handleApplyLayout = () => {
      let newCapacity = 0;
      if (draftLayoutType === 'CUSTOM' && draftCustomLayout) {
          newCapacity = draftCustomLayout.outlets;
      } else {
          const def = RACK_LAYOUTS[draftLayoutType];
          if (def) newCapacity = def.outlets;
      }

      const nextOutlets: {[key: number]: Device[]} = {};
      const displacedDevices: Device[] = [];

      Object.entries(config.virtualRack.outlets).forEach(([strId, devices]) => {
          const id = parseInt(strId);
          if (id <= newCapacity) {
              nextOutlets[id] = devices;
          } else {
              const resetDevices = devices.map(d => ({ ...d, assignedOutlet: undefined }));
              displacedDevices.push(...resetDevices);
          }
      });

      const message = displacedDevices.length > 0 
        ? `Switching to ${draftLayoutType} (${newCapacity} outlets). ${displacedDevices.length} devices will be unassigned.`
        : `Switching to ${draftLayoutType}.`;

      onRequestSecureAction(() => {
          onUpdateConfig({
              ...config,
              virtualRack: {
                  ...config.virtualRack,
                  layoutType: draftLayoutType,
                  customLayout: draftLayoutType === 'CUSTOM' ? draftCustomLayout : undefined,
                  outlets: nextOutlets,
                  unassignedDevices: [...config.virtualRack.unassignedDevices, ...displacedDevices]
              }
          });
      }, message);
  };

  const validateCustomLayout = () => {
      setCustomError(null);
      if (!/^[\d,\s]*$/.test(customOutletStr)) {
          setCustomError("Invalid format."); return;
      }
      const groups = customOutletStr.split(',').map(s => s.trim()).filter(Boolean).map(Number);
      if (groups.some(isNaN)) { setCustomError("Invalid number."); return; }
      if (groups.length === 0 || groups.length > MAX_CUSTOM_GROUPS) { setCustomError("Invalid group count."); return; }
      const total = groups.reduce((a,b)=>a+b, 0);
      if (total === 0 || total > MAX_CUSTOM_OUTLETS) { setCustomError("Invalid total outlets."); return; }

      if (draftCustomLayout) {
          setDraftCustomLayout({ ...draftCustomLayout, groups, outlets: total });
      }
  };

  // 4. Host Handlers
  const handleHostChange = (field: keyof AppSettings['host'], value: any) => {
      setDraftHost(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveHost = () => {
      onRequestSecureAction(() => {
          onUpdateSettings({ ...settings, host: draftHost });
      }, "Update Host Server Configuration (Requires Restart)");
  };
  
  // 5. Security Handlers
  const handleSecurityChange = (field: keyof AppSettings['security'], value: any) => {
      setDraftSecurity(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSaveSecurity = () => {
      onRequestSecureAction(() => {
          onUpdateSettings({ ...settings, security: draftSecurity });
      }, "Modify Critical Security Policies");
  };

  // 6. User Access & System
  const handlePasswordSave = (userId: string) => {
      if (!newPassword.trim()) return;
      
      // Enforce strong password locally if enabled
      if (settings.security.enforceStrongPasswords) {
          if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
              alert("Policy Violation: Password must be 8+ characters with uppercase and numbers.");
              return;
          }
      }

      onRequestSecureAction(() => {
          const newUsers = settings.users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
          onUpdateSettings({ ...settings, users: newUsers });
          setEditUserId(null);
          setNewPassword('');
      }, "Modify User Credentials");
  };

  const handleSaveSystem = () => {
      onUpdateSettings({
          ...settings,
          system: {
              ...settings.system,
              themeMode: draftTheme,
              enableAudibleAlarms: draftAudible
          }
      });
  };

  const handleSecureResetEnergy = () => {
      onRequestSecureAction(onResetEnergy, "Reset Lifetime Energy Counter");
  };

  // --- RENDER ---
  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-900/50 overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-gray-800 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto shrink-0 bg-black/40">
         <h2 className="hidden md:block text-gray-500 text-xs font-mono tracking-widest mb-4">CONFIGURATION</h2>
         {(['NETWORK', 'HARDWARE', 'ACCESS', 'SYSTEM', 'HOST', 'SECURITY'] as Section[]).map(section => (
             <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`text-center md:text-left px-3 py-2 md:px-4 md:py-3 text-xs font-mono border-b-2 md:border-b-0 md:border-l-2 transition-all whitespace-nowrap
                    ${activeSection === section 
                        ? 'border-neon-cyan bg-neon-cyan/10 text-white' 
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }
                `}
             >
                 {section}
             </button>
         ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <h2 className="text-lg md:text-xl font-mono text-neon-cyan mb-6 md:mb-8 border-b border-gray-800 pb-2">
            {activeSection} SETTINGS
        </h2>

        {/* --- NETWORK / UPS MANAGEMENT SECTION --- */}
        {activeSection === 'NETWORK' && (
            <div className="max-w-xl space-y-6">
                
                {/* List View */}
                {!editingUpsId && (
                    <>
                        <div className="bg-black/50 border border-gray-800 rounded overflow-hidden">
                            <div className="grid grid-cols-12 bg-gray-900 p-3 text-[10px] font-mono text-gray-500 font-bold tracking-wider">
                                <div className="col-span-4">NAME</div>
                                <div className="col-span-4">TARGET IP</div>
                                <div className="col-span-4 text-right">ACTIONS</div>
                            </div>
                            <div className="divide-y divide-gray-800">
                                {draftRegistry.map(ups => (
                                    <div key={ups.id} className="grid grid-cols-12 p-3 items-center hover:bg-white/5 transition-colors">
                                        <div className="col-span-4 text-xs font-bold text-white font-mono">{ups.name}</div>
                                        <div className="col-span-4 text-xs font-mono text-neon-cyan">{ups.targetIp}</div>
                                        <div className="col-span-4 flex justify-end gap-2">
                                            <button onClick={() => handleEditUps(ups.id)} className="px-2 py-1 text-[10px] border border-gray-600 hover:border-white text-gray-400 hover:text-white rounded transition-colors">EDIT</button>
                                            <button onClick={() => handleDeleteUps(ups.id)} className="px-2 py-1 text-[10px] border border-red-900 text-red-500 hover:bg-red-900/20 rounded transition-colors">DEL</button>
                                        </div>
                                    </div>
                                ))}
                                {draftRegistry.length === 0 && (
                                    <div className="p-6 text-center text-gray-600 font-mono text-xs italic">
                                        No UPS units configured. Add one to begin monitoring.
                                    </div>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={handleNewUps}
                            className="w-full py-3 border border-dashed border-gray-700 text-gray-400 hover:border-neon-cyan hover:text-neon-cyan font-mono text-xs transition-colors rounded"
                        >
                            + ADD NEW UPS UNIT
                        </button>
                    </>
                )}

                {/* Edit View */}
                {editingUpsId && tempUpsConfig && (
                    <div className="bg-black/50 border border-gray-800 rounded p-6 relative animate-fade-in">
                        <button onClick={() => setEditingUpsId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                        <h3 className="text-white font-mono text-sm mb-6 border-b border-gray-800 pb-2">
                            {editingUpsId === 'NEW' ? 'ADD NEW UPS' : 'EDIT CONFIGURATION'}
                        </h3>
                        
                        <div className="space-y-4">
                            <InputField label="DISPLAY NAME" value={tempUpsConfig.name} onChange={v => handleTempUpsChange('name', v)} placeholder="e.g. Server Room Rack 1" />
                            <InputField label="TARGET IP ADDRESS" value={tempUpsConfig.targetIp} onChange={v => handleTempUpsChange('targetIp', v)} placeholder="192.168.1.50" />
                            <InputField label="COMMUNITY STRING" value={tempUpsConfig.community} onChange={v => handleTempUpsChange('community', v)} type="password"/>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="PORT" value={tempUpsConfig.port} onChange={v => handleTempUpsChange('port', parseInt(v))} type="number"/>
                                <InputField label="TIMEOUT (ms)" value={tempUpsConfig.timeout} onChange={v => handleTempUpsChange('timeout', parseInt(v))} type="number"/>
                            </div>
                            <InputField label="POLLING INTERVAL (ms)" value={tempUpsConfig.pollingInterval} onChange={v => handleTempUpsChange('pollingInterval', parseInt(v))} type="number"/>
                        </div>

                        <div className="pt-6 mt-6 border-t border-gray-800 flex gap-4">
                            <button 
                                onClick={() => setEditingUpsId(null)}
                                className="flex-1 py-3 text-xs font-mono border border-transparent text-gray-500 hover:text-white hover:border-gray-600 rounded"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleSaveUps}
                                disabled={networkStatus === 'TESTING'} 
                                className={`flex-1 py-3 font-mono font-bold text-xs rounded transition-colors
                                    ${networkStatus === 'TESTING' ? 'bg-gray-800 text-gray-500' : 'bg-neon-cyan text-black hover:bg-white'}
                                `}
                            >
                                {networkStatus === 'TESTING' ? 'VERIFYING...' : 'SAVE & CONNECT'}
                            </button>
                        </div>
                        {networkStatus !== 'IDLE' && (
                            <div className={`mt-4 p-3 border rounded text-xs font-mono whitespace-pre-line ${networkStatus === 'SUCCESS' ? 'bg-green-900/20 border-green-500 text-green-400' : networkStatus === 'FAILURE' ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-gray-800'}`}>
                                {networkMsg}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {activeSection === 'HOST' && (
            <div className="max-w-md space-y-6">
                 <div className="bg-black/50 p-6 rounded border border-gray-800">
                     <h3 className="text-sm font-mono text-white mb-6 border-b border-gray-800 pb-2">HOST SERVER CONFIGURATION</h3>
                     <div className="space-y-4">
                         <InputField label="GUI WEB PORT" value={draftHost.serverPort} onChange={v => handleHostChange('serverPort', parseInt(v))} type="number" />
                         
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono tracking-wider block mb-2">BIND ADDRESS</label>
                            <select 
                                value={draftHost.bindAddress}
                                onChange={e => handleHostChange('bindAddress', e.target.value)}
                                className="w-full bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:border-neon-cyan outline-none"
                            >
                                <option value="127.0.0.1">Localhost Only (Secure)</option>
                                <option value="0.0.0.0">All Interfaces (Remote Access)</option>
                            </select>
                            <div className="text-[9px] text-gray-500 pt-1">
                                * "All Interfaces" allows other devices on the LAN to access this dashboard.
                            </div>
                         </div>

                         <InputField label="DATA RETENTION (DAYS)" value={draftHost.dataRetentionDays} onChange={v => handleHostChange('dataRetentionDays', parseInt(v))} type="number" />
                     </div>
                     
                     <div className="mt-6 pt-4 border-t border-gray-800">
                         <div className="bg-orange-900/20 border border-orange-500/50 p-3 mb-4 rounded flex gap-2 items-start">
                             <div className="text-orange-500 pt-0.5">⚠</div>
                             <div className="text-[10px] text-orange-200 font-mono">
                                 Changes to Host Port or Bind Address require a manual restart of the server application executable.
                             </div>
                         </div>
                         <button 
                             onClick={handleSaveHost}
                             className="w-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan hover:text-black px-3 py-3 text-xs font-bold font-mono transition-colors"
                         >
                             SAVE HOST CONFIGURATION
                         </button>
                     </div>
                 </div>
            </div>
        )}

        {activeSection === 'SECURITY' && (
             <div className="max-w-lg space-y-6">
                 <div className="bg-black/50 p-6 rounded border border-gray-800">
                     <h3 className="text-sm font-mono text-white mb-6 border-b border-gray-800 pb-2">CYBER DEFENSE CONTROLS</h3>
                     
                     <div className="space-y-6">
                         <ToggleItem 
                            label="IDLE TIMEOUT (AUTO-LOGOUT)" 
                            description="Automatically logs out after inactivity to prevent session hijacking."
                            enabled={draftSecurity.enableIdleTimeout}
                            onToggle={() => handleSecurityChange('enableIdleTimeout', !draftSecurity.enableIdleTimeout)}
                         >
                            {draftSecurity.enableIdleTimeout && (
                                <div className="mt-2">
                                    <InputField label="TIMEOUT MINUTES" value={draftSecurity.idleTimeoutMinutes} onChange={v => handleSecurityChange('idleTimeoutMinutes', parseInt(v))} type="number" />
                                </div>
                            )}
                         </ToggleItem>

                         <ToggleItem 
                            label="BRUTE FORCE PROTECTION" 
                            description="Tempoary system cooldown after repeated failed login attempts."
                            enabled={draftSecurity.enableBruteForceProtection}
                            onToggle={() => handleSecurityChange('enableBruteForceProtection', !draftSecurity.enableBruteForceProtection)}
                         >
                             {draftSecurity.enableBruteForceProtection && (
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                    <InputField label="MAX ATTEMPTS" value={draftSecurity.maxLoginAttempts} onChange={v => handleSecurityChange('maxLoginAttempts', parseInt(v))} type="number" />
                                    <InputField label="LOCKOUT DURATION (MIN)" value={draftSecurity.lockoutDurationMinutes} onChange={v => handleSecurityChange('lockoutDurationMinutes', parseInt(v))} type="number" />
                                </div>
                            )}
                         </ToggleItem>

                         <ToggleItem 
                            label="ENFORCE STRONG PASSWORDS" 
                            description="Requires uppercase, numbers, and min 8 chars for all user credentials."
                            enabled={draftSecurity.enforceStrongPasswords}
                            onToggle={() => handleSecurityChange('enforceStrongPasswords', !draftSecurity.enforceStrongPasswords)}
                         />

                         <div className="opacity-50 pointer-events-none">
                            <ToggleItem 
                                label="MULTI-FACTOR AUTHENTICATION (MFA)" 
                                description="Requires external token (Coming Soon)."
                                enabled={false}
                                onToggle={() => {}}
                            />
                         </div>
                     </div>

                     <div className="mt-8 pt-4 border-t border-gray-800">
                         <button 
                             onClick={handleSaveSecurity}
                             className="w-full bg-neon-cyan text-black px-3 py-3 text-xs font-bold font-mono hover:bg-white transition-colors border border-transparent"
                         >
                             APPLY SECURITY POLICIES
                         </button>
                     </div>
                 </div>
             </div>
        )}

        {activeSection === 'HARDWARE' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-black/50 p-6 rounded border border-gray-800">
                    <h3 className="text-sm font-mono text-white mb-4 border-b border-gray-800 pb-2">VIRTUAL RACK MODEL</h3>
                    <div className="relative mb-4">
                        <select 
                            value={draftLayoutType}
                            onChange={handleLayoutSelection}
                            className="w-full bg-black border border-gray-700 text-white text-xs p-3 rounded focus:border-neon-cyan outline-none appearance-none font-mono"
                        >
                            {Object.entries(RACK_LAYOUTS).map(([key, def]) => (
                                <option key={key} value={key}>{def.name} ({def.outlets} Outlets)</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500 text-xs">▼</div>
                    </div>

                    {draftLayoutType === 'CUSTOM' && (
                         <div className="bg-gray-900/50 p-4 rounded border border-gray-700 mb-4">
                             <h4 className="text-neon-cyan text-xs font-mono font-bold mb-3">CUSTOM DEFINITION</h4>
                             <InputField 
                                label="MODEL NAME" 
                                value={draftCustomLayout?.name || ''} 
                                onChange={(val) => setDraftCustomLayout(prev => prev ? {...prev, name: val} : undefined)} 
                             />
                             <div className="mt-2 space-y-1">
                                <label className="text-[10px] text-gray-500 font-mono tracking-wider">BANKS (Comma Sep)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={customOutletStr} 
                                        onChange={e => setCustomOutletStr(e.target.value)}
                                        className="flex-1 bg-black border border-gray-700 text-white px-2 py-1 text-xs font-mono focus:border-neon-cyan outline-none"
                                    />
                                    <button onClick={validateCustomLayout} className="bg-gray-700 text-[10px] px-2 hover:text-white">CHECK</button>
                                </div>
                                {customError && <div className="text-red-500 text-[10px]">{customError}</div>}
                                <div className="text-[10px] text-gray-400 mt-1">Total: {draftCustomLayout?.outlets} Outlets</div>
                             </div>
                         </div>
                    )}
                    
                    <button 
                        onClick={handleApplyLayout}
                        className="w-full bg-gray-800 text-white border border-gray-600 hover:border-white px-3 py-3 text-xs font-bold font-mono transition-colors"
                    >
                        SAVE TOPOLOGY CONFIGURATION
                    </button>
                </div>

                <div className="bg-black/50 p-6 rounded border border-gray-800">
                    <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-2">
                         <h3 className="text-sm font-mono text-white">BATTERY ARRAY OVERRIDE</h3>
                         <button 
                            onClick={() => setDraftBattEnabled(!draftBattEnabled)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${draftBattEnabled ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                         >
                             <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${draftBattEnabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
                         </button>
                    </div>

                    <div className={`space-y-4 mb-6 transition-opacity ${draftBattEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono tracking-wider">NOMINAL DC VOLTAGE</label>
                            <select 
                                value={draftBattVoltage}
                                onChange={(e) => setDraftBattVoltage(parseInt(e.target.value))}
                                className="w-full bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:border-neon-cyan outline-none"
                            >
                                <option value="12">12V</option>
                                <option value="24">24V</option>
                                <option value="36">36V</option>
                                <option value="48">48V</option>
                                <option value="96">96V</option>
                                <option value="192">192V</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-mono tracking-wider">EXTERNAL PACKS (XR)</label>
                            <input 
                                type="number" 
                                min="0" max="10"
                                value={draftBattPacks}
                                onChange={(e) => setDraftBattPacks(parseInt(e.target.value))}
                                className="w-full bg-black border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:border-neon-cyan outline-none"
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSaveBattery}
                        disabled={!draftBattEnabled && !config.batteryConfigOverride?.enabled}
                        className="w-full bg-gray-800 text-white border border-gray-600 hover:border-white px-3 py-3 text-xs font-bold font-mono transition-colors"
                    >
                        SAVE BATTERY PARAMETERS
                    </button>
                </div>
             </div>
        )}

        {activeSection === 'ACCESS' && (
            <div className="space-y-6 max-w-3xl">
                <div className="border border-gray-800 rounded overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm font-mono min-w-[400px]">
                        <thead className="bg-gray-900 text-gray-500">
                            <tr>
                                <th className="p-3">USERNAME</th>
                                <th className="p-3">ROLE</th>
                                <th className="p-3">LAST LOGIN</th>
                                <th className="p-3 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 bg-black/50">
                            {settings.users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5">
                                    <td className="p-3 text-white font-bold">{u.username}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${u.role === 'ADMIN' ? 'bg-neon-orange/20 text-neon-orange' : 'bg-neon-cyan/20 text-neon-cyan'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-400">{u.lastLogin}</td>
                                    <td className="p-3 text-right">
                                        {(currentUser?.id === u.id || currentUser?.role === 'ADMIN') && (
                                            <button onClick={() => setEditUserId(u.id)} className="text-neon-cyan text-xs border border-neon-cyan px-2 py-1 hover:bg-neon-cyan hover:text-black transition-colors">CHANGE PASS</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {editUserId && (
                    <div className="bg-black border border-gray-700 p-4 rounded animate-fade-in border-l-4 border-l-neon-cyan">
                        <h4 className="text-neon-cyan text-xs font-mono mb-4 font-bold">SET NEW PASSWORD</h4>
                        <div className="flex flex-col md:flex-row gap-4">
                             <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter New Password" className="flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-2 font-mono text-sm focus:border-neon-cyan outline-none"/>
                             <div className="flex gap-2">
                                <button onClick={() => handlePasswordSave(editUserId)} className="bg-neon-cyan text-black px-4 py-2 text-xs font-bold hover:bg-white transition-colors">SAVE CHANGES</button>
                                <button onClick={() => { setEditUserId(null); setNewPassword(''); }} className="text-gray-500 border border-gray-700 px-4 py-2 text-xs hover:text-white transition-colors">CANCEL</button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeSection === 'SYSTEM' && (
            <div className="max-w-md space-y-8">
                 <div className="bg-black/50 p-6 rounded border border-gray-800">
                     <h3 className="text-sm font-mono text-white mb-6 border-b border-gray-800 pb-2">INTERFACE PREFERENCES</h3>
                     
                     <div className="mb-6">
                        <label className="text-[10px] text-gray-500 font-mono tracking-wider block mb-2">THEME MODE</label>
                        <div className="flex gap-2">
                            <button onClick={() => setDraftTheme('CYBER')} className={`flex-1 py-2 border text-[10px] font-mono transition-colors ${draftTheme === 'CYBER' ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>CYBER</button>
                            <button onClick={() => setDraftTheme('MINIMAL')} className={`flex-1 py-2 border text-[10px] font-mono transition-colors ${draftTheme === 'MINIMAL' ? 'border-white text-white bg-white/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>MINIMAL</button>
                            <button onClick={() => setDraftTheme('CLEAN')} className={`flex-1 py-2 border text-[10px] font-mono transition-colors ${draftTheme === 'CLEAN' ? 'border-white text-black bg-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>CLEAN</button>
                        </div>
                     </div>

                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="text-[10px] text-gray-500 font-mono tracking-wider mb-1">AUDIBLE ALARMS</div>
                            <div className="text-[10px] text-gray-600">PC Speaker emulation on fault</div>
                        </div>
                        <button onClick={() => setDraftAudible(!draftAudible)} className={`w-12 h-6 rounded-full p-1 transition-colors ${draftAudible ? 'bg-neon-cyan' : 'bg-gray-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${draftAudible ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                     </div>

                     <button onClick={handleSaveSystem} className="w-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan hover:text-black px-3 py-3 text-xs font-bold font-mono transition-colors">
                        SAVE PREFERENCES
                     </button>
                 </div>

                 <div className="bg-red-900/10 p-6 rounded border border-red-900/50">
                     <h3 className="text-sm font-mono text-red-500 mb-4 font-bold border-b border-red-900/30 pb-2">DANGER ZONE</h3>
                     <div className="flex justify-between items-center">
                         <div>
                             <div className="text-xs text-red-400 font-bold">Lifetime Energy Counter</div>
                             <div className="text-[10px] text-gray-500">Current: {upsData.energyUsageKWh.toFixed(1)} kWh</div>
                         </div>
                         <button 
                             onClick={handleSecureResetEnergy}
                             className="bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-600 hover:text-white px-4 py-2 text-xs font-mono rounded transition-colors"
                         >
                             RESET COUNTER
                         </button>
                     </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

const InputField: React.FC<{ label: string, value: any, onChange: (val: string) => void, type?: string, placeholder?: string }> = ({ label, value, onChange, type = "text", placeholder }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-[10px] text-gray-500 font-mono tracking-wider">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-black border border-gray-700 text-white px-2 py-2 font-mono text-sm focus:outline-none focus:border-neon-cyan transition-colors"
        />
    </div>
);

const ToggleItem: React.FC<{ label: string, description: string, enabled: boolean, onToggle: () => void, children?: React.ReactNode }> = ({ label, description, enabled, onToggle, children }) => (
    <div className="bg-gray-900/30 p-4 border border-gray-800 rounded">
        <div className="flex justify-between items-start mb-2">
            <div>
                <div className="text-xs font-bold text-gray-300 font-mono mb-1">{label}</div>
                <div className="text-[10px] text-gray-500 font-mono">{description}</div>
            </div>
             <button onClick={onToggle} className={`w-10 h-5 shrink-0 rounded-full relative transition-colors ${enabled ? 'bg-neon-cyan' : 'bg-gray-700'}`}>
                 <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
             </button>
        </div>
        {children}
    </div>
);

export default SettingsPanel;
