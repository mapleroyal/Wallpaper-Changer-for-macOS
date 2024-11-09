import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  sendCommand: (payload: { command: string; args?: Record<string, any> }) =>
    ipcRenderer.send("command", payload),
});
