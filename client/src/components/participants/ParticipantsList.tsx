import React from 'react';
import { Users, Mic, MicOff, Hand, Crown, VideoOff, X } from 'lucide-react';
import type { User } from '../../types';

interface ParticipantsListProps {
  participants: User[];
  currentUser: User | null;
  isHost: boolean;
  onClose: () => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUser,
  isHost,
  onClose
}) => {
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

  const formatJoinTime = (joinedAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(joinedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Participants ({participants.length})
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map((participant) => {
          const isCurrentUser = currentUser?.socketId === participant.socketId;
          const isParticipantHost = isHost && isCurrentUser;
          
          return (
            <div
              key={participant.socketId}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCurrentUser 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {/* Avatar */}
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getRandomColor(participant.nickname)} flex-shrink-0`}>
                <span className="text-sm font-bold text-white">
                  {getInitials(participant.nickname)}
                </span>
                
                {/* Host Crown */}
                {isParticipantHost && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              {/* Participant Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {participant.nickname}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Joined {formatJoinTime(participant.joinedAt)}
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {/* Mute Status */}
                {participant.isMuted ? (
                  <div className="bg-red-500 rounded-full p-1.5" title="Muted">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="bg-green-500 rounded-full p-1.5" title="Unmuted">
                    <Mic className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Video Status */}
                {!participant.isVideoEnabled && (
                  <div className="bg-gray-600 rounded-full p-1.5" title="Video off">
                    <VideoOff className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Hand Raised */}
                {participant.isHandRaised && (
                  <div className="bg-yellow-500 rounded-full p-1.5 animate-pulse" title="Hand raised">
                    <Hand className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {participants.filter(p => p.isHandRaised).length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hands Raised
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
