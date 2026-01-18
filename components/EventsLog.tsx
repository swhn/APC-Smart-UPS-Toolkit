
import React, { useState } from 'react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const EventsLog: React.FC<Props> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');

  const filteredLogs = logs.filter(log => filter === 'ALL' || log.severity === filter).reverse();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-500 border-red-500 bg-red-900/10';
      case 'WARNING': return 'text-orange-500 border-orange-500 bg-orange-900/10';
      case 'SUCCESS': return 'text-green-500 border-green-500 bg-green-900/10';
      default: return 'text-neon-cyan border-gray-700 bg-gray-900/10';
    }
  };

  return (
    <div className="h-full p-4 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
            <h2 className="text-xl font-mono text-neon-cyan">SYSTEM EVENT LOG</h2>
            <p className="text-xs text-gray-500 font-mono mt-1">Audit trail of system actions, automation events, and alerts.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onClearLogs} 
                className="px-3 py-2 border border-gray-700 hover:border-red-500 text-gray-500 hover:text-red-500 text-xs font-mono rounded transition-colors"
            >
                CLEAR LOGS
            </button>
            <button className="px-3 py-2 bg-neon-cyan text-black text-xs font-bold font-mono rounded hover:bg-white transition-colors">
                EXPORT CSV
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
         {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map(f => (
             <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1 text-[10px] font-mono border rounded-full transition-colors
                    ${filter === f 
                        ? 'bg-gray-800 text-white border-gray-600' 
                        : 'bg-transparent text-gray-600 border-transparent hover:border-gray-800'}
                `}
             >
                 {f}
             </button>
         ))}
      </div>

      {/* Log Table */}
      <div className="flex-1 bg-black border border-gray-800 rounded-lg overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 bg-gray-900 text-gray-500 text-[10px] font-mono font-bold uppercase p-3 border-b border-gray-800">
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-1">Level</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-7">Message</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredLogs.length === 0 && (
                <div className="text-center text-gray-600 font-mono text-xs py-10">No logs found matching criteria.</div>
            )}
            {filteredLogs.map(log => (
                <div key={log.id} className="grid grid-cols-12 items-center p-2 rounded hover:bg-white/5 border border-transparent hover:border-gray-800 transition-colors group">
                    <div className="col-span-2 text-[10px] font-mono text-gray-400">{log.timestamp}</div>
                    <div className="col-span-1">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 border rounded ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                        </span>
                    </div>
                    <div className="col-span-2 text-[10px] font-mono text-gray-300">{log.source}</div>
                    <div className="col-span-7 text-xs font-mono text-white break-words">{log.message}</div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default EventsLog;
