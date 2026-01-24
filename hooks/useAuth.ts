
import { useState, useEffect, useRef } from 'react';
import { UserProfile, AppSettings, LogEntry } from '../types';

interface AuthProps {
    settings: AppSettings;
    handleUpdateSettings: (s: AppSettings) => void;
    addEvent: (msg: string, severity: LogEntry['severity'], source: LogEntry['source']) => void;
    notify: (n: any) => void;
}

export const useAuth = ({ settings, handleUpdateSettings, addEvent, notify }: AuthProps) => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
    const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
    
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- IDLE TIMER ---
    useEffect(() => {
        if (!currentUser || !settings.security.enableIdleTimeout) {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            return;
        }
        const resetIdleTimer = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                addEvent("Session Terminated: Idle Timeout exceeded.", 'WARNING', 'SYSTEM');
                handleLogout();
            }, settings.security.idleTimeoutMinutes * 60 * 1000);
        };
        resetIdleTimer();
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            window.removeEventListener('mousemove', resetIdleTimer);
            window.removeEventListener('keydown', resetIdleTimer);
            window.removeEventListener('click', resetIdleTimer);
        };
    }, [currentUser, settings.security]);

    const handleLogin = async (username: string, password: string): Promise<boolean> => {
        if (lockoutEndTime && Date.now() < lockoutEndTime) return false;
        if (lockoutEndTime && Date.now() >= lockoutEndTime) setLockoutEndTime(null);

        const user = settings.users.find(u => u.username === username);
        if (user && user.password === password) {
            setFailedLoginAttempts(0);
            setLockoutEndTime(null);
            
            const updatedUser = { ...user, lastLogin: new Date().toISOString() };
            const newSettings = { ...settings, users: settings.users.map(u => u.id === user.id ? updatedUser : u) };
            handleUpdateSettings(newSettings); 
            
            setCurrentUser(updatedUser);
            addEvent(`User ${username} logged in.`, 'INFO', 'USER');
            notify({ type: 'SUCCESS', message: 'Uplink Established. Welcome back, Operator.' });
            return true;
        }
        
        if (settings.security.enableBruteForceProtection) {
            const newCount = failedLoginAttempts + 1;
            if (newCount >= settings.security.maxLoginAttempts) {
                const cooldownMs = settings.security.lockoutDurationMinutes * 60 * 1000;
                setLockoutEndTime(Date.now() + cooldownMs);
                setFailedLoginAttempts(0); 
                addEvent(`System Locked: Too many failed login attempts for ${username}. Cooldown active.`, 'CRITICAL', 'SYSTEM');
                notify({ type: 'ERROR', message: 'Security Lockout Active. Access Suspended.' });
            } else {
                setFailedLoginAttempts(newCount);
            }
        }
        return false;
    };

    const handleLogout = () => {
        if (currentUser) addEvent(`User ${currentUser?.username} logged out.`, 'INFO', 'USER');
        setCurrentUser(null);
    };

    return {
        currentUser,
        failedLoginAttempts,
        lockoutEndTime,
        handleLogin,
        handleLogout
    };
};
