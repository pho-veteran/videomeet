import { useContext } from 'react';
import { SocketContext, type SocketContextType } from './socketContext';

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};


