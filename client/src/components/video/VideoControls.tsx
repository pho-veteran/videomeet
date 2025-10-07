import React, { useState, useEffect } from 'react';
import { Mic, MicOff, MessageCircle, PhoneOff } from 'lucide-react';

interface VideoControlsProps {
  onLeave: () => void;
  onToggleMute: (isMuted: boolean) => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  currentUser?: {
    isMuted: boolean;
  } | null;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  onLeave,
  onToggleMute,
  onToggleChat,
  isChatOpen,
  currentUser
}) => {
  const [isMuted, setIsMuted] = useState(false);
  // Removed video toggle

  // Sync with current user state
  useEffect(() => {
    if (currentUser) {
      setIsMuted(currentUser.isMuted);
      // no-op for video state
    }
  }, [currentUser]);

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    onToggleMute(newMutedState);
  };

  // Removed handleToggleVideo

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-center space-x-3 sm:space-x-4 max-w-4xl mx-auto">
        {/* Mute/Unmute Button */}
        <button
          onClick={handleToggleMute}
          className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25' 
              : 'bg-white hover:bg-gray-100 text-gray-900 shadow-lg'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : (
            <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
          {isMuted && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></div>
          )}
        </button>

        {/* Removed Video Toggle Button */}

        {/* Chat Toggle Button */}
        <button
          onClick={onToggleChat}
          className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            isChatOpen 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25' 
              : 'bg-gray-700 hover:bg-gray-600 text-white shadow-lg'
          }`}
          title={isChatOpen ? 'Close chat' : 'Open chat'}
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          {isChatOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-900"></div>
          )}
        </button>

        {/* Leave Button */}
        <button
          onClick={onLeave}
          className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25"
          title="Leave call"
        >
          <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
    </div>
  );
};

export default VideoControls;
