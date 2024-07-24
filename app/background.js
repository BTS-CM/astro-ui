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

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

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
/* harmony import */ var url__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! url */ "url");
/* harmony import */ var url__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(url__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! os */ "os");
/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(os__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _lib_applicationMenu_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/applicationMenu.js */ "./src/lib/applicationMenu.js");









let mainWindow;
let tray = null;

/*
 * Creating the primary window, only runs once.
 */
const createWindow = async () => {
    const { screen } = __webpack_require__(/*! electron */ "electron");
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new electron__WEBPACK_IMPORTED_MODULE_4__.BrowserWindow({
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
            preload: path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, "preload.js"),
        },
        icon: __dirname + "/img/beet-taskbar.png",
    });
    
    const app = express__WEBPACK_IMPORTED_MODULE_3___default()();
    app.use(express__WEBPACK_IMPORTED_MODULE_3___default()["static"]('astroDist'));
    app.listen(8080);

    (0,_lib_applicationMenu_js__WEBPACK_IMPORTED_MODULE_5__.initApplicationMenu)(mainWindow);

    mainWindow.loadURL('http://localhost:8080/index.html');

    tray = new electron__WEBPACK_IMPORTED_MODULE_4__.Tray(__dirname + "/img/beet-tray.png");
    const contextMenu = electron__WEBPACK_IMPORTED_MODULE_4__.Menu.buildFromTemplate([
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
    electron__WEBPACK_IMPORTED_MODULE_4__.ipcMain.on("openURL", (event, arg) => {
        try {
            const parsedUrl = new (url__WEBPACK_IMPORTED_MODULE_1___default().URL)(arg);
            const domain = parsedUrl.hostname;
            if (safeDomains.includes(domain)) {
                electron__WEBPACK_IMPORTED_MODULE_4__.shell.openExternal(arg);
            } else {
                console.error(
                    `Rejected opening URL with unsafe domain: ${domain}`
                );
            }
        } catch (err) {
            console.error(`Failed to open URL: ${err.message}`);
        }
    });

    electron__WEBPACK_IMPORTED_MODULE_4__.ipcMain.on("notify", (event, arg) => {
        const NOTIFICATION_TITLE = "Beet wallet notification";
        const NOTIFICATION_BODY =
            arg == "request" ? "Beet has received a new request." : arg;

        if ((os__WEBPACK_IMPORTED_MODULE_2___default().platform) === "win32") {
            app.setAppUserModelId(app.name);
        }

        function showNotification() {
            new electron__WEBPACK_IMPORTED_MODULE_4__.Notification({
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

electron__WEBPACK_IMPORTED_MODULE_4__.app.disableHardwareAcceleration();

let currentOS = os__WEBPACK_IMPORTED_MODULE_2___default().platform();
if (currentOS === "win32" || currentOS === "linux") {
    // windows + linux setup phase
    const gotTheLock = electron__WEBPACK_IMPORTED_MODULE_4__.app.requestSingleInstanceLock();

    if (!gotTheLock) {
        electron__WEBPACK_IMPORTED_MODULE_4__.app.quit();
    }

    electron__WEBPACK_IMPORTED_MODULE_4__.app.whenReady().then(() => {
        createWindow();
    });
} else {
    electron__WEBPACK_IMPORTED_MODULE_4__.app.whenReady().then(() => {
        createWindow();
    });

    electron__WEBPACK_IMPORTED_MODULE_4__.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron__WEBPACK_IMPORTED_MODULE_4__.app.quit();
        }
    });

    electron__WEBPACK_IMPORTED_MODULE_4__.app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}

/******/ })()
;
//# sourceMappingURL=background.js.map