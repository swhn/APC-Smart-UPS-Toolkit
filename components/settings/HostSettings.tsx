
import React, { useState, useEffect } from 'react';
import { AppSettings, LogEntry } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { InputField, SaveButton, SectionHeader, SelectField } from './SettingsCommon';

interface Props {
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const HostSettings: React.FC<Props> = ({ settings, onUpdateSettings, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();
    const [draftHost, setDraftHost] = useState(settings.host);

    useEffect(() => {
        setDraftHost(settings.host);
    }, [settings]);

    const handleSave = () => {
        onRequestSecureAction(() => {
            onUpdateSettings({ ...settings, host: draftHost });
            onLogEvent('Host Config: Server settings updated. Restart required.', 'WARNING', 'USER');
            notify({ type: 'SUCCESS', message: 'Host Configuration Updated. Restart required.' });
        }, "Update Host Configuration (Requires Manual Restart)");
    };

    return (
        <div className="max-w-md bg-black/50 p-6 rounded border border-gray-800">
            <SectionHeader title="HOST SERVER CONFIGURATION" subtitle="Settings for the backend service." onHelp={onHelp ? () => onHelp('network_config') : undefined} />
            
            <div className="space-y-6">
                <InputField 
                    label="SERVER PORT" 
                    value={draftHost.serverPort} 
                    onChange={v => setDraftHost({...draftHost, serverPort: parseInt(v)})} 
                    type="number"
                    onHelp={onHelp ? () => onHelp('host_port') : undefined}
                />

                <SelectField 
                    label="BIND ADDRESS"
                    value={draftHost.bindAddress}
                    onChange={v => setDraftHost({...draftHost, bindAddress: v})}
                    options={[
                        { label: '127.0.0.1 (Localhost Only - Secure)', value: '127.0.0.1' },
                        { label: '0.0.0.0 (All Interfaces - Remote Access)', value: '0.0.0.0' }
                    ]}
                    onHelp={onHelp ? () => onHelp('host_bind') : undefined}
                />

                <InputField 
                    label="DATA RETENTION (DAYS)" 
                    value={draftHost.dataRetentionDays} 
                    onChange={v => setDraftHost({...draftHost, dataRetentionDays: parseInt(v)})} 
                    type="number"
                    onHelp={onHelp ? () => onHelp('host_retention') : undefined}
                />

                <div className="bg-orange-900/20 border border-orange-500/50 p-3 rounded flex gap-3 items-start">
                    <div className="text-orange-500 font-bold">⚠</div>
                    <div className="text-[10px] text-orange-200 font-mono leading-relaxed">
                        Changes to the Server Port or Bind Address will require a manual restart of the host application/container to take effect.
                    </div>
                </div>

                <div className="pt-2">
                    <SaveButton onClick={handleSave} label="SAVE HOST CONFIGURATION" />
                </div>
            </div>
        </div>
    );
};

export default HostSettings;
