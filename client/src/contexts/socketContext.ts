import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);


