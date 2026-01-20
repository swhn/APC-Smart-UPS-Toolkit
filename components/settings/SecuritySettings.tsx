
import React, { useState, useEffect } from 'react';
import { AppSettings, LogEntry } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { InputField, SaveButton, SectionHeader, ToggleItem } from './SettingsCommon';

interface Props {
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    onRequestSecureAction: (cb: () => void, desc: string) => void;
    onLogEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    onHelp?: (context: string) => void;
}

const SecuritySettings: React.FC<Props> = ({ settings, onUpdateSettings, onRequestSecureAction, onLogEvent, onHelp }) => {
    const { notify } = useNotification();
    const [draftSecurity, setDraftSecurity] = useState(settings.security);

    useEffect(() => {
        setDraftSecurity(settings.security);
    }, [settings]);

    const handleUpdate = (field: keyof typeof draftSecurity, value: any) => {
        setDraftSecurity(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onRequestSecureAction(() => {
            onUpdateSettings({ ...settings, security: draftSecurity });
            onLogEvent('Security Policy Updated: Global security settings modified.', 'WARNING', 'USER');
            notify({ type: 'SUCCESS', message: 'Security Policies Applied.' });
        }, "Modify Security Policies");
    };

    return (
        <div className="max-w-2xl bg-black/50 p-6 rounded border border-gray-800">
            <SectionHeader title="CYBER DEFENSE CONTROLS" subtitle="Configure automated security measures." onHelp={onHelp ? () => onHelp('security_config') : undefined} />
            
            <div className="space-y-6">
                
                {/* Idle Timeout */}
                <ToggleItem 
                    label="IDLE SESSION TIMEOUT" 
                    description="Automatically log out users after a period of inactivity."
                    enabled={draftSecurity.enableIdleTimeout} 
                    onToggle={() => handleUpdate('enableIdleTimeout', !draftSecurity.enableIdleTimeout)}
                    onHelp={onHelp ? () => onHelp('security_idle') : undefined}
                >
                    <div className="mt-2 max-w-xs">
                        <InputField 
                            label="TIMEOUT (MINUTES)" 
                            type="number"
                            value={draftSecurity.idleTimeoutMinutes}
                            onChange={v => handleUpdate('idleTimeoutMinutes', parseInt(v))}
                        />
                    </div>
                </ToggleItem>

                {/* Brute Force */}
                <ToggleItem 
                    label="BRUTE FORCE PROTECTION" 
                    description="Lock system access after repeated failed login attempts."
                    enabled={draftSecurity.enableBruteForceProtection} 
                    onToggle={() => handleUpdate('enableBruteForceProtection', !draftSecurity.enableBruteForceProtection)}
                    onHelp={onHelp ? () => onHelp('security_brute') : undefined}
                >
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <InputField 
                            label="MAX ATTEMPTS" 
                            type="number"
                            value={draftSecurity.maxLoginAttempts}
                            onChange={v => handleUpdate('maxLoginAttempts', parseInt(v))}
                            onHelp={onHelp ? () => onHelp('security_attempts') : undefined}
                        />
                        <InputField 
                            label="LOCKOUT DURATION (MIN)" 
                            type="number"
                            value={draftSecurity.lockoutDurationMinutes}
                            onChange={v => handleUpdate('lockoutDurationMinutes', parseInt(v))}
                            onHelp={onHelp ? () => onHelp('security_lockout') : undefined}
                        />
                    </div>
                </ToggleItem>

                {/* Password Policy */}
                <ToggleItem 
                    label="ENFORCE STRONG PASSWORDS" 
                    description="Require 8+ chars, uppercase, and numbers for all users."
                    enabled={draftSecurity.enforceStrongPasswords} 
                    onToggle={() => handleUpdate('enforceStrongPasswords', !draftSecurity.enforceStrongPasswords)}
                    onHelp={onHelp ? () => onHelp('security_policy') : undefined}
                />

                {/* MFA Placeholder */}
                <div className="opacity-50 pointer-events-none grayscale">
                    <ToggleItem 
                        label="MULTI-FACTOR AUTHENTICATION (MFA)" 
                        description="Requires hardware token (Feature Unavailable in Toolkit Basic)."
                        enabled={false} 
                        onToggle={() => {}}
                        disabled={true}
                    />
                </div>

                <div className="pt-4 border-t border-gray-800">
                    <SaveButton onClick={handleSave} label="APPLY SECURITY POLICIES" />
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
