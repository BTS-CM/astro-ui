import path from "path";
import url from "url";
import os from "os";
import express from "express";

import {
    app,
    BrowserWindow,
    Menu,
    Tray,
    dialog,
    ipcMain,
    Notification,
    shell,
} from "electron";

import { initApplicationMenu } from "./lib/applicationMenu.js";

let mainWindow;
let tray = null;

/*
 * Creating the primary window, only runs once.
 */
const createWindow = async () => {
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        minWidth: 480,
        minHeight: 695,
        maxWidth: width,
        maximizable: true,
        maxHeight: height,
        useContentSize: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false, // Keep false for security
            contextIsolation: true, // Keep true for security
            enableRemoteModule: false, // Keep false for security
            sandbox: true, // Keep true for security
            preload: path.join(__dirname, "preload.js"),
        },
        icon: __dirname + "/img/beet-taskbar.png",
    });
    
    const app = express();
    app.use(express.static('astroDist'));
    app.listen(8080);

    initApplicationMenu(mainWindow);

    mainWindow.loadURL('http://localhost:8080/index.html');

    tray = new Tray(__dirname + "/img/beet-tray.png");
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show App",
            click: function () {
                mainWindow.show();
            },
        },
        {
            label: "Quit",
            click: function () {
                app.isQuiting = true;
                tray = null;
                app.quit();
            },
        },
    ]);

    tray.setToolTip("Bitshares Astro UI");

    tray.on("right-click", (event, bounds) => {
        tray.popUpContextMenu(contextMenu);
    });

    const safeDomains = [ // TODO: REPLACE WITH SAFE BTS DOMAINS
        "bloks.io",
        "explore.beos.world",
        "blocksights.info",
        "telos.eosx.io",
    ];
    ipcMain.on("openURL", (event, arg) => {
        try {
            const parsedUrl = new url.URL(arg);
            const domain = parsedUrl.hostname;
            if (safeDomains.includes(domain)) {
                shell.openExternal(arg);
            } else {
                console.error(
                    `Rejected opening URL with unsafe domain: ${domain}`
                );
            }
        } catch (err) {
            console.error(`Failed to open URL: ${err.message}`);
        }
    });

    ipcMain.on("notify", (event, arg) => {
        const NOTIFICATION_TITLE = "Beet wallet notification";
        const NOTIFICATION_BODY =
            arg == "request" ? "Beet has received a new request." : arg;

        if (os.platform === "win32") {
            app.setAppUserModelId(app.name);
        }

        function showNotification() {
            new Notification({
                title: NOTIFICATION_TITLE,
                subtitle: "subtitle",
                body: NOTIFICATION_BODY,
                icon: __dirname + "/img/beet-tray.png",
            }).show();
        }

        showNotification();
    });

    tray.on("click", () => {
        mainWindow.setAlwaysOnTop(true);
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(false);
    });

    tray.on("balloon-click", () => {
        mainWindow.setAlwaysOnTop(true);
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(false);
    });
};

app.disableHardwareAcceleration();

let currentOS = os.platform();
if (currentOS === "win32" || currentOS === "linux") {
    // windows + linux setup phase
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
    }

    app.whenReady().then(() => {
        createWindow();
    });
} else {
    app.whenReady().then(() => {
        createWindow();
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}
