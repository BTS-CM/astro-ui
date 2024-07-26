import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // MISC
    //openURL: async (target) => ipcRenderer.send('openURL', target), // Links to explorers
    //notify: async (msg) => ipcRenderer.send('notify', msg), // Triggering an electron notification prompt
    /*
    setNode: (func) => { // For storing the current connected blockchain node
        ipcRenderer.on('setNode', (event, args) => {
            func(args);
        });
    },
    */
    // REST queries
    fetchTopMarkets: async (args) => ipcRenderer.invoke('fetchTopMarkets', args),
    fetchAccountHistory: async (args) => ipcRenderer.invoke('fetchAccountHistory', args),
    // API queries
    generateDeepLink: async (args) => ipcRenderer.invoke('generateDeepLink', args),
    /*
    // For logging background issues to renderer dev console
    onMainLog: async (func) => {
        ipcRenderer.on("mainLog", (event, data) => {
            func(data);
        })
    },
    */
});
