import ChainWebSocket from "./ChainWebSocket";
import GrapheneApi from "./GrapheneApi";
import ChainConfig from "./ChainConfig";

type OptionalApis = {
  enableDatabase?: boolean;
  enableHistory?: boolean;
  enableNetworkBroadcast?: boolean;
  enableCrypto?: boolean;
  enableOrders?: boolean;
};

type CallbackStatus = (status: string) => void;

type ApiName = "_db" | "_hist" | "_net" | "_orders" | "_crypt";

type ApiObject = {
  url?: string;
  ws_rpc?: ChainWebSocket;
  _db?: GrapheneApi;
  _hist?: GrapheneApi;
  _net?: GrapheneApi;
  _orders?: GrapheneApi;
  _crypt?: GrapheneApi;
  init_promise?: Promise<any>;
  chain_id?: string;
  closeCb?: any;
  [key: string]: any;
};

type ApiInstance = {
  connect: (wssURL: string, connectTimeout: number, optionalApis: OptionalApis) => Promise<void>;
  init: () => Promise<void>;
  close: () => Promise<void>;
  db_api: () => GrapheneApi;
  network_api: () => GrapheneApi;
  history_api: () => GrapheneApi;
  crypto_api: () => GrapheneApi;
  orders_api: () => GrapheneApi;
  get: (name: string) => any;
  setRpcConnectionStatusCallback: (callback: CallbackStatus) => void;
  setAutoReconnect: (auto: boolean) => void;
  closeCb?: () => void;
  chainId: () => string | Error;
};

/**
 * Template for initializing a new API instance
 */
const newApis = (): ApiInstance => {
  let Api: ApiObject = {};
  let autoReconnect = false;
  let callbackStatus: CallbackStatus | null = null;
  let currentOptionalApis: OptionalApis = {
    enableDatabase: false,
    enableHistory: false,
    enableNetworkBroadcast: false,
    enableCrypto: false,
    enableOrders: false,
  };

  const getApi = (apiName: ApiName) => {
    if (!Api || !Api.ws_rpc) {
      throw new Error("Api not initialized");
    }
    if (Api[apiName]) {
      return Api[apiName];
    } else {
      throw new Error(`${apiName} API disabled by instance config`);
    }
  };

  const close = async () => {
    if (Api && Api.ws_rpc && Api.ws_rpc.ws && Api.ws_rpc.ws.readyState === 1) {
      await Api.ws_rpc.close();
    }
    Api = {};
    autoReconnect = false;
    callbackStatus = null;
  };

  const connect = (wssURL: string, connectTimeout: number, optionalApis: OptionalApis) => {
    return new Promise<void>((resolve, reject) => {
      if (!wssURL || !wssURL.length) {
        reject(new Error("Websocket URL not set"));
      }

      const hasOptApis = optionalApis ? Object.keys(optionalApis).length > 0 : false;
      const hasTrueApis = hasOptApis
        ? Object.values(optionalApis).some((val) => val === true)
        : false;

      if (!hasTrueApis) {
        // At least one optional Api is required
        reject(new Error("Please configure at least one API"));
      }

      currentOptionalApis = optionalApis;

      Api.url = wssURL;
      Api.ws_rpc = new ChainWebSocket(wssURL);

      if (Api.ws_rpc) {
        resolve();
      }
    });
  };

  const initApi = (apiName: string, url: string) => {
    console.log(`Enabled ${apiName} api`);
    try {
      Api[apiName] = new GrapheneApi(Api.ws_rpc, url);
    } catch (e) {
      console.log({ e });
    }
    if (Api[apiName]) {
      return Api[apiName].init();
    }
  };

  const init = () => {
    return new Promise<void>((resolve, reject) => {
      if (Api.ws_rpc) {
        const initPromises = [];
        if (currentOptionalApis.enableDatabase) {
          const db_promise = initApi("_db", "database").then(() => {
            if (!Api._db) {
              throw new Error("Api._db is not initialized");
            }
            return Api._db.exec("get_chain_id", []).then((_chain_id: string) => {
              Api.chain_id = _chain_id;
              return ChainConfig.setChainId(_chain_id);
            });
          });
          initPromises.push(db_promise);
        }

        if (currentOptionalApis.enableHistory) {
          initPromises.push(initApi("_hist", "history"));
        }

        if (currentOptionalApis.enableNetworkBroadcast) {
          initPromises.push(initApi("_net", "network_broadcast"));
        }

        if (currentOptionalApis.enableOrders) {
          initPromises.push(initApi("_orders", "orders"));
        }

        if (currentOptionalApis.enableCrypto) {
          initPromises.push(initApi("_crypt", "crypto"));
        }

        Promise.all(initPromises)
          .then(() => {
            //console.log({Api})
            resolve();
          })
          .catch((err: Error) => {
            console.log({
              msg: "Failed to initialize with error",
              err,
            });
            if (Api) {
              close();
              Api = {};
            }
            reject(err);
          });
      }
    });
  };

  const db_api = () => {
    const api = getApi("_db");
    if (!api) {
      throw new Error("DB API is undefined");
    }
    return api;
  };

  const history_api = () => {
    const api = getApi("_hist");
    if (!api) {
      throw new Error("History API is undefined");
    }
    return api;
  };

  const network_api = () => {
    const api = getApi("_net");
    if (!api) {
      throw new Error("Network API is undefined");
    }
    return api;
  };

  const crypto_api = () => {
    const api = getApi("_crypt");
    if (!api) {
      throw new Error("Crypto API is undefined");
    }
    return api;
  };

  const orders_api = () => {
    const api = getApi("_orders");
    if (!api) {
      throw new Error("Orders API is undefined");
    }
    return api;
  };

  const get = (name: string) =>
    new Proxy([], {
      get:
        (_, method) =>
        (...args: any) =>
          Api[name].exec(method, [...args]),
    });

  const setRpcConnectionStatusCallback = (callback: CallbackStatus) => (callbackStatus = callback);

  const setAutoReconnect = (auto: boolean) => {
    autoReconnect = auto;
  };

  const chainId = () => {
    if (Api) {
      if (Api.chain_id) {
        return Api.chain_id;
      } else {
        throw new Error("Chain ID not found");
      }
    } else {
      throw new Error("Api not initialized");
    }
  };

  return {
    connect,
    init,
    close,
    db_api,
    network_api,
    history_api,
    crypto_api,
    orders_api,
    get,
    setRpcConnectionStatusCallback,
    setAutoReconnect,
    chainId,
  };
};

const instance = (
  wssURL: string = "ws://localhost:8090",
  connect: boolean,
  connectTimeout: number = 4000,
  optionalApis: OptionalApis = {
    enableDatabase: false,
    enableHistory: false,
    enableNetworkBroadcast: false,
    enableCrypto: false,
    enableOrders: false,
  },
  closeCb?: any
): Promise<ApiInstance> => {
  const Api = newApis();
  if (!Api || !connect) {
    // connect kind of pointless
    throw new Error("Api failed to initialize");
  }

  if (closeCb) {
    Api.closeCb = closeCb;
  }

  return Api.connect(wssURL, connectTimeout, optionalApis).then(() => {
    return Api.init().then(() => {
      console.log("connection initialized");
      return Api;
    });
  });
};

const Apis = {
  instance,
};

export default Apis;
