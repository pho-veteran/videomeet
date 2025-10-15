const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = socketIo(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Static serve for uploaded files
app.use('/uploads', express.static(uploadsDir));

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Max upload size for socket uploads (should mirror multer limit)
const MAX_SOCKET_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

// In-memory storage for rooms
const rooms = new Map();
const MAX_PARTICIPANTS = 10;

// Room model
class Room {
  constructor(id, hostId) {
    this.id = id;
    this.hostId = hostId;
    this.participants = new Map();
    this.createdAt = new Date();
    this.messages = [];
  }

  addParticipant(socketId, userData) {
    if (this.participants.size >= MAX_PARTICIPANTS) {
      return false;
    }
    this.participants.set(socketId, userData);
    return true;
  }

  removeParticipant(socketId) {
    this.participants.delete(socketId);
    // If host leaves, assign new host
    if (this.hostId === socketId && this.participants.size > 0) {
      this.hostId = this.participants.keys().next().value;
    }
  }

  getParticipants() {
    return Array.from(this.participants.entries()).map(([socketId, userData]) => ({
      socketId,
      ...userData
    }));
  }
}

// REST API Routes
app.post('/api/create-room', (req, res) => {
  const roomId = uuidv4().substring(0, 8).toUpperCase();
  const hostId = req.body.hostId || 'temp-host';
  
  const room = new Room(roomId, hostId);
  rooms.set(roomId, room);
  
  res.json({ roomId, success: true });
});

app.get('/api/room/:id', (req, res) => {
  const roomId = req.params.id.toUpperCase();
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ 
    roomId, 
    participantCount: room.participants.size,
    exists: true 
  });
});

// Upload endpoint scoped to room
app.post('/api/rooms/:id/upload', upload.single('file'), (req, res) => {
  try {
    const roomId = (req.params.id || '').toUpperCase();
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileMeta = {
      id: uuidv4(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };
    return res.json({ success: true, file: fileMeta });
  } catch (e) {
    console.error('File upload error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Track ongoing socket uploads per socket
  const ongoingUploads = new Map();

  // Join room
  socket.on('join-room', (data) => {
    const { roomId, nickname } = data;
    const room = rooms.get(roomId.toUpperCase());
    
    console.log(`User ${socket.id} (${nickname}) attempting to join room ${roomId}`);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check if user is already in the room
    if (room.participants.has(socket.id)) {
      console.log(`User ${socket.id} is already in room ${roomId}, skipping join`);
      // Don't emit error, just send the current room state
      socket.emit('room-joined', {
        roomId,
        participants: room.getParticipants(),
        isHost: room.hostId === socket.id
      });
      return;
    }

    if (room.participants.size >= MAX_PARTICIPANTS) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Check for duplicate nicknames
    const existingNicknames = Array.from(room.participants.values()).map(p => p.nickname);
    if (existingNicknames.includes(nickname)) {
      socket.emit('error', { message: 'Nickname already taken' });
      return;
    }

    // Add participant to room
    const userData = {
      nickname,
      isMuted: false,
      isVideoEnabled: true,
      isHandRaised: false,
      joinedAt: new Date()
    };

    if (room.addParticipant(socket.id, userData)) {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.nickname = nickname;

      console.log(`Room ${roomId} now has ${room.participants.size} participants:`, 
        Array.from(room.participants.keys()));

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        ...userData
      });

      // Send current participants to the new user
      socket.emit('room-joined', {
        roomId,
        participants: room.getParticipants(),
        isHost: room.hostId === socket.id
      });

      console.log(`${nickname} (${socket.id}) successfully joined room ${roomId}`);
    }
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  // Removed 'ice-candidate' relay since trickle ICE is disabled

  // Chat messages
  socket.on('chat-message', (data) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const message = {
        id: uuidv4(),
        socketId: socket.id,
        nickname: socket.nickname,
        message: data.message,
        file: data.file || null,
        timestamp: new Date()
      };
      
      room.messages.push(message);
      io.to(socket.roomId).emit('chat-message', message);
    }
  });

  // Socket-based file uploads (chunked)
  // Client flow: 'file-upload-start' -> many 'file-upload-chunk' -> 'file-upload-complete'
  socket.on('file-upload-start', (data, ack) => {
    try {
      const { roomId, originalName, mimeType, size } = data || {};
      const effectiveRoomId = (roomId || socket.roomId || '').toUpperCase();
      const room = rooms.get(effectiveRoomId);
      if (!room) {
        if (ack) ack({ ok: false, error: 'Room not found' });
        return;
      }
      if (typeof size !== 'number' || size <= 0) {
        if (ack) ack({ ok: false, error: 'Invalid file size' });
        return;
      }
      if (size > MAX_SOCKET_UPLOAD_BYTES) {
        if (ack) ack({ ok: false, error: 'File too large' });
        return;
      }

      const ext = path.extname(originalName || '');
      const base = path.basename(originalName || 'upload', ext);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${base}-${uniqueSuffix}${ext || ''}`;
      const filepath = path.join(uploadsDir, filename);

      const writeStream = fs.createWriteStream(filepath);
      const uploadId = uuidv4();
      const state = {
        uploadId,
        filepath,
        filename,
        originalName: originalName || filename,
        mimeType: mimeType || 'application/octet-stream',
        size,
        bytesReceived: 0,
        closed: false,
        writeStream
      };
      ongoingUploads.set(uploadId, state);

      writeStream.on('error', (err) => {
        console.error('Upload stream error', err);
        try { fs.unlinkSync(filepath); } catch {}
        ongoingUploads.delete(uploadId);
        socket.emit('file-upload-error', { uploadId, error: 'Write failed' });
      });

      if (ack) ack({ ok: true, uploadId });
    } catch (e) {
      console.error('file-upload-start error', e);
      if (ack) ack({ ok: false, error: 'Upload init failed' });
    }
  });

  socket.on('file-upload-chunk', (data, ack) => {
    try {
      const { uploadId, chunk } = data || {};
      const state = ongoingUploads.get(uploadId);
      if (!state) {
        if (ack) ack({ ok: false, error: 'Unknown uploadId' });
        return;
      }
      if (state.closed) {
        if (ack) ack({ ok: false, error: 'Upload already closed' });
        return;
      }
      if (!chunk) {
        if (ack) ack({ ok: false, error: 'Empty chunk' });
        return;
      }
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      state.bytesReceived += buffer.length;
      if (state.bytesReceived > state.size || state.bytesReceived > MAX_SOCKET_UPLOAD_BYTES) {
        try { state.writeStream.destroy(); } catch {}
        try { fs.unlinkSync(state.filepath); } catch {}
        ongoingUploads.delete(uploadId);
        if (ack) ack({ ok: false, error: 'File exceeded declared size' });
        return;
      }
      state.writeStream.write(buffer, (err) => {
        if (err) {
          console.error('Chunk write error', err);
          if (ack) ack({ ok: false, error: 'Write failed' });
        } else {
          if (ack) ack({ ok: true, received: state.bytesReceived });
        }
      });
    } catch (e) {
      console.error('file-upload-chunk error', e);
      if (ack) ack({ ok: false, error: 'Chunk failed' });
    }
  });

  socket.on('file-upload-complete', (data, ack) => {
    try {
      const { uploadId } = data || {};
      const state = ongoingUploads.get(uploadId);
      if (!state) {
        if (ack) ack({ ok: false, error: 'Unknown uploadId' });
        return;
      }
      state.closed = true;
      state.writeStream.end(() => {
        ongoingUploads.delete(uploadId);

        const fileMeta = {
          id: uuidv4(),
          originalName: state.originalName,
          mimeType: state.mimeType,
          size: state.bytesReceived,
          url: `/uploads/${state.filename}`,
          uploadedAt: new Date()
        };
        if (ack) ack({ ok: true, file: fileMeta });
      });
    } catch (e) {
      console.error('file-upload-complete error', e);
      if (ack) ack({ ok: false, error: 'Complete failed' });
    }
  });

  // Media controls
  socket.on('toggle-mute', (data) => {
    const room = rooms.get(socket.roomId);
    if (room && room.participants.has(socket.id)) {
      room.participants.get(socket.id).isMuted = data.isMuted;
      socket.to(socket.roomId).emit('user-mute-changed', {
        socketId: socket.id,
        isMuted: data.isMuted
      });
    }
  });

  // Raise hand controls
  socket.on('toggle-raise-hand', (data) => {
    const room = rooms.get(socket.roomId);
    if (room && room.participants.has(socket.id)) {
      room.participants.get(socket.id).isHandRaised = data.isHandRaised;
      socket.to(socket.roomId).emit('user-hand-raised', {
        socketId: socket.id,
        isHandRaised: data.isHandRaised,
        nickname: socket.nickname
      });
    }
  });

  // Removed video toggle feature

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id, socket.nickname);

    // Cleanup any ongoing uploads for this socket
    ongoingUploads.forEach((state) => {
      try { state.writeStream.destroy(); } catch {}
      try { fs.unlinkSync(state.filepath); } catch {}
    });
    ongoingUploads.clear();
    
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        console.log(`Removing ${socket.nickname} (${socket.id}) from room ${socket.roomId}`);
        room.removeParticipant(socket.id);
        
        console.log(`Room ${socket.roomId} now has ${room.participants.size} participants:`, 
          Array.from(room.participants.keys()));
        
        // Notify others in the room
        socket.to(socket.roomId).emit('user-left', {
          socketId: socket.id,
          nickname: socket.nickname
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`Room ${socket.roomId} deleted (empty)`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

