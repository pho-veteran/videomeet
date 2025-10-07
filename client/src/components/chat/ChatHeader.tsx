import React from 'react';
import { X, MessageCircle, Users } from 'lucide-react';

interface ChatHeaderProps {
  participantCount: number;
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ participantCount, onClose }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-2">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h3>
        <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">{participantCount}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ChatHeader;


