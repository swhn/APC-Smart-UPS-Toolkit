
import React, { useState } from 'react';
import { UPSConfig, AppSettings, LogEntry } from '../../types';
import { SnmpManager } from '../../services/snmpManager';
import { useNotification } from '../../context/NotificationContext';

interface Props {
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const NetworkSettings: React.FC<Props> = ({ settings, onUpdateSettings, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftConfig, setDraftConfig] = useState<UPSConfig | null>(null);
    
    // Handshake State
    const [handshakeStatus, setHandshakeStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILURE'>('IDLE');
    const [handshakeData, setHandshakeData] = useState<{ model: string, serial: string } | null>(null);

    const handleEdit = (ups: UPSConfig) => {
        setDraftConfig({ ...ups });
        setEditingId(ups.id);
        setHandshakeStatus('IDLE');
        setHandshakeData(null);
    };

    const handleNew = () => {
        setDraftConfig({
            id: `ups_${Date.now()}`,
            name: 'New UPS Unit',
            targetIp: '',
            community: 'public',
            port: 161,
            timeout: 3000,
            pollingInterval: 5000
        });
        setEditingId('NEW');
        setHandshakeStatus('IDLE');
    };

    const handleDelete = (id: string) => {
        onRequestSecureAction(() => {
            const removedUps = settings.upsRegistry.find(u => u.id === id);
            const updated = settings.upsRegistry.filter(u => u.id !== id);
            onUpdateSettings({ ...settings, upsRegistry: updated });
            onLogEvent(`Network Config: Removed UPS "${removedUps?.name || id}" from registry.`, 'WARNING', 'USER');
            notify({ type: 'SUCCESS', message: 'UPS removed from registry.' });
        }, "Delete UPS Configuration");
    };

    const runHandshake = async () => {
        if (!draftConfig) return;
        setHandshakeStatus('TESTING');
        setHandshakeData(null);

        // Perform real SNMP test
        const result = await SnmpManager.testConnection(draftConfig.targetIp, draftConfig.community);

        if (result.success) {
            setHandshakeStatus('SUCCESS');
            setHandshakeData({ model: result.model || 'Unknown', serial: result.serial || 'Unknown' });
            notify({ type: 'SUCCESS', message: `Connected to ${result.model}` });
        } else {
            setHandshakeStatus('FAILURE');
            notify({ type: 'ERROR', title: 'Connection Failed', message: result.error || 'Unknown Error' });
        }
    };

    const saveConfiguration = () => {
        if (!draftConfig) return;
        
        // Block saving if handshake failed (Industrial Standard: Verify before Commit)
        if (handshakeStatus !== 'SUCCESS') {
            notify({ type: 'WARNING', message: 'Please verify connection successfully before saving.' });
            return;
        }

        onRequestSecureAction(() => {
            let updatedRegistry = [...settings.upsRegistry];
            if (editingId === 'NEW') {
                updatedRegistry.push(draftConfig);
            } else {
                updatedRegistry = updatedRegistry.map(u => u.id === editingId ? draftConfig : u);
            }
            onUpdateSettings({ ...settings, upsRegistry: updatedRegistry });
            onLogEvent(`Network Config: UPS "${draftConfig.name}" (${draftConfig.targetIp}) configuration updated.`, 'SUCCESS', 'USER');
            setEditingId(null);
            notify({ type: 'SUCCESS', message: 'Network Configuration Saved.' });
        }, "Save Network Settings");
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* List View */}
            {!editingId && (
                <div className="bg-black/50 border border-gray-800 rounded overflow-hidden">
                    <div className="grid grid-cols-12 bg-gray-900 p-3 text-[10px] font-mono text-gray-500 font-bold tracking-wider">
                        <div className="col-span-4">NAME</div>
                        <div className="col-span-4">TARGET IP</div>
                        <div className="col-span-4 text-right">ACTIONS</div>
                    </div>
                    <div className="divide-y divide-gray-800">
                        {settings.upsRegistry.map(ups => (
                            <div key={ups.id} className="grid grid-cols-12 p-3 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-4 text-xs font-bold text-white font-mono">{ups.name}</div>
                                <div className="col-span-4 text-xs font-mono text-neon-cyan">{ups.targetIp}</div>
                                <div className="col-span-4 flex justify-end gap-2">
                                    <button onClick={() => handleEdit(ups)} className="px-2 py-1 text-[10px] border border-gray-600 hover:border-white text-gray-400 hover:text-white rounded transition-colors">EDIT</button>
                                    <button onClick={() => handleDelete(ups.id)} className="px-2 py-1 text-[10px] border border-red-900 text-red-500 hover:bg-red-900/20 rounded transition-colors">DEL</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleNew} className="w-full py-3 border-t border-gray-800 text-gray-400 hover:text-neon-cyan font-mono text-xs hover:bg-gray-900 transition-colors">+ ADD UNIT</button>
                </div>
            )}

            {/* Edit View */}
            {editingId && draftConfig && (
                <div className="bg-black/50 border border-gray-800 rounded p-6 animate-fade-in relative">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                        <h3 className="text-white font-mono text-sm">
                            {editingId === 'NEW' ? 'ADD NEW UPS' : 'EDIT CONFIGURATION'}
                        </h3>
                        {onHelp && (
                            <button onClick={() => onHelp('network_config')} className="w-5 h-5 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[10px] hover:text-neon-cyan hover:border-neon-cyan transition-colors">?</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 font-mono">FRIENDLY NAME</label>
                            <input className="w-full bg-black border border-gray-700 p-2 text-white text-sm font-mono focus:border-neon-cyan outline-none" 
                                value={draftConfig.name} onChange={e => setDraftConfig({...draftConfig, name: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center mb-0.5">
                                <label className="text-[10px] text-gray-500 font-mono">IP ADDRESS</label>
                                {onHelp && <button onClick={(e) => { e.preventDefault(); onHelp('network_ip'); }} className="ml-2 w-4 h-4 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[9px] hover:text-neon-cyan hover:border-neon-cyan transition-colors">?</button>}
                            </div>
                            <input className="w-full bg-black border border-gray-700 p-2 text-white text-sm font-mono focus:border-neon-cyan outline-none" 
                                value={draftConfig.targetIp} onChange={e => setDraftConfig({...draftConfig, targetIp: e.target.value})} placeholder="192.168.x.x" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center mb-0.5">
                                <label className="text-[10px] text-gray-500 font-mono">COMMUNITY STRING</label>
                                {onHelp && <button onClick={(e) => { e.preventDefault(); onHelp('network_community'); }} className="ml-2 w-4 h-4 rounded-full border border-gray-600 text-gray-500 flex items-center justify-center text-[9px] hover:text-neon-cyan hover:border-neon-cyan transition-colors">?</button>}
                            </div>
                            <input className="w-full bg-black border border-gray-700 p-2 text-white text-sm font-mono focus:border-neon-cyan outline-none" 
                                type="password" value={draftConfig.community} onChange={e => setDraftConfig({...draftConfig, community: e.target.value})} />
                        </div>
                    </div>

                    {/* Test & Handshake Section */}
                    <div className="mt-6 p-4 bg-gray-900/30 border border-gray-800 rounded">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-mono text-gray-400">CONNECTION VERIFICATION</span>
                            {handshakeStatus === 'SUCCESS' && <span className="text-[10px] text-green-500 font-bold bg-green-900/20 px-2 py-1 rounded">VERIFIED</span>}
                            {handshakeStatus === 'FAILURE' && <span className="text-[10px] text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded">FAILED</span>}
                        </div>
                        
                        {handshakeData && (
                            <div className="mb-4 text-[10px] font-mono grid grid-cols-2 gap-2 bg-black p-2 rounded border border-gray-700">
                                <div className="text-gray-500">MODEL:</div><div className="text-white">{handshakeData.model}</div>
                                <div className="text-gray-500">SERIAL:</div><div className="text-neon-cyan">{handshakeData.serial}</div>
                            </div>
                        )}

                        <button 
                            onClick={runHandshake}
                            disabled={handshakeStatus === 'TESTING' || !draftConfig.targetIp}
                            className={`w-full py-2 font-mono text-xs font-bold border transition-colors 
                                ${handshakeStatus === 'TESTING' ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-transparent text-neon-cyan border-neon-cyan hover:bg-neon-cyan hover:text-black'}
                            `}
                        >
                            {handshakeStatus === 'TESTING' ? 'HANDSHAKING...' : 'TEST CONNECTION & GET INFO'}
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-3 border border-gray-700 text-gray-400 hover:text-white font-mono text-xs">CANCEL</button>
                        <button onClick={saveConfiguration} className="flex-1 py-3 bg-neon-cyan text-black font-bold font-mono text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={handshakeStatus !== 'SUCCESS'}>
                            SAVE SETTINGS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkSettings;
