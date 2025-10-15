import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/useSocket';
import type { User, SimplePeerInstance, SimplePeerSignal } from '../types';

interface UseWebRTCOptions {
  roomId: string;
  currentUser: User | null;
  participants: User[];
}

export const useWebRTC = ({ roomId, currentUser, participants }: UseWebRTCOptions) => {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [remoteScreenShares, setRemoteScreenShares] = useState<Map<string, MediaStream>>(new Map());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentScreenSharer, setCurrentScreenSharer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, SimplePeerInstance>>(new Map());
  const screenSharePeersRef = useRef<Map<string, SimplePeerInstance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  const stopScreenShareRef = useRef<(() => void) | null>(null);

  // Helper to enable/disable specific track types on the current local stream
  const setTracksEnabled = useCallback((kind: 'audio' | 'video', enabled: boolean) => {
    if (!localStreamRef.current) return;
    const tracks = kind === 'audio'
      ? localStreamRef.current.getAudioTracks()
      : localStreamRef.current.getVideoTracks();
    tracks.forEach(track => {
      track.enabled = enabled;
    });

    // Update state with a shallow-cloned stream to trigger re-render
    setLocalStream(prev => {
      if (!prev) return prev;
      const newStream = prev.clone();
      const newTracks = kind === 'audio' ? newStream.getAudioTracks() : newStream.getVideoTracks();
      newTracks.forEach(track => {
        track.enabled = enabled;
      });
      return newStream;
    });
  }, []);

  // Toggle video on/off
  const toggleVideo = useCallback((enabled: boolean) => {
    setTracksEnabled('video', enabled);
  }, [setTracksEnabled]);

  // Check media device permissions
  const checkPermissions = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        return { camera: 'unknown', microphone: 'unknown' };
      }

      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName })
      ]);

      return {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      };
    } catch (error) {
      console.warn('Permission check failed:', error);
      return { camera: 'unknown', microphone: 'unknown' };
    }
  }, []);

  // Initialize local media stream with timeout and retry logic
  const initializeLocalStream = useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        clearTimeout(timeoutId);
        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsLoading(false);
      } catch (mediaError) {
        clearTimeout(timeoutId);
        throw mediaError;
      }
    } catch (err: unknown) {
      console.error('Error accessing media devices:', err);

      let errorMessage = 'Failed to access camera and microphone.';
      const isTimeout = err instanceof DOMException && (err.name === 'AbortError' || err.message.includes('Timeout'))
        || (err instanceof Error && (err.name === 'AbortError' || err.message.includes('Timeout')));

      if (err instanceof DOMException) {
        if (isTimeout) {
          errorMessage = 'Camera/microphone access timed out. Please check if another application is using your camera.';
        } else if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow permissions and refresh the page.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a camera and microphone.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera settings are not supported. Trying with basic settings...';
          if (retryCount < 2) {
            setTimeout(() => initializeLocalStream(retryCount + 1), 1000);
            return;
          }
        }
      } else if (isTimeout) {
        errorMessage = 'Camera/microphone access timed out. Please check if another application is using your camera.';
      }

      if (isTimeout && retryCount < 2) {
        console.log(`Retrying media access (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => initializeLocalStream(retryCount + 1), 2000);
        return;
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  // Initialize audio-only stream as fallback
  const initializeAudioOnlyStream = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsLoading(false);
      return stream;
    } catch (err) {
      console.error('Error accessing audio only:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((socketId: string, isInitiator: boolean) => {
    if (!socket || !window.SimplePeer) return;

    const peer = new window.SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream: localStreamRef.current
    });

    const registerPeerEvents = (p: SimplePeerInstance) => {
      p.on('signal', (data: unknown) => {
        if (!socket) return;
        if (isInitiator) {
          socket.emit('offer', { roomId, offer: data as SimplePeerSignal, to: socketId });
        } else {
          socket.emit('answer', { roomId, answer: data as SimplePeerSignal, to: socketId });
        }
      });

      p.on('stream', (stream: unknown) => {
        setRemoteStreams(prev => new Map(prev.set(socketId, stream as MediaStream)));
      });

      p.on('connect', () => {
        console.log(`Connected to peer: ${socketId}`);
      });

      p.on('error', (err: unknown) => {
        console.error('Peer connection error:', err as Error);
      });

      p.on('close', () => {
        console.log(`Peer connection closed: ${socketId}`);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      });
    };

    registerPeerEvents(peer as unknown as SimplePeerInstance);

    peersRef.current.set(socketId, peer);
    return peer;
  }, [socket, roomId]);

  // Handle incoming offers
  const handleOffer = useCallback((data: { offer: SimplePeerSignal; from: string }) => {
    const peer = createPeerConnection(data.from, false);
    if (peer) {
      peer.signal(data.offer);
    }
  }, [createPeerConnection]);

  // Handle incoming answers
  const handleAnswer = useCallback((data: { answer: SimplePeerSignal; from: string }) => {
    const peer = peersRef.current.get(data.from);
    if (peer) {
      peer.signal(data.answer);
    }
  }, []);


  // Removed ICE candidate handling (trickle ICE disabled)

  // Initialize connections when participants change
  useEffect(() => {
    if (!localStream || !currentUser) return;

    participants.forEach(participant => {
      if (participant.socketId !== currentUser.socketId && !peersRef.current.has(participant.socketId)) {
        // Determine who initiates the connection (lower socket ID initiates)
        const isInitiator = currentUser.socketId < participant.socketId;
        createPeerConnection(participant.socketId, isInitiator);
      }
    });
  }, [participants, localStream, currentUser, createPeerConnection]);

  // Clean up peer connections when participants leave
  useEffect(() => {
    const currentParticipantIds = new Set(participants.map(p => p.socketId));
    
    peersRef.current.forEach((peer, socketId) => {
      if (!currentParticipantIds.has(socketId)) {
        peer.destroy();
        peersRef.current.delete(socketId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      }
    });
  }, [participants]);

  // Toggle mute
  const toggleMute = useCallback((muted: boolean) => {
    setTracksEnabled('audio', !muted);
  }, [setTracksEnabled]);

  // Create peer connection for screen sharing
  const createScreenSharePeerConnection = useCallback((socketId: string, isInitiator: boolean) => {
    if (!socket || !window.SimplePeer) return;

    // Only require screenShareStreamRef.current for the initiator (person sharing screen)
    if (isInitiator && !screenShareStreamRef.current) {
      console.log('Cannot create screen share peer connection: no screen share stream for initiator');
      return;
    }

    console.log(`Creating screen share peer connection to ${socketId}, isInitiator: ${isInitiator}`);
    const peer = new window.SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream: isInitiator ? screenShareStreamRef.current : undefined
    });

    const registerScreenSharePeerEvents = (p: SimplePeerInstance) => {
      p.on('signal', (data: unknown) => {
        if (!socket) return;
        if (isInitiator) {
          socket.emit('screen-share-offer', { roomId, offer: data as SimplePeerSignal, to: socketId });
        } else {
          socket.emit('screen-share-answer', { roomId, answer: data as SimplePeerSignal, to: socketId });
        }
      });

      p.on('stream', (stream: unknown) => {
        console.log(`Received screen share stream from ${socketId}`);
        setRemoteScreenShares(prev => new Map(prev.set(socketId, stream as MediaStream)));
      });

      p.on('connect', () => {
        console.log(`Screen share connected to peer: ${socketId}`);
      });

      p.on('error', (err: unknown) => {
        console.error('Screen share peer connection error:', err as Error);
      });

      p.on('close', () => {
        console.log(`Screen share peer connection closed: ${socketId}`);
        setRemoteScreenShares(prev => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      });
    };

    registerScreenSharePeerEvents(peer as unknown as SimplePeerInstance);
    screenSharePeersRef.current.set(socketId, peer);
    return peer;
  }, [socket, roomId]);

  // Handle incoming screen share offers
  const handleScreenShareOffer = useCallback((data: { offer: SimplePeerSignal; from: string }) => {
    const peer = createScreenSharePeerConnection(data.from, false);
    if (peer) {
      peer.signal(data.offer);
    }
  }, [createScreenSharePeerConnection]);

  // Handle incoming screen share answers
  const handleScreenShareAnswer = useCallback((data: { answer: SimplePeerSignal; from: string }) => {
    const peer = screenSharePeersRef.current.get(data.from);
    if (peer) {
      peer.signal(data.answer);
    }
  }, []);

  // Handle screen share start notification
  const handleScreenShareStart = useCallback((data: { userId: string; userName: string }) => {
    console.log(`${data.userName} started screen sharing`);
    
    // If someone else is already screen sharing, stop their screen share first
    if (currentScreenSharer && currentScreenSharer !== data.userId) {
      console.log(`Stopping previous screen share from ${currentScreenSharer}`);
      // Close existing screen share peer connections
      const existingPeer = screenSharePeersRef.current.get(currentScreenSharer);
      if (existingPeer) {
        existingPeer.destroy();
        screenSharePeersRef.current.delete(currentScreenSharer);
      }
      setRemoteScreenShares(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentScreenSharer);
        return newMap;
      });
    }
    
    // Set the new screen sharer
    setCurrentScreenSharer(data.userId);
    
    // Create peer connection to receive screen share
    if (data.userId !== currentUser?.socketId) {
      createScreenSharePeerConnection(data.userId, false);
    }
  }, [currentUser, createScreenSharePeerConnection, currentScreenSharer]);

  // Handle screen share stop notification
  const handleScreenShareStop = useCallback((data: { userId: string }) => {
    console.log('Screen sharing stopped');
    // Close peer connection and remove screen share stream
    const peer = screenSharePeersRef.current.get(data.userId);
    if (peer) {
      peer.destroy();
      screenSharePeersRef.current.delete(data.userId);
    }
    setRemoteScreenShares(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
    
    // Clear current screen sharer if it's the one stopping
    if (currentScreenSharer === data.userId) {
      setCurrentScreenSharer(null);
    }
  }, [currentScreenSharer]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported in this browser');
      }

      // If someone else is already screen sharing, stop their screen share first
      if (currentScreenSharer && currentScreenSharer !== currentUser?.socketId) {
        console.log(`Stopping existing screen share from ${currentScreenSharer} before starting new one`);
        // Close existing screen share peer connections
        const existingPeer = screenSharePeersRef.current.get(currentScreenSharer);
        if (existingPeer) {
          existingPeer.destroy();
          screenSharePeersRef.current.delete(currentScreenSharer);
        }
        setRemoteScreenShares(prev => {
          const newMap = new Map(prev);
          newMap.delete(currentScreenSharer);
          return newMap;
        });
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      setScreenShareStream(stream);
      screenShareStreamRef.current = stream;
      setIsScreenSharing(true);
      setCurrentScreenSharer(currentUser?.socketId || null);

      console.log('Screen share stream started, notifying other participants');

      // Notify other participants about screen share start
      if (socket && currentUser) {
        socket.emit('screen-share-start', {
          roomId,
          userId: currentUser.socketId,
          userName: currentUser.nickname
        });
      }

      // Handle screen share end (when user stops sharing via browser UI)
      stream.getVideoTracks()[0].onended = () => {
        if (stopScreenShareRef.current) {
          stopScreenShareRef.current();
        }
      };

      // Create new peer connections for screen sharing
      console.log(`Creating screen share peer connections for ${participants.length} participants`);
      participants.forEach(participant => {
        if (participant.socketId !== currentUser?.socketId) {
          console.log(`Creating screen share peer connection to ${participant.socketId} (${participant.nickname})`);
          createScreenSharePeerConnection(participant.socketId, true);
        }
      });

      return stream;
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError('Failed to start screen sharing. Please check permissions.');
      throw err;
    }
  }, [socket, roomId, currentUser, participants, createScreenSharePeerConnection, currentScreenSharer]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
      screenShareStreamRef.current = null;
      setIsScreenSharing(false);
      setCurrentScreenSharer(null);

      // Notify other participants about screen share end
      if (socket && currentUser) {
        socket.emit('screen-share-stop', {
          roomId,
          userId: currentUser.socketId
        });
      }

      // Close all screen share peer connections
      screenSharePeersRef.current.forEach(peer => peer.destroy());
      screenSharePeersRef.current.clear();
      setRemoteScreenShares(new Map());
    }
  }, [socket, roomId, currentUser]);

  // Set the ref for the stop function
  stopScreenShareRef.current = stopScreenShare;

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('screen-share-offer', handleScreenShareOffer);
    socket.on('screen-share-answer', handleScreenShareAnswer);
    socket.on('screen-share-start', handleScreenShareStart);
    socket.on('screen-share-stop', handleScreenShareStop);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('screen-share-offer', handleScreenShareOffer);
      socket.off('screen-share-answer', handleScreenShareAnswer);
      socket.off('screen-share-start', handleScreenShareStart);
      socket.off('screen-share-stop', handleScreenShareStop);
    };
  }, [socket, handleOffer, handleAnswer, handleScreenShareOffer, handleScreenShareAnswer, handleScreenShareStart, handleScreenShareStop]);

  // Cleanup on unmount
  useEffect(() => {
    // Capture current values at effect creation time
    const currentPeers = peersRef.current;
    const currentScreenSharePeers = screenSharePeersRef.current;
    const currentLocalStream = localStreamRef.current;
    const currentScreenShareStream = screenShareStreamRef.current;
    
    return () => {
      if (currentPeers) {
        currentPeers.forEach(peer => peer.destroy());
      }
      if (currentScreenSharePeers) {
        currentScreenSharePeers.forEach(peer => peer.destroy());
      }
      if (currentLocalStream) {
        currentLocalStream.getTracks().forEach(track => track.stop());
      }
      if (currentScreenShareStream) {
        currentScreenShareStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    screenShareStream,
    remoteScreenShares,
    isScreenSharing,
    currentScreenSharer,
    isLoading,
    error,
    initializeLocalStream,
    initializeAudioOnlyStream,
    checkPermissions,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  };
};
