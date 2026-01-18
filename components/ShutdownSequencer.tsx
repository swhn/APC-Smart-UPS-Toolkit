
import React, { useState, useEffect } from 'react';
import { SystemConfiguration } from '../types';
import { RACK_LAYOUTS } from '../constants';

interface Props {
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const ShutdownSequencer: React.FC<Props> = ({ config, onUpdateConfig, onDirtyChange }) => {
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
              const defaultDelay = entityId.startsWith('OUTLET_') || entityId.startsWith('BANK_') ? 120 : 60;
              return [...prev, { deviceId: entityId, delaySeconds: defaultDelay }];
          } else {
              return prev.filter(s => s.deviceId !== entityId);
          }
      });
      setHasChanges(true);
  };

  const updateDelayLocal = (entityId: string, delay: number) => {
      setDraftSequence(prev => prev.map(item => 
          item.deviceId === entityId ? { ...item, delaySeconds: delay } : item
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
  
  const getCommittedSequenceInfo = (id: string) => config.phoenixProtocol.shutdownSequence.find(s => s.deviceId === id);
  const getDraftSequenceInfo = (id: string) => draftSequence.find(s => s.deviceId === id);

  const getSequenceRank = (id: string) => {
      const sorted = config.phoenixProtocol.shutdownSequence.sort((a,b) => a.delaySeconds - b.delaySeconds);
      return sorted.findIndex(s => s.deviceId === id) + 1;
  };

  // --- Topology Awareness & Entity Generation ---
  
  // 1. Resolve Layout Definition
  const currentLayout = config.virtualRack.layoutType === 'CUSTOM' && config.virtualRack.customLayout
      ? config.virtualRack.customLayout
      : RACK_LAYOUTS[config.virtualRack.layoutType] || RACK_LAYOUTS['RACK_2U_8'];

  const isGroupSwitched = currentLayout.controlType === 'GROUP';

  // 2. Get Soft-Shutdown Devices
  // NOTE: We only allow sequencing of devices that are physically ASSIGNED to the rack.
  // Unassigned (Staging) devices are filtered out to ensure topology consistency.
  const assignedDevices = Object.values(config.virtualRack.outlets).flat().map(d => ({
      ...d,
      isHardCut: false
  }));

  // 3. Generate Hard Cut Entities (Banks vs Outlets)
  let hardCutEntities: any[] = [];

  if (isGroupSwitched) {
      // -- GROUP CONTROL LOGIC --
      // We aggregate devices based on the layout groups (e.g. [4, 4] means outlets 1-4 are Bank 1)
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

          // We create a control entity for every bank, regardless of occupancy, 
          // so the user knows they CAN control it.
          hardCutEntities.push({
              id: `OUTLET_GRP_${bankId}`, // Using consistent ID schema for logic compatibility
              name: `SWITCH BANK #${bankId}`,
              type: 'BANK',
              shutdownMethod: 'HARD_CUT',
              assignedOutlet: start, // Used for sorting
              isHardCut: true,
              subDevices: devicesInBank,
              description: `Controls Outlets ${start}-${end}`
          });

          currentOutletCursor += groupSize;
      });

  } else {
      // -- INDIVIDUAL CONTROL LOGIC --
      // Create an entity for every outlet that has a device, OR just all outlets?
      // Usually better to show all outlets so you can cut power even if "empty" in software but has dumb load.
      // For this UI, we'll map existing configured outlets + any empty ones up to max count.
      
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
      // 1. Enabled items first (based on draft)
      const draftA = getDraftSequenceInfo(a.id);
      const draftB = getDraftSequenceInfo(b.id);
      
      if (draftA && !draftB) return -1;
      if (!draftA && draftB) return 1;
      
      // 2. By Delay Time (if enabled)
      if (draftA && draftB) return draftA.delaySeconds - draftB.delaySeconds;
      
      // 3. Fallback: Hard Cuts at bottom
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
                        <h2 className="text-xl font-mono text-neon-cyan">PHOENIX PROTOCOL CONFIGURATION</h2>
                        <p className="text-xs text-gray-500 font-mono mt-1">Configure automated shutdown sequence and battery thresholds.</p>
                    </div>
                    
                    {/* Topology Badge */}
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider mb-1">HARDWARE TOPOLOGY</div>
                        <span className={`px-2 py-1 rounded text-[10px] font-mono border ${isGroupSwitched ? 'border-orange-500 text-orange-500 bg-orange-900/10' : 'border-green-500 text-green-500 bg-green-900/10'}`}>
                            {isGroupSwitched ? 'GROUP SWITCHED (BANKS)' : 'INDIVIDUAL OUTLET CONTROL'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 1. Trigger Threshold Card (Top) */}
            <div className={`bg-gray-900/50 border p-6 rounded relative overflow-hidden transition-colors duration-300 ${draftThreshold !== config.phoenixProtocol.shutdownThreshold ? 'border-neon-orange bg-neon-orange/5' : 'border-gray-800'}`}>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl text-neon-orange font-bold font-mono pointer-events-none -mt-4 -mr-4 select-none">%</div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1">
                        <h3 className="text-neon-orange font-mono text-sm mb-2 flex items-center gap-2">
                            TRIGGER THRESHOLD
                            {draftThreshold !== config.phoenixProtocol.shutdownThreshold && (
                                <span className="text-[10px] bg-neon-orange text-black px-2 py-0.5 rounded font-bold animate-pulse">UNSAVED CHANGE</span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-400 max-w-md">
                            The system will automatically initiate the shutdown sequence when the UPS battery capacity drops below this percentage.
                        </p>
                    </div>

                    <div className="flex-1 w-full md:w-auto flex items-center gap-6">
                        <div className="flex-1">
                            <input 
                                type="range" 
                                min="5" max="90" 
                                value={draftThreshold} 
                                onChange={handleShutdownThresholdChange}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-orange"
                            />
                            <div className="flex justify-between text-[10px] text-gray-600 font-mono px-1 mt-2">
                                <span>5% (CRITICAL)</span>
                                <span>90% (EARLY)</span>
                            </div>
                        </div>
                        <div className="w-24 text-right shrink-0">
                            <span className="font-mono text-neon-orange font-bold text-5xl">{draftThreshold}</span>
                            <span className="text-sm text-gray-500 ml-1">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Sequence Editor (Middle) */}
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-neon-cyan font-mono text-sm">SHUTDOWN SEQUENCE ORDER</h3>
                        <span className="text-[10px] text-gray-500">{sequencedEntities.length} Active Entities Detected</span>
                    </div>
                    {config.virtualRack.unassignedDevices.length > 0 && (
                        <div className="text-[10px] text-gray-600 font-mono italic">
                            * {config.virtualRack.unassignedDevices.length} unassigned devices hidden
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    {sequencedEntities.length === 0 && (
                        <div className="text-center text-gray-600 text-sm italic py-12 border-2 border-dashed border-gray-800 rounded bg-black/20">
                            No active rack devices found. Please assign devices to outlets in the Virtual Rack.
                        </div>
                    )}

                    {sequencedEntities.map((entity: any) => {
                        const isHardCut = entity.isHardCut;
                        
                        // Visual order uses COMMITTED state for rank if unchanged, or recalculates if needed
                        // Ideally we show the sequence order based on DRAFT values
                        const draftSeq = getDraftSequenceInfo(entity.id);
                        const isEnabled = !!draftSeq;
                        
                        return (
                            <div 
                                key={entity.id} 
                                className={`flex items-center gap-4 p-3 rounded border transition-all duration-300
                                    ${isEnabled 
                                        ? 'bg-black border-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.05)]' 
                                        : 'bg-black/20 border-gray-800 opacity-60 hover:opacity-100'}
                                `}
                            >
                                {/* Enable Toggle */}
                                <div className="shrink-0">
                                    <input 
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={(e) => toggleEntityLocal(entity.id, e.target.checked)}
                                        className="w-5 h-5 accent-neon-cyan cursor-pointer rounded bg-gray-800 border-gray-600"
                                    />
                                </div>

                                {/* Sequence Number (only if enabled) */}
                                <div className={`w-8 font-mono text-lg font-bold text-center ${isEnabled ? 'text-white' : 'text-gray-700'}`}>
                                    {isEnabled ? (draftSequence.sort((a,b) => a.delaySeconds - b.delaySeconds).findIndex(s => s.deviceId === entity.id) + 1) : '-'}
                                </div>

                                {/* Icon / Type Indicator */}
                                <div className={`w-10 h-10 flex items-center justify-center rounded bg-gray-900 border ${isHardCut ? 'border-red-900 text-red-500' : 'border-blue-900 text-blue-500'}`}>
                                    {isHardCut ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-white truncate">{entity.name}</div>
                                        {/* Badge for Type */}
                                        {isHardCut && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${
                                                entity.type === 'BANK' 
                                                    ? 'border-orange-900 bg-orange-900/20 text-orange-500' 
                                                    : 'border-red-900 bg-red-900/20 text-red-500'
                                            }`}>
                                                {entity.type === 'BANK' ? 'SWITCH BANK' : 'OUTLET CUT'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate">
                                        {isHardCut 
                                            ? (entity.subDevices && entity.subDevices.length > 0 
                                                ? `Hard Power Cut: Affects ${entity.subDevices.map((d: any) => d.name).join(', ')}` 
                                                : "Hard Power Cut (Empty Socket)")
                                            : `${entity.shutdownMethod} Command @ ${entity.ipAddress || 'Unknown IP'}`
                                        }
                                    </div>
                                </div>

                                {/* Delay Input */}
                                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded border border-gray-700">
                                    <span className="text-[10px] text-gray-500 font-mono uppercase">Delay</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        disabled={!isEnabled}
                                        value={isEnabled ? draftSeq?.delaySeconds : ''}
                                        onChange={(e) => updateDelayLocal(entity.id, parseInt(e.target.value))}
                                        className="w-16 bg-transparent text-right font-mono text-neon-cyan font-bold focus:outline-none disabled:text-gray-700"
                                        placeholder="-"
                                    />
                                    <span className="text-xs text-gray-500">sec</span>
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
