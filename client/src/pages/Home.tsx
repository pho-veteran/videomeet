import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  const handleJoinOrCreate = async () => {
    if (!nickname.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (nickname.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      if (roomId.trim()) {
        // Join existing room
        const response = await fetch(`http://localhost:3001/api/room/${roomId.toUpperCase()}`);
        const data = await response.json();
        
        if (data.exists) {
          toast.success(`Joining room ${roomId.toUpperCase()}`);
          navigate(`/room/${roomId.toUpperCase()}?nickname=${encodeURIComponent(nickname.trim())}`);
        } else {
          toast.error('Room not found. Please check the room code.');
        }
      } else {
        // Create new room
        const response = await fetch('http://localhost:3001/api/create-room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hostId: 'temp-host' }),
        });

        const data = await response.json();
        
        if (data.success) {
          toast.success('Room created successfully!');
          navigate(`/room/${data.roomId}?nickname=${encodeURIComponent(nickname.trim())}`);
        } else {
          toast.error('Failed to create room. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              VideoMeet
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Start or join a video call
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Nickname Input */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinOrCreate()}
              />
            </div>

            {/* Room ID Input */}
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Code (Optional)
              </label>
              <div className="relative">
                <input
                  id="roomId"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter room code to join existing room"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  maxLength={8}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinOrCreate()}
                />
                {roomId && (
                  <button
                    type="button"
                    onClick={() => setRoomId('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleJoinOrCreate}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {roomId.trim() ? 'Joining...' : 'Creating...'}
                </div>
              ) : (
                roomId.trim() ? 'Join Room' : 'Start New Room'
              )}
            </button>
          </div>

          {/* Simple Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {roomId.trim() 
                  ? `Joining room: ${roomId.toUpperCase()}`
                  : 'Creating a new room for you'
                }
              </p>
              {!roomId.trim() && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Share the room code with others to invite them
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
