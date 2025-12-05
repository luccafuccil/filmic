const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const {
  handleOpenFile,
  handleOpenFolder,
  handleReadFile,
  handleWriteFile,
  handleFileExists,
  handleReadDirectory,
  handleGetMovies,
  handleGetVideoFile,
  handleGetSubtitles,
  handleOpenInExternalPlayer,
} = require("./handlers/fileHandlers");
const {
  handleGenerateThumbnail,
  handleCleanupThumbnails,
} = require("./handlers/thumbnailHandlers");
const {
  handleGetWatchProgress,
  handleSaveWatchProgress,
  handleRemoveWatchProgress,
  handleGetContinueWatching,
} = require("./handlers/watchProgressHandlers");

let mainWindow;

ipcMain.on("window:minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window:close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: "#1a1a1a",
    icon: path.join(__dirname, "../dist/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  // mainWindow.webContents.openDevTools();

  const template = [
    {
      label: "Arquivo",
      submenu: [
        {
          label: "Trocar Pasta",
          click: () => {
            mainWindow.webContents.send("menu:changeFolder");
          },
        },
        { type: "separator" },
        {
          label: "Sair",
          role: "quit",
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Configuração do auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info.version);
  mainWindow.webContents.send("update:available", info);
});

autoUpdater.on("update-not-available", () => {
  console.log("Update not available");
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log("Download progress:", progressObj.percent);
  mainWindow.webContents.send("update:progress", progressObj);
});

autoUpdater.on("update-downloaded", () => {
  console.log("Update downloaded");
  mainWindow.webContents.send("update:downloaded");
});

// Handler para instalar update
ipcMain.on("update:install", () => {
  autoUpdater.quitAndInstall();
});

// Handler para baixar update
ipcMain.on("update:download", () => {
  autoUpdater.downloadUpdate();
});

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleOpenFile);
  ipcMain.handle("dialog:openFolder", handleOpenFolder);
  ipcMain.handle("fs:readFile", handleReadFile);
  ipcMain.handle("fs:writeFile", handleWriteFile);
  ipcMain.handle("fs:exists", handleFileExists);
  ipcMain.handle("fs:readDirectory", handleReadDirectory);
  ipcMain.handle("fs:getMovies", handleGetMovies);
  ipcMain.handle("video:getFile", handleGetVideoFile);
  ipcMain.handle("video:getSubtitles", handleGetSubtitles);
  ipcMain.handle("video:openExternal", handleOpenInExternalPlayer);
  ipcMain.handle("thumbnails:generate", handleGenerateThumbnail);
  ipcMain.handle("thumbnails:cleanup", handleCleanupThumbnails);
  ipcMain.handle("watch:getProgress", handleGetWatchProgress);
  ipcMain.handle("watch:saveProgress", handleSaveWatchProgress);
  ipcMain.handle("watch:removeProgress", handleRemoveWatchProgress);
  ipcMain.handle("watch:getContinueWatching", handleGetContinueWatching);

  createWindow();

  // Verificar updates após 3 segundos (dar tempo da janela abrir)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
