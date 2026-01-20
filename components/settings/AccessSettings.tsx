
import React, { useState } from 'react';
import { AppSettings, UserProfile, LogEntry } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { InputField, SaveButton, SectionHeader } from './SettingsCommon';

interface Props {
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    currentUser: UserProfile | null;
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const AccessSettings: React.FC<Props> = ({ settings, onUpdateSettings, currentUser, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const handlePasswordSave = () => {
        if (!editUserId || !newPassword.trim()) return;

        // Local complexity check
        if (settings.security.enforceStrongPasswords) {
            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                notify({ type: 'ERROR', message: "Password Policy: Must be 8+ chars, contain uppercase and number." });
                return;
            }
        }

        const targetUser = settings.users.find(u => u.id === editUserId);
        if (!targetUser) return;

        onRequestSecureAction(() => {
            const newUsers = settings.users.map(u => 
                u.id === editUserId ? { ...u, password: newPassword } : u
            );
            onUpdateSettings({ ...settings, users: newUsers });
            onLogEvent(`Security: Password changed for user "${targetUser.username}" by "${currentUser?.username}".`, 'INFO', 'USER');
            setEditUserId(null);
            setNewPassword('');
            notify({ type: 'SUCCESS', message: `Password updated for ${targetUser.username}` });
        }, `Change password for user ${targetUser.username}`);
    };

    return (
        <div className="max-w-4xl">
            <SectionHeader title="USER ACCESS CONTROL" subtitle="Manage operator credentials and roles." onHelp={onHelp ? () => onHelp('access_control') : undefined} />
            
            <div className="bg-black/50 border border-gray-800 rounded overflow-hidden mb-6">
                <div className="grid grid-cols-12 bg-gray-900 p-3 text-[10px] font-mono text-gray-500 font-bold tracking-wider">
                    <div className="col-span-4">USERNAME</div>
                    <div className="col-span-3">ROLE</div>
                    <div className="col-span-3">LAST LOGIN</div>
                    <div className="col-span-2 text-right">ACTIONS</div>
                </div>
                <div className="divide-y divide-gray-800">
                    {settings.users.map(u => (
                        <div key={u.id} className="grid grid-cols-12 p-3 items-center hover:bg-white/5 transition-colors">
                            <div className="col-span-4 text-xs font-bold text-white font-mono flex items-center gap-2">
                                {u.username}
                                {currentUser?.id === u.id && <span className="bg-neon-cyan/20 text-neon-cyan px-1 rounded text-[8px]">YOU</span>}
                            </div>
                            <div className="col-span-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                                    u.role === 'ADMIN' ? 'bg-neon-orange/10 text-neon-orange border-neon-orange/30' : 'bg-blue-900/20 text-blue-400 border-blue-900'
                                }`}>
                                    {u.role}
                                </span>
                            </div>
                            <div className="col-span-3 text-[10px] text-gray-500 font-mono">{u.lastLogin || 'Never'}</div>
                            <div className="col-span-2 text-right">
                                {(currentUser?.role === 'ADMIN' || currentUser?.id === u.id) && (
                                    <button 
                                        onClick={() => { setEditUserId(u.id); setNewPassword(''); }}
                                        className="text-xs text-neon-cyan border border-neon-cyan px-2 py-1 hover:bg-neon-cyan hover:text-black transition-colors rounded"
                                    >
                                        RESET PASS
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Password Reset Modal / Panel */}
            {editUserId && (
                <div className="bg-gray-900/50 border-l-4 border-neon-cyan p-6 rounded animate-fade-in">
                    <h4 className="text-neon-cyan text-xs font-mono font-bold mb-4">
                        RESETTING CREDENTIALS FOR: <span className="text-white ml-2">{settings.users.find(u => u.id === editUserId)?.username}</span>
                    </h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <InputField 
                            label="NEW PASSWORD"
                            type="password"
                            value={newPassword}
                            onChange={setNewPassword}
                            className="flex-1"
                            placeholder="Enter new secure password"
                            onHelp={onHelp ? () => onHelp('access_password') : undefined}
                        />
                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => setEditUserId(null)}
                                className="flex-1 md:w-24 py-2 border border-gray-700 text-gray-400 hover:text-white font-mono text-xs rounded transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handlePasswordSave}
                                className="flex-1 md:w-32 py-2 bg-neon-cyan text-black font-bold font-mono text-xs hover:bg-white rounded transition-colors"
                            >
                                UPDATE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessSettings;
