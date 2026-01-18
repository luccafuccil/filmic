const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const {
  handleOpenFile,
  handleOpenFolder,
  handleGetDroppedPath,
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
  handleSelectPlayerExecutable,
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
  const iconPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "public",
        "icon.ico",
      )
    : path.join(__dirname, "..", "public", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: "#1a1a1a",
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
  });

  const indexPath = app.isPackaged
    ? path.join(__dirname, "../dist/index.html")
    : path.join(__dirname, "../dist/index.html");

  mainWindow.loadFile(indexPath).catch((err) => {
    console.error("Error loading index.html:", err);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    },
  );

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
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

autoUpdater.on("checking-for-update", () => {
  console.log("[AutoUpdater] Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  console.log("[AutoUpdater] Update available:", info.version);
  console.log("[AutoUpdater] Current version:", app.getVersion());
  mainWindow.webContents.send("update:available", info);
});

autoUpdater.on("update-not-available", (info) => {
  console.log(
    "[AutoUpdater] Update not available. Current version:",
    app.getVersion(),
  );
  console.log("[AutoUpdater] Latest version:", info.version);
});

autoUpdater.on("error", (err) => {
  console.error("[AutoUpdater] Error:", err);
  console.error("[AutoUpdater] Error message:", err.message);
  console.error("[AutoUpdater] Error stack:", err.stack);
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
      console.log(
        "[AutoUpdater] Running in development mode, skipping update check",
      );
      return {
        updateAvailable: false,
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion(),
      };
    }

    console.log(
      "[AutoUpdater] Manual check initiated. Current version:",
      app.getVersion(),
    );
    const result = await autoUpdater.checkForUpdates();
    console.log("[AutoUpdater] Check result:", result?.updateInfo?.version);

    const updateAvailable =
      result &&
      result.updateInfo &&
      result.updateInfo.version !== app.getVersion();
    console.log("[AutoUpdater] Update available:", updateAvailable);

    return {
      updateAvailable,
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version || app.getVersion(),
    };
  } catch (error) {
    console.error("[AutoUpdater] Error checking for updates:", error);
    console.error("[AutoUpdater] Error details:", error.message);
    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
      error: error.message,
    };
  }
});

ipcMain.handle("update:getVersion", () => {
  return app.getVersion();
});

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleOpenFile);
  ipcMain.handle("dialog:openFolder", handleOpenFolder);
  ipcMain.handle("fs:getDroppedPath", handleGetDroppedPath);
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
  ipcMain.handle("player:selectExecutable", handleSelectPlayerExecutable);
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
