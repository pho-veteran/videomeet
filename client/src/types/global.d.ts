import type { SimplePeerInstance } from './index';

declare global {
  interface Window {
    SimplePeer: {
      new (options: {
        initiator: boolean;
        trickle: boolean;
        stream?: MediaStream | null;
      }): SimplePeerInstance;
    };
  }
}

export {};

