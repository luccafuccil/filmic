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
  handleGetMedia,
  handleGetVideoFile,
  handleGetEpisodeVideoFile,
  handleGetSubtitles,
  handleExtractSubtitleTrack,
  handleCacheSubtitles,
  handleOpenInExternalPlayer,
} = require("./handlers/fileHandlers");
const {
  handleGenerateThumbnail,
  handleGenerateEpisodeThumbnail,
  handleCleanupThumbnails,
} = require("./handlers/thumbnailHandlers");
const {
  handleGetWatchProgress,
  handleSaveWatchProgress,
  handleRemoveWatchProgress,
  handleGetContinueWatching,
  handleGetEpisodeProgress,
  handleSaveEpisodeProgress,
  handleFindNextEpisode,
} = require("./handlers/watchProgressHandlers");
const { registerTmdbHandlers } = require("./handlers/tmdbHandlers");

const resourcePath = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, "..");

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
    icon: path.join(resourcePath, "public/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  // Abrir DevTools automaticamente em desenvolvimento
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

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

ipcMain.on("update:install", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on("update:download", () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle("update:check", async () => {
  try {
    if (!app.isPackaged) {
      return {
        updateAvailable: false,
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion(),
      };
    }

    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable:
        result &&
        result.updateInfo &&
        result.updateInfo.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version || app.getVersion(),
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
    };
  }
});

ipcMain.handle("update:getVersion", () => {
  return app.getVersion();
});

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleOpenFile);
  ipcMain.handle("dialog:openFolder", handleOpenFolder);
  ipcMain.handle("fs:readFile", handleReadFile);
  ipcMain.handle("fs:writeFile", handleWriteFile);
  ipcMain.handle("fs:exists", handleFileExists);
  ipcMain.handle("fs:readDirectory", handleReadDirectory);
  ipcMain.handle("fs:getMovies", handleGetMovies);
  ipcMain.handle("fs:getMedia", handleGetMedia);
  ipcMain.handle("video:getFile", handleGetVideoFile);
  ipcMain.handle("video:getEpisodeFile", handleGetEpisodeVideoFile);
  ipcMain.handle("video:getSubtitles", handleGetSubtitles);
  ipcMain.handle("video:extractSubtitleTrack", handleExtractSubtitleTrack);
  ipcMain.handle("video:cacheSubtitles", handleCacheSubtitles);
  ipcMain.handle("video:openExternal", handleOpenInExternalPlayer);
  ipcMain.handle("thumbnails:generate", handleGenerateThumbnail);
  ipcMain.handle("thumbnails:generateEpisode", handleGenerateEpisodeThumbnail);
  ipcMain.handle("thumbnails:cleanup", handleCleanupThumbnails);
  ipcMain.handle("watch:getProgress", handleGetWatchProgress);
  ipcMain.handle("watch:saveProgress", handleSaveWatchProgress);
  ipcMain.handle("watch:removeProgress", handleRemoveWatchProgress);
  ipcMain.handle("watch:getContinueWatching", handleGetContinueWatching);
  ipcMain.handle("watch:getEpisodeProgress", handleGetEpisodeProgress);
  ipcMain.handle("watch:saveEpisodeProgress", handleSaveEpisodeProgress);
  ipcMain.handle("watch:findNextEpisode", handleFindNextEpisode);

  registerTmdbHandlers();

  createWindow();

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error("Error checking for updates:", err);
      });
    }, 3000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
