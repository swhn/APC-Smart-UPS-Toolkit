
import React, { useState, useEffect } from 'react';
import { SystemConfiguration, DeviceStatusMap, SequenceCountdownMap, Device } from '../types';
import { RACK_LAYOUTS } from '../constants';

interface Props {
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  deviceStatuses: DeviceStatusMap;
  activeCountdowns: SequenceCountdownMap;
  onHelp?: (context: string) => void;
}

const HelpButton: React.FC<{ onClick: () => void, color?: string }> = ({ onClick, color = 'text-gray-500' }) => (
    <button onClick={onClick} className={`w-5 h-5 rounded-full border border-current ${color} flex items-center justify-center text-[10px] hover:text-neon-cyan hover:border-neon-cyan transition-colors z-10`} title="Help">
        ?
    </button>
);

const ShutdownSequencer: React.FC<Props> = ({ config, onUpdateConfig, onDirtyChange, deviceStatuses, activeCountdowns, onHelp }) => {
  // --- Draft State ---
  const [draftSequence, setDraftSequence] = useState(config.phoenixProtocol.shutdownSequence);
  const [draftThreshold, setDraftThreshold] = useState(config.phoenixProtocol.shutdownThreshold);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync draft with config whenever config changes
  useEffect(() => {
    setDraftSequence(config.phoenixProtocol.shutdownSequence);
    setDraftThreshold(config.phoenixProtocol.shutdownThreshold);
    setHasChanges(false);
  }, [config.phoenixProtocol.shutdownSequence, config.phoenixProtocol.shutdownThreshold]);

  // Notify parent of dirty state changes
  useEffect(() => {
      if (onDirtyChange) {
          onDirtyChange(hasChanges);
      }
  }, [hasChanges, onDirtyChange]);

  const handleShutdownThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraftThreshold(parseInt(e.target.value));
      setHasChanges(true);
  };

  // --- Draft Handlers ---

  const toggleEntityLocal = (entityId: string, enabled: boolean) => {
      setDraftSequence(prev => {
          if (enabled) {
              if (prev.find(s => s.deviceId === entityId)) return prev;
              const defaultThreshold = entityId.startsWith('OUTLET_') || entityId.startsWith('BANK_') ? 120 : 60;
              return [...prev, { deviceId: entityId, type: 'TIMER', threshold: defaultThreshold }];
          } else {
              return prev.filter(s => s.deviceId !== entityId);
          }
      });
      setHasChanges(true);
  };

  const updateRuleLocal = (entityId: string, type: 'TIMER' | 'BATTERY', threshold: number) => {
      setDraftSequence(prev => prev.map(item => 
          item.deviceId === entityId ? { ...item, type, threshold } : item
      ));
      setHasChanges(true);
  };

  const commitUpdates = () => {
      onUpdateConfig({
          ...config,
          phoenixProtocol: {
              ...config.phoenixProtocol,
              shutdownSequence: draftSequence,
              shutdownThreshold: draftThreshold
          }
      });
  };

  // --- Visualized Sequence Logic ---
  
  const getDraftRule = (id: string) => draftSequence.find(s => s.deviceId === id);

  // --- Topology Awareness & Entity Generation ---
  
  // 1. Resolve Layout Definition
  const currentLayout = config.virtualRack.layoutType === 'CUSTOM' && config.virtualRack.customLayout
      ? config.virtualRack.customLayout
      : RACK_LAYOUTS[config.virtualRack.layoutType] || RACK_LAYOUTS['RACK_2U_8'];

  const isGroupSwitched = currentLayout.controlType === 'GROUP';

  // 2. Get Soft-Shutdown Devices
  // NOTE: We only allow sequencing of devices that are physically ASSIGNED to the rack.
  // Unassigned (Staging) devices are filtered out to ensure topology consistency.
  const assignedDevices = (Object.values(config.virtualRack.outlets) as Device[][]).flat().map(d => ({
      ...d,
      isHardCut: false
  }));

  // 3. Generate Hard Cut Entities (Banks vs Outlets)
  let hardCutEntities: any[] = [];

  if (isGroupSwitched) {
      // -- GROUP CONTROL LOGIC --
      let currentOutletCursor = 1;
      
      currentLayout.groups.forEach((groupSize, groupIndex) => {
          const bankId = groupIndex + 1;
          const start = currentOutletCursor;
          const end = currentOutletCursor + groupSize - 1;
          
          // Find all devices in this bank
          const devicesInBank: any[] = [];
          for(let i = start; i <= end; i++) {
              if (config.virtualRack.outlets[i]) {
                  devicesInBank.push(...config.virtualRack.outlets[i]);
              }
          }

          hardCutEntities.push({
              id: `OUTLET_GRP_${bankId}`, 
              name: `SWITCH BANK #${bankId}`,
              type: 'BANK',
              shutdownMethod: 'HARD_CUT',
              assignedOutlet: start, 
              isHardCut: true,
              subDevices: devicesInBank,
              description: `Controls Outlets ${start}-${end}`
          });

          currentOutletCursor += groupSize;
      });

  } else {
      // -- INDIVIDUAL CONTROL LOGIC --
      for(let i=1; i<=currentLayout.outlets; i++) {
          const devices = config.virtualRack.outlets[i] || [];
          hardCutEntities.push({
              id: `OUTLET_GRP_${i}`,
              name: `OUTLET #${i}`,
              type: 'OUTLET',
              shutdownMethod: 'HARD_CUT',
              assignedOutlet: i,
              isHardCut: true,
              subDevices: devices,
              description: 'Individual Socket Control'
          });
      }
  }

  // Combine Lists: Only Assigned Devices + Physical Control Entities
  const allEntities = [...assignedDevices, ...hardCutEntities];

  // Helper to ensure unique keys in map if IDs conflict (rare)
  const uniqueEntities = Array.from(new Map(allEntities.map(item => [item.id, item])).values());

  const sequencedEntities = uniqueEntities.sort((a, b) => {
      // Sorting Logic for Display:
      const draftA = getDraftRule(a.id);
      const draftB = getDraftRule(b.id);
      
      if (draftA && !draftB) return -1;
      if (!draftA && draftB) return 1;
      
      // Secondary: Group by Type then Threshold
      if (draftA && draftB) {
          if (draftA.type !== draftB.type) return draftA.type === 'TIMER' ? -1 : 1;
          // If timer, ascending (30s first). If battery, descending (80% first)
          return draftA.type === 'TIMER' 
            ? draftA.threshold - draftB.threshold 
            : draftB.threshold - draftA.threshold;
      }
      
      // Fallback: Hard Cuts at bottom
      if (a.isHardCut && !b.isHardCut) return 1;
      if (!a.isHardCut && b.isHardCut) return -1;
      
      return 0;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="border-b border-gray-800 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-mono text-neon-cyan">DYNAMIC LOAD SHEDDING</h2>
                        <p className="text-xs text-gray-500 font-mono mt-1">Configure per-device triggers to extend runtime or perform graceful shutdowns.</p>
                    </div>
                    
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider mb-1">HARDWARE TOPOLOGY</div>
                        <span className={`px-2 py-1 rounded text-[10px] font-mono border ${isGroupSwitched ? 'border-orange-500 text-orange-500 bg-orange-900/10' : 'border-green-500 text-green-500 bg-green-900/10'}`}>
                            {isGroupSwitched ? 'GROUP SWITCHED (BANKS)' : 'INDIVIDUAL OUTLET CONTROL'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 1. Global Failsafe Card */}
            <div className={`bg-gray-900/50 border p-6 rounded relative overflow-hidden transition-colors duration-300 ${draftThreshold !== config.phoenixProtocol.shutdownThreshold ? 'border-neon-orange bg-neon-orange/5' : 'border-gray-800'}`}>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl text-neon-orange font-bold font-mono pointer-events-none -mt-4 -mr-4 select-none">Ω</div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-neon-orange font-mono text-sm">GLOBAL FAILSAFE THRESHOLD</h3>
                            {onHelp && <HelpButton onClick={() => onHelp('sequencer_failsafe')} color="text-neon-orange border-neon-orange" />}
                            {draftThreshold !== config.phoenixProtocol.shutdownThreshold && (
                                <span className="text-[10px] bg-neon-orange text-black px-2 py-0.5 rounded font-bold animate-pulse">UNSAVED</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 max-w-md">
                            If the battery drops below this critical level, the system assumes a catastrophic failure state and initiates emergency shutdown procedures for ALL remaining devices.
                        </p>
                    </div>

                    <div className="flex-1 w-full md:w-auto flex items-center gap-6">
                        <div className="flex-1">
                            <input 
                                type="range" 
                                min="10" max="90" 
                                value={draftThreshold} 
                                onChange={handleShutdownThresholdChange}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-orange"
                            />
                            <div className="flex justify-between text-[10px] text-gray-600 font-mono px-1 mt-2">
                                <span>10% (DEEP DISCHARGE)</span>
                                <span>90% (EARLY CUTOFF)</span>
                            </div>
                        </div>
                        <div className="w-24 text-right shrink-0">
                            <span className="font-mono text-neon-orange font-bold text-5xl">{draftThreshold}</span>
                            <span className="text-sm text-gray-500 ml-1">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Rule Engine */}
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-neon-cyan font-mono text-sm">LOAD SHEDDING RULES</h3>
                            {onHelp && <HelpButton onClick={() => onHelp('sequencer_rules')} />}
                        </div>
                        <span className="text-[10px] text-gray-500">Active Rules take precedence over manual control during outages.</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {sequencedEntities.length === 0 && (
                        <div className="text-center text-gray-600 text-sm italic py-12 border-2 border-dashed border-gray-800 rounded bg-black/20">
                            No active rack devices found. Please assign devices to outlets in the Virtual Rack.
                        </div>
                    )}

                    {sequencedEntities.map((entity: any) => {
                        const isHardCut = entity.isHardCut;
                        
                        const draftRule = getDraftRule(entity.id);
                        const isEnabled = !!draftRule;
                        const ruleType = draftRule?.type || 'TIMER'; // Default visual
                        const ruleValue = draftRule?.threshold || 0;

                        // Real-time status for active trigger
                        const triggerInfo = activeCountdowns[entity.id];
                        const isOffline = deviceStatuses[entity.id] === 'OFFLINE';
                        
                        return (
                            <div 
                                key={entity.id} 
                                className={`flex flex-col md:flex-row md:items-center gap-4 p-3 rounded border transition-all duration-300 relative overflow-hidden
                                    ${isEnabled 
                                        ? 'bg-black border-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.05)]' 
                                        : 'bg-black/20 border-gray-800 opacity-60 hover:opacity-100'}
                                    ${triggerInfo?.isMet ? 'border-red-500 bg-red-900/10' : ''}
                                `}
                            >
                                {/* Active Trigger Overlay */}
                                {triggerInfo?.isMet && (
                                    <div className="absolute inset-0 z-0 bg-red-900/10 animate-pulse pointer-events-none"></div>
                                )}

                                {/* ROW CONTENT */}
                                <div className="flex items-center gap-4 w-full md:w-auto flex-1 min-w-0 z-10">
                                    {/* Checkbox */}
                                    <input 
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={(e) => toggleEntityLocal(entity.id, e.target.checked)}
                                        className="w-5 h-5 accent-neon-cyan cursor-pointer rounded bg-gray-800 border-gray-600 shrink-0"
                                    />

                                    {/* Icon */}
                                    <div className={`w-10 h-10 flex items-center justify-center rounded bg-gray-900 border shrink-0 ${isHardCut ? 'border-red-900 text-red-500' : 'border-blue-900 text-blue-500'}`}>
                                        {isHardCut ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                                        )}
                                    </div>

                                    {/* Name & Details */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-bold text-white truncate">{entity.name}</div>
                                            {isHardCut && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${
                                                    entity.type === 'BANK' 
                                                        ? 'border-orange-900 bg-orange-900/20 text-orange-500' 
                                                        : 'border-red-900 bg-red-900/20 text-red-500'
                                                }`}>
                                                    {entity.type === 'BANK' ? 'SWITCH BANK' : 'OUTLET CUT'}
                                                </span>
                                            )}
                                            {isOffline && (
                                                 <span className="text-[9px] bg-red-900/40 text-red-400 border border-red-900 px-1 rounded">OFFLINE</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono truncate">
                                            {isHardCut 
                                                ? (entity.subDevices?.length > 0 ? `Affects: ${entity.subDevices.map((d:any)=>d.name).join(', ')}` : "Controls Empty Socket")
                                                : `${entity.shutdownMethod} Protocol @ ${entity.ipAddress || 'Unknown IP'}`
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Controls Section */}
                                <div className={`flex items-center gap-4 z-10 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                    
                                    {/* Trigger Type Toggle */}
                                    <div className="flex bg-gray-900 border border-gray-700 rounded p-0.5">
                                        <button 
                                            onClick={() => updateRuleLocal(entity.id, 'TIMER', ruleValue)}
                                            className={`px-3 py-1.5 text-[10px] font-mono rounded transition-colors ${ruleType === 'TIMER' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            ⏱ TIMER
                                        </button>
                                        <button 
                                            onClick={() => updateRuleLocal(entity.id, 'BATTERY', ruleValue)}
                                            className={`px-3 py-1.5 text-[10px] font-mono rounded transition-colors ${ruleType === 'BATTERY' ? 'bg-green-900/50 text-green-300' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            🔋 BATTERY
                                        </button>
                                    </div>

                                    {/* Value Input */}
                                    <div className="flex items-center gap-2 bg-gray-900 px-2 py-1 rounded border border-gray-700 w-32">
                                        <input 
                                            type="number"
                                            min="0"
                                            value={ruleValue}
                                            onChange={(e) => updateRuleLocal(entity.id, ruleType, parseInt(e.target.value))}
                                            className={`w-full bg-transparent text-right font-mono font-bold focus:outline-none ${ruleType === 'BATTERY' ? 'text-green-400' : 'text-blue-400'}`}
                                        />
                                        <span className="text-[10px] text-gray-500 font-mono w-8">
                                            {ruleType === 'TIMER' ? 'SEC' : '% CAP'}
                                        </span>
                                    </div>

                                    {/* Hint Text */}
                                    <div className="w-24 text-[9px] text-gray-500 font-mono text-right leading-tight hidden lg:block">
                                        {ruleType === 'TIMER' ? 'After Outage' : 'Trigger Level'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-4 border-t border-gray-800 bg-[#0a0a0a] flex justify-end gap-4">
           {hasChanges && (
               <div className="flex items-center text-neon-orange text-xs font-mono mr-auto animate-pulse">
                   ⚠ UNSAVED CHANGES
               </div>
           )}
           <button 
                onClick={() => {
                    setDraftSequence(config.phoenixProtocol.shutdownSequence);
                    setDraftThreshold(config.phoenixProtocol.shutdownThreshold);
                    setHasChanges(false);
                }}
                disabled={!hasChanges}
                className="px-6 py-3 text-xs font-mono border border-transparent text-gray-500 hover:text-white hover:border-gray-700 disabled:opacity-30 disabled:hover:text-gray-500"
           >
               DISCARD
           </button>
           <button 
                onClick={commitUpdates}
                disabled={!hasChanges}
                className="px-6 py-3 bg-neon-cyan text-black font-bold font-mono text-xs hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
           >
               COMMIT PROTOCOL CHANGES
           </button>
      </div>
    </div>
  );
};

export default ShutdownSequencer;
