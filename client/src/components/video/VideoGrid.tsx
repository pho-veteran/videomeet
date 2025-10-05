import React from 'react';
import { Users } from 'lucide-react';
import VideoTile from './VideoTile';
import type { User } from '../../types';

interface VideoGridProps {
  participants: User[];
  currentUser: User | null;
  activeSpeaker: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

const VideoGrid: React.FC<VideoGridProps> = ({ 
  participants, 
  currentUser, 
  activeSpeaker, 
  localStream, 
  remoteStreams
}) => {
  const participantCount = participants.length;

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
                  isActiveSpeaker={activeSpeaker === participant.socketId}
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
                isActiveSpeaker={activeSpeaker === participant.socketId}
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
