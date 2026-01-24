
import React from 'react';
import { TabId, UPSData, UserProfile, AppSettings } from '../../types';

// --- Vector Icons ---
const IconDeck = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconRack = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;
const IconSequence = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconDiag = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IconEnergy = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const IconLogs = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconSettings = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconLogout = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const IconLab = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 2v7.31"></path><path d="M14 2v7.31"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0V2"></path></svg>;
const IconHelp = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

interface Props {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
    activeUpsId: string;
    setActiveUpsId: (id: string) => void;
    allUpsData: Record<string, UPSData>;
    settings: AppSettings;
    handleNavigation: (target: TabId | 'LOGOUT') => void;
    isUpsSimulating: boolean;
    isDeviceSimulating: boolean;
    currentUser: UserProfile | null;
    currentUpsData: UPSData;
    shutdownTriggered: boolean;
    setShutdownTriggered: (v: boolean) => void;
    children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({ 
    activeTab, 
    activeUpsId, 
    setActiveUpsId, 
    allUpsData, 
    settings, 
    handleNavigation,
    isUpsSimulating,
    isDeviceSimulating,
    currentUser,
    currentUpsData,
    shutdownTriggered,
    setShutdownTriggered,
    children
}) => {
    return (
        <div className={`h-screen w-screen bg-charcoal text-white flex overflow-hidden font-mono select-none transition-all duration-500`}>
            
            {/* Desktop Sidebar Navigation */}
            <nav className="hidden md:flex w-20 hover:w-64 bg-black border-r border-gray-800 flex-col items-start py-6 z-40 transition-all duration-300 ease-in-out group shadow-2xl">
                <div className="w-full flex items-center h-12 mb-8 px-2 overflow-hidden">
                    <div className="w-16 flex-shrink-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-gray-900 border border-neon-cyan/30 rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                        </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center whitespace-nowrap">
                        <span className="text-neon-cyan font-bold font-mono text-lg tracking-widest leading-none">APC TOOLKIT</span>
                        <span className="text-[9px] text-gray-500 font-mono tracking-widest">COMMAND CORE</span>
                    </div>
                </div>
                
                <div className="w-full px-2 mb-6">
                    <div className="text-[9px] text-gray-500 mb-1 pl-2 font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">ACTIVE UPS</div>
                    <div className="bg-gray-900 border border-gray-700 rounded p-1">
                        {settings.upsRegistry.map(ups => (
                            <button
                                key={ups.id}
                                onClick={() => setActiveUpsId(ups.id)}
                                className={`w-full text-left px-2 py-2 mb-1 last:mb-0 rounded flex items-center gap-2 transition-all ${
                                    activeUpsId === ups.id 
                                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${allUpsData[ups.id]?.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                <div className="overflow-hidden">
                                    <div className="text-[10px] font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity delay-75">{ups.name}</div>
                                    {activeUpsId === ups.id && <div className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity delay-75">{ups.targetIp}</div>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <NavButton label="COMMAND DECK" active={activeTab === TabId.COMMAND_DECK} onClick={() => handleNavigation(TabId.COMMAND_DECK)} icon={<IconDeck />} />
                    <NavButton label="VIRTUAL RACK" active={activeTab === TabId.VIRTUAL_RACK} onClick={() => handleNavigation(TabId.VIRTUAL_RACK)} icon={<IconRack />} />
                    <NavButton label="SHUTDOWN SEQ" active={activeTab === TabId.SHUTDOWN_SEQUENCER} onClick={() => handleNavigation(TabId.SHUTDOWN_SEQUENCER)} icon={<IconSequence />} />
                    <NavButton label="DIAGNOSTICS" active={activeTab === TabId.DIAGNOSTICS} onClick={() => handleNavigation(TabId.DIAGNOSTICS)} icon={<IconDiag />} />
                    <NavButton label="ENERGY STATS" active={activeTab === TabId.ENERGY_MONITOR} onClick={() => handleNavigation(TabId.ENERGY_MONITOR)} icon={<IconEnergy />} />
                    <NavButton label="SIMULATION" active={activeTab === TabId.SIMULATION} onClick={() => handleNavigation(TabId.SIMULATION)} icon={<IconLab />} />
                    <NavButton label="EVENT LOGS" active={activeTab === TabId.EVENTS_LOGS} onClick={() => handleNavigation(TabId.EVENTS_LOGS)} icon={<IconLogs />} />
                </div>
                <div className="flex-1" />
                <div className="flex flex-col gap-2 w-full pb-4">
                    <NavButton label="SETTINGS" active={activeTab === TabId.SETTINGS} onClick={() => handleNavigation(TabId.SETTINGS)} icon={<IconSettings />} color="text-gray-400" borderColor="border-gray-600" />
                    <NavButton label="HELP" active={activeTab === TabId.HELP} onClick={() => handleNavigation(TabId.HELP)} icon={<IconHelp />} color="text-gray-400" borderColor="border-gray-600" />
                    <NavButton label="LOGOUT" active={false} onClick={() => handleNavigation('LOGOUT')} icon={<IconLogout />} color="text-red-500" borderColor="border-red-900" />
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col h-full">
                <header className="h-14 bg-black/50 border-b border-gray-800 flex items-center px-4 md:px-6 justify-between shrink-0">
                    <h1 className="text-xs md:text-sm text-gray-400 tracking-[0.2em] uppercase">
                        {settings.upsRegistry.find(u => u.id === activeUpsId)?.name || 'UPS SYSTEM'} 
                        <span className="text-gray-600 mx-2">|</span> 
                        {activeTab.replace('_', ' ')}
                    </h1>
                    <div className="hidden md:flex gap-4 text-xs">
                        {isUpsSimulating && <span className="text-neon-orange animate-pulse font-bold">[UPS SIM ACTIVE]</span>}
                        {isDeviceSimulating && <span className="text-blue-500 animate-pulse font-bold">[DEV SIM ACTIVE]</span>}
                        <span className="text-green-500">SNMP: {settings.upsRegistry.find(u => u.id === activeUpsId)?.targetIp}</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-neon-cyan">USER: {currentUser?.username} [{currentUser?.role}]</span>
                    </div>
                    <div className="md:hidden flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentUpsData.status === 'ONLINE' ? 'bg-neon-green' : 'bg-neon-orange animate-pulse'}`}></div>
                        <span className="text-[10px] text-neon-cyan">{currentUpsData.status}</span>
                        <button onClick={() => handleNavigation('LOGOUT')} className="ml-2 text-red-500 text-xs border border-red-900 px-1 rounded">EXIT</button>
                    </div>
                </header>

                {/* Protocol Notification Overlay */}
                {shutdownTriggered && (
                    <div className="bg-red-900/90 text-white text-xs font-mono p-2 flex justify-between items-center border-b border-red-500 animate-pulse">
                        <span>⚠ PHOENIX PROTOCOL ACTIVE: GLOBAL FAILSAFE SHUTDOWN IMMINENT</span>
                        <button onClick={() => setShutdownTriggered(false)} className="border border-white px-2 hover:bg-white hover:text-red-900">DISMISS</button>
                    </div>
                )}

                {children}
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur border-t border-gray-800 flex justify-start items-center z-50 px-4 overflow-x-auto gap-4 custom-scrollbar">
                <NavButton mobile label="DASH" active={activeTab === TabId.COMMAND_DECK} onClick={() => handleNavigation(TabId.COMMAND_DECK)} icon={<IconDeck />} />
                <NavButton mobile label="RACK" active={activeTab === TabId.VIRTUAL_RACK} onClick={() => handleNavigation(TabId.VIRTUAL_RACK)} icon={<IconRack />} />
                <NavButton mobile label="SEQ" active={activeTab === TabId.SHUTDOWN_SEQUENCER} onClick={() => handleNavigation(TabId.SHUTDOWN_SEQUENCER)} icon={<IconSequence />} />
                <NavButton mobile label="DIAG" active={activeTab === TabId.DIAGNOSTICS} onClick={() => handleNavigation(TabId.DIAGNOSTICS)} icon={<IconDiag />} />
                <NavButton mobile label="PWR" active={activeTab === TabId.ENERGY_MONITOR} onClick={() => handleNavigation(TabId.ENERGY_MONITOR)} icon={<IconEnergy />} />
                <NavButton mobile label="SIM" active={activeTab === TabId.SIMULATION} onClick={() => handleNavigation(TabId.SIMULATION)} icon={<IconLab />} />
                <NavButton mobile label="LOGS" active={activeTab === TabId.EVENTS_LOGS} onClick={() => handleNavigation(TabId.EVENTS_LOGS)} icon={<IconLogs />} />
                <NavButton mobile label="SET" active={activeTab === TabId.SETTINGS} onClick={() => handleNavigation(TabId.SETTINGS)} icon={<IconSettings />} />
                <NavButton mobile label="HELP" active={activeTab === TabId.HELP} onClick={() => handleNavigation(TabId.HELP)} icon={<IconHelp />} />
            </nav>
        </div>
    );
};

const NavButton: React.FC<{ label: string, active: boolean, onClick: () => void, icon: React.ReactNode, color?: string, borderColor?: string, mobile?: boolean }> = ({ label, active, onClick, icon, color = 'text-neon-cyan', borderColor = 'border-neon-cyan', mobile = false }) => {
    if (mobile) {
        return (
            <button onClick={onClick} className={`w-10 h-10 rounded flex items-center justify-center transition-all duration-300 shrink-0 mx-1 ${active ? `bg-gray-900 border ${borderColor} ${color} shadow-[0_0_10px_rgba(0,240,255,0.2)]` : 'bg-transparent border border-transparent text-gray-600 hover:text-gray-300 hover:border-gray-700'} ${color !== 'text-neon-cyan' && !active ? color : ''}`}>
                {React.cloneElement(icon as React.ReactElement<any>, { width: 18, height: 18 })}
            </button>
        );
    }
    return (
        <button onClick={onClick} className={`relative flex items-center h-12 w-[calc(100%-1rem)] mx-2 px-3 rounded-md transition-all duration-200 overflow-hidden group/btn ${active ? `bg-gray-900 border ${borderColor} ${color} shadow-[0_0_15px_rgba(0,240,255,0.15)]` : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-200 hover:bg-gray-900/40'} ${color !== 'text-neon-cyan' && !active ? color : ''}`}>
            <div className="flex-shrink-0 flex items-center justify-center w-6">{React.cloneElement(icon as React.ReactElement<any>, { width: 20, height: 20 })}</div>
            <span className={`ml-3 font-mono text-xs font-bold tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0 ${active ? color : 'text-gray-400 group-hover/btn:text-gray-200'}`}>{label}</span>
            {active && <div className={`absolute left-0 top-2 bottom-2 w-0.5 ${color.replace('text-', 'bg-')}`}></div>}
        </button>
    );
};
