import path from "path";
import os from "os";
import url from "url";
import express from "express";

import { Apis } from "bitsharesjs-ws";

import { app, BrowserWindow, Menu, Tray, ipcMain, screen, shell } from "electron";

import { initApplicationMenu } from "./lib/applicationMenu.js";
import { generateDeepLink } from "./lib/deeplink.js";

let mainWindow = null;
let tray = null;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    minWidth: 480,
    minHeight: 695,
    maximizable: true,
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

  let astroDistPath;
  if (process.env.NODE_ENV === "development") {
    astroDistPath = "astroDist";
  } else {
    astroDistPath = path.join(process.resourcesPath, "astroDist");
  }

  expressApp.use(express.static(astroDistPath));
  expressApp.listen(8080, () => {
    console.log("Express server listening on port 8080");
  });

  initApplicationMenu(mainWindow);

  mainWindow.loadURL("http://localhost:8080/index.html");

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

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

  let continueFetching = false;
  let latestBlockNumber = 0;
  let isFetching = false;
  let apisInstance = null;
  let fetchTimeout = null;

  const fetchBlocks = async () => {
    isFetching = true;
    while (continueFetching) {
      let currentBlock;
      try {
        currentBlock = await apisInstance.db_api().exec("get_block", [latestBlockNumber]);
      } catch (error) {
        console.log({ error });
        continueFetching = false;
        isFetching = false;
        break;
      }
      mainWindow.webContents.send("blockResponse", {
        ...currentBlock,
        block: latestBlockNumber,
      });
      latestBlockNumber += 1;

      await new Promise((resolve) => {
        fetchTimeout = setTimeout(resolve, 4200);
      });
    }

    if (!continueFetching) {
      apisInstance.close();
      apisInstance = null;
    }
    isFetching = false;
  };

  ipcMain.on("requestBlocks", async (event, arg) => {
    const { url } = arg;

    // Stop any ongoing fetching process
    if (isFetching) {
      continueFetching = false;
      clearTimeout(fetchTimeout); // Clear the timeout to stop the current fetching process immediately
      await new Promise((resolve) => setTimeout(resolve, 100)); // Short wait to ensure the current fetching process stops
    }

    // Reset state variables
    continueFetching = true;
    isFetching = false;

    // Create a new Apis instance
    try {
      apisInstance = Apis.instance(url, true);
    } catch (error) {
      console.log({ error, location: "Apis.instance", url });
      continueFetching = false;
      isFetching = false;
      return;
    }

    try {
      await apisInstance.init_promise;
      console.log("connected to:", apisInstance.chain_id);
    } catch (err) {
      console.log({ err });
      continueFetching = false;
      isFetching = false;
      if (apisInstance) {
        apisInstance.close();
        apisInstance = null;
      }
      return;
    }

    let globalProperties;
    try {
      globalProperties = await apisInstance.db_api().exec("get_dynamic_global_properties", []);
    } catch (error) {
      console.log({ error, location: "globalProperties", url });
      continueFetching = false;
      isFetching = false;
      return;
    }

    latestBlockNumber = globalProperties.head_block_number;

    const blockPromises = [];
    for (let i = latestBlockNumber - 1; i > latestBlockNumber - 31; i--) {
      blockPromises.push(apisInstance.db_api().exec("get_block", [i]));
    }

    let lastFewBlocks = [];
    try {
      lastFewBlocks = await Promise.all(blockPromises);
    } catch (error) {
      console.log({ error });
    }

    for (let i = lastFewBlocks.length - 1; i >= 0; i--) {
      mainWindow.webContents.send("blockResponse", {
        ...lastFewBlocks[i],
        block: latestBlockNumber - 1 - i,
      });
    }

    // Start fetching blocks continuously
    fetchBlocks();
  });

  // Handle the user navigating away from the page
  ipcMain.on("stopBlocks", () => {
    continueFetching = false;
    clearTimeout(fetchTimeout); // Clear the timeout to stop the current fetching process immediately
    if (apisInstance) {
      apisInstance.close();
      apisInstance = null;
    }
    isFetching = false;
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
      console.log({ error });
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

    const url =
      `https://${
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
    const { usrChain, nodeURL, operationNames, trxJSON } = arg;

    let deeplink;
    try {
      deeplink = await generateDeepLink(usrChain, nodeURL, operationNames, trxJSON);
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

      const isSafeDomain = safeDomains.some((safeDomain) => {
        const safeDomainHostname = new url.URL(safeDomain).hostname;
        return safeDomainHostname === domain;
      });

      if (isSafeDomain) {
        shell.openExternal(arg);
      } else {
        console.error(`Rejected opening URL with unsafe domain: ${domain}`);
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
