import { app, BrowserWindow, Menu, shell, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_TIMEOUT_MS = 120_000;

ipcMain.handle("ai-request", async (_event, payload) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(payload.url, {
      method: "POST",
      headers: payload.headers,
      body: JSON.stringify(payload.body),
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
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
