// Faithful port of bitsharesjs-ws `src/ChainWebSocket.js`.
//
// Deviations from the literal reference, all behavior-preserving:
//  - TypeScript types + camelCase private fields.
//  - `onClose`/`on_reconnect` are assigned by ApiInstances (as in the
//    reference) and invoked here on the matching lifecycle events.

const SOCKET_DEBUG = false;
const MAX_SEND_LIFE = 5;
const MAX_RECV_LIFE = MAX_SEND_LIFE * 2;

class ChainWebSocket {
  public url: string;
  public statusCb: any = null;
  public on_reconnect: any = null;
  public on_close: any = null;
  public keepAliveCb: any = null;

  private current_reject: ((reason?: any) => void) | null = null;
  private current_resolve: (() => void) | null = null;
  private closed = false;
  private send_life = MAX_SEND_LIFE;
  private recv_life = MAX_RECV_LIFE;
  private connectionTimeout: any = null;
  private keepalive_timer: any = null;

  private cbId = 0;
  private responseCbId = 0;
  private cbs: {
    [key: number]: { time?: any; resolve?: (v?: any) => void; reject?: (r?: any) => void };
  } = {};
  private subs: { [key: number]: { callback: any } } = {};
  private unsub: { [key: number]: number } = {};

  public ws: WebSocket | null = null;
  public connect_promise: Promise<void>;

  constructor(
    ws_server: string,
    statusCb: any = null,
    connectTimeout: number = 5000,
    autoReconnect: boolean = true,
    keepAliveCb: any = null
  ) {
    this.url = ws_server;
    this.statusCb = statusCb;
    this.keepAliveCb = keepAliveCb;

    this.connect_promise = this.connect(ws_server, connectTimeout);
  }

  private connect = (server: string, connectTimeout: number): Promise<void> =>
    new Promise((resolve, reject) => {
      this.current_reject = reject;
      this.current_resolve = resolve;

      try {
        this.ws = new WebSocket(server);
      } catch (error) {
        this.ws = { readyState: 3, close: () => {} } as any; // DISCONNECTED
        reject(new Error("Invalid url " + server + " closed"));
        return;
      }

      (this.ws as any).onopen = this.onOpen;
      (this.ws as any).onerror = this.onError;
      (this.ws as any).onmessage = this.onMessage;
      (this.ws as any).onclose = this.onClose;

      this.connectionTimeout = setTimeout(() => {
        if (this.current_reject) {
          this.current_reject = null;
          this.close();
          reject(
            new Error(
              "Connection attempt timed out after " + connectTimeout / 1000 + "s"
            )
          );
        }
      }, connectTimeout);
    });

  private onOpen = () => {
    clearTimeout(this.connectionTimeout);
    if (this.statusCb) this.statusCb("open");
    if (this.on_reconnect) this.on_reconnect();
    this.keepalive_timer = setInterval(() => {
      this.recv_life--;
      if (this.recv_life === 0) {
        console.error(this.url + " connection is dead, terminating ws");
        this.close();
        return;
      }
      this.send_life--;
      if (this.send_life === 0) {
        if (this.keepAliveCb) {
          this.keepAliveCb(this.closed);
        }
        this.send_life = MAX_SEND_LIFE;
      }
    }, 5000);
    this.current_reject = null;
    this.current_resolve && this.current_resolve();
  };

  private onError = (error: any) => {
    if (this.keepalive_timer) {
      clearInterval(this.keepalive_timer);
      this.keepalive_timer = undefined;
    }
    clearTimeout(this.connectionTimeout);
    if (this.statusCb) this.statusCb("error");

    if (this.current_reject) {
      this.current_reject(error);
    }
  };

  private onMessage = (message: any) => {
    this.recv_life = MAX_RECV_LIFE;
    this.listener(JSON.parse(message.data));
  };

  private onClose = () => {
    this.closed = true;
    if (this.keepalive_timer) {
      clearInterval(this.keepalive_timer);
      this.keepalive_timer = undefined;
    }

    // Reject every in-flight call so pending requests surface a clear error
    // instead of hanging or resolving with `undefined`.
    for (let cbId = this.responseCbId + 1; cbId <= this.cbId; cbId += 1) {
      const cb = this.cbs[cbId];
      if (cb && cb.reject) {
        cb.reject(new Error("connection closed"));
      }
    }

    if (this.statusCb) this.statusCb("closed");
    if (this._closeCb) {
      this._closeCb();
      this._closeCb = null;
    }
    if (this.on_close) this.on_close();
  };

  public call = (params: any[]): Promise<any> => {
    if (!this.ws) {
      return Promise.reject(new Error("websocket is not connected"));
    }
    if ((this.ws as any).readyState !== 1) {
      return Promise.reject(
        new Error("websocket state error:" + (this.ws as any).readyState)
      );
    }
    const method = params[1];
    if (SOCKET_DEBUG)
      console.log(
        '[ChainWebSocket] >---- call ----->  "id":' + (this.cbId + 1),
        JSON.stringify(params)
      );

    this.cbId += 1;

    if (
      [
        "set_subscribe_callback",
        "subscribe_to_market",
        "broadcast_transaction_with_callback",
        "set_pending_transaction_callback",
        "set_block_applied_callback",
      ].includes(method)
    ) {
      this.subs[this.cbId] = {
        callback: params[2][0],
      };
      params[2][0] = this.cbId;
    }

    if (
      ["unsubscribe_from_market", "unsubscribe_from_accounts"].includes(method)
    ) {
      if (typeof params[2][0] !== "function") {
        throw new Error(
          "First parameter of unsub must be the original callback"
        );
      }

      const unSubCb = params[2].splice(0, 1)[0];

      for (const id in this.subs) {
        if (this.subs[id].callback === unSubCb) {
          this.unsub[this.cbId] = parseInt(id, 10);
          break;
        }
      }
    }

    const request: any = {
      method: "call",
      params: params,
    };
    request.id = this.cbId;
    this.send_life = MAX_SEND_LIFE;

    return new Promise((resolve, reject) => {
      this.cbs[this.cbId] = {
        time: new Date(),
        resolve: resolve,
        reject: reject,
      };
      (this.ws as any).send(JSON.stringify(request));
    });
  };

  private listener = (response: any) => {
    if (SOCKET_DEBUG)
      console.log(
        "[ChainWebSocket] <---- reply ----<",
        JSON.stringify(response)
      );

    let sub = false;
    let callback: any = null;

    if (response.method === "notice") {
      sub = true;
      response.id = response.params[0];
    }

    if (!sub) {
      callback = this.cbs[response.id];
      this.responseCbId = response.id;
    } else {
      callback = this.subs[response.id].callback;
    }

    if (callback && !sub) {
      if (response.error) {
        callback.reject(response.error);
      } else {
        callback.resolve(response.result);
      }
      delete this.cbs[response.id];

      if (this.unsub[response.id]) {
        delete this.subs[this.unsub[response.id]];
        delete this.unsub[response.id];
      }
    } else if (callback && sub) {
      callback(response.params[1]);
    } else {
      console.log("Warning: unknown websocket response: ", response);
    }
  };

  public login = (user: string, password: string): Promise<any> =>
    this.connect_promise.then(() => this.call([1, "login", [user, password]]));

  private _closeCb: any = null;

  public close = (): Promise<void> =>
    new Promise<void>((res) => {
      if (this.keepalive_timer) {
        clearInterval(this.keepalive_timer);
        this.keepalive_timer = undefined;
      }

      this._closeCb = () => {
        res();
        this._closeCb = null;
      };

      if (!this.ws) {
        console.log("Websocket already cleared", this);
        return res();
      }

      if ((this.ws as any).terminate) {
        (this.ws as any).terminate();
      } else {
        (this.ws as any).close();
      }

      if ((this.ws as any).readyState === 3) res();
    });
}

export default ChainWebSocket;
