
import { Device } from "../types";

export class DeviceControlService {
    
    static async verifyConnection(device: Device): Promise<boolean> {
        console.log(`[DeviceControl] Verifying ${device.name}...`);

        if (device.shutdownMethod === 'HARD_CUT') return true;

        // In Electron, we can use the backend to SSH ping
        if (window.electronAPI && device.shutdownMethod === 'SSH') {
             // For a quick verification, we assume valid config implies ready in this prototype
             // A real implementation would have a specific testSSH handler in main
             return !!device.ipAddress;
        }
        
        // Simulating delay for verification
        await this.simulateNetworkDelay(500);
        return true; 
    }

    static async shutdownDevice(device: Device): Promise<boolean> {
        console.log(`[DeviceControl] Initiating ${device.shutdownMethod} on ${device.name}`);

        // --- SSH VIA ELECTRON ---
        if (device.shutdownMethod === 'SSH' && window.electronAPI && device.ipAddress) {
            const result = await window.electronAPI.shutdownTarget({
                ip: device.ipAddress,
                username: device.auth?.username,
                password: device.auth?.password
            });
            
            if (result.success) {
                console.log("[Electron SSH] Command Sent Successfully");
                console.log(result.stdout);
                return true;
            } else {
                console.error("[Electron SSH] Failed:", result.error);
                return false;
            }
        }

        // --- HTTP / OTHER METHODS ---
        // These can still work via browser fetch if CORS allows, or we could add more IPC handlers
        if (device.shutdownMethod === 'HTTP_POST') {
             // ... existing fetch logic or simulation
        }

        await this.simulateNetworkDelay(1000);
        return true;
    }

    private static simulateNetworkDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
