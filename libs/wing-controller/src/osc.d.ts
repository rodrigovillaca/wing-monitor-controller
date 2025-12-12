declare module 'osc' {
  export class UDPPort {
    constructor(options: any);
    on(event: string, callback: (msg: any) => void): void;
    open(): void;
    send(msg: any): void;
    close(): void;
  }
}
