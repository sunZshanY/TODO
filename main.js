import { app, BrowserWindow, Menu, session, shell, ipcMain, net } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;

async function runRequest(url, method, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await net.fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

ipcMain.handle("ai-request", (_event, payload) =>
  runRequest(payload.url, "POST", payload.headers, JSON.stringify(payload.body)),
);

ipcMain.handle("github-request", (_event, payload) =>
  runRequest(
    payload.url,
    payload.method || "GET",
    payload.headers || {},
    payload.body || undefined,
  ),
);

ipcMain.handle("set-proxy", (_event, proxy) => {
  const ses = session.defaultSession;
  const trimmed = typeof proxy === "string" ? proxy.trim() : "";
  if (trimmed) {
    return ses.setProxy({
      mode: "fixed_servers",
      proxyRules: trimmed,
    });
  }
  return ses.setProxy({ mode: "system" });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadFile(path.join(__dirname, "dist", "index.html"));
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
