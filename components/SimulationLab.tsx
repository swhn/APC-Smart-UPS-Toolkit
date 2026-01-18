
import React from 'react';
import { UPSData } from '../types';

interface Props {
  upsData: UPSData;
  setUpsData: React.Dispatch<React.SetStateAction<UPSData>>;
  setIsSimulating: (isSimulating: boolean) => void;
}

const SimulationLab: React.FC<Props> = ({ upsData, setUpsData, setIsSimulating }) => {

  const triggerScenario = (scenario: 'NORMAL' | 'POWER_CUT' | 'OVERLOAD' | 'LOW_BATTERY') => {
      setIsSimulating(true);
      switch(scenario) {
          case 'NORMAL':
              setUpsData(prev => ({
                  ...prev,
                  status: 'ONLINE',
                  inputVoltage: 120,
                  outputVoltage: 120,
                  batteryCapacity: 100,
                  loadPercentage: 45,
                  runtimeRemaining: 3400,
                  batteryTemp: 28,
                  outputAmps: 8.5
              }));
              setIsSimulating(false); // Stop the randomizer jitter when returning to normal static state
              break;
          case 'POWER_CUT':
              setUpsData(prev => ({
                  ...prev,
                  status: 'ON_BATTERY',
                  inputVoltage: 0,
                  outputVoltage: 118,
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
      }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
            
            <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-mono text-neon-orange">SIMULATION LAB</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">
                    Test system responses, alarms, and shutdown sequences without physical hardware events.
                    <span className="block text-neon-orange mt-1 font-bold">⚠ WARNING: ACTIONS HERE TRIGGER REAL APPLICATION ALERTS.</span>
                </p>
            </div>

            <div className="space-y-6 md:space-y-8">
                {/* Scenario Buttons */}
                <div className="bg-black border border-gray-800 p-6 rounded relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20 text-6xl text-gray-700 font-bold font-mono select-none">TEST</div>
                    <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">PRESET EVENT SCENARIOS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => triggerScenario('POWER_CUT')} className="bg-red-900/20 border border-red-500/50 text-red-500 py-4 hover:bg-red-900/50 hover:border-red-500 font-mono text-xs font-bold transition-all">
                            POWER OUTAGE
                        </button>
                        <button onClick={() => triggerScenario('OVERLOAD')} className="bg-orange-900/20 border border-orange-500/50 text-orange-500 py-4 hover:bg-orange-900/50 hover:border-orange-500 font-mono text-xs font-bold transition-all">
                            SYSTEM OVERLOAD
                        </button>
                        <button onClick={() => triggerScenario('LOW_BATTERY')} className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-500 py-4 hover:bg-yellow-900/50 hover:border-yellow-500 font-mono text-xs font-bold transition-all">
                            CRITICAL BATTERY
                        </button>
                        <button onClick={() => triggerScenario('NORMAL')} className="bg-green-900/20 border border-green-500/50 text-green-500 py-4 hover:bg-green-900/50 hover:border-green-500 font-mono text-xs font-bold transition-all">
                            RESTORE NORMAL
                        </button>
                    </div>
                </div>

                {/* Manual Controls */}
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded">
                    <h3 className="text-sm font-mono text-white mb-6 tracking-widest border-b border-gray-800 pb-2">MANUAL TELEMETRY OVERRIDE</h3>
                    <div className="space-y-8">
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
