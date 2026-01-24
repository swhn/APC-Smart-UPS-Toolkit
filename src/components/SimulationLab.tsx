
import React, { useState, useEffect, useRef } from 'react';
import { UPSData, SystemConfiguration, Device } from '../types';

interface Props {
  upsData: UPSData;
  setUpsData: React.Dispatch<React.SetStateAction<UPSData>>;
  isUpsSimulating: boolean;
  setIsUpsSimulating: (val: boolean) => void;
  isDeviceSimulating: boolean;
  setIsDeviceSimulating: (val: boolean) => void;
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
  onRestoreConfig: () => void; // New Prop to revert system state
  onHelp?: (context: string) => void;
}

const SimulationLab: React.FC<Props> = ({ 
    upsData, 
    setUpsData, 
    isUpsSimulating, 
    setIsUpsSimulating,
    isDeviceSimulating,
    setIsDeviceSimulating,
    config, 
    onUpdateConfig, 
    onRestoreConfig,
    onHelp 
}) => {
  const [thermalRunawayActive, setThermalRunawayActive] = useState(false);
  const [brownoutActive, setBrownoutActive] = useState(false);
  const scenarioIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Clean up scenarios on unmount
  useEffect(() => {
      return () => {
          if (scenarioIntervalRef.current) clearInterval(scenarioIntervalRef.current);
      };
  }, []);

  const toggleDeviceSimulation = () => {
      const newState = !isDeviceSimulating;
      
      if (newState) {
          // TURNING ON: Inject Fake Devices
          injectTestDevices();
      } else {
          // TURNING OFF: Restore Real Configuration from Storage
          onRestoreConfig();
      }
      setIsDeviceSimulating(newState);
  };

  const triggerScenario = (scenario: 'NORMAL' | 'POWER_CUT' | 'OVERLOAD' | 'LOW_BATTERY' | 'BROWNOUT' | 'THERMAL_RUNAWAY') => {
      // Auto-enable UPS simulation if a scenario is clicked
      if (!isUpsSimulating) setIsUpsSimulating(true);
      
      setThermalRunawayActive(false);
      setBrownoutActive(false);
      if (scenarioIntervalRef.current) clearInterval(scenarioIntervalRef.current);

      switch(scenario) {
          case 'NORMAL':
              setUpsData(prev => ({
                  ...prev,
                  status: 'ONLINE',
                  inputVoltage: 120,
                  outputVoltage: 120,
                  inputFrequency: 60,
                  batteryCapacity: 100,
                  loadPercentage: 45,
                  runtimeRemaining: 3400,
                  batteryTemp: 28,
                  outputAmps: 8.5
              }));
              break;
          case 'POWER_CUT':
              setUpsData(prev => ({
                  ...prev,
                  status: 'ON_BATTERY',
                  inputVoltage: 0,
                  outputVoltage: 118,
                  inputFrequency: 0,
                  batteryCapacity: 95,
                  loadPercentage: 45,
                  runtimeRemaining: 1800,
              }));
              break;
          case 'OVERLOAD':
              setUpsData(prev => ({
                  ...prev,
                  status: 'OVERLOAD',
                  inputVoltage: 115,
                  outputVoltage: 115,
                  loadPercentage: 110,
                  outputAmps: 22,
                  batteryTemp: 45
              }));
              break;
          case 'LOW_BATTERY':
              setUpsData(prev => ({
                  ...prev,
                  status: 'ON_BATTERY',
                  inputVoltage: 0,
                  outputVoltage: 110,
                  batteryCapacity: 10,
                  runtimeRemaining: 120,
              }));
              break;
          case 'BROWNOUT':
              setBrownoutActive(true);
              setUpsData(prev => ({ ...prev, inputVoltage: 95, status: 'ONLINE' }));
              scenarioIntervalRef.current = setInterval(() => {
                  setUpsData(prev => {
                      const newVolt = 90 + Math.random() * 15; // 90-105V
                      const isSag = newVolt < 92;
                      return {
                          ...prev,
                          inputVoltage: newVolt,
                          status: isSag ? 'ON_BATTERY' : 'ONLINE',
                          batteryCapacity: isSag ? Math.max(0, prev.batteryCapacity - 0.1) : prev.batteryCapacity
                      };
                  });
              }, 2000);
              break;
          case 'THERMAL_RUNAWAY':
              setThermalRunawayActive(true);
              scenarioIntervalRef.current = setInterval(() => {
                  setUpsData(prev => {
                      const newTemp = prev.batteryTemp + 1.5;
                      return {
                          ...prev,
                          batteryTemp: newTemp,
                          status: newTemp > 60 ? 'OVERLOAD' : prev.status
                      };
                  });
              }, 1000);
              break;
      }
  };

  const injectTestDevices = () => {
      const mockDevices: Device[] = [
          { id: 'sim_srv_01', name: 'Database-Primary', type: 'SERVER', shutdownMethod: 'SSH', ipAddress: '192.168.1.101', powerDraw: 350, status: 'ONLINE', assignedOutlet: 1 },
          { id: 'sim_srv_02', name: 'App-Server-Cluster', type: 'SERVER', shutdownMethod: 'SSH', ipAddress: '192.168.1.102', powerDraw: 420, status: 'ONLINE', assignedOutlet: 2 },
          { id: 'sim_net_01', name: 'Core-Switch-L3', type: 'NETWORK', shutdownMethod: 'SNMP_SET', ipAddress: '192.168.1.254', powerDraw: 120, status: 'ONLINE', assignedOutlet: 3 },
          { id: 'sim_nas_01', name: 'Backup-Storage', type: 'STORAGE', shutdownMethod: 'HTTP_POST', ipAddress: '192.168.1.50', powerDraw: 180, status: 'ONLINE', assignedOutlet: 4 },
          { id: 'sim_fw_01', name: 'Edge-Firewall', type: 'NETWORK', shutdownMethod: 'SSH', ipAddress: '192.168.1.1', powerDraw: 65, status: 'ONLINE', assignedOutlet: 5 },
          { id: 'sim_mon_01', name: 'Env-Monitor', type: 'OTHER', shutdownMethod: 'HARD_CUT', powerDraw: 15, status: 'ONLINE', assignedOutlet: 6 },
      ];

      const newOutlets: any = {};
      mockDevices.forEach(d => {
          if (d.assignedOutlet) {
              newOutlets[d.assignedOutlet] = [d];
          }
      });

      onUpdateConfig({
          ...config,
          virtualRack: {
              ...config.virtualRack,
              outlets: newOutlets,
              unassignedDevices: []
          }
      });
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
            
            <div className="border-b border-gray-800 pb-4 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2">
                         <h2 className="text-xl font-mono text-neon-orange">SIMULATION LAB</h2>
                         {onHelp && (
                            <button onClick={() => onHelp('simulation')} className="w-5 h-5 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[10px] hover:text-neon-cyan hover:border-neon-cyan transition-colors">?</button>
                         )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                        Override system inputs to test failover protocols.
                    </p>
                </div>
                
                {/* DUAL TOGGLES */}
                <div className="flex items-center gap-6">
                    {/* UPS Simulation Toggle */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] font-mono text-gray-500 tracking-wider">UPS DATA SIM</div>
                        <button 
                            onClick={() => setIsUpsSimulating(!isUpsSimulating)}
                            className={`w-12 h-6 rounded-full border relative transition-all duration-300 ${isUpsSimulating ? 'bg-neon-orange/20 border-neon-orange' : 'bg-gray-900 border-gray-700'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${isUpsSimulating ? 'left-7 bg-neon-orange shadow-[0_0_10px_#FF9900]' : 'left-1 bg-gray-500'}`}></div>
                        </button>
                        <div className={`text-[10px] font-bold font-mono ${isUpsSimulating ? 'text-neon-orange' : 'text-gray-600'}`}>
                            {isUpsSimulating ? 'ON' : 'OFF'}
                        </div>
                    </div>

                    {/* Device Simulation Toggle */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px] font-mono text-gray-500 tracking-wider">DEVICE RACK SIM</div>
                        <button 
                            onClick={toggleDeviceSimulation}
                            className={`w-12 h-6 rounded-full border relative transition-all duration-300 ${isDeviceSimulating ? 'bg-blue-500/20 border-blue-500' : 'bg-gray-900 border-gray-700'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${isDeviceSimulating ? 'left-7 bg-blue-500 shadow-[0_0_10px_blue]' : 'left-1 bg-gray-500'}`}></div>
                        </button>
                        <div className={`text-[10px] font-bold font-mono ${isDeviceSimulating ? 'text-blue-500' : 'text-gray-600'}`}>
                            {isDeviceSimulating ? 'VIRTUAL' : 'REAL'}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-300 ${!isUpsSimulating ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                
                {/* 1. Event Scenarios */}
                <div className="space-y-6">
                    <div className="bg-black border border-gray-800 p-6 rounded relative overflow-hidden">
                        <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">CRITICAL EVENTS (UPS)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => triggerScenario('POWER_CUT')} className="bg-red-900/20 border border-red-500/50 text-red-500 py-4 hover:bg-red-900/50 hover:border-red-500 font-mono text-xs font-bold transition-all">
                                BLACKOUT (0V)
                            </button>
                            <button onClick={() => triggerScenario('OVERLOAD')} className="bg-orange-900/20 border border-orange-500/50 text-orange-500 py-4 hover:bg-orange-900/50 hover:border-orange-500 font-mono text-xs font-bold transition-all">
                                110% OVERLOAD
                            </button>
                            <button onClick={() => triggerScenario('LOW_BATTERY')} className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 py-4 hover:bg-yellow-900/50 hover:border-yellow-500 font-mono text-xs font-bold transition-all">
                                CRITICAL BATTERY
                            </button>
                            <button onClick={() => triggerScenario('NORMAL')} className="bg-green-900/20 border border-green-500/50 text-green-500 py-4 hover:bg-green-900/50 hover:border-green-500 font-mono text-xs font-bold transition-all">
                                RESTORE NORMAL
                            </button>
                        </div>
                    </div>

                    <div className="bg-black border border-gray-800 p-6 rounded relative overflow-hidden">
                        <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">ADVANCED SCENARIOS</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => triggerScenario('BROWNOUT')} 
                                className={`py-4 font-mono text-xs font-bold transition-all border ${brownoutActive ? 'bg-orange-500 text-black border-orange-500 animate-pulse' : 'bg-gray-900 text-orange-500 border-gray-700 hover:border-orange-500'}`}
                            >
                                {brownoutActive ? 'BROWNOUT ACTIVE' : 'VOLTAGE SAG (BROWNOUT)'}
                            </button>
                            <button 
                                onClick={() => triggerScenario('THERMAL_RUNAWAY')} 
                                className={`py-4 font-mono text-xs font-bold transition-all border ${thermalRunawayActive ? 'bg-red-500 text-black border-red-500 animate-pulse' : 'bg-gray-900 text-red-500 border-gray-700 hover:border-red-500'}`}
                            >
                                {thermalRunawayActive ? 'TEMP RISING...' : 'THERMAL RUNAWAY'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Manual Controls */}
                <div className="space-y-6">
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded">
                        <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">TELEMETRY OVERRIDE</h3>
                        <div className="space-y-6">
                            <RangeControl 
                                label="INPUT VOLTAGE (V)" 
                                value={upsData.inputVoltage} 
                                min={0} max={140} 
                                onChange={(v) => { 
                                    setUpsData(p => ({...p, inputVoltage: v, status: v < 90 ? 'ON_BATTERY' : 'ONLINE'})); 
                                }} 
                            />
                            <RangeControl 
                                label="INPUT FREQUENCY (Hz)" 
                                value={upsData.inputFrequency} 
                                min={40} max={70} 
                                color={Math.abs(upsData.inputFrequency - 60) > 3 ? 'text-red-500' : 'text-neon-cyan'}
                                onChange={(v) => { 
                                    setUpsData(p => ({...p, inputFrequency: v})); 
                                }} 
                            />
                            <RangeControl 
                                label="LOAD PERCENTAGE (%)" 
                                value={upsData.loadPercentage} 
                                min={0} max={120} 
                                color={upsData.loadPercentage > 100 ? 'text-red-500' : 'text-neon-cyan'} 
                                onChange={(v) => { 
                                    setUpsData(p => ({...p, loadPercentage: v, status: v > 100 ? 'OVERLOAD' : p.status})); 
                                }} 
                            />
                            <RangeControl 
                                label="BATTERY CAPACITY (%)" 
                                value={upsData.batteryCapacity} 
                                min={0} max={100} 
                                color={upsData.batteryCapacity < 20 ? 'text-red-500' : 'text-neon-green'} 
                                onChange={(v) => { 
                                    setUpsData(p => ({...p, batteryCapacity: v})); 
                                }} 
                            />
                            <RangeControl 
                                label="BATTERY TEMP (°C)" 
                                value={upsData.batteryTemp} 
                                min={10} max={80} 
                                color={upsData.batteryTemp > 40 ? 'text-red-500' : 'text-neon-cyan'} 
                                onChange={(v) => { 
                                    setUpsData(p => ({...p, batteryTemp: v})); 
                                }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {!isUpsSimulating && (
                <div className="text-center text-xs text-gray-500 font-mono mt-4 italic">
                    UPS Simulation controls locked. Enable "UPS DATA SIM" to override SNMP values.
                </div>
            )}
        </div>
    </div>
  );
};

const RangeControl: React.FC<{ label: string, value: number, min: number, max: number, onChange: (val: number) => void, color?: string }> = ({ label, value, min, max, onChange, color = 'text-neon-cyan' }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
            <label className="text-[10px] text-gray-500 font-mono tracking-wider">{label}</label>
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        </div>
        <input 
            type="range" 
            min={min} max={max} 
            value={value} 
            onChange={e => onChange(parseInt(e.target.value))} 
            className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-neon-cyan border border-gray-700" 
        />
    </div>
);

export default SimulationLab;
