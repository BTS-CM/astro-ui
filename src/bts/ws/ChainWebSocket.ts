import WebSocket from "isomorphic-ws";

class ChainWebSocket {
  private messageQueue: any[] = [];

  public ws: WebSocket | null = null;
  private url: string;
  private connectTimeout: number;
  private current_reject: ((reason?: any) => void) | null;
  private current_resolve: (() => void) | null = null;
  private callbacks: {
    [key: number]:
      | ((data: any) => void)
      | { resolve?: (value?: any) => void; reject?: (reason?: any) => void };
  } = {};
  private cbId: number = 0;

  constructor(ws_server: string, connectTimeout: number = 4000) {
    this.url = ws_server;
    this.connectTimeout = connectTimeout;
    this.current_reject = null;
    this.connect(ws_server);
  }

  private connect = (server: string): Promise<void> =>
    new Promise((resolve, reject) => {
      this.current_reject = reject;
      this.current_resolve = resolve;

      const timeoutId = setTimeout(() => {
        this.messageQueue = [];
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        reject(`Connection to ${server} timed out after ${this.connectTimeout} ms`);
      }, this.connectTimeout);

      try {
        this.ws = new WebSocket(server);
        this.ws.addEventListener("open", () => {
          clearTimeout(timeoutId);
          this.onOpen();
        });
        this.ws.addEventListener("error", (event: any) => {
          clearTimeout(timeoutId);
          this.onError(event);
        });
        this.ws.addEventListener("message", (event: any) => this.onMessage(event));
        this.ws.addEventListener("close", () => this.onClose());
      } catch (error) {
        clearTimeout(timeoutId);
        this.ws = null;
        reject(`Failed to connect to ${server}`);
      }
    });

  private onOpen = () => {
    if (this.current_resolve) {
      this.current_resolve();
    }
    this.sendQueuedMessages();
  };

  private onError = (error: Error) => {
    if (this.current_reject) {
      this.current_reject(error);
    }
  };

  private onMessage = (message: MessageEvent) => {
    this.listener(JSON.parse(message.data));
  };

  private onClose = () => {
    console.log("ChainWebSocket connection closed");
    this.ws = null;
  };

  private sendQueuedMessages = () => {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.ws) {
        this.ws.send(message);
      }
    }
  };

  public call = (params: any[]): Promise<any> => {
    this.cbId += 1;
    return new Promise((resolve, reject) => {
      this.callbacks[this.cbId] = { resolve, reject };
      const message = JSON.stringify({ method: "call", params: params, id: this.cbId });
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(message);
      } else {
        this.messageQueue.push(message);
      }
    });
  };

  private listener = (response: any) => {
    const callbackObj = this.callbacks[response.id];
    if (callbackObj && "reject" in callbackObj && "resolve" in callbackObj) {
      if (response.error) {
        callbackObj.reject?.(response.error);
      } else {
        callbackObj.resolve?.(response.result);
      }
      delete this.callbacks[response.id];
    }
  };

  public close = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        return resolve();
      }

      try {
        this.ws.close();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
}

export default ChainWebSocket;
