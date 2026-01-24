
import React from 'react';
import { AppSettings, UPSData, LogEntry, SystemConfiguration } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { SectionHeader, ToggleItem, SaveButton, SelectField } from './SettingsCommon';
import { INITIAL_SYS_CONFIG } from '../../constants';

interface Props {
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    upsData: UPSData;
    onResetEnergy: () => void;
    onUpdateConfig?: (newConfig: SystemConfiguration) => void; // Added optional prop
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const SystemSettings: React.FC<Props> = ({ settings, onUpdateSettings, upsData, onResetEnergy, onUpdateConfig, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();

    const handleThemeChange = (mode: string) => {
        const newSettings = {
            ...settings,
            system: { ...settings.system, themeMode: mode as any }
        };
        onUpdateSettings(newSettings);
        notify({ type: 'INFO', message: `Theme set to ${mode}` });
    };

    const handleAlarmToggle = () => {
        const newSettings = {
            ...settings,
            system: { ...settings.system, enableAudibleAlarms: !settings.system.enableAudibleAlarms }
        };
        onUpdateSettings(newSettings);
        onLogEvent(`System Prefs: Audible alarms ${!settings.system.enableAudibleAlarms ? 'Enabled' : 'Disabled'}.`, 'INFO', 'USER');
        notify({ type: 'INFO', message: `Audible Alarms ${newSettings.system.enableAudibleAlarms ? 'Enabled' : 'Disabled'}` });
    };

    const handleSecureReset = () => {
        onRequestSecureAction(() => {
            onResetEnergy();
            onLogEvent('DATA PURGE: Energy counter reset initiated by user.', 'WARNING', 'USER');
        }, "Reset Lifetime Energy Counter");
    };

    const handleFactoryResetConfig = () => {
        if (!onUpdateConfig) return;
        onRequestSecureAction(() => {
            // Reset to the import from constants which now has empty devices
            onUpdateConfig(INITIAL_SYS_CONFIG);
            onLogEvent('FACTORY RESET: System configuration restored to default state.', 'CRITICAL', 'USER');
            notify({ type: 'SUCCESS', message: 'Configuration Reset. Rack is now empty.' });
        }, "Factory Reset System Configuration (Deletes all devices)");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Preferences */}
            <div className="bg-black/50 p-6 rounded border border-gray-800">
                <SectionHeader title="INTERFACE PREFERENCES" subtitle="Customize the dashboard behavior." onHelp={onHelp ? () => onHelp('system_theme') : undefined} />
                
                <div className="space-y-6">
                    <SelectField 
                        label="VISUAL THEME"
                        value={settings.system.themeMode}
                        onChange={handleThemeChange}
                        options={[
                            { label: 'CYBER (High Contrast Neon)', value: 'CYBER' },
                            { label: 'MINIMAL (Grayscale)', value: 'MINIMAL' },
                            { label: 'CLEAN (Inverted)', value: 'CLEAN' }
                        ]}
                    />

                    <ToggleItem 
                        label="AUDIBLE ALARMS" 
                        description="Enable browser-based audio alerts for critical events."
                        enabled={settings.system.enableAudibleAlarms} 
                        onToggle={handleAlarmToggle}
                        onHelp={onHelp ? () => onHelp('system_alarms') : undefined}
                    />
                </div>
            </div>

            {/* Right: Data Management (Danger Zone) */}
            <div className="bg-red-900/10 p-6 rounded border border-red-900/50">
                <div className="mb-6 border-b border-red-900/30 pb-2">
                    <h3 className="text-red-500 font-mono text-sm font-bold tracking-wider">DATA MANAGEMENT</h3>
                    <p className="text-[10px] text-red-300/50 font-mono mt-1">Irreversible actions.</p>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Energy Reset */}
                    <div className="flex justify-between items-center bg-black/40 p-4 rounded border border-red-900/30">
                        <div>
                            <div className="text-xs text-red-400 font-bold font-mono">LIFETIME ENERGY COUNTER</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-1">Current: <span className="text-white">{upsData.energyUsageKWh.toFixed(1)} kWh</span></div>
                        </div>
                        <button 
                            onClick={handleSecureReset}
                            className="bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-600 hover:text-white px-4 py-2 text-xs font-mono rounded transition-colors font-bold"
                        >
                            RESET
                        </button>
                    </div>

                    {/* Config Reset */}
                    {onUpdateConfig && (
                        <div className="flex justify-between items-center bg-black/40 p-4 rounded border border-red-900/30">
                            <div>
                                <div className="text-xs text-red-400 font-bold font-mono">SYSTEM CONFIGURATION</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-1 max-w-[200px]">Wipe Rack Topology and Shutdown Rules to Factory Default.</div>
                            </div>
                            <button 
                                onClick={handleFactoryResetConfig}
                                className="bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-600 hover:text-white px-4 py-2 text-xs font-mono rounded transition-colors font-bold"
                            >
                                FACTORY RESET
                            </button>
                        </div>
                    )}
                    
                    <div className="p-3 text-[10px] text-gray-500 font-mono italic text-center">
                        Note: Resetting the counter does not affect the physical UPS hardware logs, only the local dashboard history.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
