import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, VideoOff, Loader2 } from 'lucide-react';
import type { User } from '../../types';

interface VideoTileProps {
  participant: User;
  isActiveSpeaker: boolean;
  isCurrentUser: boolean;
  stream?: MediaStream | null;
}

const VideoTile: React.FC<VideoTileProps> = ({ participant, isActiveSpeaker, isCurrentUser, stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsLoading(false);
    } else if (!stream) {
      setIsLoading(false);
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (name: string) => {
    const gradients = [
      'from-red-500 to-red-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-cyan-500 to-cyan-600',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className={`relative w-full h-full bg-gray-800 rounded-xl overflow-hidden group ${
      isActiveSpeaker ? 'ring-2 ring-green-400 ring-opacity-80 shadow-lg shadow-green-400/20' : ''
    } transition-all duration-300 shadow-lg hover:shadow-xl`}>
      {/* Video Element */}
      {participant.isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentUser}
          className="w-full h-full object-cover"
        />
      ) : (
        /* Avatar Placeholder */
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getRandomColor(participant.nickname)}`}>
          <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            {getInitials(participant.nickname)}
          </span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/90 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-xs text-gray-300">Loading...</span>
          </div>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-white font-medium text-sm truncate">
              {participant.nickname}
              {isCurrentUser && (
                <span className="ml-1 text-xs bg-blue-500/80 text-white px-1.5 py-0.5 rounded-full">
                  You
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Mute Indicator */}
            {participant.isMuted ? (
              <div className="bg-red-500 rounded-full p-1.5 shadow-lg">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="bg-green-500/80 rounded-full p-1.5 shadow-lg">
                <Mic className="w-3 h-3 text-white" />
              </div>
            )}
            
            {/* Video Off Indicator */}
            {!participant.isVideoEnabled && (
              <div className="bg-gray-600/80 rounded-full p-1.5 shadow-lg">
                <VideoOff className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Speaker Indicator */}
      {isActiveSpeaker && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center space-x-1 bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs text-white font-medium">Speaking</span>
          </div>
        </div>
      )}

      {/* Hover overlay for additional info */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
    </div>
  );
};

export default VideoTile;
