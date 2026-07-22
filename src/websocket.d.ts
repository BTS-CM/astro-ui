// Node.js 22+ exposes WebSocket as a global (via Undici).
// Declare it here so TypeScript recognises the ambient global in the
// electron-main process where @types/node may not provide it.
declare class WebSocket extends EventTarget {
  constructor(url: string, protocols?: string | string[]);

  readonly readyState: number;
  readonly OPEN: 0;
  readonly CLOSING: 1;
  readonly CONNECTING: 2;
  readonly CLOSED: 3;

  binaryType: string;
  bufferedAmount: number;
  extensions: string;
  protocol: string;
  url: string;

  onopen: ((this: WebSocket, ev: Event) => void) | null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null;
  onerror: ((this: WebSocket, ev: Event) => void) | null;

  close(code?: number, reason?: string): void;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
}
