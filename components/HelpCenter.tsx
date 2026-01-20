
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type HelpSection = 'OVERVIEW' | 'MODULES' | 'PROTOCOLS' | 'GUIDES' | 'SETTINGS_GUIDE' | 'FAQ';

interface Props {
    context?: string;
}

// --- DATA STRUCTURES FOR SEARCH ---

interface FaqEntry {
    id: string;
    category: string;
    question: string;
    answer: string;
    tags: string[];
}

const FAQ_DATABASE: FaqEntry[] = [
    // --- CONNECTIVITY ---
    {
        id: 'conn_1',
        category: 'CONNECTIVITY',
        question: 'Error: SNMP Request Timed Out',
        answer: 'The system could not reach the UPS IP address. 1) Verify the IP is correct in Settings > Network. 2) Ensure the UPS Network Management Card (NMC) is powered on and connected. 3) Check that UDP Port 161 is open on any firewalls between the Toolkit server and the UPS.',
        tags: ['snmp', 'network', 'timeout', 'offline']
    },
    {
        id: 'conn_2',
        category: 'CONNECTIVITY',
        question: 'Error: Connection Refused (Agent)',
        answer: 'The Shutdown Agent on the target server rejected the connection. 1) Ensure the "ups-agent" service is running on the target. 2) Verify Port 4444 is open on the target\'s firewall. 3) Check that the Secret Key matches exactly in Virtual Rack settings.',
        tags: ['agent', 'tcp', 'refused', 'port']
    },
    {
        id: 'conn_3',
        category: 'CONNECTIVITY',
        question: 'Device Stuck in "CHECKING" Status',
        answer: 'The heartbeat monitor is waiting for a response. If this persists for >30 seconds, the network latency might be too high (>2000ms) or the browser is throttling background tabs. Refresh the page to reset the monitor.',
        tags: ['latency', 'heartbeat', 'stuck']
    },
    // --- HARDWARE ---
    {
        id: 'hw_1',
        category: 'HARDWARE',
        question: 'Battery Capacity reads 0% or 100% instantly',
        answer: 'This indicates a mismatch between the configured voltage and the actual hardware. Go to Settings > Hardware and verify the "Nominal Voltage". For example, if you have a 48V system set to 24V, readings will be incorrect.',
        tags: ['battery', 'voltage', 'capacity', 'calibration']
    },
    {
        id: 'hw_2',
        category: 'HARDWARE',
        question: 'Status: "OVERLOAD" Warning',
        answer: 'The connected equipment is drawing more power than the UPS can supply (Load > 100%). Immediate action required: Unplug non-critical devices or shutdown servers immediately to prevent the UPS internal breaker from tripping.',
        tags: ['overload', 'critical', 'power']
    },
    {
        id: 'hw_3',
        category: 'HARDWARE',
        question: 'Battery Temperature High (>40°C)',
        answer: 'High temperature degrades battery life significantly. Check the server room AC / ventilation. If the battery is hot to the touch, it may be experiencing Thermal Runaway—disconnect immediately and evacuate if smoke is present.',
        tags: ['temp', 'heat', 'thermal', 'danger']
    },
    {
        id: 'hw_4',
        category: 'HARDWARE',
        question: 'Replace Battery Indicator',
        answer: 'The UPS self-test failed. The batteries can no longer hold a sufficient charge. Order an RBC (Replacement Battery Cartridge) matching your UPS model immediately. Runtime is not guaranteed in this state.',
        tags: ['replace', 'rbc', 'maintenance']
    },
    // --- AUTOMATION ---
    {
        id: 'auto_1',
        category: 'AUTOMATION',
        question: 'Shutdown Sequence didn\'t trigger',
        answer: '1) Check if the "Global Failsafe" was hit first (this overrides rules). 2) Ensure the device is enabled (checked) in the Sequencer. 3) Verify the device IP is actually reachable (Status must be ONLINE).',
        tags: ['shutdown', 'failsafe', 'rules']
    },
    {
        id: 'auto_2',
        category: 'AUTOMATION',
        question: 'VMware Host shutdown failed',
        answer: 'The user account provided must have "Global.Power" privileges in vSphere. Also, ensure the ESXi host is not in Maintenance Mode with "Prohibit Shutdown" enabled.',
        tags: ['vmware', 'esxi', 'permissions']
    },
    // --- SECURITY ---
    {
        id: 'sec_1',
        category: 'SECURITY',
        question: 'Login Failed: Account Locked',
        answer: 'Brute Force Protection is active. You have exceeded the maximum login attempts. Please wait for the lockout duration (default 5 mins) to expire before trying again.',
        tags: ['lockout', 'login', 'password']
    },
    {
        id: 'sec_2',
        category: 'SECURITY',
        question: 'Session Expired / Idle Timeout',
        answer: 'For security, the dashboard logs out inactive users. You can increase this duration in Settings > Security > Idle Timeout.',
        tags: ['timeout', 'session', 'logout']
    }
];

const HelpCenter: React.FC<Props> = ({ context }) => {
  const [activeSection, setActiveSection] = useState<HelpSection>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  
  // -- Search Logic --
  const searchResults = useMemo(() => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const q = searchQuery.toLowerCase();
      return FAQ_DATABASE.filter(item => 
          item.question.toLowerCase().includes(q) || 
          item.answer.toLowerCase().includes(q) ||
          item.tags.some(t => t.includes(q))
      );
  }, [searchQuery]);

  // -- Context Routing --
  useEffect(() => {
      if (!context) return;
      const mapping: Record<string, HelpSection> = {
          'provision_device': 'GUIDES',
          'rack_topology': 'MODULES',
          'sequencer_rules': 'MODULES',
          'sequencer_failsafe': 'MODULES',
          'diagnostics_calibration': 'GUIDES',
          'energy_charts': 'MODULES',
          'simulation': 'MODULES',
          'network_config': 'SETTINGS_GUIDE',
          'network_ip': 'SETTINGS_GUIDE',
          'network_community': 'SETTINGS_GUIDE',
          'hardware_config': 'SETTINGS_GUIDE',
          'hardware_model': 'SETTINGS_GUIDE',
          'hardware_banks': 'SETTINGS_GUIDE',
          'hardware_battery_override': 'SETTINGS_GUIDE',
          'hardware_voltage': 'SETTINGS_GUIDE',
          'hardware_packs': 'SETTINGS_GUIDE',
          'security_config': 'SETTINGS_GUIDE',
          'security_idle': 'SETTINGS_GUIDE',
          'security_brute': 'SETTINGS_GUIDE',
          'security_attempts': 'SETTINGS_GUIDE',
          'security_lockout': 'SETTINGS_GUIDE',
          'security_policy': 'SETTINGS_GUIDE',
          'access_control': 'SETTINGS_GUIDE',
          'access_password': 'SETTINGS_GUIDE',
          'host_port': 'SETTINGS_GUIDE',
          'host_bind': 'SETTINGS_GUIDE',
          'host_retention': 'SETTINGS_GUIDE',
          'system_theme': 'SETTINGS_GUIDE',
          'system_alarms': 'SETTINGS_GUIDE'
      };

      if (mapping[context]) {
          setActiveSection(mapping[context]);
          setSearchQuery(''); // Clear search on context switch
      }
  }, [context]);

  const isContext = (key: string) => context === key;

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-900/50 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-800 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto shrink-0 bg-black/40">
         <h2 className="hidden md:block text-gray-500 text-xs font-mono tracking-widest mb-4">DOCUMENTATION</h2>
         {[
             { id: 'OVERVIEW', label: 'SYSTEM OVERVIEW' },
             { id: 'MODULES', label: 'MODULE GUIDE' },
             { id: 'PROTOCOLS', label: 'PROTOCOLS & AGENTS' },
             { id: 'GUIDES', label: 'OPERATOR GUIDES' },
             { id: 'SETTINGS_GUIDE', label: 'SETTINGS REFERENCE' },
             { id: 'FAQ', label: 'FAQ & ERROR CODES' }
         ].map(item => (
             <button
                key={item.id}
                onClick={() => { setActiveSection(item.id as HelpSection); setSearchQuery(''); }}
                className={`text-center md:text-left px-3 py-2 md:px-4 md:py-3 text-xs font-mono border-b-2 md:border-b-0 md:border-l-2 transition-all whitespace-nowrap outline-none
                    ${activeSection === item.id && !searchQuery
                        ? 'border-neon-cyan bg-neon-cyan/10 text-white shadow-[inset_4px_0_0_0_#00F0FF] md:shadow-[inset_2px_0_0_0_#00F0FF]' 
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }
                `}
             >
                 {item.label}
             </button>
         ))}
         
         <div className="mt-auto hidden md:block p-4">
             <div className="text-[10px] text-gray-600 font-mono">
                 Version: 1.0.4<br/>
                 Build: 2023.10.22<br/>
                 License: Enterprise
             </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900/30">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-800 bg-black/20">
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search manual, error codes, or settings..."
                    className="w-full bg-black border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white font-mono focus:border-neon-cyan focus:outline-none transition-colors"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto animate-fade-in">
                
                {/* SEARCH RESULTS VIEW */}
                {searchQuery && (
                    <div className="space-y-6">
                        <h2 className="text-neon-cyan font-mono text-lg border-b border-gray-800 pb-2">
                            SEARCH RESULTS: "{searchQuery}"
                        </h2>
                        {searchResults && searchResults.length > 0 ? (
                            searchResults.map(item => (
                                <div key={item.id} className="bg-black/40 border border-gray-700 p-4 rounded hover:border-gray-500 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-white font-mono text-sm font-bold">{item.question}</h3>
                                        <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded font-mono">{item.category}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs font-mono leading-relaxed">{item.answer}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 font-mono">
                                No matches found. Try searching for "error", "battery", or "network".
                            </div>
                        )}
                        <div className="pt-8 text-center">
                            <button onClick={() => setSearchQuery('')} className="text-neon-cyan text-xs font-mono underline">
                                Return to {activeSection}
                            </button>
                        </div>
                    </div>
                )}

                {/* STANDARD SECTION VIEW (When not searching) */}
                {!searchQuery && (
                    <>
                        {activeSection === 'OVERVIEW' && (
                            <div className="space-y-8">
                                <div>
                                    <h1 className="text-3xl font-mono text-neon-cyan mb-4 font-bold">APC SMART UPS TOOLKIT</h1>
                                    <p className="text-gray-300 font-mono text-sm leading-relaxed mb-4">
                                        Welcome to the Command Core. This software is designed to provide a unified, visual-first interface for monitoring and controlling APC Smart-UPS hardware in mission-critical environments.
                                    </p>
                                    <div className="p-4 bg-gray-900/50 border border-neon-cyan/30 rounded text-xs font-mono text-neon-cyan">
                                        Designed for high-availability IT racks, edge computing nodes, and industrial automation power backup systems.
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FeatureCard title="Real-Time Telemetry" icon="⚡">
                                        Monitor Voltage, Frequency, Load, and Battery Health with &lt;1s latency.
                                    </FeatureCard>
                                    <FeatureCard title="Dynamic Load Shedding" icon="🛡">
                                        Automated shutdown sequences based on Battery % or Outage Duration.
                                    </FeatureCard>
                                    <FeatureCard title="Virtual Topology" icon="🔌">
                                        Map physical devices to UPS outlets for precise control.
                                    </FeatureCard>
                                    <FeatureCard title="Multi-Protocol Support" icon="🌐">
                                        Seamlessly integrate with VMware, Windows, Linux, Synology, and QNAP.
                                    </FeatureCard>
                                </div>
                            </div>
                        )}

                        {activeSection === 'MODULES' && (
                            <div className="space-y-10">
                                <SectionBlock title="COMMAND DECK" highlight={isContext('energy_charts')}>
                                    <p>The primary dashboard. Provides an instantaneous view of power flow, battery capacity, and system status. Supports "Stealth Mode" for dark room operations.</p>
                                </SectionBlock>
                                
                                <SectionBlock title="VIRTUAL RACK TOPOLOGY" highlight={isContext('rack_topology')}>
                                    <p>A digital twin of your physical hardware. Use this module to provision new devices and assign them to specific power outlets. This mapping is crucial for <b>Hard Cut</b> operations.</p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                        <li><b>Staging Area:</b> Newly added devices appear here first.</li>
                                        <li><b>Drag & Drop:</b> Move devices from Staging to Outlets.</li>
                                        <li><b>Grouping:</b> Visualize PDU strips or Outlet Banks based on UPS model.</li>
                                    </ul>
                                </SectionBlock>

                                <SectionBlock title="SHUTDOWN SEQUENCER" highlight={isContext('sequencer_rules')}>
                                    <p>The logic engine for load shedding. Define <b>Rules</b> that trigger graceful shutdowns during power events.</p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                        <li><b>Timer Rules:</b> "Shutdown Server X if outage lasts longer than 60 seconds."</li>
                                        <li><b>Capacity Rules:</b> "Shutdown NAS if battery drops below 30%."</li>
                                    </ul>
                                </SectionBlock>

                                <SectionBlock title="GLOBAL FAILSAFE" highlight={isContext('sequencer_failsafe')}>
                                    <p>A hard threshold (e.g., 10%) where ALL remaining loads are cut to protect the battery from deep discharge damage. This override ignores individual rules.</p>
                                </SectionBlock>

                                <SectionBlock title="DIAGNOSTICS BAY">
                                    <p>Advanced battery health monitoring. View individual battery pack status (if supported), temperature trends, and perform Runtime Calibration cycles.</p>
                                </SectionBlock>
                            </div>
                        )}

                        {activeSection === 'PROTOCOLS' && (
                            <div className="space-y-8">
                                <h2 className="text-xl font-mono text-neon-orange border-b border-gray-800 pb-2">SUPPORTED SHUTDOWN METHODS</h2>
                                
                                <ProtocolDetail 
                                    name="VMware vSphere API" 
                                    code="VMWARE_REST"
                                    desc="Connects to ESXi or vCenter via HTTPS. Issues 'Soft Shutdown' commands to running VMs first, then shuts down the host."
                                    req="Requires User/Pass with 'System.View' and 'Global.Power' privileges."
                                />

                                <ProtocolDetail 
                                    name="SSH (Secure Shell)" 
                                    code="SSH"
                                    desc="Standard Linux/Unix shutdown. Executes `shutdown -h now`. Ideal for headless servers."
                                    req="Root credentials or Sudo user. SSH port 22 must be open."
                                />

                                <ProtocolDetail 
                                    name="Synology / QNAP API" 
                                    code="NAS_API"
                                    desc="Uses vendor-specific Web APIs to trigger 'Safe Mode' or shutdown."
                                    req="Admin credentials for the NAS web interface."
                                />

                                <ProtocolDetail 
                                    name="Toolkit Agent" 
                                    code="AGENT_WIN / AGENT_LINUX"
                                    desc="A lightweight background service installed on the target machine. Listens on TCP 4444."
                                    req="Agent software installed. Firewall allows port 4444."
                                />

                                <ProtocolDetail 
                                    name="Hard Power Cut" 
                                    code="HARD_CUT"
                                    desc="Toggles the physical relay of the UPS Outlet Bank. Immediate power loss."
                                    req="Device must be assigned to a specific Switchable Outlet Group."
                                />
                            </div>
                        )}

                        {activeSection === 'GUIDES' && (
                            <div className="space-y-8">
                                <GuideBlock title="HOW TO: PROVISION A NEW DEVICE" highlight={isContext('provision_device')}>
                                    <ol className="list-decimal pl-5 space-y-2 text-gray-300 text-xs font-mono">
                                        <li>Navigate to the <b>VIRTUAL RACK</b> tab.</li>
                                        <li>Click the <b>+ PROVISION DEVICE</b> button in the top right.</li>
                                        <li>Enter a friendly Name (e.g., "SQL-Primary").</li>
                                        <li>Select the Device Type and Shutdown Protocol.</li>
                                        <li>Enter IP Address and Credentials (Username/Password or Secret).</li>
                                        <li>Click <b>VERIFY & ADD</b>. The system will attempt a handshake.</li>
                                        <li>Once verified, the device appears in the "Staging Area" (bottom panel).</li>
                                        <li>Drag the device to its physical outlet on the rack diagram.</li>
                                        <li>Click <b>SAVE CONFIGURATION</b>.</li>
                                    </ol>
                                </GuideBlock>

                                <GuideBlock title="HOW TO: CONFIGURE BATTERY CALIBRATION" highlight={isContext('diagnostics_calibration')}>
                                    <ol className="list-decimal pl-5 space-y-2 text-gray-300 text-xs font-mono">
                                        <li>Navigate to the <b>DIAGNOSTICS</b> tab.</li>
                                        <li>Ensure load is steady (at least 15%) and battery is 100% charged.</li>
                                        <li>Locate the "Calibration Wizard" panel.</li>
                                        <li>Click <b>START NEW CALIBRATION</b>.</li>
                                        <li>The UPS will switch to battery power to measure actual discharge curve.</li>
                                        <li><b>Do not</b> disconnect critical loads during this test.</li>
                                    </ol>
                                </GuideBlock>
                            </div>
                        )}

                        {activeSection === 'SETTINGS_GUIDE' && (
                            <div className="space-y-10">
                                <div className="mb-6">
                                    <h2 className="text-xl font-mono text-white mb-2">CONFIGURATION DEEP DIVE</h2>
                                    <p className="text-gray-400 text-xs">Detailed reference for all system settings and parameters.</p>
                                </div>

                                <SectionBlock title="NETWORK CONFIGURATION" highlight={isContext('network_config')}>
                                    <p>Configure the connection to your APC UPS Network Management Card (NMC).</p>
                                    <div className="space-y-4 mt-2">
                                        <ContextDetail label="IP Address" context="network_ip" highlight={isContext('network_ip')}>
                                            IPv4 address of the UPS. Must be static or reserved in DHCP.
                                        </ContextDetail>
                                        <ContextDetail label="Community String" context="network_community" highlight={isContext('network_community')}>
                                            SNMP Read-Only or Read-Write community string. Default is usually 'public' or 'private'. Ensure SNMPv2c is enabled on the card.
                                        </ContextDetail>
                                    </div>
                                </SectionBlock>

                                <SectionBlock title="HARDWARE DEFINITION" highlight={isContext('hardware_config')}>
                                    <p>Map the visual dashboard to your physical hardware capabilities.</p>
                                    <div className="space-y-4 mt-2">
                                        <ContextDetail label="UPS Model / Layout" context="hardware_model" highlight={isContext('hardware_model')}>
                                            Selects the visual template for the Virtual Rack. Matches physical outlet arrangement (e.g. 2U 8-Outlet).
                                        </ContextDetail>
                                        <ContextDetail label="Custom Banks" context="hardware_banks" highlight={isContext('hardware_banks')}>
                                            For non-standard UPS units, define grouping logic (e.g. "4,4" means two banks of 4 outlets each).
                                        </ContextDetail>
                                        <ContextDetail label="Battery Override" context="hardware_battery_override" highlight={isContext('hardware_battery_override')}>
                                            Forces the system to use manual voltage calculations instead of SNMP data. Useful for DIY battery packs.
                                        </ContextDetail>
                                        <ContextDetail label="Nominal Voltage" context="hardware_voltage" highlight={isContext('hardware_voltage')}>
                                            Base DC bus voltage (e.g. 24V, 48V). Incorrect settings will skew % capacity readings.
                                        </ContextDetail>
                                        <ContextDetail label="External Packs" context="hardware_packs" highlight={isContext('hardware_packs')}>
                                            Number of additional battery packs daisy-chained to the main unit. Used to estimate total runtime.
                                        </ContextDetail>
                                    </div>
                                </SectionBlock>

                                <SectionBlock title="HOST SETTINGS" highlight={isContext('host_bind')}>
                                    <p>Backend server configuration.</p>
                                    <div className="space-y-4 mt-2">
                                        <ContextDetail label="Server Port" context="host_port" highlight={isContext('host_port')}>
                                            The TCP port the web interface listens on (default: 3000).
                                        </ContextDetail>
                                        <ContextDetail label="Bind Address" context="host_bind" highlight={isContext('host_bind')}>
                                            0.0.0.0 allows external access. 127.0.0.1 restricts access to localhost only.
                                        </ContextDetail>
                                        <ContextDetail label="Data Retention" context="host_retention" highlight={isContext('host_retention')}>
                                            Number of days to keep energy logs in the local database before purging.
                                        </ContextDetail>
                                    </div>
                                </SectionBlock>

                                <SectionBlock title="SECURITY POLICIES" highlight={isContext('security_config')}>
                                    <p>Hardening measures for the dashboard interface.</p>
                                    <div className="space-y-4 mt-2">
                                        <ContextDetail label="Idle Timeout" context="security_idle" highlight={isContext('security_idle')}>
                                            Logs out inactive users after X minutes to prevent unauthorized access.
                                        </ContextDetail>
                                        <ContextDetail label="Brute Force Protection" context="security_brute" highlight={isContext('security_brute')}>
                                            Temporarily bans login attempts after repeated failures.
                                        </ContextDetail>
                                        <ContextDetail label="Max Attempts" context="security_attempts" highlight={isContext('security_attempts')}>
                                            Number of failed tries allowed before lockout.
                                        </ContextDetail>
                                        <ContextDetail label="Lockout Duration" context="security_lockout" highlight={isContext('security_lockout')}>
                                            Time in minutes the system remains locked after a breach attempt.
                                        </ContextDetail>
                                        <ContextDetail label="Strong Passwords" context="security_policy" highlight={isContext('security_policy')}>
                                            Enforces complexity rules: 8+ chars, uppercase, numbers, symbols.
                                        </ContextDetail>
                                    </div>
                                </SectionBlock>

                                <SectionBlock title="USER MANAGEMENT" highlight={isContext('access_control')}>
                                    <ContextDetail label="Password Reset" context="access_password" highlight={isContext('access_password')}>
                                        Admin tool to forcibly change user credentials. Requires Admin re-authentication.
                                    </ContextDetail>
                                </SectionBlock>

                                <SectionBlock title="SYSTEM PREFERENCES" highlight={isContext('system_theme')}>
                                    <ContextDetail label="Visual Theme" context="system_theme" highlight={isContext('system_theme')}>
                                        Toggle between Cyber (Dark/Neon), Minimal (Low Contrast), and Clean (Inverted) modes.
                                    </ContextDetail>
                                    <ContextDetail label="Audible Alarms" context="system_alarms" highlight={isContext('system_alarms')}>
                                        Browser-based beeps for Critical and Warning events. Requires active tab focus in some browsers.
                                    </ContextDetail>
                                </SectionBlock>
                            </div>
                        )}

                        {activeSection === 'FAQ' && (
                            <div className="space-y-8">
                                {['CONNECTIVITY', 'HARDWARE', 'AUTOMATION', 'SECURITY'].map(cat => (
                                    <div key={cat}>
                                        <h3 className="text-neon-cyan font-mono text-sm font-bold border-b border-gray-800 pb-2 mb-4">{cat}</h3>
                                        <div className="space-y-4">
                                            {FAQ_DATABASE.filter(i => i.category === cat).map(item => (
                                                <FaqItem key={item.id} q={item.question} a={item.answer} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const FeatureCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded hover:border-neon-cyan/50 transition-colors">
        <div className="text-2xl mb-2">{icon}</div>
        <h3 className="text-white font-mono font-bold text-sm mb-2">{title}</h3>
        <p className="text-gray-400 text-xs font-mono leading-relaxed">{children}</p>
    </div>
);

const SectionBlock: React.FC<{ title: string; children: React.ReactNode; highlight?: boolean }> = ({ title, children, highlight }) => (
    <div className={`transition-all duration-500 p-4 rounded border ${highlight ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'border-transparent'}`}>
        <h3 className="text-neon-cyan font-mono text-sm font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-neon-cyan rounded-full"></span> {title}
        </h3>
        <div className="text-gray-300 font-mono text-sm leading-relaxed pl-4 border-l border-gray-800">
            {children}
        </div>
    </div>
);

const ContextDetail: React.FC<{ label: string, context: string, highlight?: boolean, children: React.ReactNode }> = ({ label, context, highlight, children }) => (
    <div className={`p-2 rounded ${highlight ? 'bg-white/10' : ''}`}>
        <span className="text-neon-orange font-bold text-xs font-mono block mb-1">{label} <span className="text-gray-600 font-normal">({context})</span></span>
        <span className="text-xs text-gray-400 block font-mono">{children}</span>
    </div>
);

const ProtocolDetail: React.FC<{ name: string; code: string; desc: string; req: string }> = ({ name, code, desc, req }) => (
    <div className="bg-black border border-gray-800 p-4 rounded">
        <div className="flex justify-between items-start mb-2">
            <h4 className="text-white font-mono font-bold text-sm">{name}</h4>
            <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded">{code}</span>
        </div>
        <p className="text-gray-400 text-xs font-mono mb-3">{desc}</p>
        <div className="text-[10px] font-mono text-neon-orange">
            <span className="font-bold">REQUIREMENTS:</span> {req}
        </div>
    </div>
);

const GuideBlock: React.FC<{ title: string; children: React.ReactNode; highlight?: boolean }> = ({ title, children, highlight }) => (
    <div className={`bg-gray-900/30 border border-gray-800 p-6 rounded transition-all duration-500 ${highlight ? 'ring-1 ring-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)]' : ''}`}>
        <h3 className="text-white font-mono font-bold text-sm mb-4 border-b border-gray-700 pb-2">{title}</h3>
        {children}
    </div>
);

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => (
    <div className="mb-4">
        <div className="flex items-start gap-2">
            <span className="text-neon-cyan text-xs font-bold shrink-0 mt-0.5">Q:</span>
            <h4 className="text-white font-mono text-xs font-bold mb-1">{q}</h4>
        </div>
        <p className="text-gray-400 font-mono text-xs pl-5 border-l border-gray-800 ml-1">{a}</p>
    </div>
);

export default HelpCenter;
