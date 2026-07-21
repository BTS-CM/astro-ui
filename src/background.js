import path from "node:path";
import os from "os";
import url from "node:url";
import { createConnection } from "node:net";
import { performance } from "node:perf_hooks";
import { readFile } from "fs/promises";
import mime from "mime-types";

import { key } from "./bts/ecc/key";
import PrivateKey from "./bts/ecc/PrivateKey";
import Aes from "./bts/ecc/Aes";
import Apis from "./bts/ws/ApiInstances";
import { chains } from "./config/chains";
import blindDictionary from "./data/blindDictionary.js";

import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  protocol,
  shell,
  globalShortcut,
} from "electron";

import { initApplicationMenu } from "./lib/applicationMenu.js";
import { generateDeepLink } from "./lib/deeplink.js";
import { generateQRContents } from "./lib/qr.js";
import * as mcpServer from "./mcp/server.js";

let mainWindow = null;
let tray = null;

mcpServer.setHooks({
  log: (msg) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("mcp-log", msg);
    }
  },
  status: (status) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("mcp-status", status);
    }
  },
  activeNode: (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("mcp-active-node", info);
    }
  },
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: "file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    maximizable: true,
    fullscreenable: true,
    resizable: true,
    minimizable: true,
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

  initApplicationMenu(mainWindow);

  // Load the local HTML file using the custom protocol
  mainWindow.loadURL("file://index.html");
  mainWindow.maximize();

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  // Register global shortcut for "Alt + Left Arrow"
  app.whenReady().then(() => {
    globalShortcut.register("Alt+Left", () => {
      if (mainWindow && mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack();
      }
    });
  });

  // Unregister shortcut when app is closed
  app.on("will-quit", () => {
    globalShortcut.unregister("Alt+Left");
    globalShortcut.unregisterAll();
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
        currentBlock = await apisInstance
          .db_api()
          .exec("get_block", [latestBlockNumber]);
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

    // Build the ordered list of nodes to try: start with the requested
    // `url`, then fall back to the rest of the chain's configured nodeList
    // (skipping duplicates). This lets a node that rejects the connection
    // (e.g. "Access denied" / `is_allowed`) be transparently bypassed.
    const chain = arg && arg.chain ? arg.chain : "bitshares";
    const nodeUrls = [];
    if (url) nodeUrls.push(url);
    const configured = (chains[chain] && chains[chain].nodeList) || [];
    for (const n of configured) {
      if (n && n.url && !nodeUrls.includes(n.url)) {
        nodeUrls.push(n.url);
      }
    }

    let lastConnectError = null;
    for (const nodeUrl of nodeUrls) {
      try {
        apisInstance = Apis.instance(nodeUrl, true);
      } catch (error) {
        lastConnectError = error;
        console.log({ error, location: "Apis.instance", nodeUrl });
        continue;
      }

      try {
        await apisInstance.init_promise;
        console.log("connected to:", nodeUrl, apisInstance.chain_id);
        lastConnectError = null;
        break; // success
      } catch (err) {
        lastConnectError = err;
        console.log({ err, location: "init_promise", nodeUrl });
        if (apisInstance) {
          try {
            apisInstance.close();
          } catch (e) {
            /* ignore */
          }
          apisInstance = null;
        }
        // try next node
      }
    }

    if (!apisInstance) {
      console.log({
        error: lastConnectError,
        location: "requestBlocks: all nodes failed",
        tried: nodeUrls,
      });
      continueFetching = false;
      isFetching = false;
      return;
    }

    let globalProperties;
    try {
      globalProperties = await apisInstance
        .db_api()
        .exec("get_dynamic_global_properties", []);
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

  ipcMain.handle("genKey", async () => {
    return key.get_random_key().toWif();
  });

  ipcMain.handle("genAccount", async (event, arg) => {
    const { userID, username, password, method, nodeURL } = arg;

    let apiInstance;
    try {
      apiInstance = Apis.instance(nodeURL, true);
    } catch (error) {
      console.log({ error, location: "Apis.instance", nodeURL });
      return;
    }

    try {
      await apiInstance.init_promise;
      console.log("connected to:", apiInstance.chain_id);
    } catch (err) {
      console.log({ err });
      return;
    }

    apiInstance.close();
    apiInstance = null;

    function _generateKeyFromPassword(accountName, role, password) {
      let seed = accountName + role + password;
      let privKey = PrivateKey.fromSeed(seed);
      let pubKey = privKey.toPublicKey().toPublicKeyString();
      return { privKey, pubKey };
    }

    if (!userID || !username || !password || !method) {
      console.log(`Missing required parameters for account generation`);
      return { success: false };
    }

    let { privKey: owner_private, pubKey: owner_public } =
      _generateKeyFromPassword(username, "owner", password);

    let { privKey: active_private, pubKey: active_public } =
      _generateKeyFromPassword(username, "active", password);

    let { privKey: memo_private, pubKey: memo_public } =
      _generateKeyFromPassword(username, "memo", password);

    if (method === "ltm") {
      // BeetEOS broadcast by LTM account creating premium account names

      if (!userID) {
        console.log(`User ID is required for this method`);
        return { success: false };
      }

      return {
        fee: {
          amount: 0,
          asset_id: "1.3.0",
        },
        registrar: userID,
        referrer: userID,
        referrer_percent: 100,
        name: username,
        owner: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [[owner_public, 1]],
          address_auths: [],
        },
        active: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [[active_public, 1]],
          address_auths: [],
        },
        options: {
          memo_key: memo_public,
          voting_account: "1.2.5", // proxy-to-self
          votes: [],
          num_witness: 0,
          num_committee: 0,
        },
      };
    } else {
      // Creating user with the public account faucet
      return {
        account: {
          name: username,
          owner_key: owner_public,
          active_key: active_public,
          memo_key: memo_public,
          refcode: "1.2.1803677",
          referrer: "1.2.1803677",
        },
       };
     }
   });

  // ---- Blind (stealth) account crypto -------------------------------------
  // bts/ecc requires Node's Buffer, so all blind-account key operations run
  // here in the main process and are exposed to the renderer over IPC.
  function _blindPrefixForChain(chain) {
    return chain === "bitshares_testnet" ? "TEST" : "BTS";
  }

  function _blindSerialize(label, chain, privateKey, brainKey) {
    const prefix = _blindPrefixForChain(chain);
    return {
      label,
      chain,
      publicKey: privateKey.toPublicKey().toPublicKeyString(prefix),
      wif: privateKey.toWif(),
      brainKey: brainKey ?? null,
    };
  }

  ipcMain.handle("blindSuggestBrainKey", async () => {
    return key.suggest_brain_key(blindDictionary.en);
  });

  ipcMain.handle("blindAccountFromBrainKey", async (event, arg) => {
    const { label, chain, brainKey, sequence = 0 } = arg;
    const pk = key.get_brainPrivateKey(brainKey, sequence);
    return _blindSerialize(label, chain, pk, brainKey);
  });

  ipcMain.handle("blindAccountFromWif", async (event, arg) => {
    const { label, chain, wif } = arg;
    const pk = PrivateKey.fromWif(wif);
    return _blindSerialize(label, chain, pk, null);
  });

  ipcMain.handle("blindEncrypt", async (event, arg) => {
    const { plaintext, password } = arg;
    return Aes.fromSeed(password).encryptToHex(plaintext);
  });

  ipcMain.handle("blindDecrypt", async (event, arg) => {
    const { encrypted, password, validateWif = false } = arg;
    const decrypted = Aes.fromSeed(password).decryptHexToText(
      encrypted,
      "binary"
    );
    if (validateWif) {
      PrivateKey.fromWif(decrypted);
    }
    return decrypted;
  });

  ipcMain.on("notify", (event, arg) => {
    const NOTIFICATION_TITLE = "Error!";
    const NOTIFICATION_BODY = arg;

    if (os.platform === "win32") {
      app.setAppUserModelId(app.name);
    }

    function showNotification() {
      new Notification({
        title: NOTIFICATION_TITLE,
        subtitle: "subtitle",
        body: NOTIFICATION_BODY,
        icon: __dirname + "/img/tray.png",
      }).show();
    }

    showNotification();
  });

  ipcMain.handle("faucetRegistration", async (event, arg) => {
    const { chain, bodyParameters } = arg;

    function createAccountWithPassword(chain, bodyParameters) {
      return new Promise((resolve, reject) => {
        const faucetAddress =
          chain === "bitshares"
            ? "https://faucet.bitshares.eu/onboarding"
            : "https://faucet.testnet.bitshares.eu";

        fetch(faucetAddress + "/api/v1/accounts", {
          method: "post",
          mode: "cors",
          headers: {
            Accept: "application/json",
            "Content-type": "application/json",
          },
          body: bodyParameters,
        })
          .then((response) => response.json())
          .then((res) => {
            if (!res || (res && res.error)) {
              reject(res.error);
            } else {
              resolve(res);
            }
          })
          .catch(reject);
      });
    }

    try {
      const result = await createAccountWithPassword(chain, bodyParameters);
      return result;
    } catch (error) {
      console.error("Error during faucet registration:", error);
      return { error };
    }
  });

  ipcMain.handle("calculateOperationFees", async (event, arg) => {
    const { nodeURL, trxJSON } = arg;

    let currentAPI;
    try {
      currentAPI = await Apis.instance(
        nodeURL.url,
        true,
        4000,
        { enableDatabase: true },
        (error) => console.log({ error }),
      );
    } catch (error) {
      console.log({ error });
      return;
    }

    currentAPI.init_promise;

    let _op = {
      ...trxJSON,
    };

    delete _op.fee;

    let fee;
    try {
      fee = await currentAPI
        .db_api()
        .exec("get_required_fees", [[[_op]], "1.3.0"]);
    } catch (error) {
      console.log({ error });
    }

    console.log({ fee, nodeURL, _op });

    currentAPI.close();
    currentAPI = null;

    return fee && fee.length ? fee[0].amount : null;
  });

  ipcMain.handle("generateDeepLink", async (event, arg) => {
    const { usrChain, nodeURL, operationNames, trxJSON } = arg;

    let deeplink;
    try {
      deeplink = await generateDeepLink(
        usrChain,
        nodeURL,
        operationNames,
        trxJSON,
      );
    } catch (error) {
      console.log({ error });
    }

    return deeplink ?? null;
  });

  ipcMain.handle("generateQRContents", async (event, arg) => {
    const { usrChain, nodeURL, currentNode, operationNames, trxJSON } = arg;

    let qr;
    try {
      qr = await generateQRContents(
        usrChain,
        nodeURL || currentNode,
        operationNames,
        trxJSON,
      );
    } catch (error) {
      console.log({ error });
    }

    return qr ?? null;
  });

  // Ping handler: perform a TCP connect to the host/port to measure latency using node:net
  // Returns { ok: true, ms: <number> } on success, or { ok: false, error: <string> } on failure
  ipcMain.handle("ping", async (event, urlToPing) => {
    if (!urlToPing) return { ok: false, error: "missing_url" };

    let parsed;
    try {
      parsed = new url.URL(urlToPing);
    } catch (err) {
      return { ok: false, error: `invalid_url: ${err && err.message}` };
    }

    // Determine host and port for the TCP connection. For ws/wss default to 80/443.
    const hostname = parsed.hostname;
    let port = parsed.port ? Number(parsed.port) : null;
    if (!port) {
      if (parsed.protocol === "wss:") port = 443;
      else if (parsed.protocol === "ws:") port = 80;
      else if (parsed.protocol === "https:") port = 443;
      else if (parsed.protocol === "http:") port = 80;
      else port = 80;
    }

    const timeoutMs = 5000; // 5s timeout as requested

    return new Promise((resolve) => {
      let settled = false;
      const start = performance.now();

      let socket;
      try {
        socket = createConnection({ host: hostname, port }, () => {
          if (settled) return;
          settled = true;
          const ms = Math.round(performance.now() - start);
          try {
            socket.end();
          } catch (e) {}
          resolve({ ok: true, ms });
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          resolve({ ok: false, error: `connect_error: ${err && err.message}` });
        }
        return;
      }

      socket.setTimeout(timeoutMs);

      const cleanup = () => {
        try {
          socket.destroy();
        } catch (e) {}
      };

      socket.on("timeout", () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ ok: false, error: "timeout" });
      });

      socket.on("error", (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ ok: false, error: `error: ${err && err.message}` });
      });
    });
  });

  ipcMain.handle("mcp:start", async (event, arg) => {
    const port = (arg && arg.port) || 35899;
    try {
      const result = await mcpServer.start(port);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle("mcp:stop", async () => {
    try {
      await mcpServer.stop();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle("mcp:setStoredUsers", async (event, users) => {
    mcpServer.setStoredUsers(users);
    return { ok: true };
  });

  ipcMain.handle("mcp:setActiveNode", async (event, payload) => {
    try {
      return mcpServer.setActiveNode(payload.chain, payload.url);
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  });

  const safeDomains = [
    "https://bts.exchange/",
    "https://ex.xbts.io/",
    "https://kibana.bitshares.dev/",
    "https://www.electronjs.org/",
    "https://bitshareschain.com/",
    "https://react.dev/",
    "https://github.com/",
    "https://astro.build/",
    "https://www.pinata.cloud/",
    "https://nft.storage/",
    "https://web3.storage/",
    "https://fleek.co/ipfs-gateway/",
    "https://infura.io/product/ipfs",
    "https://landing.storj.io/permanently-pin-with-storj-dcs",
    "https://www.eternum.io/",
    "https://blog.ipfs.io/2021-04-05-storing-nfts-on-ipfs/",
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

  app
    .whenReady()
    .then(() => {
      protocol.handle("file", async (req) => {
        const { pathname } = new URL(req.url);
        if (!pathname) {
          return;
        }

        let fullPath =
          process.env.NODE_ENV === "development"
            ? path.join("astroDist", pathname)
            : path.join(process.resourcesPath, "astroDist", pathname);

        if (pathname === "/") {
          fullPath = path.join(fullPath, "index.html");
        }

        if (fullPath.includes("..") || fullPath.includes("~")) {
          return; // Prevent directory traversal attacks
        }

        let _res;
        try {
          _res = await readFile(fullPath);
        } catch (error) {
          console.log({ error });
        }

        const mimeType = mime.lookup(fullPath) || "application/octet-stream";

        return new Response(_res, {
          headers: { "content-type": mimeType },
        });
      });
    })
    .then(createWindow);
} else {
  app
    .whenReady()
    .then(() => {
      protocol.handle("file", async (req) => {
        const { pathname } = new URL(req.url);
        if (!pathname) {
          return;
        }

        let fullPath =
          process.env.NODE_ENV === "development"
            ? path.join("astroDist", pathname)
            : path.join(process.resourcesPath, "astroDist", pathname);

        if (pathname === "/") {
          fullPath = path.join(fullPath, "index.html");
        }

        if (fullPath.includes("..") || fullPath.includes("~")) {
          return; // Prevent directory traversal attacks
        }

        let _res;
        try {
          _res = await readFile(fullPath);
        } catch (error) {
          console.log({ error });
        }

        const mimeType = mime.lookup(fullPath) || "application/octet-stream";

        return new Response(_res, {
          headers: { "content-type": mimeType },
        });
      });
    })
    .then(createWindow);

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
