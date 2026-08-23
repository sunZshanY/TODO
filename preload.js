const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiRequest", (payload) =>
  ipcRenderer.invoke("ai-request", payload),
);

contextBridge.exposeInMainWorld("githubRequest", (payload) =>
  ipcRenderer.invoke("github-request", payload),
);

contextBridge.exposeInMainWorld("setProxy", (proxy) =>
  ipcRenderer.invoke("set-proxy", proxy),
);
