/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/lib/applicationMenu.js":
/*!************************************!*\
  !*** ./src/lib/applicationMenu.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initApplicationMenu: () => (/* binding */ initApplicationMenu)
/* harmony export */ });
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);


/**
 * For configuring the electron window menu
 */
function initApplicationMenu(mainWindow) {
    const template = [
      {
        label: 'View',
        submenu: [
          {
            label: 'Send to tray',
            click() {
              mainWindow.minimize();
            }
          },
          { label: 'Reload', role: 'reload' },
          { label: 'Dev tools', role: 'toggleDevTools' }
        ]
      }
    ];
    const menu = electron__WEBPACK_IMPORTED_MODULE_0__.Menu.buildFromTemplate(template);
    electron__WEBPACK_IMPORTED_MODULE_0__.Menu.setApplicationMenu(menu);
}


/***/ }),

/***/ "./src/lib/deeplink.js":
/*!*****************************!*\
  !*** ./src/lib/deeplink.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateDeepLink: () => (/* binding */ generateDeepLink)
/* harmony export */ });
/* harmony import */ var bitsharesjs_ws__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! bitsharesjs-ws */ "bitsharesjs-ws");
/* harmony import */ var bitsharesjs_ws__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(bitsharesjs_ws__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var bitsharesjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! bitsharesjs */ "bitsharesjs");
/* harmony import */ var bitsharesjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(bitsharesjs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! uuid */ "uuid");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(uuid__WEBPACK_IMPORTED_MODULE_2__);




const chains = {
    bitshares: {
        nodeList: [
            {
            url: "wss://node.xbts.io/ws",
            },
            {
            url: "wss://api.bts.mobi/ws",
            },
            {
            url: "wss://api.bitshares.bhuz.info/ws",
            },
            {
            url: "wss://btsws.roelandp.nl/ws",
            },
        ],
    },
    bitshares_testnet: {
        nodeList: [
            {
            url: "wss://testnet.dex.trading/",
            },
            {
            url: "wss://testnet.xbts.io/ws",
            },
            {
            url: "wss://api-testnet.61bts.com/ws",
            },
        ],
    },
};

async function generateDeepLink(chain, opType, operations) {
    return new Promise(async (resolve, reject) => {
        const _node = chains[chain].nodeList[0].url

        try {
            await bitsharesjs_ws__WEBPACK_IMPORTED_MODULE_0__.Apis.instance(
                _node,
                true,
                4000,
                { enableCrypto: false, enableOrders: true },
                (error) => console.log({ error })
            ).init_promise;
        } catch (error) {
            console.log({ error, location: "api instance failed" });
            return reject(error);
        }

        const tr = new bitsharesjs__WEBPACK_IMPORTED_MODULE_1__.TransactionBuilder();
        for (let i = 0; i < operations.length; i++) {
            tr.add_type_operation(opType, operations[i]);
        }

        try {
            await tr.update_head_block();
        } catch (error) {
            console.log({ error, location: "update head block failed" });
            reject(error);
            return;
        }

        try {
            await tr.set_required_fees();
        } catch (error) {
            console.log({ error, location: "set required fees failed" });
            reject(error);
            return;
        }

        try {
            tr.set_expire_seconds(7200);
        } catch (error) {
            console.log({ error, location: "set expire seconds failed" });
            reject(error);
            return;
        }

        try {
            tr.finalize();
        } catch (error) {
            console.log({ error, location: "finalize failed" });
            reject(error);
            return;
        }

        let id;
        try {
            id = await (0,uuid__WEBPACK_IMPORTED_MODULE_2__.v4)();
        } catch (error) {
            console.log({ error, location: "uuid generation failed" });
            reject(error);
            return;
        }

        const request = {
            type: "api",
            id: id,
            payload: {
                method: "injectedCall",
                params: ["signAndBroadcast", JSON.stringify(tr.toObject()), []],
                appName: "Bitshares Astro UI",
                chain: chain === "bitshares" ? "BTS" : "BTS_TEST",
                browser: "web browser",
                origin: "localhost",
            },
        };

        let encodedPayload;
        try {
            encodedPayload = encodeURIComponent(JSON.stringify(request));
        } catch (error) {
            console.log({ error, location: "encode payload failed" });
            reject(error);
            return;
        }

        resolve(encodedPayload);
    });
}



/***/ }),

/***/ "bitsharesjs":
/*!******************************!*\
  !*** external "bitsharesjs" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("bitsharesjs");

/***/ }),

/***/ "bitsharesjs-ws":
/*!*********************************!*\
  !*** external "bitsharesjs-ws" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("bitsharesjs-ws");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

/***/ }),

/***/ "uuid":
/*!***********************!*\
  !*** external "uuid" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./src/background.js ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! os */ "os");
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(os__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_applicationMenu_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./lib/applicationMenu.js */ "./src/lib/applicationMenu.js");
/* harmony import */ var _lib_deeplink_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/deeplink.js */ "./src/lib/deeplink.js");









let mainWindow = null;
let tray = null;

const createWindow = async () => {
    const { width, height } = electron__WEBPACK_IMPORTED_MODULE_3__.screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new electron__WEBPACK_IMPORTED_MODULE_3__.BrowserWindow({
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
            preload: path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, "preload.js"),
        },
        icon: __dirname + "/img/taskbar.png",
    });
    
    const expressApp = express__WEBPACK_IMPORTED_MODULE_2___default()();
    expressApp.use(express__WEBPACK_IMPORTED_MODULE_2___default()["static"]('astroDist'));
    expressApp.listen(8080, () => {
        console.log("Express server listening on port 8080");
    });

    (0,_lib_applicationMenu_js__WEBPACK_IMPORTED_MODULE_4__.initApplicationMenu)(mainWindow);

    mainWindow.loadURL('http://localhost:8080/index.html');

    tray = new electron__WEBPACK_IMPORTED_MODULE_3__.Tray(path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, "img", "tray.png"));
    const contextMenu = electron__WEBPACK_IMPORTED_MODULE_3__.Menu.buildFromTemplate([
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
                electron__WEBPACK_IMPORTED_MODULE_3__.app.quit();
            },
        },
    ]);

    tray.setToolTip("Bitshares Astro UI");

    tray.on("right-click", (event, bounds) => {
        tray?.popUpContextMenu(contextMenu);
    });

    electron__WEBPACK_IMPORTED_MODULE_3__.ipcMain.handle("fetchTopMarkets", async (event, arg) => {
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

    electron__WEBPACK_IMPORTED_MODULE_3__.ipcMain.handle("fetchAccountHistory", async (event, arg) => {
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

    electron__WEBPACK_IMPORTED_MODULE_3__.ipcMain.handle("generateDeepLink", async (event, arg) => {
        const { usrChain, operationName, trxJSON } = arg;

        let deeplink;
        try {
            deeplink = await (0,_lib_deeplink_js__WEBPACK_IMPORTED_MODULE_5__.generateDeepLink)(usrChain, operationName, trxJSON);
        } catch (error) {
            console.log({ error });
        }

        return deeplink ?? null;
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

electron__WEBPACK_IMPORTED_MODULE_3__.app.disableHardwareAcceleration();

const currentOS = os__WEBPACK_IMPORTED_MODULE_1___default().platform();
if (currentOS === "win32" || currentOS === "linux") {
    // windows + linux setup phase
    const gotTheLock = electron__WEBPACK_IMPORTED_MODULE_3__.app.requestSingleInstanceLock();

    if (!gotTheLock) {
        electron__WEBPACK_IMPORTED_MODULE_3__.app.quit();
    }

    electron__WEBPACK_IMPORTED_MODULE_3__.app.whenReady().then(() => {
        createWindow();
    });
} else {
    electron__WEBPACK_IMPORTED_MODULE_3__.app.whenReady().then(() => {
        createWindow();
    });

    electron__WEBPACK_IMPORTED_MODULE_3__.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron__WEBPACK_IMPORTED_MODULE_3__.app.quit();
        }
    });

    electron__WEBPACK_IMPORTED_MODULE_3__.app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}

/******/ })()
;
//# sourceMappingURL=background.js.map