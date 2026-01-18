
import React, { useState, useEffect } from 'react';
import { Device, SystemConfiguration, ShutdownMethod, LayoutType } from '../types';
import { DeviceControlService } from '../services/DeviceControlService';
import { RACK_LAYOUTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  onRequestSecureAction: (callback: () => void, description: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const VirtualRack: React.FC<Props> = ({ config, onUpdateConfig, onRequestSecureAction, onDirtyChange }) => {
  
  // --- Local Draft State ---
  // We initialize from the global config, but all edits happen locally until "Save" is clicked.
  const [localRack, setLocalRack] = useState(config.virtualRack);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync dirty state with parent
  useEffect(() => {
    if (onDirtyChange) {
        onDirtyChange(hasChanges);
    }
  }, [hasChanges, onDirtyChange]);

  // Modal State for Adding Devices
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Local state for Add Device Form
  const [newDevName, setNewDevName] = useState('');
  const [newDevIp, setNewDevIp] = useState('');
  const [newDevPower, setNewDevPower] = useState(100);
  const [newDevType, setNewDevType] = useState<Device['type']>('SERVER');
  const [newDevMethod, setNewDevMethod] = useState<ShutdownMethod>('SSH');
  
  // Staging Area Toggle
  const [isStagingOpen, setIsStagingOpen] = useState(true); 
  
  // Verification State
  const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [verifyMsg, setVerifyMsg] = useState('');

  // Outlet Modal State
  const [viewingOutlet, setViewingOutlet] = useState<number | null>(null);

  // Resolve current layout based on LOCAL state
  const currentLayout = localRack.layoutType === 'CUSTOM' && localRack.customLayout
      ? localRack.customLayout
      : RACK_LAYOUTS[localRack.layoutType] || RACK_LAYOUTS['RACK_2U_8'];

  const resetForm = () => {
    setNewDevName('');
    setNewDevIp('');
    setNewDevPower(100);
    setNewDevType('SERVER');
    setNewDevMethod('SSH');
    setVerifyStatus('IDLE');
    setVerifyMsg('');
  };

  const handleOpenAddModal = () => {
      resetForm();
      setIsAddModalOpen(true);
  };

  const handleVerifyAndAdd = async () => {
      if(!newDevName) return;

      setVerifyStatus('CHECKING');
      setVerifyMsg(`Initializing Handshake via ${newDevMethod}...`);

      const tempDevice: Device = {
        id: `d${Date.now()}`,
        name: newDevName,
        ipAddress: newDevIp || undefined,
        type: newDevType,
        shutdownMethod: newDevMethod,
        powerDraw: newDevPower,
        status: 'ONLINE',
        connectionStatus: 'UNKNOWN'
      };

      const isVerified = await DeviceControlService.verifyConnection(tempDevice);

      if (isVerified) {
          setVerifyStatus('SUCCESS');
          setVerifyMsg('Connection Established. Device Provisioned.');
          
          setTimeout(() => {
              setLocalRack(prev => ({
                  ...prev,
                  unassignedDevices: [...prev.unassignedDevices, { ...tempDevice, connectionStatus: 'VERIFIED' }]
              }));
              setHasChanges(true);
              setIsAddModalOpen(false);
          }, 800);
      } else {
          setVerifyStatus('FAILED');
          setVerifyMsg(`Host Unreachable: Check IP/Firewall.`);
      }
  };

  const forceAddDevice = () => {
       const tempDevice: Device = {
        id: `d${Date.now()}`,
        name: newDevName,
        ipAddress: newDevIp || undefined,
        type: newDevType,
        shutdownMethod: newDevMethod,
        powerDraw: newDevPower,
        status: 'ONLINE', // Default
        connectionStatus: 'FAILED'
      };
      
      setLocalRack(prev => ({
          ...prev,
          unassignedDevices: [...prev.unassignedDevices, tempDevice]
      }));
      setHasChanges(true);
      setIsAddModalOpen(false);
  };

  const handleDeleteDevice = (deviceId: string) => {
      // Deletion is now a draft action, committed on Save. 
      // Password is required at the Save step, not individual delete step.
      const updatedUnassigned = localRack.unassignedDevices.filter(d => d.id !== deviceId);
      setLocalRack(prev => ({
          ...prev,
          unassignedDevices: updatedUnassigned
      }));
      setHasChanges(true);
  };

  const handleSaveTopology = () => {
      onRequestSecureAction(() => {
          onUpdateConfig({
              ...config,
              virtualRack: localRack
          });
          setHasChanges(false);
          console.log("Topology Configuration Securely Saved.");
      }, "Verify Identity to Commit Topology Changes");
  };

  const handleDragStart = (e: React.DragEvent, deviceId: string) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', deviceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, outletId: number) => {
      e.preventDefault();
      const deviceId = e.dataTransfer.getData('text/plain');
      if (deviceId) {
          assignDevice(deviceId, outletId);
      }
  };

  const assignDevice = (deviceId: string, outletId: number) => {
    const device = localRack.unassignedDevices.find(d => d.id === deviceId);
    if (!device) return;

    // Get current devices in this outlet (default to empty array)
    const currentOutletDevices = localRack.outlets[outletId] || [];

    // Update Device with assigned outlet
    const assignedDevice = { ...device, assignedOutlet: outletId };

    // Remove from unassigned
    const updatedUnassigned = localRack.unassignedDevices.filter(d => d.id !== deviceId);

    setLocalRack(prev => ({
        ...prev,
        outlets: { ...prev.outlets, [outletId]: [...currentOutletDevices, assignedDevice] },
        unassignedDevices: updatedUnassigned
    }));
    setHasChanges(true);
  };

  const unassignDevice = (outletId: number, deviceId: string) => {
      const devices = localRack.outlets[outletId];
      if (!devices) return;

      const deviceToRemove = devices.find(d => d.id === deviceId);
      if (!deviceToRemove) return;

      const restoredDevice: Device = {
          ...deviceToRemove,
          assignedOutlet: undefined
      };

      // Remove specific device from array
      const remainingDevices = devices.filter(d => d.id !== deviceId);
      
      const newOutlets = { ...localRack.outlets };
      if (remainingDevices.length > 0) {
          newOutlets[outletId] = remainingDevices;
      } else {
          delete newOutlets[outletId];
      }

      setLocalRack(prev => ({
          ...prev,
          outlets: newOutlets,
          unassignedDevices: [...prev.unassignedDevices, restoredDevice]
      }));
      setHasChanges(true);
  };

  // Reusable Component for a single Outlet
  const OutletSocket = ({ id, isGroupControlled }: { id: number, isGroupControlled: boolean }) => {
    // Determine devices for this outlet (Device[])
    const devices = localRack.outlets[id] || [];
    const isOccupied = devices.length > 0;
    const isMulti = devices.length > 1;

    // Aggregate stats
    const totalPower = devices.reduce((sum, d) => sum + (d.powerDraw || 0), 0);
    const isShuttingDown = devices.some(d => d.status === 'SHUTTING_DOWN');
    const isOffline = devices.every(d => d.status === 'OFFLINE') && isOccupied;
    
    // LED Status
    const ledColor = isOccupied
        ? isShuttingDown 
            ? 'bg-red-500 animate-pulse' 
            : isOffline 
                ? 'bg-red-900' 
                : 'bg-neon-green shadow-[0_0_10px_#39FF14]'
        : 'bg-gray-800';

    return (
        <div 
            className={`flex flex-col items-center gap-2 group relative p-1.5 rounded-lg transition-colors border border-transparent 
            ${isOccupied ? 'cursor-pointer' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, id)}
            onClick={(e) => {
                if (isOccupied) {
                    e.stopPropagation();
                    setViewingOutlet(id);
                }
            }}
        >
            {/* Socket / Plug Housing - Dimensions increased significantly for visibility */}
            <div className={`w-24 h-32 md:w-28 md:h-40 bg-[#111] border rounded-lg flex items-center justify-center relative transition-colors shadow-2xl ${isOccupied ? 'border-gray-600' : 'border-gray-700 hover:border-gray-500'}`}>
                
                {/* Visual: NEMA 5-15R Socket Face (Visible only if empty) */}
                {!isOccupied && (
                    <div className="opacity-40 flex flex-col items-center gap-2 mt-2 transform scale-125">
                        <div className="flex gap-2">
                            <div className="w-2 h-6 bg-black rounded-sm border border-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div> 
                            <div className="w-2 h-6 bg-black rounded-sm border border-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div> 
                        </div>
                        <div className="w-5 h-5 rounded-full bg-black border border-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,1)] mt-1 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#111]"></div>
                        </div>
                    </div>
                )}

                {/* --- Single Device View --- */}
                {isOccupied && !isMulti && (
                    <div className="absolute inset-1.5 md:inset-2 bg-gray-800 rounded border-t border-gray-600 shadow-lg flex flex-col items-center justify-between z-10 pointer-events-none p-2">
                        {/* Header: Type Indicator */}
                        <div className="w-full flex justify-between items-center">
                            <span className={`w-2 h-2 rounded-full ${
                                devices[0].type === 'SERVER' ? 'bg-blue-500 shadow-[0_0_6px_blue]' : 
                                devices[0].type === 'NETWORK' ? 'bg-green-500 shadow-[0_0_6px_green]' : 
                                'bg-orange-500 shadow-[0_0_6px_orange]'
                            }`}></span>
                        </div>

                        {/* Name */}
                        <div className="text-[10px] md:text-xs font-mono text-white text-center leading-tight break-words w-full font-bold truncate">
                            {devices[0].name.substring(0, 10)}
                        </div>
                        
                        {/* Divider */}
                        <div className="w-3/4 h-px bg-gray-700"></div>

                        {/* Stats: Power & Status */}
                        <div className="flex flex-col items-center w-full gap-1">
                            <div className="text-[9px] md:text-[10px] text-gray-400 font-mono">{devices[0].powerDraw}W</div>
                            <div className={`text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-tighter ${
                                devices[0].status === 'ONLINE' ? 'text-green-400' : 
                                devices[0].status === 'SHUTTING_DOWN' ? 'text-yellow-400 animate-pulse' : 
                                'text-red-500'
                            }`}>
                                {devices[0].status || 'ONLINE'}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Multi-Device View --- */}
                {isMulti && (
                    <div className="absolute inset-1.5 md:inset-2 bg-gray-900 rounded border-t border-neon-cyan flex flex-col items-center justify-center z-10 pointer-events-none p-2">
                         <div className="text-[8px] font-mono text-neon-cyan font-bold tracking-widest mb-1">PDU</div>
                         <div className="text-3xl font-mono text-white font-bold leading-none mb-1">{devices.length}</div>
                         <div className="text-[7px] text-gray-400 font-mono mb-2">DEVICES</div>
                         
                         <div className="w-full h-px bg-gray-700 my-1"></div>
                         <div className="text-[9px] text-neon-orange font-mono font-bold">∑ {totalPower}W</div>
                    </div>
                )}
            </div>
            
            {/* Outlet Info */}
            <div className="flex flex-col items-center">
                <div className={`w-1.5 h-1.5 rounded-full mb-1 ${ledColor}`}></div>
                <span className={`text-[9px] font-mono tracking-wider ${isGroupControlled ? 'text-gray-600' : 'text-gray-400'}`}>#{id}</span>
            </div>
        </div>
    );
  };

  const renderCleanLayout = () => {
    let currentOutletId = 1;
    const isGroupControlled = currentLayout.controlType === 'GROUP';

    return (
        <div className="w-full flex flex-col items-center mt-2 md:mt-4 animate-fade-in px-4 pb-20">
            
            {/* Simple Label for Context */}
            <div className="flex flex-col items-center mb-6">
                <div className="text-neon-cyan font-mono text-sm tracking-[0.2em] uppercase bg-gray-900/80 px-6 py-2 rounded border border-gray-800 shadow-lg text-center">
                    {currentLayout.name}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">CONTROL MODE:</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isGroupControlled ? 'text-red-400 border-red-900 bg-red-900/10' : 'text-green-400 border-green-900 bg-green-900/10'}`}>
                        {isGroupControlled ? 'GROUP SWITCHED' : 'INDIVIDUAL OUTLET'}
                    </span>
                </div>
            </div>

            {/* Outlets Container - Visualized by Groups */}
            <div className="w-full flex flex-wrap justify-center gap-4 md:gap-8">
                {currentLayout.groups.map((groupSize, groupIndex) => {
                    // Capture start/end for this group
                    const startId = currentOutletId;
                    const endId = currentOutletId + groupSize - 1;
                    const outletsInGroup = [];
                    
                    for(let i=0; i<groupSize; i++) {
                        outletsInGroup.push(currentOutletId++);
                    }

                    return (
                        <div key={groupIndex} className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 md:p-6 relative hover:border-gray-700 transition-colors">
                            {/* Group Label */}
                            <div className="absolute -top-3 left-3 bg-[#1a1a1a] px-2 text-[9px] font-mono text-gray-500 border border-gray-800 uppercase tracking-widest">
                                {currentLayout.groups.length > 1 ? `BANK ${groupIndex + 1}` : 'MAIN OUTPUT'}
                            </div>
                            
                            {/* Group Control Indicator (if relevant) */}
                            {isGroupControlled && (
                                <div className="absolute -bottom-2 right-3 bg-red-900/20 px-2 py-0.5 border border-red-900/50 rounded flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-[8px] text-red-500 font-mono">LINKED</span>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                                {outletsInGroup.map(id => (
                                    <OutletSocket key={id} id={id} isGroupControlled={isGroupControlled} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* 1. Header Toolbar */}
      <div className="shrink-0 p-4 md:p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-xl font-mono text-neon-cyan">VIRTUAL RACK TOPOLOGY</h2>
              <div className="text-xs text-gray-500 font-mono mt-1">
                  Drag and drop devices to assign power outlets.
              </div>
          </div>

          <div className="flex gap-4 items-center">
               {hasChanges && (
                   <div className="text-neon-orange text-xs font-mono animate-pulse mr-2 flex items-center gap-1">
                       <span>⚠</span> UNSAVED CHANGES
                   </div>
               )}
               <button 
                  onClick={handleSaveTopology}
                  disabled={!hasChanges}
                  className={`px-6 py-2 font-bold font-mono text-xs border flex items-center gap-2 transition-all
                    ${hasChanges 
                        ? 'bg-transparent text-neon-cyan border-neon-cyan hover:bg-neon-cyan hover:text-black shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
                        : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'}
                  `}
               >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                   SAVE CONFIGURATION
               </button>
               <button 
                    onClick={handleOpenAddModal}
                    className="bg-neon-cyan text-black px-6 py-2 font-bold font-mono text-xs hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)] border border-neon-cyan flex items-center gap-2"
               >
                   <span className="text-lg leading-none">+</span>
                   PROVISION DEVICE
               </button>
          </div>
      </div>
      
      {/* 2. Main Rack Area */}
      <div className="flex-1 overflow-y-auto bg-black/50 p-4 relative">
            {/* Rack Mount Rails Visual */}
            <div className="absolute top-0 bottom-0 left-4 w-4 bg-[#1a1a1a] border-r border-gray-800 flex flex-col items-center py-2 gap-8 pointer-events-none opacity-50">
                 {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black border border-gray-600"></div>)}
            </div>
            <div className="absolute top-0 bottom-0 right-4 w-4 bg-[#1a1a1a] border-l border-gray-800 flex flex-col items-center py-2 gap-8 pointer-events-none opacity-50">
                 {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black border border-gray-600"></div>)}
            </div>

            {renderCleanLayout()}
      </div>

      {/* 3. Staging Area (Unassigned) */}
      <div className={`border-t border-gray-800 bg-[#121212] transition-all duration-300 flex flex-col ${isStagingOpen ? 'h-48 md:h-56' : 'h-10'}`}>
          <div 
            onClick={() => setIsStagingOpen(!isStagingOpen)}
            className="h-10 bg-gray-900 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-800 border-b border-gray-800"
          >
              <div className="flex items-center gap-2">
                  <span className="text-neon-orange text-xs font-mono font-bold tracking-wider">UNASSIGNED DEVICES (STAGING)</span>
                  <span className="bg-gray-800 text-gray-400 text-[10px] px-2 rounded-full">{localRack.unassignedDevices.length}</span>
              </div>
              <div className="text-gray-500 text-xs">
                  {isStagingOpen ? '▼' : '▲'}
              </div>
          </div>
          
          <div className="flex-1 p-4 overflow-x-auto custom-scrollbar flex items-center gap-4">
              {localRack.unassignedDevices.length === 0 && (
                  <div className="w-full text-center text-gray-600 text-xs font-mono italic">
                      Staging area empty. Add devices or drag from rack.
                  </div>
              )}
              {localRack.unassignedDevices.map(device => (
                  <div 
                      key={device.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, device.id)}
                      className="min-w-[140px] p-3 rounded border border-gray-700 bg-gray-800 hover:border-neon-cyan cursor-grab active:cursor-grabbing group relative"
                  >
                      {/* Delete Button */}
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDevice(device.id);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-gray-900 text-gray-500 hover:text-red-500 hover:bg-black rounded border border-transparent hover:border-red-900 z-10 transition-colors"
                        title="Delete Device"
                      >
                          <span className="text-xs leading-none">×</span>
                      </button>

                      <div className="flex items-center justify-between mb-2">
                          <span className={`w-2 h-2 rounded-full ${
                              device.type === 'SERVER' ? 'bg-blue-500' :
                              device.type === 'NETWORK' ? 'bg-green-500' : 'bg-orange-500'
                          }`}></span>
                          <span className="text-[10px] text-gray-500">{device.powerDraw}W</span>
                      </div>
                      <div className="text-xs text-white font-mono font-bold truncate mb-1 pr-4">{device.name}</div>
                      <div className="text-[9px] text-gray-400 font-mono truncate">{device.shutdownMethod}</div>
                      
                      {/* Connection Verification Dot */}
                      {device.connectionStatus === 'VERIFIED' && (
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_4px_lime]" title="Verified Connection"></div>
                      )}
                  </div>
              ))}
          </div>
      </div>

      {/* --- ADD DEVICE MODAL --- */}
      <AnimatePresence>
          {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border border-neon-cyan p-1 rounded max-w-lg w-full shadow-[0_0_50px_rgba(0,240,255,0.15)] relative"
                  >
                      {/* Inner Container */}
                      <div className="bg-black/80 p-6 md:p-8 rounded relative overflow-hidden">
                           {/* Decorative Corner lines */}
                           <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-cyan/50"></div>
                           <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-cyan/50"></div>
                           
                           <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>

                           <h3 className="text-neon-cyan font-mono text-lg font-bold mb-6 flex items-center gap-2">
                               <span className="bg-neon-cyan text-black px-1.5 rounded text-xs">+</span>
                               PROVISION NEW HARDWARE
                           </h3>

                           <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 font-mono">DEVICE NAME</label>
                                        <input 
                                            type="text" 
                                            value={newDevName}
                                            onChange={e => setNewDevName(e.target.value)}
                                            placeholder="e.g., Main-Server-01"
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 font-mono">DEVICE TYPE</label>
                                        <select 
                                            value={newDevType}
                                            onChange={e => setNewDevType(e.target.value as any)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                                        >
                                            <option value="SERVER">Server / Compute</option>
                                            <option value="NETWORK">Network / Switch</option>
                                            <option value="STORAGE">Storage / NAS</option>
                                            <option value="OTHER">Other / Peripheral</option>
                                        </select>
                                    </div>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 font-mono">SHUTDOWN PROTOCOL</label>
                                        <select 
                                            value={newDevMethod}
                                            onChange={e => setNewDevMethod(e.target.value as any)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                                        >
                                            <option value="SSH">SSH (Linux/Unix)</option>
                                            <option value="HTTP_POST">HTTP Webhook</option>
                                            <option value="SNMP_SET">SNMP (Trap/Set)</option>
                                            <option value="HARD_CUT">Hard Power Cut</option>
                                        </select>
                                   </div>
                                   <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 font-mono">POWER DRAW (WATTS)</label>
                                        <input 
                                            type="number" 
                                            value={newDevPower}
                                            onChange={e => setNewDevPower(parseInt(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 text-sm focus:border-neon-cyan outline-none"
                                        />
                                   </div>
                               </div>

                               {newDevMethod !== 'HARD_CUT' && (
                                   <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500 font-mono">TARGET IP ADDRESS</label>
                                        <input 
                                            type="text"
                                            value={newDevIp}
                                            onChange={e => setNewDevIp(e.target.value)}
                                            placeholder="192.168.1.xxx"
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 text-sm focus:border-neon-cyan outline-none font-mono"
                                        />
                                   </div>
                               )}
                               
                               {/* Status / Error Message Area */}
                               <div className={`mt-4 p-3 text-xs font-mono border rounded flex justify-between items-center transition-all ${
                                   verifyStatus === 'IDLE' ? 'border-transparent text-gray-600' :
                                   verifyStatus === 'CHECKING' ? 'border-blue-900 bg-blue-900/20 text-blue-400' :
                                   verifyStatus === 'SUCCESS' ? 'border-green-900 bg-green-900/20 text-green-400' :
                                   'border-red-900 bg-red-900/20 text-red-400'
                               }`}>
                                   <span>{verifyMsg || 'Ready to initialize connection...'}</span>
                                   {verifyStatus === 'FAILED' && (
                                       <button onClick={forceAddDevice} className="underline hover:text-white">FORCE ADD</button>
                                   )}
                               </div>

                               {/* Footer Buttons */}
                               <div className="flex gap-4 mt-6 pt-4 border-t border-gray-800">
                                   <button 
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 py-3 text-xs font-mono text-gray-500 hover:text-white border border-transparent hover:border-gray-700"
                                    >
                                        CANCEL
                                   </button>
                                   <button 
                                        onClick={handleVerifyAndAdd}
                                        disabled={!newDevName || verifyStatus === 'CHECKING'}
                                        className={`flex-1 py-3 text-xs font-mono font-bold transition-all relative overflow-hidden group
                                            ${verifyStatus === 'CHECKING' ? 'bg-gray-800 text-gray-500' : 'bg-neon-cyan text-black hover:bg-white'}
                                        `}
                                    >
                                        {verifyStatus === 'CHECKING' ? 'VERIFYING...' : 'VERIFY & PROVISION'}
                                   </button>
                               </div>
                           </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Viewing Outlet Modal (Existing) */}
      {viewingOutlet !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg max-w-md w-full shadow-2xl relative">
                  <button onClick={() => setViewingOutlet(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                  <h3 className="text-neon-cyan font-mono text-lg mb-4">OUTLET #{viewingOutlet} CONTENTS</h3>
                  
                  <div className="space-y-2">
                      {localRack.outlets[viewingOutlet].map(dev => (
                          <div key={dev.id} className="flex items-center justify-between bg-black p-3 rounded border border-gray-800">
                              <div>
                                  <div className="text-sm font-bold text-white">{dev.name}</div>
                                  <div className="text-xs text-gray-500">{dev.type} | {dev.ipAddress || 'No IP'}</div>
                              </div>
                              <button 
                                onClick={() => {
                                    unassignDevice(viewingOutlet, dev.id);
                                    if (localRack.outlets[viewingOutlet].length <= 1) setViewingOutlet(null);
                                }}
                                className="text-xs text-red-500 hover:text-red-400 border border-red-900 px-2 py-1 rounded"
                              >
                                  UNPLUG
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VirtualRack;
