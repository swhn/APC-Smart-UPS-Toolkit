
import React, { useState, useEffect } from 'react';
import { Device, SystemConfiguration, ShutdownMethod, LayoutType, DeviceStatusMap } from '../types';
import { DeviceControlService } from '../services/DeviceControlService';
import { RACK_LAYOUTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  onRequestSecureAction: (callback: () => void, description: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  deviceStatuses: DeviceStatusMap;
  onHelp?: (context: string) => void;
}

// Helper to get compatible protocols based on device type
const getCompatibleProtocols = (type: Device['type']): ShutdownMethod[] => {
    switch(type) {
        case 'SERVER': return ['SSH', 'AGENT_WIN', 'AGENT_LINUX', 'VMWARE_REST', 'HTTP_POST', 'HARD_CUT'];
        case 'STORAGE': return ['SYNOLOGY_API', 'QNAP_API', 'SSH', 'HTTP_POST', 'HARD_CUT'];
        case 'NETWORK': return ['SNMP_SET', 'SSH', 'HARD_CUT'];
        default: return ['HARD_CUT', 'HTTP_POST'];
    }
};

type AuthFieldType = 'NONE' | 'BASIC' | 'COMMUNITY' | 'KEY';

interface ProtocolMeta {
    label: string;
    description: string;
    requirements: string;
    authType: AuthFieldType;
}

const PROTOCOL_INFO: Record<ShutdownMethod, ProtocolMeta> = {
    'SSH': { label: 'SSH (Secure Shell)', description: 'Executes shutdown command via standard SSH connection.', requirements: 'Root/Sudo credentials.', authType: 'BASIC' },
    'HTTP_POST': { label: 'HTTP Webhook', description: 'Sends a POST request to a custom endpoint.', requirements: 'Optional Bearer Token.', authType: 'KEY' },
    'SNMP_SET': { label: 'SNMP Trap/Set', description: 'Sends an OID Set command to trigger shutdown.', requirements: 'Write Community String.', authType: 'COMMUNITY' },
    'VMWARE_REST': { label: 'VMware vSphere API', description: 'Gracefully shuts down VMs then the ESXi Host.', requirements: 'vCenter/Host Credentials.', authType: 'BASIC' },
    'SYNOLOGY_API': { label: 'Synology DSM API', description: 'Uses DSM Web API to initiate safe shutdown.', requirements: 'User with Shutdown privileges.', authType: 'BASIC' },
    'QNAP_API': { label: 'QNAP QTS API', description: 'Uses QTS API to initiate safe shutdown.', requirements: 'Admin credentials.', authType: 'BASIC' },
    'NUT_CLIENT': { label: 'NUT Client', description: 'Network UPS Tools protocol.', requirements: 'NUT Server User/Pass.', authType: 'BASIC' },
    'AGENT_WIN': { label: 'Toolkit Agent (Windows)', description: 'Lightweight service for Windows Server/10/11.', requirements: 'Install "ups-agent.exe".', authType: 'KEY' },
    'AGENT_LINUX': { label: 'Toolkit Agent (Linux)', description: 'Daemon for Debian/RHEL based systems.', requirements: 'Install "ups-agentd".', authType: 'KEY' },
    'HARD_CUT': { label: 'Hard Power Cut', description: 'Immediate power loss via UPS Outlet Switch.', requirements: 'Managed Outlet Bank.', authType: 'NONE' }
};

// Help Button Component
const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="w-5 h-5 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[10px] hover:text-neon-cyan hover:border-neon-cyan transition-colors" title="View Documentation">
        ?
    </button>
);

const VirtualRack: React.FC<Props> = ({ config, onUpdateConfig, onRequestSecureAction, onDirtyChange, deviceStatuses, onHelp }) => {
  
  // --- Local Draft State ---
  const [localRack, setLocalRack] = useState(config.virtualRack);
  const [hasChanges, setHasChanges] = useState(false);

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
  
  // Auth State
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCommunity, setAuthCommunity] = useState('private'); // Default write community
  const [authKey, setAuthKey] = useState('');

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
    setAuthUsername('');
    setAuthPassword('');
    setAuthCommunity('private');
    setAuthKey('');
    setVerifyStatus('IDLE');
    setVerifyMsg('');
  };

  const handleOpenAddModal = () => {
      resetForm();
      setIsAddModalOpen(true);
  };

  const handleTypeChange = (type: Device['type']) => {
      setNewDevType(type);
      const bestProto = getCompatibleProtocols(type)[0];
      setNewDevMethod(bestProto);
  };

  const buildDeviceObject = (): Device => {
      const dev: Device = {
        id: `d${Date.now()}`,
        name: newDevName,
        ipAddress: newDevIp || undefined,
        type: newDevType,
        shutdownMethod: newDevMethod,
        powerDraw: newDevPower,
        status: 'ONLINE',
        connectionStatus: 'UNKNOWN',
        auth: {}
      };

      const authType = PROTOCOL_INFO[newDevMethod].authType;
      if (authType === 'BASIC') {
          dev.auth = { username: authUsername, password: authPassword };
      } else if (authType === 'COMMUNITY') {
          dev.auth = { community: authCommunity };
      } else if (authType === 'KEY') {
          dev.auth = { secretKey: authKey };
      }
      return dev;
  };

  const handleVerifyAndAdd = async () => {
      if(!newDevName) return;

      setVerifyStatus('CHECKING');
      setVerifyMsg(`Authenticating via ${PROTOCOL_INFO[newDevMethod].label}...`);

      const tempDevice = buildDeviceObject();
      const isVerified = await DeviceControlService.verifyConnection(tempDevice);

      if (isVerified) {
          setVerifyStatus('SUCCESS');
          setVerifyMsg('Authentication Successful. Device Provisioned.');
          
          setTimeout(() => {
              onRequestSecureAction(() => {
                  setLocalRack(prev => ({
                      ...prev,
                      unassignedDevices: [...prev.unassignedDevices, { ...tempDevice, connectionStatus: 'VERIFIED' }]
                  }));
                  setHasChanges(true);
                  setIsAddModalOpen(false);
              }, "Authorize New Device Provisioning");
          }, 800);
      } else {
          setVerifyStatus('FAILED');
          setVerifyMsg(`Connection Failed: Check IP and Credentials.`);
      }
  };

  const forceAddDevice = () => {
      const tempDevice = buildDeviceObject();
      tempDevice.connectionStatus = 'FAILED';
      
      onRequestSecureAction(() => {
          setLocalRack(prev => ({
              ...prev,
              unassignedDevices: [...prev.unassignedDevices, tempDevice]
          }));
          setHasChanges(true);
          setIsAddModalOpen(false);
      }, "Force Add Unverified Device");
  };

  const handleDeleteDevice = (deviceId: string) => {
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

    const currentOutletDevices = localRack.outlets[outletId] || [];
    const assignedDevice = { ...device, assignedOutlet: outletId };
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
  const OutletSocket: React.FC<{ id: number, isGroupControlled: boolean }> = ({ id, isGroupControlled }) => {
    const devices = localRack.outlets[id] || [];
    const isOccupied = devices.length > 0;
    const isMulti = devices.length > 1;
    const getDeviceStatus = (d: Device) => deviceStatuses[d.id] || d.status || 'ONLINE';
    const totalPower = devices.reduce((sum, d) => sum + (d.powerDraw || 0), 0);
    const isShuttingDown = devices.some(d => getDeviceStatus(d) === 'SHUTTING_DOWN');
    const isOffline = devices.every(d => getDeviceStatus(d) === 'OFFLINE') && isOccupied;
    
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
            <div className={`w-24 h-32 md:w-28 md:h-40 bg-[#111] border rounded-lg flex items-center justify-center relative transition-colors shadow-2xl ${isOccupied ? 'border-gray-600' : 'border-gray-700 hover:border-gray-500'}`}>
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
                {isOccupied && !isMulti && (
                    <div className="absolute inset-1.5 md:inset-2 bg-gray-800 rounded border-t border-gray-600 shadow-lg flex flex-col items-center justify-between z-10 pointer-events-none p-2">
                        <div className="w-full flex justify-between items-center">
                            <span className={`w-2 h-2 rounded-full ${
                                devices[0].type === 'SERVER' ? 'bg-blue-500 shadow-[0_0_6px_blue]' : 
                                devices[0].type === 'NETWORK' ? 'bg-green-500 shadow-[0_0_6px_green]' : 
                                'bg-orange-500 shadow-[0_0_6px_orange]'
                            }`}></span>
                        </div>
                        <div className="text-[10px] md:text-xs font-mono text-white text-center leading-tight break-words w-full font-bold truncate">
                            {devices[0].name.substring(0, 10)}
                        </div>
                        <div className="w-3/4 h-px bg-gray-700"></div>
                        <div className="flex flex-col items-center w-full gap-1">
                            <div className="text-[9px] md:text-[10px] text-gray-400 font-mono">{devices[0].powerDraw}W</div>
                            <div className={`text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-tighter ${
                                getDeviceStatus(devices[0]) === 'ONLINE' ? 'text-green-400' : 
                                getDeviceStatus(devices[0]) === 'SHUTTING_DOWN' ? 'text-yellow-400 animate-pulse' : 
                                'text-red-500'
                            }`}>
                                {getDeviceStatus(devices[0])}
                            </div>
                        </div>
                    </div>
                )}
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
            <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="text-neon-cyan font-mono text-sm tracking-[0.2em] uppercase bg-gray-900/80 px-6 py-2 rounded border border-gray-800 shadow-lg text-center">
                        {currentLayout.name}
                    </div>
                    {onHelp && <HelpButton onClick={() => onHelp('rack_topology')} />}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">CONTROL MODE:</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isGroupControlled ? 'text-red-400 border-red-900 bg-red-900/10' : 'text-green-400 border-green-900 bg-green-900/10'}`}>
                        {isGroupControlled ? 'GROUP SWITCHED' : 'INDIVIDUAL OUTLET'}
                    </span>
                </div>
            </div>
            <div className="w-full flex flex-wrap justify-center gap-4 md:gap-8">
                {currentLayout.groups.map((groupSize, groupIndex) => {
                    const startId = currentOutletId;
                    const outletsInGroup = [];
                    for(let i=0; i<groupSize; i++) {
                        outletsInGroup.push(currentOutletId++);
                    }
                    return (
                        <div key={groupIndex} className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 md:p-6 relative hover:border-gray-700 transition-colors">
                            <div className="absolute -top-3 left-3 bg-[#1a1a1a] px-2 text-[9px] font-mono text-gray-500 border border-gray-800 uppercase tracking-widest">
                                {currentLayout.groups.length > 1 ? `BANK ${groupIndex + 1}` : 'MAIN OUTPUT'}
                            </div>
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
      <div className="shrink-0 p-4 md:p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <div className="flex items-center gap-2">
                  <h2 className="text-xl font-mono text-neon-cyan">VIRTUAL RACK TOPOLOGY</h2>
                  {onHelp && <HelpButton onClick={() => onHelp('rack_topology')} />}
              </div>
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
      
      <div className="flex-1 overflow-y-auto bg-black/50 p-4 relative">
            <div className="absolute top-0 bottom-0 left-4 w-4 bg-[#1a1a1a] border-r border-gray-800 flex flex-col items-center py-2 gap-8 pointer-events-none opacity-50">
                 {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black border border-gray-600"></div>)}
            </div>
            <div className="absolute top-0 bottom-0 right-4 w-4 bg-[#1a1a1a] border-l border-gray-800 flex flex-col items-center py-2 gap-8 pointer-events-none opacity-50">
                 {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-black border border-gray-600"></div>)}
            </div>
            {renderCleanLayout()}
      </div>

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
              {localRack.unassignedDevices.map(device => {
                  const status = deviceStatuses[device.id] || device.status || 'ONLINE';
                  return (
                      <div 
                          key={device.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, device.id)}
                          className="min-w-[140px] p-3 rounded border border-gray-700 bg-gray-800 hover:border-neon-cyan cursor-grab active:cursor-grabbing group relative"
                      >
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
                              <span className="text-[10px] text-white font-bold font-mono truncate max-w-[100px]">{device.name}</span>
                          </div>
                          <div className="flex justify-between items-end mt-1">
                              <span className="text-[9px] text-gray-500 font-mono">{device.shutdownMethod}</span>
                              <span className={`text-[9px] font-mono ${status === 'ONLINE' ? 'text-green-500' : 'text-red-500'}`}>
                                  {status}
                              </span>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
      
      <AnimatePresence>
        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#121212] border border-neon-cyan rounded-lg p-6 w-full max-w-lg shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-neon-cyan font-mono text-lg font-bold">PROVISION NEW DEVICE</h3>
                        {onHelp && <HelpButton onClick={() => onHelp('provision_device')} />}
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-500 font-mono block mb-1">DEVICE NAME</label>
                            <input 
                                type="text" 
                                value={newDevName}
                                onChange={e => setNewDevName(e.target.value)}
                                className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                placeholder="e.g. Production VM Host 01"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-mono block mb-1">TYPE</label>
                                <select 
                                    value={newDevType}
                                    onChange={e => handleTypeChange(e.target.value as any)}
                                    className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                >
                                    <option value="SERVER">SERVER / HYPERVISOR</option>
                                    <option value="STORAGE">STORAGE (NAS/SAN)</option>
                                    <option value="NETWORK">NETWORK (SWITCH/ROUTER)</option>
                                    <option value="OTHER">OTHER (GENERIC)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-mono block mb-1">EST. POWER (W)</label>
                                <input 
                                    type="number" 
                                    value={newDevPower}
                                    onChange={e => setNewDevPower(parseInt(e.target.value))}
                                    className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 font-mono block mb-1">SHUTDOWN PROTOCOL</label>
                            <select 
                                value={newDevMethod}
                                onChange={e => setNewDevMethod(e.target.value as any)}
                                className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                            >
                                {getCompatibleProtocols(newDevType).map(proto => (
                                    <option key={proto} value={proto}>{PROTOCOL_INFO[proto].label}</option>
                                ))}
                            </select>
                            
                            {/* Protocol Info Panel */}
                            <div className="mt-2 bg-gray-900/50 p-3 rounded border border-gray-800 text-[10px] font-mono">
                                <div className="text-neon-cyan font-bold mb-1">{PROTOCOL_INFO[newDevMethod].label}</div>
                                <div className="text-gray-400 mb-2">{PROTOCOL_INFO[newDevMethod].description}</div>
                                <div className="flex items-center gap-1 text-gray-500">
                                    <span className="font-bold text-gray-300">REQ:</span> {PROTOCOL_INFO[newDevMethod].requirements}
                                </div>
                                {newDevMethod.includes('AGENT') && (
                                    <div className="mt-2 pt-2 border-t border-gray-800 text-blue-400 cursor-pointer hover:underline">
                                        ⬇ Download Agent Software v1.0.4
                                    </div>
                                )}
                            </div>
                        </div>

                        {newDevMethod !== 'HARD_CUT' && (
                             <div className="space-y-4 pt-2 border-t border-gray-800">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-mono block mb-1">IP ADDRESS / HOSTNAME</label>
                                    <input 
                                        type="text" 
                                        value={newDevIp}
                                        onChange={e => setNewDevIp(e.target.value)}
                                        className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                        placeholder="192.168.1.x"
                                    />
                                </div>

                                {/* Dynamic Auth Fields */}
                                {PROTOCOL_INFO[newDevMethod].authType === 'BASIC' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-mono block mb-1">USERNAME</label>
                                            <input 
                                                type="text" 
                                                value={authUsername}
                                                onChange={e => setAuthUsername(e.target.value)}
                                                className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                                placeholder="root / admin"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-mono block mb-1">PASSWORD</label>
                                            <input 
                                                type="password" 
                                                value={authPassword}
                                                onChange={e => setAuthPassword(e.target.value)}
                                                className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                                placeholder="********"
                                            />
                                        </div>
                                    </div>
                                )}

                                {PROTOCOL_INFO[newDevMethod].authType === 'COMMUNITY' && (
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-mono block mb-1">WRITE COMMUNITY STRING</label>
                                        <input 
                                            type="password" 
                                            value={authCommunity}
                                            onChange={e => setAuthCommunity(e.target.value)}
                                            className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                            placeholder="private"
                                        />
                                    </div>
                                )}

                                {PROTOCOL_INFO[newDevMethod].authType === 'KEY' && (
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-mono block mb-1">API KEY / SHARED SECRET</label>
                                        <input 
                                            type="password" 
                                            value={authKey}
                                            onChange={e => setAuthKey(e.target.value)}
                                            className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-neon-cyan outline-none font-mono"
                                            placeholder="Secret Token"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {verifyMsg && (
                            <div className={`p-2 rounded border text-[10px] font-mono ${
                                verifyStatus === 'CHECKING' ? 'bg-blue-900/20 border-blue-500 text-blue-400' :
                                verifyStatus === 'SUCCESS' ? 'bg-green-900/20 border-green-500 text-green-400' :
                                verifyStatus === 'FAILED' ? 'bg-red-900/20 border-red-500 text-red-400' : ''
                            }`}>
                                {verifyMsg}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="flex-1 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-white font-mono text-xs"
                            >
                                CANCEL
                            </button>
                            {verifyStatus === 'FAILED' ? (
                                <button 
                                    onClick={forceAddDevice}
                                    className="flex-1 py-2 bg-red-900/50 text-red-200 border border-red-500 font-mono text-xs hover:bg-red-900"
                                >
                                    FORCE ADD (OFFLINE)
                                </button>
                            ) : (
                                <button 
                                    onClick={handleVerifyAndAdd}
                                    disabled={verifyStatus === 'CHECKING'}
                                    className="flex-1 py-2 bg-neon-cyan text-black font-bold font-mono text-xs hover:bg-white"
                                >
                                    {verifyStatus === 'CHECKING' ? 'VERIFYING...' : 'VERIFY & ADD'}
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingOutlet !== null && (
             <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setViewingOutlet(null)}
             >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-black border border-gray-700 rounded-lg p-6 w-full max-w-sm relative"
                >
                    <button onClick={() => setViewingOutlet(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white">✕</button>
                    <h3 className="text-white font-mono text-lg mb-1">OUTLET #{viewingOutlet}</h3>
                    <div className="text-xs text-gray-500 font-mono mb-4">Connected Devices</div>
                    
                    <div className="space-y-2">
                        {localRack.outlets[viewingOutlet]?.map(d => (
                            <div key={d.id} className="bg-gray-900 p-2 rounded border border-gray-800 flex justify-between items-center group">
                                <div>
                                    <div className="text-sm font-bold text-white">{d.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{d.ipAddress} | {d.powerDraw}W</div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setViewingOutlet(null);
                                        unassignDevice(viewingOutlet!, d.id);
                                    }}
                                    className="text-[10px] text-red-500 border border-red-900 px-2 py-1 rounded hover:bg-red-900 hover:text-white transition-colors"
                                >
                                    UNPLUG
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
             </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VirtualRack;
