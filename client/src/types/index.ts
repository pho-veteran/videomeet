export interface User {
  socketId: string;
  nickname: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isHandRaised: boolean;
  isScreenSharing?: boolean;
  joinedAt: Date;
}

export interface Room {
  id: string;
  hostId: string;
  participants: User[];
  createdAt: Date;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  socketId: string;
  nickname: string;
  message: string;
  file?: ChatFile | null;
  timestamp: Date;
}

export interface ChatFile {
  id: string;
  url: string; // server-relative URL like /uploads/filename.ext
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface MediaStream {
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

// SimplePeer types
export interface SimplePeerSignal {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export interface SimplePeerInstance {
  signal: (data: SimplePeerSignal) => void;
  send: (data: string | ArrayBuffer) => void;
  destroy: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
  connected: boolean;
}

export interface WebRTCConnection {
  peer: SimplePeerInstance;
  stream: MediaStream | null;
  isConnected: boolean;
}

// WebRTC Signal Data Types
export interface WebRTCOfferData {
  roomId: string;
  offer: SimplePeerSignal;
  to: string;
}

export interface WebRTCAnswerData {
  roomId: string;
  answer: SimplePeerSignal;
  to: string;
}

export interface WebRTCCandidateData {
  roomId: string;
  candidate: SimplePeerSignal;
  to: string;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; nickname: string }) => void;
  'offer': (data: WebRTCOfferData) => void;
  'answer': (data: WebRTCAnswerData) => void;
  'screen-share-offer': (data: WebRTCOfferData) => void;
  'screen-share-answer': (data: WebRTCAnswerData) => void;
  'screen-share-start': (data: { roomId: string; userId: string; userName: string }) => void;
  'screen-share-stop': (data: { roomId: string; userId: string }) => void;
  'chat-message': (data: { message: string; file?: ChatFile | null }) => void;
  'toggle-mute': (data: { isMuted: boolean }) => void;
  'toggle-raise-hand': (data: { isHandRaised: boolean }) => void;
}

export interface ServerToClientEvents {
  'room-joined': (data: { roomId: string; participants: User[]; isHost: boolean }) => void;
  'user-joined': (data: User) => void;
  'user-left': (data: { socketId: string; nickname: string }) => void;
  'offer': (data: { offer: SimplePeerSignal; from: string }) => void;
  'answer': (data: { answer: SimplePeerSignal; from: string }) => void;
  'screen-share-offer': (data: { offer: SimplePeerSignal; from: string }) => void;
  'screen-share-answer': (data: { answer: SimplePeerSignal; from: string }) => void;
  'screen-share-start': (data: { userId: string; userName: string }) => void;
  'screen-share-stop': (data: { userId: string }) => void;
  'chat-message': (data: ChatMessage) => void;
  'user-mute-changed': (data: { socketId: string; isMuted: boolean }) => void;
  'user-hand-raised': (data: { socketId: string; isHandRaised: boolean; nickname: string }) => void;
  'error': (data: { message: string }) => void;
}

export interface AppState {
  currentRoom: Room | null;
  currentUser: User | null;
  isConnected: boolean;
  isHost: boolean;
  participants: User[];
  messages: ChatMessage[];
  isChatOpen: boolean;
}

