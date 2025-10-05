const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Chat messages
  socket.on('chat-message', (data) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const message = {
        id: uuidv4(),
        socketId: socket.id,
        nickname: socket.nickname,
        message: data.message,
        timestamp: new Date()
      };
      
      room.messages.push(message);
      io.to(socket.roomId).emit('chat-message', message);
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

  socket.on('toggle-video', (data) => {
    const room = rooms.get(socket.roomId);
    if (room && room.participants.has(socket.id)) {
      room.participants.get(socket.id).isVideoEnabled = data.isVideoEnabled;
      socket.to(socket.roomId).emit('user-video-changed', {
        socketId: socket.id,
        isVideoEnabled: data.isVideoEnabled
      });
    }
  });


  // Audio level for active speaker detection
  socket.on('audio-level', (data) => {
    socket.to(socket.roomId).emit('audio-level', {
      socketId: socket.id,
      level: data.level
    });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id, socket.nickname);
    
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

