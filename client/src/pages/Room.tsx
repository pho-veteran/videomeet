import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Crown, MessageCircle, AlertCircle, RefreshCw, Mic } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/video/VideoGrid';
import VideoControls from '../components/video/VideoControls';
import ChatPanel from '../components/chat/ChatPanel';
import type { User, ChatMessage } from '../types';
import toast from 'react-hot-toast';

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [participants, setParticipants] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const hasShownJoinToastRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const nickname = searchParams.get('nickname');

  // Initialize WebRTC
  const { 
    localStream, 
    remoteStreams, 
    isLoading: webrtcLoading, 
    error: webrtcError,
    initializeLocalStream,
    initializeAudioOnlyStream,
    toggleMute
  } = useWebRTC({ roomId: roomId || '', currentUser, participants });

  // Initialize room and media
  useEffect(() => {
    if (!nickname || !roomId) {
      return;
    }

    // Reset initialization flag when socket disconnects
    if (!isConnected) {
      hasInitializedRef.current = false;
      hasShownJoinToastRef.current = false;
      return;
    }

    // Only initialize if not already initialized and socket is connected
    if (hasInitializedRef.current || !socket) {
      return;
    }

    hasInitializedRef.current = true;

    // Initialize local stream first
    initializeLocalStream();

    // Join room
    socket.emit('join-room', { roomId, nickname });
  }, [nickname, roomId, socket, isConnected, navigate, initializeLocalStream]);

  // Set up event listeners - separate effect
  useEffect(() => {
    if (!socket) return;

    // Set up event listeners
    const handleRoomJoined = (data: { participants: User[]; isHost: boolean }) => {
      setParticipants(data.participants);
      setIsHost(data.isHost);
      setCurrentUser({
        socketId: socket.id || '',
        nickname: nickname || '',
        isMuted: false,
        isVideoEnabled: true,
        joinedAt: new Date()
      });
      
      // Only show toast once
      if (!hasShownJoinToastRef.current) {
        toast.success(`Joined room ${roomId}`);
        hasShownJoinToastRef.current = true;
      }
    };

    const handleUserJoined = (user: User) => {
      setParticipants(prev => {
        // Check if user already exists to prevent duplicates
        const exists = prev.some(p => p.socketId === user.socketId);
        if (exists) {
          console.warn('User already exists, not adding duplicate:', user.socketId);
          return prev;
        }
        return [...prev, user];
      });
      toast.success(`${user.nickname} joined the room`);
    };

    const handleUserLeft = (data: { socketId: string; nickname: string }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      toast(`${data.nickname} left the room`);
    };

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleUserMuteChanged = (data: { socketId: string; isMuted: boolean }) => {
      setParticipants(prev => 
        prev.map(p => 
          p.socketId === data.socketId 
            ? { ...p, isMuted: data.isMuted }
            : p
        )
      );
    };

    const handleUserVideoChanged = (data: { socketId: string; isVideoEnabled: boolean }) => {
      setParticipants(prev => 
        prev.map(p => 
          p.socketId === data.socketId 
            ? { ...p, isVideoEnabled: data.isVideoEnabled }
            : p
        )
      );
    };


    const handleAudioLevel = (data: { socketId: string; level: number }) => {
      if (data.level > 0.1) {
        setActiveSpeaker(data.socketId);
      } else if (activeSpeaker === data.socketId) {
        setActiveSpeaker(null);
      }
    };

    const handleError = (data: { message: string }) => {
      toast.error(data.message);
      if (data.message.includes('Room not found') || data.message.includes('Room is full')) {
        navigate('/');
      }
    };

    // Add event listeners
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('chat-message', handleChatMessage);
    socket.on('user-mute-changed', handleUserMuteChanged);
    socket.on('user-video-changed', handleUserVideoChanged);
    socket.on('audio-level', handleAudioLevel);
    socket.on('error', handleError);

    // Cleanup
    return () => {
      if (socket) {
        socket.off('room-joined', handleRoomJoined);
        socket.off('user-joined', handleUserJoined);
        socket.off('user-left', handleUserLeft);
        socket.off('chat-message', handleChatMessage);
        socket.off('user-mute-changed', handleUserMuteChanged);
        socket.off('user-video-changed', handleUserVideoChanged);
        socket.off('audio-level', handleAudioLevel);
        socket.off('error', handleError);
      }
    };
  }, [socket, roomId, nickname, navigate, activeSpeaker]);

  const handleLeaveRoom = () => {
    // Reset flags when manually leaving
    hasInitializedRef.current = false;
    hasShownJoinToastRef.current = false;
    
    if (socket) {
      socket.disconnect();
    }
    navigate('/');
  };

  if (!nickname || !roomId) {
    return null;
  }

  if (webrtcLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <RefreshCw className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Initializing Meeting</h2>
          <p className="text-gray-300">Setting up your camera and microphone...</p>
        </div>
      </div>
    );
  }

  if (webrtcError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Media Access Issue</h2>
          <p className="text-gray-300 mb-6">{webrtcError}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => initializeLocalStream()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            
            <button
              onClick={async () => {
                try {
                  await initializeAudioOnlyStream();
                  toast.success('Joined with audio only');
                } catch {
                  toast.error('Failed to access microphone');
                }
              }}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
            >
              <Mic className="w-4 h-4" />
              <span>Join Audio Only</span>
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white font-semibold text-lg">Room: {roomId}</h1>
          </div>
          <div className="flex items-center space-x-2 bg-gray-700/50 rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isHost && (
            <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              <span className="text-xs font-medium">Host</span>
            </div>
          )}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isChatOpen 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Video Grid */}
        <div className={`flex-1 transition-all duration-300 ${isChatOpen ? 'mr-0 sm:mr-80' : ''} overflow-hidden`}>
          <VideoGrid 
            participants={participants}
            currentUser={currentUser}
            activeSpeaker={activeSpeaker}
            localStream={localStream}
            remoteStreams={remoteStreams}
          />
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-10 shadow-xl">
            <ChatPanel 
              messages={messages}
              participants={participants}
              onSendMessage={(message) => {
                if (socket) {
                  socket.emit('chat-message', { message });
                }
              }}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Video Controls */}
        <VideoControls 
          onLeave={handleLeaveRoom}
          onToggleMute={(isMuted) => {
            toggleMute(isMuted);
            if (socket) {
              socket.emit('toggle-mute', { isMuted });
            }
          }}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isChatOpen={isChatOpen}
          currentUser={currentUser}
        />
    </div>
  );
};

export default Room;