import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // MISC
  openURL: async (target) => ipcRenderer.send("openURL", target), // Links to explorers
  notify: async (msg) => ipcRenderer.send("notify", msg), // Triggering an electron notification prompt
  registerFaucetAccount: async (args) =>
    ipcRenderer.invoke("faucetRegistration", args),
  genKey: async () => ipcRenderer.invoke("genKey"),
  genAccount: async (args) => ipcRenderer.invoke("genAccount", args),
  // Blind (stealth) account crypto (bts/ecc runs in main process)
  blindSuggestBrainKey: async () => ipcRenderer.invoke("blindSuggestBrainKey"),
  blindAccountFromBrainKey: async (args) =>
    ipcRenderer.invoke("blindAccountFromBrainKey", args),
  blindAccountFromWif: async (args) =>
    ipcRenderer.invoke("blindAccountFromWif", args),
  blindEncrypt: async (args) => ipcRenderer.invoke("blindEncrypt", args),
  blindDecrypt: async (args) => ipcRenderer.invoke("blindDecrypt", args),
  // REST queries
  fetchTopMarkets: async (args) => ipcRenderer.invoke("fetchTopMarkets", args),
  fetchAccountHistory: async (args) =>
    ipcRenderer.invoke("fetchAccountHistory", args),
  // WS queries
  requestBlocks: async (args) => ipcRenderer.send("requestBlocks", args),
  onBlockResponse: (func) => {
    ipcRenderer.on("blockResponse", (event, data) => {
      func(data);
    });
  },
  stopBlocks: async () => ipcRenderer.send("stopBlocks", args),
  // API queries
  generateDeepLink: async (args) =>
    ipcRenderer.invoke("generateDeepLink", args),
  generateQRContents: async (args) =>
    ipcRenderer.invoke("generateQRContents", args),
  calculateOperationFees: async (args) =>
    ipcRenderer.invoke("calculateOperationFees", args),
  // Ping a node URL from the main process. Returns an object { ok: boolean, status?: number, error?: string }
  ping: async (url) => ipcRenderer.invoke("ping", url),

  // ---- MCP server control (page-tied lifecycle) ----
  mcp: {
    start: async (port) => ipcRenderer.invoke("mcp:start", { port }),
    stop: async () => ipcRenderer.invoke("mcp:stop"),
    setStoredUsers: async (users) => ipcRenderer.invoke("mcp:setStoredUsers", users),
    setActiveNode: async (chain, url) => ipcRenderer.invoke("mcp:setActiveNode", { chain, url }),
    onStatus: (func) => {
      ipcRenderer.on("mcp-status", (event, data) => func(data));
    },
    onLog: (func) => {
      ipcRenderer.on("mcp-log", (event, data) => func(data));
    },
    onActiveNode: (func) => {
      ipcRenderer.on("mcp-active-node", (event, data) => func(data));
    },
  },
});
