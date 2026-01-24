
import { Device } from "../types";

export class DeviceControlService {
    
    /**
     * Verifies connectivity using the Main Process TCP handshake.
     */
    static async verifyConnection(device: Device): Promise<boolean> {
        if (!window.electron) {
            console.warn("Electron API not available. Running in browser mode (Simulated).");
            return true; // Fallback for dev without Electron
        }
        return await window.electron.device.verify(device);
    }

    /**
     * Executes the configured shutdown method via Main Process.
     */
    static async shutdownDevice(device: Device): Promise<boolean> {
        console.log(`[DeviceControl] Requesting Shutdown for ${device.name}`);
        
        if (!window.electron) {
            console.warn("Electron API not available. Simulation: Shutdown successful.");
            return true;
        }

        try {
            return await window.electron.device.shutdown(device);
        } catch (error) {
            console.error(`[DeviceControl] IPC Error:`, error);
            return false;
        }
    }
}
