import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // MISC
  openURL: async (target) => ipcRenderer.send("openURL", target), // Links to explorers
  notify: async (msg) => ipcRenderer.send("notify", msg), // Triggering an electron notification prompt
  registerFaucetAccount: async (args) =>
    ipcRenderer.invoke("faucetRegistration", args),
  genKey: async () => ipcRenderer.invoke("genKey"),
  genAccount: async (args) => ipcRenderer.invoke("genAccount", args),
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
  calculateOperationFees: async (args) =>
    ipcRenderer.invoke("calculateOperationFees", args),
  // Ping a node URL from the main process. Returns an object { ok: boolean, status?: number, error?: string }
  ping: async (url) => ipcRenderer.invoke("ping", url),
});
