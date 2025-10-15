import React, { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { ChatMessage, User } from '../../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  participants: User[];
  onSendMessage: (message: string) => void;
  onSendFile: (file: File) => Promise<void> | void;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, participants, onSendMessage, onSendFile, onClose }) => {
  const [newMessage, setNewMessage] = useState('');
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 min-h-0">
      <ChatHeader participantCount={participants.length} onClose={onClose} />

      <div className="flex-1 min-h-0">
        <MessageList messages={messages} />
      </div>

      <ChatInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSendMessage}
        onSendFile={onSendFile}
      />
    </div>
  );
};

export default ChatPanel;

