import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, SimplePeerInstance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

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
      
      // Type guard for DOMException
      if (err instanceof DOMException) {
        if (err.name === 'AbortError' || err.message.includes('Timeout')) {
          errorMessage = 'Camera/microphone access timed out. Please check if another application is using your camera.';
        } else if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow permissions and refresh the page.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a camera and microphone.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera settings are not supported. Trying with basic settings...';
          // Retry with basic constraints
          if (retryCount < 2) {
            setTimeout(() => initializeLocalStream(retryCount + 1), 1000);
            return;
          }
        }
      } else if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('Timeout')) {
          errorMessage = 'Camera/microphone access timed out. Please check if another application is using your camera.';
        }
      }

      // If it's a timeout error and we haven't retried too many times, try again
      if ((err instanceof DOMException && (err.name === 'AbortError' || err.message.includes('Timeout'))) || 
          (err instanceof Error && (err.name === 'AbortError' || err.message.includes('Timeout')))) {
        if (retryCount < 2) {
          console.log(`Retrying media access (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => initializeLocalStream(retryCount + 1), 2000);
          return;
        }
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
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

    peer.on('signal', (data: unknown) => {
      if (isInitiator) {
        socket.emit('offer', { roomId, offer: data as SimplePeerSignal, to: socketId });
      } else {
        socket.emit('answer', { roomId, answer: data as SimplePeerSignal, to: socketId });
      }
    });

    peer.on('stream', (stream: unknown) => {
      setRemoteStreams(prev => new Map(prev.set(socketId, stream as MediaStream)));
    });

    peer.on('connect', () => {
      console.log(`Connected to peer: ${socketId}`);
    });

    peer.on('error', (err: unknown) => {
      console.error('Peer connection error:', err as Error);
    });

    peer.on('close', () => {
      console.log(`Peer connection closed: ${socketId}`);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    });

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

  // Handle ICE candidates
  const handleIceCandidate = useCallback((data: { candidate: SimplePeerSignal; from: string }) => {
    const peer = peersRef.current.get(data.from);
    if (peer) {
      peer.signal(data.candidate);
    }
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

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
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      
      // Update local stream state to trigger re-render
      setLocalStream(prev => {
        if (prev) {
          const newStream = prev.clone();
          newStream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
          });
          return newStream;
        }
        return prev;
      });
    }
  }, []);



  // Cleanup on unmount
  useEffect(() => {
    // Capture current values at effect creation time
    const currentPeers = peersRef.current;
    const currentLocalStream = localStreamRef.current;
    
    return () => {
      if (currentPeers) {
        currentPeers.forEach(peer => peer.destroy());
      }
      if (currentLocalStream) {
        currentLocalStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    isLoading,
    error,
    initializeLocalStream,
    initializeAudioOnlyStream,
    checkPermissions,
    toggleMute
  };
};
