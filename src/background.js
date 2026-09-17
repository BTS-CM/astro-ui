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
import { generateDeepLink, generateTotpDeepLink } from "./lib/deeplink.js";
import { generateQRContents } from "./lib/qr.js";

let mainWindow = null;
let tray = null;
let localizedNotificationTitle = "Error!";

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

  // ---- Testnet-only block polling (REFERENCE_CODE re-introduced) -----------
  // Mainnet uses renderer-side set_block_applied_callback subscription
  // (src/nanoeffects/BlocksLive.ts). Testnet nodes reject
  // set_subscribe_callback/enable_subscribe_to_all, so we restore the
  // pre-subscription Electron polling loop for bitshares_testnet only.
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
      if (apisInstance) {
        try { apisInstance.close(); } catch {}
        apisInstance = null;
      }
    }
    isFetching = false;
  };

  ipcMain.on("requestBlocks", async (event, arg) => {
    const { url } = arg;

    // Testnet-only: mainnet uses renderer subscription, ignore polling
    const chain = arg && arg.chain ? arg.chain : "bitshares";
    if (chain !== "bitshares_testnet") {
      console.log("requestBlocks: mainnet uses renderer subscription, ignoring polling for chain", chain);
      return;
    }

    if (isFetching) {
      continueFetching = false;
      clearTimeout(fetchTimeout);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    continueFetching = true;
    isFetching = false;

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
        break;
      } catch (err) {
        lastConnectError = err;
        console.log({ err, location: "init_promise", nodeUrl });
        if (apisInstance) {
          try { apisInstance.close(); } catch {}
          apisInstance = null;
        }
      }
    }

    if (!apisInstance) {
      console.log({ error: lastConnectError, location: "requestBlocks: all nodes failed", tried: nodeUrls });
      continueFetching = false;
      isFetching = false;
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

    fetchBlocks();
  });

  ipcMain.on("stopBlocks", () => {
    continueFetching = false;
    clearTimeout(fetchTimeout);
    if (apisInstance) {
      try { apisInstance.close(); } catch {}
      apisInstance = null;
    }
    isFetching = false;
  });

  ipcMain.handle("genKey", async () => {
    return key.get_random_key().toWif();
  });

  ipcMain.handle("generatePasswordKeys", async (event, arg) => {
    const { accountName, password, chain } = arg;
    if (!accountName || !password) {
      console.log("Missing accountName or password for key generation");
      return { success: false };
    }
    // Use explicit prefix per chain; ChainConfig default is CBA and only set after Apis connection,
    // so derive with BTS/TEST explicitly to avoid CBA mismatch (see PublicKey.fromStringOrThrow).
    const prefix = chain === "bitshares_testnet" ? "TEST" : "BTS";
    function _generateKeyFromPassword(accountName, role, password, prefix) {
      let seed = accountName + role + password;
      let privKey = PrivateKey.fromSeed(seed);
      let pubKey = privKey.toPublicKey().toPublicKeyString(prefix);
      return { privKey, pubKey };
    }
    try {
      const { pubKey: owner } = _generateKeyFromPassword(accountName, "owner", password, prefix);
      const { pubKey: active } = _generateKeyFromPassword(accountName, "active", password, prefix);
      const { pubKey: memo } = _generateKeyFromPassword(accountName, "memo", password, prefix);
      return { owner, active, memo };
    } catch (error) {
      console.log({ error, location: "generatePasswordKeys" });
      return { success: false, error: error.message };
    }
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
      // Creating user with the public account faucet. The renderer passes an
      // optional referrerOverride (the top monthly donator to nft.artist, see
      // the Monthly Referrer reward feature); when none is supplied we fall
      // back to the default referrer/registration account.
      const referrer = arg.referrerOverride || (arg.chain === "bitshares" ? "1.2.1803677" : "1.2.3");
      return {
        account: {
          name: username,
          owner_key: owner_public,
          active_key: active_public,
          memo_key: memo_public,
          refcode: referrer,
          referrer,
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

  /*
  ipcMain.handle("fetchTopMarkets", async (event, arg) => {
    const { chain } = arg;

    let retrievedData;
    try {
      retrievedData = await fetch(
        chain === "bitshares"
          ? `https://api.bitshares.ws/openexplorer/top_markets?top_n=100` // WS DOMAIN HIJACKED!
          : `https://api.testnet.bitshares.ws/openexplorer/top_markets?top_n=50` // WS DOMAIN HIJACKED!
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
  */

  /*
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
  */

  // Localized UI strings sent from the renderer once i18n has loaded
  ipcMain.on("setWindowTitle", (event, title) => {
    if (typeof title === "string" && title) {
      mainWindow?.setTitle(title);
    }
  });

  ipcMain.on("setTrayTooltip", (event, tooltip) => {
    if (typeof tooltip === "string" && tooltip) {
      tray?.setToolTip(tooltip);
    }
  });

  ipcMain.on("setNotificationTitle", (event, title) => {
    if (typeof title === "string" && title) {
      localizedNotificationTitle = title;
    }
  });

  ipcMain.on("setMenuLabels", (event, labels) => {
    if (
      labels &&
      typeof labels === "object" &&
      Object.keys(labels).length > 0
    ) {
      initApplicationMenu(mainWindow, labels);
    }
  });

  ipcMain.on("notify", (event, arg) => {
    const NOTIFICATION_TITLE = localizedNotificationTitle;
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
            ? "https://faucet.xbts.io/"
            : "https://testnet-faucet.xbts.io/";

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

  ipcMain.handle("generateTotpDeepLink", async (event, arg) => {
    const { usrChain, nodeURL, operationNames, trxJSON, totpCode } = arg;

    let deeplink;
    try {
      deeplink = await generateTotpDeepLink(
        usrChain,
        nodeURL,
        operationNames,
        trxJSON,
        totpCode,
      );
    } catch (error) {
      console.log({ error, location: "generateTotpDeepLink" });
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
        let pathname;
        try {
          pathname = decodeURIComponent(new URL(req.url).pathname);
        } catch {
          pathname = new URL(req.url).pathname;
        }
        if (!pathname) {
          return new Response(null, { status: 400 });
        }

        // Resolve astroDist independently of process.cwd() in dev, so
        // file:///pagefind/pagefind-entry.json maps to <app>/astroDist/...
        // In packaged builds astroDist ships as extraResources.
        const baseDir =
          process.env.NODE_ENV === "development"
            ? path.join(app.getAppPath(), "astroDist")
            : path.join(process.resourcesPath, "astroDist");

        const rel = pathname.replace(/^\/+/, "");
        let fullPath = path.join(baseDir, rel);

        if (pathname === "/") {
          fullPath = path.join(baseDir, "index.html");
        }

        // Keep the original traversal protection, but anchored to baseDir
        // so it cannot accidentally pass/fail on unrelated path segments.
        const normBase = path.normalize(baseDir + path.sep);
        const normFull = path.normalize(fullPath);
        if (
          normFull !== path.normalize(baseDir) &&
          !normFull.startsWith(normBase)
        ) {
          return new Response(null, { status: 403 });
        }
        if (fullPath.includes("~")) {
          return new Response(null, { status: 403 });
        }

        // Candidate fallbacks are additive only: exact path is tried first,
        // so every route that works today resolves identically. The extra
        // candidates only turn a former empty-200 miss (EISDIR/ENOENT) into
        // a real file when it exists (e.g. trailing-slash doc URLs from
        // `build.format: 'file'` output, extensionless routes).
        const candidates = [fullPath];
        if (pathname.endsWith("/")) {
          candidates.push(path.join(fullPath, "index.html"));
        }
        if (!path.extname(fullPath)) {
          candidates.push(`${fullPath}.html`);
        }

        let fileBuf;
        let resolvedPath = candidates[0];
        let lastError;
        for (const cand of candidates) {
          try {
            fileBuf = await readFile(cand);
            resolvedPath = cand;
            lastError = undefined;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError || fileBuf === undefined) {
          // file:// base is host-polluted (`file://index.html` from
          // loadURL): Pagefind/_astro requests arrive nested, e.g.
          // `/docs/index.html/pagefind/pagefind-entry.json` instead of
          // `/pagefind/pagefind-entry.json`. Exact path above misses with
          // ENOENT, so re-anchor known absolute asset roots as a
          // miss-only fallback. Working routes already returned above and
          // are unaffected.
          let reqHost = "";
          try {
            reqHost = new URL(req.url).host || "";
          } catch {
            reqHost = "";
          }
          const assetRoots = ["/pagefind/", "/_astro/"];
          let resolvedVia = null;
          for (const root of assetRoots) {
            const idx = pathname.lastIndexOf(root);
            if (idx < 0) continue;
            const suffix = pathname.slice(idx);
            const suffixPath = path.join(
              baseDir,
              suffix.replace(/^\/+/, "")
            );
            const normSuffix = path.normalize(suffixPath);
            if (
              normSuffix !== path.normalize(baseDir) &&
              !normSuffix.startsWith(normBase)
            ) {
              continue;
            }
            if (suffixPath.includes("~")) continue;
            try {
              fileBuf = await readFile(suffixPath);
              resolvedPath = suffixPath;
              lastError = undefined;
              resolvedVia = `suffix-fallback:${root}`;
              break;
            } catch (error) {
              lastError = error;
            }
          }
          if (lastError || fileBuf === undefined) {
            // Previously this returned `new Response(undefined)` with an
            // implicit 200, so Pagefind's `.json()` threw
            // "Unexpected end of JSON input" on what was really a 404/EISDIR.
            // Return an honest 404 so DevTools + Pagefind report the miss.
            console.log({
              fileProtocolMiss: req.url,
              host: reqHost,
              pathname,
              fullPath,
              resolvedVia,
              error: String(
                (lastError && lastError.message) || lastError || "not found"
              ),
            });
            return new Response(null, { status: 404 });
          }
        }

        let mimeType =
          mime.lookup(resolvedPath) || "application/octet-stream";
        // Pagefind ships its wasm as `wasm.<lang>.pagefind`, which
        // mime-types doesn't know. Serve it as wasm so the search worker
        // can instantiate it instead of erroring to the main-thread
        // fallback. Other `.pf_*` chunks correctly stay octet-stream.
        if (resolvedPath.endsWith(".pagefind")) {
          mimeType = "application/wasm";
        }

        // Copy out of Node's Buffer pool: passing the Buffer directly can
        // surface a mis-sized ArrayBuffer to the Response body.
        const body = new Uint8Array(
          fileBuf.buffer.slice(
            fileBuf.byteOffset,
            fileBuf.byteOffset + fileBuf.byteLength
          )
        );

        return new Response(body, {
          status: 200,
          headers: {
            "content-type": mimeType,
            "content-length": String(body.byteLength),
          },
        });
      });
    })
    .then(createWindow);
} else {
  app
    .whenReady()
    .then(() => {
      protocol.handle("file", async (req) => {
        let pathname;
        try {
          pathname = decodeURIComponent(new URL(req.url).pathname);
        } catch {
          pathname = new URL(req.url).pathname;
        }
        if (!pathname) {
          return new Response(null, { status: 400 });
        }

        // Resolve astroDist independently of process.cwd() in dev, so
        // file:///pagefind/pagefind-entry.json maps to <app>/astroDist/...
        // In packaged builds astroDist ships as extraResources.
        const baseDir =
          process.env.NODE_ENV === "development"
            ? path.join(app.getAppPath(), "astroDist")
            : path.join(process.resourcesPath, "astroDist");

        const rel = pathname.replace(/^\/+/, "");
        let fullPath = path.join(baseDir, rel);

        if (pathname === "/") {
          fullPath = path.join(baseDir, "index.html");
        }

        // Keep the original traversal protection, but anchored to baseDir
        // so it cannot accidentally pass/fail on unrelated path segments.
        const normBase = path.normalize(baseDir + path.sep);
        const normFull = path.normalize(fullPath);
        if (
          normFull !== path.normalize(baseDir) &&
          !normFull.startsWith(normBase)
        ) {
          return new Response(null, { status: 403 });
        }
        if (fullPath.includes("~")) {
          return new Response(null, { status: 403 });
        }

        // Candidate fallbacks are additive only: exact path is tried first,
        // so every route that works today resolves identically. The extra
        // candidates only turn a former empty-200 miss (EISDIR/ENOENT) into
        // a real file when it exists (e.g. trailing-slash doc URLs from
        // `build.format: 'file'` output, extensionless routes).
        const candidates = [fullPath];
        if (pathname.endsWith("/")) {
          candidates.push(path.join(fullPath, "index.html"));
        }
        if (!path.extname(fullPath)) {
          candidates.push(`${fullPath}.html`);
        }

        let fileBuf;
        let resolvedPath = candidates[0];
        let lastError;
        for (const cand of candidates) {
          try {
            fileBuf = await readFile(cand);
            resolvedPath = cand;
            lastError = undefined;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError || fileBuf === undefined) {
          // file:// base is host-polluted (`file://index.html` from
          // loadURL): Pagefind/_astro requests arrive nested, e.g.
          // `/docs/index.html/pagefind/pagefind-entry.json` instead of
          // `/pagefind/pagefind-entry.json`. Exact path above misses with
          // ENOENT, so re-anchor known absolute asset roots as a
          // miss-only fallback. Working routes already returned above and
          // are unaffected.
          let reqHost = "";
          try {
            reqHost = new URL(req.url).host || "";
          } catch {
            reqHost = "";
          }
          const assetRoots = ["/pagefind/", "/_astro/"];
          let resolvedVia = null;
          for (const root of assetRoots) {
            const idx = pathname.lastIndexOf(root);
            if (idx < 0) continue;
            const suffix = pathname.slice(idx);
            const suffixPath = path.join(
              baseDir,
              suffix.replace(/^\/+/, "")
            );
            const normSuffix = path.normalize(suffixPath);
            if (
              normSuffix !== path.normalize(baseDir) &&
              !normSuffix.startsWith(normBase)
            ) {
              continue;
            }
            if (suffixPath.includes("~")) continue;
            try {
              fileBuf = await readFile(suffixPath);
              resolvedPath = suffixPath;
              lastError = undefined;
              resolvedVia = `suffix-fallback:${root}`;
              break;
            } catch (error) {
              lastError = error;
            }
          }
          if (lastError || fileBuf === undefined) {
            // Previously this returned `new Response(undefined)` with an
            // implicit 200, so Pagefind's `.json()` threw
            // "Unexpected end of JSON input" on what was really a 404/EISDIR.
            // Return an honest 404 so DevTools + Pagefind report the miss.
            console.log({
              fileProtocolMiss: req.url,
              host: reqHost,
              pathname,
              fullPath,
              resolvedVia,
              error: String(
                (lastError && lastError.message) || lastError || "not found"
              ),
            });
            return new Response(null, { status: 404 });
          }
        }

        let mimeType =
          mime.lookup(resolvedPath) || "application/octet-stream";
        // Pagefind ships its wasm as `wasm.<lang>.pagefind`, which
        // mime-types doesn't know. Serve it as wasm so the search worker
        // can instantiate it instead of erroring to the main-thread
        // fallback. Other `.pf_*` chunks correctly stay octet-stream.
        if (resolvedPath.endsWith(".pagefind")) {
          mimeType = "application/wasm";
        }

        // Copy out of Node's Buffer pool: passing the Buffer directly can
        // surface a mis-sized ArrayBuffer to the Response body.
        const body = new Uint8Array(
          fileBuf.buffer.slice(
            fileBuf.byteOffset,
            fileBuf.byteOffset + fileBuf.byteLength
          )
        );

        return new Response(body, {
          status: 200,
          headers: {
            "content-type": mimeType,
            "content-length": String(body.byteLength),
          },
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
