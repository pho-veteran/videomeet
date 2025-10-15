import React from 'react';
import { Users, Monitor } from 'lucide-react';
import VideoTile from './VideoTile';
import type { User } from '../../types';

interface VideoGridProps {
  participants: User[];
  currentUser: User | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  screenShareStream?: MediaStream | null;
  remoteScreenShares?: Map<string, MediaStream>;
  currentScreenSharer?: string | null;
}

// Screen Share Tile Component
const ScreenShareTile: React.FC<{ 
  stream: MediaStream; 
  participantName: string; 
  isCurrentUser: boolean;
  className?: string;
}> = ({ stream, participantName, isCurrentUser, className = "" }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isCurrentUser}
        className="w-full h-full object-contain bg-black"
      />
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <div className="flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">
            {participantName} {isCurrentUser ? '(You)' : ''} - Screen Share
          </span>
        </div>
      </div>
    </div>
  );
};

const VideoGrid: React.FC<VideoGridProps> = ({ 
  participants, 
  currentUser, 
  localStream, 
  remoteStreams,
  screenShareStream,
  remoteScreenShares = new Map(),
  currentScreenSharer = null
}) => {
  const participantCount = participants.length;
  const hasScreenShare = currentScreenSharer !== null;

  // Enhanced grid layout calculation
  const getGridLayout = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  const getVideoSize = (count: number) => {
    if (count === 1) return 'h-full min-h-[400px]';
    if (count === 2) return 'h-1/2 min-h-[300px]';
    if (count === 3) return 'h-1/3 min-h-[250px]';
    if (count === 4) return 'h-1/2 min-h-[200px]';
    if (count <= 6) return 'h-1/3 min-h-[180px]';
    if (count <= 9) return 'h-1/3 min-h-[150px]';
    return 'h-1/4 min-h-[120px]';
  };

  if (participantCount === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Waiting for participants</h3>
          <p className="text-gray-400">Share your room link to invite others to join the meeting</p>
        </div>
      </div>
    );
  }

  // For many participants, use a scrollable layout with better spacing
  if (participantCount > 9) {
    return (
      <div className="h-full w-full overflow-auto bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 p-4 md:p-6">
          {participants.map((participant) => {
            const isCurrentUser = participant.socketId === currentUser?.socketId;
            const stream = isCurrentUser ? localStream : remoteStreams.get(participant.socketId);
            
            return (
              <div key={participant.socketId} className="aspect-video min-h-[140px] w-full">
                <VideoTile
                  participant={participant}
                  isActiveSpeaker={false}
                  isCurrentUser={isCurrentUser}
                  stream={stream}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // If there's a screen share, show it prominently with participants in a smaller grid
  if (hasScreenShare) {
    return (
      <div className="h-full w-full overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="h-full w-full flex flex-col gap-3 md:gap-4 p-4 md:p-6">
          {/* Screen Share Section - Takes up most of the space */}
          <div className="flex-1 min-h-0">
            {currentScreenSharer === currentUser?.socketId && screenShareStream && (
              <ScreenShareTile
                stream={screenShareStream}
                participantName={currentUser?.nickname || 'You'}
                isCurrentUser={true}
                className="h-full"
              />
            )}
            {currentScreenSharer !== currentUser?.socketId && currentScreenSharer && (
              (() => {
                const stream = remoteScreenShares.get(currentScreenSharer);
                const participant = participants.find(p => p.socketId === currentScreenSharer);
                return stream ? (
                  <ScreenShareTile
                    key={currentScreenSharer}
                    stream={stream}
                    participantName={participant?.nickname || 'Unknown'}
                    isCurrentUser={false}
                    className="h-full"
                  />
                ) : null;
              })()
            )}
          </div>
          
          {/* Participants Section - Smaller grid at the bottom */}
          {participantCount > 0 && (
            <div className="h-32 md:h-40 flex-shrink-0">
              <div className="h-full w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {participants.map((participant) => {
                  const isCurrentUser = participant.socketId === currentUser?.socketId;
                  const stream = isCurrentUser ? localStream : remoteStreams.get(participant.socketId);
                  
                  return (
                    <div key={participant.socketId} className="h-full w-full">
                      <VideoTile
                        participant={participant}
                        isActiveSpeaker={false}
                        isCurrentUser={isCurrentUser}
                        stream={stream}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular grid layout when no screen sharing
  return (
    <div className="h-full w-full overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
      <div className={`h-full w-full grid ${getGridLayout(participantCount)} gap-3 md:gap-4 p-4 md:p-6`}>
        {participants.map((participant) => {
          const isCurrentUser = participant.socketId === currentUser?.socketId;
          const stream = isCurrentUser ? localStream : remoteStreams.get(participant.socketId);
          
          return (
            <div key={participant.socketId} className={`${getVideoSize(participantCount)} w-full`}>
              <VideoTile
                participant={participant}
                isActiveSpeaker={false}
                isCurrentUser={isCurrentUser}
                stream={stream}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoGrid;
