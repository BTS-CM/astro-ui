import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // MISC
  openURL: async (target) => ipcRenderer.send("openURL", target), // Links to explorers
  notify: async (msg) => ipcRenderer.send("notify", msg), // Triggering an electron notification prompt
  setWindowTitle: async (title) => ipcRenderer.send("setWindowTitle", title), // Localized OS window / alt-tab title
  setTrayTooltip: async (tooltip) =>
    ipcRenderer.send("setTrayTooltip", tooltip), // Localized tray tooltip
  setNotificationTitle: async (title) =>
    ipcRenderer.send("setNotificationTitle", title), // Localized notification heading
  setMenuLabels: async (labels) => ipcRenderer.send("setMenuLabels", labels), // Localized application menu labels
  registerFaucetAccount: async (args) =>
    ipcRenderer.invoke("faucetRegistration", args),
  genKey: async () => ipcRenderer.invoke("genKey"),
  genAccount: async (args) => ipcRenderer.invoke("genAccount", args),
  generatePasswordKeys: async (args) => ipcRenderer.invoke("generatePasswordKeys", args),
  // Blind (stealth) account crypto (bts/ecc runs in main process)
  blindSuggestBrainKey: async () => ipcRenderer.invoke("blindSuggestBrainKey"),
  blindAccountFromBrainKey: async (args) =>
    ipcRenderer.invoke("blindAccountFromBrainKey", args),
  blindAccountFromWif: async (args) =>
    ipcRenderer.invoke("blindAccountFromWif", args),
  blindEncrypt: async (args) => ipcRenderer.invoke("blindEncrypt", args),
  blindDecrypt: async (args) => ipcRenderer.invoke("blindDecrypt", args),
  // Block polling for LiveBlocks (testnet-only via background.js fetchBlocks loop;
  // mainnet uses renderer subscription, but bridge is re-exposed for testnet)
  requestBlocks: async (args) => ipcRenderer.send("requestBlocks", args),
  onBlockResponse: (func) => {
    ipcRenderer.on("blockResponse", (event, data) => func(data));
  },
  stopBlocks: async () => ipcRenderer.send("stopBlocks"),
  // REST queries
  fetchTopMarkets: async (args) => ipcRenderer.invoke("fetchTopMarkets", args),
  fetchAccountHistory: async (args) =>
    ipcRenderer.invoke("fetchAccountHistory", args),
  // API queries
  generateDeepLink: async (args) =>
    ipcRenderer.invoke("generateDeepLink", args),
  generateTotpDeepLink: async (args) =>
    ipcRenderer.invoke("generateTotpDeepLink", args),
  generateQRContents: async (args) =>
    ipcRenderer.invoke("generateQRContents", args),
  calculateOperationFees: async (args) =>
    ipcRenderer.invoke("calculateOperationFees", args),
  // Ping a node URL from the main process. Returns an object { ok: boolean, status?: number, error?: string }
  ping: async (url) => ipcRenderer.invoke("ping", url),
});
