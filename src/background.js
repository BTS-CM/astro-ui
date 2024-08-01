import path from "path";
import os from "os";
import url from "url";
import express from "express";

import {
    app,
    BrowserWindow,
    Menu,
    Tray,
    ipcMain,
    screen,
    shell,
} from "electron";

import { initApplicationMenu } from "./lib/applicationMenu.js";
import { generateDeepLink } from "./lib/deeplink.js";

let mainWindow = null;
let tray = null;

const createWindow = async () => {
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
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, "preload.js"),
        },
        icon: __dirname + "/img/taskbar.png",
    });
    
    const expressApp = express();
    expressApp.use(express.static('astroDist'));
    expressApp.listen(8080, () => {
        console.log("Express server listening on port 8080");
    });

    initApplicationMenu(mainWindow);

    mainWindow.loadURL('http://localhost:8080/index.html');

    tray = new Tray(path.join(__dirname, "img", "tray.png"));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show App",
            click: function () {
                mainWindow?.show();
            },
        },
        {
            label: "Quit",
            click: function () {
                tray = null;
                app.quit();
            },
        },
    ]);

    tray.setToolTip("Bitshares Astro UI");

    tray.on("right-click", (event, bounds) => {
        tray?.popUpContextMenu(contextMenu);
    });

    ipcMain.handle("fetchTopMarkets", async (event, arg) => {
        const { chain } = arg;

        let retrievedData;
        try {
            retrievedData = await fetch(
                chain === "bitshares"
                    ? `https://api.bitshares.ws/openexplorer/top_markets?top_n=100`
                    : `https://api.testnet.bitshares.ws/openexplorer/top_markets?top_n=50`
            );
        } catch (error) {
            console.log({error})
        }
      
        if (!retrievedData || !retrievedData.ok) {
            console.log("Failed to fetch top markets");
            return;
        }
    
        const topMarkets = await retrievedData.json();
        return topMarkets ?? null;
    });

    ipcMain.handle("fetchAccountHistory", async (event, arg) => {
        const { chain, accountID } = arg;

        const from = arg.from ?? 0;
        const size = arg.size ?? 100;
        const from_date = arg.from_date ?? "2015-10-10";
        const to_date = arg.to_date ?? "now";
        const sort_by = arg.sort_by ?? "-operation_id_num";
        const type = arg.type ?? "data";
        const agg_field = arg.agg_field ?? "operation_type";

        const url = `https://${
                        chain === "bitshares" ? "api" : "api.testnet"
                    }.bitshares.ws/openexplorer/es/account_history` +
                    `?account_id=${accountID}` +
                    `&from_=${from}` +
                    `&size=${size}` +
                    `&from_date=${from_date}` +
                    `&to_date=${to_date}` +
                    `&sort_by=${sort_by}` +
                    `&type=${type}` +
                    `&agg_field=${agg_field}`;

        let history;
        try {
            history = await fetch(url, { method: "GET" });
        } catch (error) {
            console.log({ error });
            return null;
        }

        if (!history || !history.ok) {
            console.log("Couldn't fetch account history.");
            return null;
        }

        const accountHistory = await history.json();     
        return accountHistory ?? null;
    });

    ipcMain.handle("generateDeepLink", async (event, arg) => {
        const { usrChain, operationName, trxJSON } = arg;

        let deeplink;
        try {
            deeplink = await generateDeepLink(usrChain, operationName, trxJSON);
        } catch (error) {
            console.log({ error });
        }

        return deeplink ?? null;
    });

    const safeDomains = [
        "https://blocksights.info/",
        "https://bts.exchange/",
        "https://ex.xbts.io/",
        "https://kibana.bts.mobi/",
        "https://www.bitsharescan.info/",
        "https://github.com/bitshares/beet",
      ];
    ipcMain.on("openURL", (event, arg) => {
        try {
            const parsedUrl = new url.URL(arg);
            const domain = parsedUrl.hostname;

            const isSafeDomain = safeDomains.some(safeDomain => {
                const safeDomainHostname = new url.URL(safeDomain).hostname;
                return safeDomainHostname === domain;
            });

            if (isSafeDomain) {
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

    tray.on("click", () => {
        mainWindow?.setAlwaysOnTop(true);
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.setAlwaysOnTop(false);
    });

    tray.on("balloon-click", () => {
        mainWindow?.setAlwaysOnTop(true);
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.setAlwaysOnTop(false);
    });
};

app.disableHardwareAcceleration();

const currentOS = os.platform();
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
