const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiRequest", (payload) =>
  ipcRenderer.invoke("ai-request", payload),
);
