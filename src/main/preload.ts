import { contextBridge, ipcRenderer } from "electron";

try {
  contextBridge.exposeInMainWorld("electronAPI", {
    sendCommand: (payload) => {
      ipcRenderer.send("command", payload);
    },
    env: { NODE_ENV: process.env.NODE_ENV },
  });
} catch (error) {
  console.error("Error in preload script:", error);
}

window.addEventListener("error", (event) => {
  // Catch any other errors
  console.error("Uncaught Error in preload:", event.error);
});
