import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Crown, MessageCircle, AlertCircle, RefreshCw, Mic, Hand } from 'lucide-react';
import { useSocket } from '../contexts/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/video/VideoGrid';
import VideoControls from '../components/video/VideoControls';
import ChatPanel from '../components/chat/ChatPanel';
import ParticipantsList from '../components/participants/ParticipantsList';
import type { User, ChatMessage, ChatFile } from '../types';
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
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const hasShownJoinToastRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const previousScreenSharerRef = useRef<string | null>(null);

  const nickname = searchParams.get('nickname');

  // Initialize WebRTC
  const { 
    localStream, 
    remoteStreams, 
    screenShareStream,
    remoteScreenShares,
    currentScreenSharer,
    isLoading: webrtcLoading, 
    error: webrtcError,
    initializeLocalStream,
    initializeAudioOnlyStream,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useWebRTC({ roomId: roomId || '', currentUser, participants });


  // Handle video toggle
  const handleToggleVideo = (enabled: boolean) => {
    setIsVideoEnabled(enabled);
    toggleVideo(enabled);
    
    // Update current user state
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, isVideoEnabled: enabled } : null);
    }
  };

  // Handle screen share start
  const handleStartScreenShare = async () => {
    try {
      await startScreenShare();
      // Update current user state
      if (currentUser) {
        setCurrentUser(prev => prev ? { ...prev, isScreenSharing: true } : null);
      }
      toast.success('Screen sharing started');
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      toast.error('Failed to start screen sharing');
    }
  };

  // Handle screen share stop
  const handleStopScreenShare = () => {
    stopScreenShare();
    // Update current user state
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, isScreenSharing: false } : null);
    }
    toast.success('Screen sharing stopped');
  };

  // Track screen sharer changes and show notifications
  useEffect(() => {
    const previousSharer = previousScreenSharerRef.current;
    const currentSharer = currentScreenSharer;
    
    if (previousSharer !== currentSharer) {
      if (currentSharer === null && previousSharer !== null) {
        // Screen sharing stopped
        const previousSharerName = participants.find(p => p.socketId === previousSharer)?.nickname || 'Someone';
        toast(`${previousSharerName} stopped screen sharing`);
      } else if (currentSharer !== null && previousSharer !== currentSharer) {
        // Screen sharing started or changed
        const currentSharerName = participants.find(p => p.socketId === currentSharer)?.nickname || 'Someone';
        if (previousSharer === null) {
          toast(`${currentSharerName} started screen sharing`);
        } else {
          const previousSharerName = participants.find(p => p.socketId === previousSharer)?.nickname || 'Someone';
          toast(`${currentSharerName} replaced ${previousSharerName}'s screen share`);
        }
      }
      
      previousScreenSharerRef.current = currentSharer;
    }
  }, [currentScreenSharer, participants]);

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
      setCurrentUser(prev => ({
        socketId: socket.id || '',
        nickname: nickname || '',
        isMuted: prev?.isMuted ?? false,
        isVideoEnabled: prev?.isVideoEnabled ?? isVideoEnabled,
        isHandRaised: prev?.isHandRaised ?? false,
        joinedAt: prev?.joinedAt ?? new Date()
      }));
      
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

    const handleUserHandRaised = (data: { socketId: string; isHandRaised: boolean; nickname: string }) => {
      setParticipants(prev => 
        prev.map(p => 
          p.socketId === data.socketId 
            ? { ...p, isHandRaised: data.isHandRaised }
            : p
        )
      );
      
      // Show toast notification
      if (data.isHandRaised) {
        toast(`${data.nickname} raised their hand`, {
          icon: '✋',
          duration: 3000,
        });
      }
    };

    // Removed video-changed handler

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
    socket.on('user-hand-raised', handleUserHandRaised);
    // Removed user-video-changed subscription
    socket.on('error', handleError);

    // Cleanup
    return () => {
      if (socket) {
        socket.off('room-joined', handleRoomJoined);
        socket.off('user-joined', handleUserJoined);
        socket.off('user-left', handleUserLeft);
        socket.off('chat-message', handleChatMessage);
        socket.off('user-mute-changed', handleUserMuteChanged);
        socket.off('user-hand-raised', handleUserHandRaised);
        socket.off('error', handleError);
      }
    };
  }, [socket, roomId, nickname, navigate, isVideoEnabled]);

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
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="flex items-center space-x-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-full px-3 py-1 transition-colors cursor-pointer"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Raised Hands Indicator */}
          {participants.filter(p => p.isHandRaised).length > 0 && (
            <div className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
              <Hand className="w-3 h-3" />
              <span className="text-xs font-medium">
                {participants.filter(p => p.isHandRaised).length} hand{participants.filter(p => p.isHandRaised).length !== 1 ? 's' : ''} raised
              </span>
            </div>
          )}
          
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
        <div className={`flex-1 transition-all duration-300 ${
          isChatOpen && isParticipantsOpen 
            ? 'mr-0 sm:mr-160' 
            : isChatOpen || isParticipantsOpen 
              ? 'mr-0 sm:mr-80' 
              : ''
        } overflow-hidden`}>
          <VideoGrid 
            participants={participants}
            currentUser={currentUser}
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenShareStream={screenShareStream}
            remoteScreenShares={remoteScreenShares}
            currentScreenSharer={currentScreenSharer}
          />
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className={`absolute top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-20 shadow-xl flex flex-col ${
            isParticipantsOpen ? 'right-0 sm:right-80' : 'right-0'
          }`}>
            <ChatPanel 
              messages={messages}
              participants={participants}
              onSendMessage={(message) => {
                if (socket) {
                  socket.emit('chat-message', { message });
                }
              }}
              onSendFile={async (file: File) => {
                if (!socket || !roomId) return;
                try {
                  const startResp = await new Promise<{ ok: boolean; uploadId?: string; error?: string }>((resolve) => {
                    socket.emit('file-upload-start', {
                      roomId,
                      originalName: file.name,
                      mimeType: file.type,
                      size: file.size
                    }, (resp: { ok: boolean; uploadId?: string; error?: string }) => resolve(resp));
                  });
                  if (!startResp.ok || !startResp.uploadId) {
                    toast.error(startResp.error || 'Upload init failed');
                    return;
                  }

                  const uploadId = startResp.uploadId;
                  const chunkSize = 64 * 1024; // 64KB
                  let offset = 0;

                  while (offset < file.size) {
                    const nextOffset = Math.min(offset + chunkSize, file.size);
                    const blob = file.slice(offset, nextOffset);
                    const arrayBuffer = await blob.arrayBuffer();
                    const chunk = new Uint8Array(arrayBuffer);

                    const chunkResp = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
                      socket.emit('file-upload-chunk', { uploadId, chunk }, (resp: { ok: boolean; error?: string }) => resolve(resp));
                    });
                    if (!chunkResp.ok) {
                      toast.error(chunkResp.error || 'Chunk upload failed');
                      return;
                    }
                    offset = nextOffset;
                  }

                  const completeResp = await new Promise<{ ok: boolean; file?: ChatFile; error?: string }>((resolve) => {
                    socket.emit('file-upload-complete', { uploadId }, (resp: { ok: boolean; file?: ChatFile; error?: string }) => resolve(resp));
                  });
                  if (!completeResp.ok || !completeResp.file) {
                    toast.error(completeResp.error || 'Upload failed');
                    return;
                  }

                  socket.emit('chat-message', { message: '', file: completeResp.file });
                } catch (e) {
                  console.error(e);
                  toast.error('Upload failed');
                }
              }}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {/* Participants Panel */}
        {isParticipantsOpen && (
          <div className={`absolute top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-10 shadow-xl flex flex-col ${
            isChatOpen ? 'right-0 sm:right-80' : 'right-0'
          }`}>
            <ParticipantsList 
              participants={participants}
              currentUser={currentUser}
              isHost={isHost}
              onClose={() => setIsParticipantsOpen(false)}
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
          onToggleVideo={handleToggleVideo}
          onToggleRaiseHand={(isHandRaised) => {
            if (socket) {
              socket.emit('toggle-raise-hand', { isHandRaised });
            }
          }}
          onStartScreenShare={handleStartScreenShare}
          onStopScreenShare={handleStopScreenShare}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
          isChatOpen={isChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          currentUser={currentUser}
          currentScreenSharer={currentScreenSharer}
          participants={participants}
        />
    </div>
  );
};

export default Room;