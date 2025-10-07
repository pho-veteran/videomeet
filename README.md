# Videomeet (WebRTC + Socket.io)

A minimal video meeting app with:
- WebRTC P2P audio/video between browsers
- Socket.io signaling and chat
- WebSocket chunked file uploads (no HTTP multipart)

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

## Features (current)
- Signaling over Socket.io: `join-room`, `offer`, `answer`
- Chat over Socket.io: `chat-message`
- Media controls: mute toggle
- File sharing over WebSocket (chunked): `file-upload-start`, `file-upload-chunk`, `file-upload-complete`
- Static file serving at `http://localhost:3001/uploads/...`
- Trickle ICE disabled (candidates bundled in SDP)

## Project structure
```
videomeet/
  client/           # Vite + React (TS)
  server/           # Express + Socket.io
  webrtc-flow-diagram.md
```

## Environment
- Client reads server URL from `client/.env` → `VITE_SERVER_URL`
- Server CORS origin reads from `server/.env` → `CLIENT_ORIGIN`

## Common scripts
- Server: `npm run dev` (nodemon) / `npm start`
- Client: `npm run dev` (Vite) / `npm run build` / `npm run preview`

## Notes
- File upload size limit: 25MB (both server multer limit and socket upload guard)
- No separate `ice-candidate` events while trickle ICE is disabled
- Video on/off UI is removed; only mute toggle remains

## Troubleshooting
- Camera/mic errors: ensure no other app is using the devices and grant permissions
- Connection issues: verify both server (3001) and client (Vite) are running and reachable
- File uploads: large files are chunked; ensure server has write access to `server/uploads`
