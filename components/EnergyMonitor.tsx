
import React, { useState, useMemo } from 'react';
import { UPSData } from '../types';
import { EnergyPoint } from '../services/StorageService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

interface Props {
  data: UPSData;
  history: EnergyPoint[]; // Now accepts real history from App parent
}

type TimeRange = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const EnergyMonitor: React.FC<Props> = ({ data, history }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('DAILY');

  // Filter and aggregate the passed history data based on selected range
  const displayData = useMemo(() => {
      if (!history || history.length === 0) return [];

      const now = Date.now();
      let cutoff = now;
      let dateFormat: 'hour' | 'day' = 'hour';

      if (timeRange === 'DAILY') {
          cutoff = now - (24 * 60 * 60 * 1000); // 24 hours ago
          dateFormat = 'hour';
      } else if (timeRange === 'WEEKLY') {
          cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago
          dateFormat = 'day';
      } else {
          cutoff = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago
          dateFormat = 'day';
      }

      // 1. Filter by time
      const filtered = history.filter(pt => pt.timestamp >= cutoff);

      // 2. Map to display format
      // In a production app with SQL, this aggregation happens on the backend.
      // Here we do a simple client-side visualization mapping.
      return filtered.map(pt => {
          const date = new Date(pt.timestamp);
          let name = '';
          
          if (dateFormat === 'hour') {
              name = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          } else {
              const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
              name = `${days[date.getDay()]} ${date.getDate()}`;
          }

          return {
              name,
              watts: pt.watts,
              kwh: pt.kwh,
              alarms: pt.alarms,
              timestamp: pt.timestamp // Keep for sorting if needed
          };
      });

  }, [timeRange, history]);

  // Custom Tooltip for 2-decimal precision and cyber styling
  const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-gray-700 p-2 rounded shadow-xl font-mono text-xs z-50">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value.toFixed(2)} {unit}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-24 md:pb-6">
      
      {/* Row 1: Instantaneous Metrics (Summary) */}
      
      {/* Digital Odometer (Lifetime Energy) */}
      <div className="bg-black border border-gray-800 rounded p-6 flex flex-col justify-center items-center min-h-[160px]">
         <h3 className="text-neon-cyan font-mono text-sm mb-4 self-start">LIFETIME ENERGY (kWh)</h3>
         <div className="flex items-center justify-center space-x-1 overflow-x-auto w-full">
            {data.energyUsageKWh.toFixed(2).toString().padStart(8, '0').split('').map((char, i) => (
                <div key={i} className={`flex-shrink-0 w-8 md:w-10 h-12 md:h-16 bg-[#1a1a1a] border border-[#333] rounded flex items-center justify-center text-2xl md:text-3xl font-mono ${char === '.' ? 'text-gray-500' : 'text-neon-cyan'} shadow-inner`}>
                    {char}
                </div>
            ))}
         </div>
         <div className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-widest">Total Cumulative Accumulation</div>
      </div>

      {/* Power Factor Triangle */}
      <div className="bg-gray-900/50 border border-gray-800 rounded p-6 relative min-h-[160px] flex items-center justify-center">
        <h3 className="text-neon-cyan font-mono text-sm absolute top-4 left-4">POWER FACTOR</h3>
        <div className="w-full flex items-center justify-center gap-8">
            <div className="relative w-32 h-32 md:w-40 md:h-40">
                 <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                     <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="10" />
                     <circle cx="50" cy="50" r="45" fill="none" stroke="#00F0FF" strokeWidth="10" strokeDasharray={`${(data.realPowerW / (data.apparentPowerVA || 1)) * 283} 283`} />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                     <span className="text-2xl font-bold font-mono">{(data.realPowerW / (data.apparentPowerVA || 1)).toFixed(2)}</span>
                     <span className="text-[10px] text-gray-500 font-mono">PF</span>
                 </div>
            </div>
            <div className="hidden md:flex flex-col gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-neon-cyan"><div className="w-2 h-2 bg-neon-cyan"></div>REAL: {data.realPowerW.toFixed(2)}W</div>
                <div className="flex items-center gap-2 text-neon-orange"><div className="w-2 h-2 bg-neon-orange"></div>APPARENT: {data.apparentPowerVA.toFixed(2)}VA</div>
            </div>
        </div>
      </div>

      {/* Row 2: Charts Area */}
      
      <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
          
          {/* Time Range Selector */}
          <div className="flex justify-end border-b border-gray-800 pb-2">
               <div className="flex bg-black rounded border border-gray-800 p-1">
                   {(['DAILY', 'WEEKLY', 'MONTHLY'] as TimeRange[]).map(range => (
                       <button
                           key={range}
                           onClick={() => setTimeRange(range)}
                           className={`px-4 py-1 text-[10px] font-mono rounded transition-colors ${timeRange === range ? 'bg-neon-cyan text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                       >
                           {range}
                       </button>
                   ))}
               </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Graph 1: Power Usage Trend (Watts) */}
              <div className="bg-gray-900/30 border border-gray-800 rounded p-4 h-[250px] relative">
                   <h3 className="text-neon-cyan font-mono text-xs absolute top-4 left-4 z-10">POWER LOAD HISTORY (WATTS)</h3>
                   <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} minTickGap={30} />
                            <YAxis 
                                stroke="#666" 
                                tick={{fill: '#666', fontSize: 10}} 
                                tickLine={false}
                                tickFormatter={(val) => val.toFixed(2)}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<CustomTooltip unit="W" />} />
                            <Area type="monotone" dataKey="watts" name="Real Power" stroke="#00F0FF" fillOpacity={1} fill="url(#colorWatts)" isAnimationActive={false} />
                        </AreaChart>
                   </ResponsiveContainer>
              </div>

              {/* Graph 2: Energy Consumption (kWh) */}
              <div className="bg-gray-900/30 border border-gray-800 rounded p-4 h-[250px] relative">
                   <h3 className="text-neon-orange font-mono text-xs absolute top-4 left-4 z-10">ENERGY USAGE (kWh)</h3>
                   <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} minTickGap={30} />
                            <YAxis 
                                stroke="#666" 
                                tick={{fill: '#666', fontSize: 10}} 
                                tickLine={false}
                                tickFormatter={(val) => val.toFixed(2)} 
                            />
                            <Tooltip content={<CustomTooltip unit="kWh" />} />
                            <Bar dataKey="kwh" name="Consumption" fill="#FF9900" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                   </ResponsiveContainer>
              </div>

              {/* Graph 3: Alarm Triggers (Full Width) */}
              <div className="lg:col-span-2 bg-gray-900/30 border border-gray-800 rounded p-4 h-[200px] relative">
                   <h3 className="text-red-500 font-mono text-xs absolute top-4 left-4 z-10">ALARM TRIGGER FREQUENCY</h3>
                   <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} minTickGap={30} />
                            <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} tickLine={false} allowDecimals={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#FF003C' }}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            />
                            <Bar dataKey="alarms" name="Events" fill="#FF003C" radius={[2, 2, 0, 0]} barSize={20} isAnimationActive={false} />
                        </BarChart>
                   </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};

export default EnergyMonitor;
