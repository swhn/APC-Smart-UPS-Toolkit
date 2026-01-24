
import React, { useState } from 'react';
import { TabId, LogEntry, Device, SystemConfiguration } from './types';
import CommandDeck from './components/CommandDeck';
import VirtualRack from './components/VirtualRack';
import ShutdownSequencer from './components/ShutdownSequencer';
import DiagnosticsBay from './components/DiagnosticsBay';
import EnergyMonitor from './components/EnergyMonitor';
import EventsLog from './components/EventsLog';
import SettingsPanel from './components/SettingsPanel';
import SimulationLab from './components/SimulationLab';
import HelpCenter from './components/HelpCenter';
import LoginScreen from './components/LoginScreen';
import { NotificationProvider, useNotification } from './context/NotificationContext';

// Hooks
import { useSystemData } from './hooks/useSystemData';
import { useAuth } from './hooks/useAuth';
import { useUpsSystem } from './hooks/useUpsSystem';
import { usePhoenixProtocol } from './hooks/usePhoenixProtocol';

// Layout
import { AppShell } from './components/layout/AppShell';

// Icons
const IconBell = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;

const MainAppContent: React.FC = () => {
  const { notify } = useNotification();
  
  // 1. System Configuration & Logs
  const { 
      sysConfig, settings, eventLogs, protocolLog, isLogOpen, hasNewLogs, secureActionState,
      setEventLogs, setProtocolLog, setIsLogOpen, setHasNewLogs, setSecureActionState,
      addEvent, handleUpdateConfig, handleUpdateSettings, requestSecureAction, reloadConfigFromStorage
  } = useSystemData();

  // 2. Authentication
  const { 
      currentUser, failedLoginAttempts, lockoutEndTime, handleLogin, handleLogout 
  } = useAuth({ settings, handleUpdateSettings, addEvent, notify });

  // 3. UPS System Logic (Polling, Sim Physics, Energy)
  const {
      activeUpsId, setActiveUpsId, allUpsData, currentUpsData, setSingleUpsData,
      energyHistory, isUpsSimulating, setIsUpsSimulating, handleResetEnergy
  } = useUpsSystem({ settings, sysConfig, currentUser, handleUpdateConfig, addEvent, notify });

  // 4. Phoenix Protocol (Shutdown Sequencing, Device Sim)
  const {
      deviceStatuses, activeCountdowns, shutdownTriggered, isDeviceSimulating,
      setIsDeviceSimulating, setShutdownTriggered
  } = usePhoenixProtocol({ sysConfig, settings, currentUpsData, currentUser, activeUpsId, addEvent, notify });

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabId>(TabId.COMMAND_DECK);
  const [helpContext, setHelpContext] = useState<string | undefined>(undefined);
  const [isSequencerDirty, setIsSequencerDirty] = useState(false);
  const [isRackDirty, setIsRackDirty] = useState(false); 
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'TAB', payload: TabId } | { type: 'LOGOUT' } | null>(null);
  
  // Secure Action Form State (Password entry)
  const [securePassword, setSecurePassword] = useState('');
  const [secureError, setSecureError] = useState('');

  // --- Handlers ---

  const handleNavigateToHelp = (context: string) => {
      setHelpContext(context);
      setActiveTab(TabId.HELP);
  };

  const toggleLog = () => {
      setIsLogOpen(!isLogOpen);
      if (!isLogOpen) setHasNewLogs(false);
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
          setSecurePassword('');
          setSecureError('');
      } else {
          setSecureError('Invalid Password. Access Denied.');
          addEvent('Failed Security Verification for critical action.', 'WARNING', 'USER');
      }
  };

  const cancelSecureAction = () => {
      setSecureActionState({ isOpen: false, actionCallback: null, description: '' });
      setSecurePassword('');
      setSecureError('');
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
      if (target === 'LOGOUT') { handleLogout(); } else { setActiveTab(target); setHelpContext(undefined); }
  };

  const confirmDiscard = () => {
      if (pendingAction) {
          if (pendingAction.type === 'LOGOUT') performNavigation('LOGOUT');
          else performNavigation(pendingAction.payload);
      }
      setShowUnsavedModal(false);
      setPendingAction(null);
  };

  const restoreSystemConfig = async () => {
      // Reload config from storage (which should be clean of simulation artifacts)
      // This effectively "resets" the view to the real configuration
      await reloadConfigFromStorage();
      setIsDeviceSimulating(false);
      addEvent('Simulation Ends. Real configuration restored.', 'INFO', 'SYSTEM');
  };

  // Wrapper for simulation to ensure mock data isn't persisted to disk
  const handleSimulationConfigUpdate = (newConfig: SystemConfiguration) => {
      handleUpdateConfig(newConfig, false); // persist = false
  };

  const renderContent = () => {
    const deviceMap = sysConfig.virtualRack.unassignedDevices.concat(...(Object.values(sysConfig.virtualRack.outlets) as Device[][]).flat());

    switch (activeTab) {
      case TabId.COMMAND_DECK: 
        return (
            <CommandDeck 
                data={currentUpsData} 
                enableAudibleAlarms={settings.system.enableAudibleAlarms} 
                activeCountdowns={activeCountdowns}
                deviceList={deviceMap}
                onHelp={handleNavigateToHelp}
            />
        );
      case TabId.VIRTUAL_RACK: 
        return (
            <VirtualRack 
                config={sysConfig} 
                onUpdateConfig={handleUpdateConfig} 
                onRequestSecureAction={requestSecureAction} 
                onDirtyChange={setIsRackDirty}
                deviceStatuses={deviceStatuses} 
                onHelp={handleNavigateToHelp}
            />
        );
      case TabId.SHUTDOWN_SEQUENCER:
        return (
            <ShutdownSequencer 
                config={sysConfig} 
                onUpdateConfig={handleUpdateConfig} 
                onDirtyChange={setIsSequencerDirty}
                deviceStatuses={deviceStatuses}
                activeCountdowns={activeCountdowns}
                onHelp={handleNavigateToHelp}
            />
        );
      case TabId.DIAGNOSTICS: 
        return <DiagnosticsBay 
            data={currentUpsData} 
            config={sysConfig} 
            setStatus={(status) => { 
                setSingleUpsData((prev: any) => ({ ...prev, status })); 
                addEvent(`System status changed to ${status}`, status === 'ONLINE' ? 'SUCCESS' : 'WARNING'); 
            }} 
            onHelp={handleNavigateToHelp}
        />;
      case TabId.ENERGY_MONITOR: 
        return <EnergyMonitor data={currentUpsData} history={energyHistory} />;
      case TabId.SIMULATION:
          return <SimulationLab 
              upsData={currentUpsData} 
              setUpsData={setSingleUpsData} 
              isUpsSimulating={isUpsSimulating}
              setIsUpsSimulating={setIsUpsSimulating}
              isDeviceSimulating={isDeviceSimulating}
              setIsDeviceSimulating={setIsDeviceSimulating}
              config={sysConfig} 
              onUpdateConfig={handleSimulationConfigUpdate}
              onRestoreConfig={restoreSystemConfig} 
              onHelp={handleNavigateToHelp} 
          />;
      case TabId.EVENTS_LOGS:
        return <EventsLog logs={eventLogs} onClearLogs={() => setEventLogs([])} />;
      case TabId.SETTINGS: 
        return (
            <SettingsPanel 
                settings={settings} 
                onUpdateSettings={handleUpdateSettings} 
                config={sysConfig} 
                onUpdateConfig={handleUpdateConfig} 
                upsData={currentUpsData} 
                currentUser={currentUser} 
                onRequestSecureAction={requestSecureAction} 
                onResetEnergy={handleResetEnergy} 
                onLogEvent={addEvent}
                onHelp={handleNavigateToHelp}
            />
        );
      case TabId.HELP:
        return <HelpCenter context={helpContext} />;
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
    <div className={getThemeClass()}>
        <AppShell
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeUpsId={activeUpsId}
            setActiveUpsId={setActiveUpsId}
            allUpsData={allUpsData}
            settings={settings}
            handleNavigation={handleNavigation}
            isUpsSimulating={isUpsSimulating}
            isDeviceSimulating={isDeviceSimulating}
            currentUser={currentUser}
            currentUpsData={currentUpsData}
            shutdownTriggered={shutdownTriggered}
            setShutdownTriggered={setShutdownTriggered}
        >
            <div className="flex-1 overflow-auto bg-charcoal pb-20 md:pb-0 relative h-full">
                {renderContent()}

                {/* Log Overlay */}
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
        </AppShell>

        {/* --- MODALS --- */}
        
        {showUnsavedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#121212] border border-neon-orange rounded-lg shadow-[0_0_30px_rgba(255,153,0,0.2)] max-w-sm w-full p-6 animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-neon-orange"></div>
                    <h3 className="text-neon-orange font-mono text-lg font-bold mb-4 flex items-center gap-2">
                        UNSAVED CHANGES
                    </h3>
                    <p className="text-gray-300 font-mono text-xs mb-6 leading-relaxed">
                        You have pending modifications. Leaving this page will discard all changes.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => setShowUnsavedModal(false)} className="w-full py-2 bg-gray-800 text-white font-mono text-xs border border-transparent hover:border-gray-500 rounded transition-colors">CANCEL (STAY)</button>
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
    </div>
  );
};

const App: React.FC = () => (
    <NotificationProvider>
        <MainAppContent />
    </NotificationProvider>
);

export default App;
