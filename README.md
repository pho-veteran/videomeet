# Videomeet (WebRTC + Socket.io)

A comprehensive video meeting app with advanced features:
- WebRTC P2P audio/video between browsers
- Screen sharing with WebRTC
- Socket.io signaling and real-time chat
- WebSocket chunked file uploads
- Advanced video controls and participant management

## Prerequisites
- Node.js 18+
- npm 9+

## Quick start

1) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

2) Configure environment variables

Client (Vite) uses `VITE_SERVER_URL`. Server uses `CLIENT_ORIGIN` and `PORT`.

```bash
# Example
echo "VITE_SERVER_URL=http://localhost:3001" > client/.env
echo "CLIENT_ORIGIN=http://localhost:5173" > server/.env
echo "PORT=3001" >> server/.env
```

3) Run dev servers (in two terminals)

```bash
# Terminal 1 (server)
cd server
npm run dev
# runs on http://localhost:3001

# Terminal 2 (client)
cd client
npm run dev
# Vite will show a local URL (e.g. http://localhost:5173)
```

4) Open the client URL in two browser windows/tabs to test.

## Features

### Core Video/Audio
- **WebRTC P2P streaming**: Direct browser-to-browser video/audio
- **Screen sharing**: Share screen, window, or tab with all participants
- **Video controls**: Toggle camera on/off, mute/unmute microphone
- **Adaptive video grid**: Smart layout that prioritizes screen sharing
- **Participant management**: Up to 10 participants per room

### Real-time Communication
- **Socket.io signaling**: WebRTC offer/answer exchange
- **Live chat**: Real-time text messaging with timestamps
- **File sharing**: Upload and share files via WebSocket (chunked)
- **Raise hand**: Visual indicator for participant interaction
- **Notifications**: Toast notifications for all important events

### User Experience
- **Responsive design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, Google Meet-inspired interface
- **Visual indicators**: Status indicators for mute, screen share, hand raised
- **Error handling**: Comprehensive error handling with retry options
- **Accessibility**: Keyboard navigation and screen reader support

### Technical Features
- **Trickle ICE disabled**: Candidates bundled in SDP for simplicity
- **File upload limit**: 25MB maximum file size
- **Static file serving**: Files served at `http://localhost:3001/uploads/...`
- **Room persistence**: Rooms persist until all participants leave
- **Host management**: Automatic host assignment when host leaves

## Project structure
```
videomeet/
  client/                    # Vite + React (TypeScript)
  ├── src/
  │   ├── components/
  │   │   ├── video/        # VideoGrid, VideoTile, VideoControls
  │   │   ├── chat/         # ChatPanel, MessageList, ChatInput
  │   │   └── participants/ # ParticipantsList
  │   ├── hooks/            # useWebRTC, useSocket
  │   ├── contexts/         # SocketContext
  │   ├── pages/            # Home, Room, NotFound
  │   └── types/            # TypeScript interfaces
  server/                   # Express + Socket.io
  ├── index.js             # Main server file
  └── uploads/             # File upload directory
  webrtc-flow-diagram.md   # Technical documentation
  requirements.md          # Project requirements
```

## Environment Variables
- **Client**: `VITE_SERVER_URL` - Server WebSocket URL
- **Server**: `CLIENT_ORIGIN` - Allowed CORS origin
- **Server**: `PORT` - Server port (default: 3001)

## Common Scripts
- **Server**: `npm run dev` (nodemon) / `npm start`
- **Client**: `npm run dev` (Vite) / `npm run build` / `npm run preview`

## WebRTC Flow
The app uses a two-phase WebRTC setup:
1. **Regular video/audio**: Standard WebRTC peer connections for camera/microphone
2. **Screen sharing**: Separate WebRTC peer connections for screen capture

See `webrtc-flow-diagram.md` for detailed technical flow documentation.

## File Upload System
Files are uploaded via WebSocket in chunks:
1. `file-upload-start` - Initialize upload with metadata
2. `file-upload-chunk` - Send file data in 64KB chunks
3. `file-upload-complete` - Finalize upload and get file URL
4. `chat-message` - Share file with room participants

## Troubleshooting

### Media Access Issues
- Ensure no other applications are using camera/microphone
- Grant browser permissions when prompted
- Try refreshing the page if permissions are denied
- Use "Join Audio Only" option if camera access fails

### Connection Issues
- Verify both server (port 3001) and client are running
- Check network connectivity
- Ensure firewall allows WebSocket connections
- Try different browsers if issues persist

### File Upload Issues
- Check file size (25MB limit)
- Ensure server has write access to `server/uploads` directory
- Verify network stability for large file uploads

### Screen Sharing Issues
- Ensure browser supports `getDisplayMedia()` API
- Grant screen sharing permissions when prompted
- Try different sharing options (entire screen, window, tab)
- Check if another participant is already screen sharing

## Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (macOS/iOS)
- **Edge**: Full support

## Development Notes
- Uses `simple-peer` library for WebRTC peer connections
- Trickle ICE is disabled for simplicity
- All media streams are encrypted by default (WebRTC standard)
- No persistent data storage - all data is in-memory
