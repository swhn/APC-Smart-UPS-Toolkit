
import React, { useState, useEffect, useRef } from 'react';
import { UPSData, SystemConfiguration, Device } from '../types';

interface Props {
  upsData: UPSData;
  setUpsData: React.Dispatch<React.SetStateAction<UPSData>>;
  setIsSimulating: (isSimulating: boolean) => void;
  config: SystemConfiguration;
  onUpdateConfig: (newConfig: SystemConfiguration) => void;
}

const SimulationLab: React.FC<Props> = ({ upsData, setUpsData, setIsSimulating, config, onUpdateConfig }) => {
  const [thermalRunawayActive, setThermalRunawayActive] = useState(false);
  const [brownoutActive, setBrownoutActive] = useState(false);
  const scenarioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up scenarios on unmount
  useEffect(() => {
      return () => {
          if (scenarioIntervalRef.current) clearInterval(scenarioIntervalRef.current);
      };
  }, []);

  const triggerScenario = (scenario: 'NORMAL' | 'POWER_CUT' | 'OVERLOAD' | 'LOW_BATTERY' | 'BROWNOUT' | 'THERMAL_RUNAWAY') => {
      setIsSimulating(true);
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
              setIsSimulating(false); 
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
                      // If drops below 92, switch to battery briefly
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
                          status: newTemp > 60 ? 'OVERLOAD' : prev.status // Simulate fail at 60C
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

      // Assign to layout
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
      alert("Virtual Rack populated with simulated hardware topology.");
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
            
            <div className="border-b border-gray-800 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-mono text-neon-orange">SIMULATION LAB</h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                        Test system responses, alarms, and shutdown sequences without physical hardware events.
                        <span className="block text-neon-orange mt-1 font-bold">⚠ WARNING: ACTIONS HERE TRIGGER REAL APPLICATION ALERTS.</span>
                    </p>
                </div>
                {setIsSimulating && (
                    <div className="text-right">
                        <div className="text-[10px] font-mono text-gray-500">SIMULATION ENGINE</div>
                        <div className="text-xs font-bold text-neon-green">ACTIVE</div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Event Scenarios */}
                <div className="space-y-6">
                    <div className="bg-black border border-gray-800 p-6 rounded relative overflow-hidden">
                        <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">CRITICAL EVENTS</h3>
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
                                    setIsSimulating(true); 
                                    setUpsData(p => ({...p, inputVoltage: v, status: v < 90 ? 'ON_BATTERY' : 'ONLINE'})); 
                                }} 
                            />
                            <RangeControl 
                                label="INPUT FREQUENCY (Hz)" 
                                value={upsData.inputFrequency} 
                                min={40} max={70} 
                                color={Math.abs(upsData.inputFrequency - 60) > 3 ? 'text-red-500' : 'text-neon-cyan'}
                                onChange={(v) => { 
                                    setIsSimulating(true); 
                                    setUpsData(p => ({...p, inputFrequency: v})); 
                                }} 
                            />
                            <RangeControl 
                                label="LOAD PERCENTAGE (%)" 
                                value={upsData.loadPercentage} 
                                min={0} max={120} 
                                color={upsData.loadPercentage > 100 ? 'text-red-500' : 'text-neon-cyan'} 
                                onChange={(v) => { 
                                    setIsSimulating(true); 
                                    setUpsData(p => ({...p, loadPercentage: v, status: v > 100 ? 'OVERLOAD' : p.status})); 
                                }} 
                            />
                            <RangeControl 
                                label="BATTERY CAPACITY (%)" 
                                value={upsData.batteryCapacity} 
                                min={0} max={100} 
                                color={upsData.batteryCapacity < 20 ? 'text-red-500' : 'text-neon-green'} 
                                onChange={(v) => { 
                                    setIsSimulating(true); 
                                    setUpsData(p => ({...p, batteryCapacity: v})); 
                                }} 
                            />
                            <RangeControl 
                                label="BATTERY TEMP (°C)" 
                                value={upsData.batteryTemp} 
                                min={10} max={80} 
                                color={upsData.batteryTemp > 40 ? 'text-red-500' : 'text-neon-cyan'} 
                                onChange={(v) => { 
                                    setIsSimulating(true); 
                                    setUpsData(p => ({...p, batteryTemp: v})); 
                                }} 
                            />
                        </div>
                    </div>

                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded">
                        <h3 className="text-sm font-mono text-white mb-4 tracking-widest border-b border-gray-800 pb-2">HARDWARE INJECTION</h3>
                        <p className="text-[10px] text-gray-400 font-mono mb-4">
                            Injects a predefined set of Servers, Network Gear, and Storage devices into the Virtual Rack to test layout logic and Shutdown Sequence protocols.
                        </p>
                        <button 
                            onClick={injectTestDevices}
                            className="w-full py-3 bg-blue-900/20 text-blue-400 border border-blue-900 hover:bg-blue-900/40 hover:text-white font-mono text-xs font-bold transition-all"
                        >
                            POPULATE TEST RACK
                        </button>
                    </div>
                </div>
            </div>
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
