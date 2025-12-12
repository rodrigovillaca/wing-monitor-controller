declare module 'osc' {
  export class UDPPort {
    constructor(options: {
      localAddress?: string;
      localPort?: number;
      remoteAddress?: string;
      remotePort?: number;
      metadata?: boolean;
    });
    
    open(): void;
    close(): void;
    send(packet: any): void;
    
    on(event: string, callback: (msg: any) => void): void;
  }
}
