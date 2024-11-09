/**
 * Should match main/preload.ts for typescript support in renderer
 */

interface commandPayload {
  command: string;
  args?: Record<string, any>;
}

export default interface ElectronApi {
  sendCommand: (payload: commandPayload) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}
