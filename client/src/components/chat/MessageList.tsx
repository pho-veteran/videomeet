import React, { useRef, useEffect } from 'react';
import { MessageCircle, Download } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
}

const formatTime = (timestamp: Date) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (bytes: number) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium mb-2">No messages yet</h4>
          <p className="text-sm">Start the conversation by sending a message!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{message.nickname}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(message.timestamp)}</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 max-w-xs shadow-sm">
              {message.message && (
                <p className="text-sm text-gray-900 dark:text-white break-words">{message.message}</p>
              )}
              {message.file && (
                <div className="mt-2">
                  {message.file.mimeType.startsWith('image/') ? (
                    <a
                      href={`${serverUrl}${message.file.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                      title={message.file.originalName}
                    >
                      <img
                        src={`${serverUrl}${message.file.url}`}
                        alt={message.file.originalName}
                        className="max-w-full rounded-md border border-gray-300 dark:border-gray-600"
                      />
                    </a>
                  ) : (
                    <a
                      href={`${serverUrl}${message.file.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                      title={message.file.originalName}
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm truncate max-w-[12rem]">{message.file.originalName}</span>
                      <span className="text-xs text-gray-500">{formatBytes(message.file.size)}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;


