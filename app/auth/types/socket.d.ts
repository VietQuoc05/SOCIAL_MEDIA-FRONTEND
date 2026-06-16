declare module "socket.io-client" {
  export interface Socket {
    on(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback?: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    connect(): this;
    disconnect(): this;
    connected: boolean;
    id: string;
  }

  export function io(url: string, options?: { transports?: string[]; reconnection?: boolean }): Socket;
  export default io;
}
