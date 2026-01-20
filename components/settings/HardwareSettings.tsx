
import React, { useState, useEffect } from 'react';
import { SystemConfiguration, LayoutType, LayoutDef, Device, LogEntry } from '../../types';
import { RACK_LAYOUTS } from '../../constants';
import { useNotification } from '../../context/NotificationContext';
import { InputField, SectionHeader, SelectField, SaveButton, ToggleItem } from './SettingsCommon';

interface Props {
    config: SystemConfiguration;
    onUpdateConfig: (newConfig: SystemConfiguration) => void;
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const MAX_CUSTOM_OUTLETS = 60;
const MAX_CUSTOM_GROUPS = 12;

const HardwareSettings: React.FC<Props> = ({ config, onUpdateConfig, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();

    // Draft State
    const [draftLayoutType, setDraftLayoutType] = useState<LayoutType>(config.virtualRack.layoutType);
    const [draftCustomLayout, setDraftCustomLayout] = useState<LayoutDef | undefined>(config.virtualRack.customLayout);
    const [customOutletStr, setCustomOutletStr] = useState(''); 
    
    // Battery Draft
    const [draftBattEnabled, setDraftBattEnabled] = useState(config.batteryConfigOverride?.enabled || false);
    const [draftBattVoltage, setDraftBattVoltage] = useState(config.batteryConfigOverride?.nominalVoltage || 24);
    const [draftBattPacks, setDraftBattPacks] = useState(config.batteryConfigOverride?.manualExternalPacks || 0);

    // Sync
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

    const handleLayoutSelection = (val: string) => {
        const type = val as LayoutType;
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

    const validateCustomLayout = (): boolean => {
        if (draftLayoutType !== 'CUSTOM') return true;

        if (!/^[\d,\s]*$/.test(customOutletStr)) {
            notify({ type: 'ERROR', message: "Invalid Layout: Use numbers separated by commas." });
            return false;
        }
        const groups = customOutletStr.split(',').map(s => s.trim()).filter(Boolean).map(Number);
        if (groups.some(isNaN)) { notify({ type: 'ERROR', message: "Invalid Layout: Contains non-numeric values." }); return false; }
        if (groups.length === 0 || groups.length > MAX_CUSTOM_GROUPS) { notify({ type: 'ERROR', message: "Invalid Layout: Too many groups." }); return false; }
        const total = groups.reduce((a,b)=>a+b, 0);
        if (total === 0 || total > MAX_CUSTOM_OUTLETS) { notify({ type: 'ERROR', message: "Invalid Layout: Outlet count exceeds limit." }); return false; }

        // Update draft custom object silently
        if (draftCustomLayout) {
            setDraftCustomLayout({ ...draftCustomLayout, groups, outlets: total });
        }
        return true;
    };

    const handleSaveTopology = () => {
        if (!validateCustomLayout()) return;

        let newCapacity = 0;
        if (draftLayoutType === 'CUSTOM' && draftCustomLayout) {
            // Re-calc capacity just to be safe
            const groups = customOutletStr.split(',').map(Number);
            newCapacity = groups.reduce((a,b)=>a+b, 0);
            draftCustomLayout.outlets = newCapacity;
            draftCustomLayout.groups = groups;
        } else {
            const def = RACK_LAYOUTS[draftLayoutType];
            if (def) newCapacity = def.outlets;
        }

        // Calculate displaced devices
        const nextOutlets: {[key: number]: Device[]} = {};
        const displacedDevices: Device[] = [];

        Object.entries(config.virtualRack.outlets).forEach(([strId, devList]) => {
            const id = parseInt(strId);
            const devices = devList as Device[]; // Fix TS casting
            if (id <= newCapacity) {
                nextOutlets[id] = devices;
            } else {
                const resetDevices = devices.map(d => ({ ...d, assignedOutlet: undefined }));
                displacedDevices.push(...resetDevices);
            }
        });

        const message = displacedDevices.length > 0 
          ? `Change layout to ${draftLayoutType}? ${displacedDevices.length} devices will be unassigned.`
          : `Change layout configuration to ${draftLayoutType}?`;

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
            onLogEvent(`Hardware Config: Topology changed to ${draftLayoutType}.`, 'WARNING', 'USER');
            notify({ type: 'SUCCESS', message: 'Rack Topology Updated.' });
        }, message);
    };

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
            onLogEvent(`Hardware Config: Battery overrides updated (Enabled: ${draftBattEnabled}).`, 'INFO', 'USER');
            notify({ type: 'SUCCESS', message: 'Battery Parameters Updated.' });
        }, "Override Battery Hardware Settings");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Virtual Rack */}
            <div className="bg-black/50 p-6 rounded border border-gray-800">
                <SectionHeader 
                    title="VIRTUAL RACK MODEL" 
                    subtitle="Define the physical outlet layout of the UPS." 
                    onHelp={onHelp ? () => onHelp('hardware_config') : undefined}
                />
                
                <div className="space-y-6">
                    <SelectField 
                        label="UPS MODEL / LAYOUT"
                        value={draftLayoutType}
                        onChange={handleLayoutSelection}
                        options={Object.entries(RACK_LAYOUTS).map(([key, def]) => ({
                            value: key,
                            label: `${def.name} (${def.outlets} Outlets)`
                        }))}
                        onHelp={onHelp ? () => onHelp('hardware_model') : undefined}
                    />

                    {draftLayoutType === 'CUSTOM' && (
                        <div className="bg-gray-900/50 p-4 rounded border border-gray-700 animate-fade-in">
                            <h4 className="text-neon-cyan text-xs font-mono font-bold mb-3">CUSTOM DEFINITION</h4>
                            <div className="space-y-3">
                                <InputField 
                                    label="MODEL NAME" 
                                    value={draftCustomLayout?.name || ''} 
                                    onChange={(val) => setDraftCustomLayout(prev => prev ? {...prev, name: val} : undefined)} 
                                />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-gray-500 font-mono tracking-wider font-bold">BANKS (COMMA SEPARATED)</label>
                                        {onHelp && (
                                            <button onClick={() => onHelp('hardware_banks')} className="w-4 h-4 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[8px] hover:text-neon-cyan hover:border-neon-cyan transition-colors">?</button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={customOutletStr} 
                                            onChange={e => setCustomOutletStr(e.target.value)}
                                            className="flex-1 bg-black border border-gray-700 text-white px-2 py-2 text-sm font-mono focus:border-neon-cyan outline-none"
                                            placeholder="e.g. 4, 4, 2"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                        Example: "4, 4" creates two groups of 4 outlets each.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <SaveButton onClick={handleSaveTopology} label="APPLY TOPOLOGY" />
                    </div>
                </div>
            </div>

            {/* Right: Battery Override */}
            <div className="bg-black/50 p-6 rounded border border-gray-800">
                <SectionHeader title="BATTERY ARRAY OVERRIDE" subtitle="Manual configuration for non-standard battery packs." />
                
                <div className="space-y-6">
                    <ToggleItem 
                        label="ENABLE MANUAL OVERRIDE" 
                        description="Ignore SNMP reported battery count and voltage."
                        enabled={draftBattEnabled} 
                        onToggle={() => setDraftBattEnabled(!draftBattEnabled)}
                        onHelp={onHelp ? () => onHelp('hardware_battery_override') : undefined}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <SelectField 
                                label="NOMINAL DC VOLTAGE"
                                value={draftBattVoltage}
                                onChange={(val) => setDraftBattVoltage(parseInt(val))}
                                options={[
                                    {label: '12V', value: 12},
                                    {label: '24V', value: 24},
                                    {label: '36V', value: 36},
                                    {label: '48V', value: 48},
                                    {label: '96V', value: 96},
                                    {label: '192V', value: 192}
                                ]}
                                onHelp={onHelp ? () => onHelp('hardware_voltage') : undefined}
                            />
                            <InputField 
                                label="EXTERNAL PACKS (XR)"
                                type="number"
                                value={draftBattPacks}
                                onChange={(val) => setDraftBattPacks(parseInt(val))}
                                onHelp={onHelp ? () => onHelp('hardware_packs') : undefined}
                            />
                        </div>
                    </ToggleItem>

                    <div className="pt-4">
                        <SaveButton 
                            onClick={handleSaveBattery} 
                            label="SAVE BATTERY CONFIG" 
                            disabled={!draftBattEnabled && !config.batteryConfigOverride?.enabled} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HardwareSettings;
