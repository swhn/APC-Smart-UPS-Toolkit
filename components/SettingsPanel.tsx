
import React, { useState } from 'react';
import { AppSettings, SystemConfiguration, UPSData, UserProfile, LogEntry } from '../types';
import NetworkSettings from './settings/NetworkSettings';
import HardwareSettings from './settings/HardwareSettings';
import AccessSettings from './settings/AccessSettings';
import SystemSettings from './settings/SystemSettings';
import HostSettings from './settings/HostSettings';
import SecuritySettings from './settings/SecuritySettings';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  upsData: UPSData;
  currentUser: UserProfile | null;
  onRequestSecureAction: (callback: () => void, description: string) => void;
  onResetEnergy: () => void;
  onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
  onHelp?: (context: string) => void;
}

type Section = 'NETWORK' | 'HARDWARE' | 'ACCESS' | 'SYSTEM' | 'HOST' | 'SECURITY';

const SettingsPanel: React.FC<Props> = (props) => {
  const [activeSection, setActiveSection] = useState<Section>('NETWORK');

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-900/50 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-gray-800 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto shrink-0 bg-black/40">
         <h2 className="hidden md:block text-gray-500 text-xs font-mono tracking-widest mb-4">CONFIGURATION</h2>
         {(['NETWORK', 'HARDWARE', 'ACCESS', 'SYSTEM', 'HOST', 'SECURITY'] as Section[]).map(section => (
             <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`text-center md:text-left px-3 py-2 md:px-4 md:py-3 text-xs font-mono border-b-2 md:border-b-0 md:border-l-2 transition-all whitespace-nowrap outline-none
                    ${activeSection === section 
                        ? 'border-neon-cyan bg-neon-cyan/10 text-white shadow-[inset_4px_0_0_0_#00F0FF] md:shadow-[inset_2px_0_0_0_#00F0FF]' 
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }
                `}
             >
                 {section}
             </button>
         ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <h2 className="text-lg md:text-xl font-mono text-neon-cyan mb-6 md:mb-8 border-b border-gray-800 pb-2">
            {activeSection} SETTINGS
        </h2>

        {/* Dynamic Component Rendering */}
        <div className="animate-fade-in">
            {activeSection === 'NETWORK' && (
                <NetworkSettings 
                    settings={props.settings} 
                    onUpdateSettings={props.onUpdateSettings} 
                    onRequestSecureAction={props.onRequestSecureAction} 
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}

            {activeSection === 'HARDWARE' && (
                <HardwareSettings 
                    config={props.config}
                    onUpdateConfig={props.onUpdateConfig}
                    onRequestSecureAction={props.onRequestSecureAction}
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}

            {activeSection === 'ACCESS' && (
                <AccessSettings 
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    currentUser={props.currentUser}
                    onRequestSecureAction={props.onRequestSecureAction}
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}

            {activeSection === 'SYSTEM' && (
                <SystemSettings 
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    upsData={props.upsData}
                    onResetEnergy={props.onResetEnergy}
                    onRequestSecureAction={props.onRequestSecureAction}
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}

            {activeSection === 'HOST' && (
                <HostSettings 
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    onRequestSecureAction={props.onRequestSecureAction}
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}

            {activeSection === 'SECURITY' && (
                <SecuritySettings 
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    onRequestSecureAction={props.onRequestSecureAction}
                    onLogEvent={props.onLogEvent}
                    onHelp={props.onHelp}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
