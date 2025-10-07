# WebRTC and Chat/File Upload — Glossary and Flows

## Glossary: Core techniques used

| Term | Description |
| --- | --- |
| WebRTC | Browser-to-browser real-time media transport (audio/video/data). After handshake, media flows P2P (server not in media path). |
| Signaling | Out-of-band channel to exchange metadata (SDP offers/answers, ICE). Here implemented over WebSocket (Socket.io). |
| SDP (Session Description Protocol) | Text description of media capabilities, codecs, encryption, and transport parameters. |
| Offer | Initiator’s SDP proposing connection parameters (codecs, tracks, transport). Sent to peer. |
| Answer | Responder’s SDP matching the offer with compatible parameters. Sent back to initiator. |
| ICE (Interactive Connectivity Establishment) | Discovers workable network paths between peers through NATs/firewalls. |
| ICE candidate | A single possible route (IP, port, protocol, priority) discovered by ICE. |

### WebSocket terms used in this project

| Term | Description |
| --- | --- |
| WebSocket | Persistent two-way connection between browser and server. |
| Event | Named message sent/received over the socket (e.g., `join-room`, `chat-message`). |
| emit | Send an event from client or server. Can include an ack callback. |
| broadcast | Send an event to many clients at once (e.g., everyone in a room with `io.to(roomId).emit(...)`). |

---

## 1) WebRTC Signaling (2 peers via signaling server)

```mermaid
sequenceDiagram
    participant A as Client A (Browser)
    participant SIG as Signaling Server (Socket.io)
    participant B as Client B (Browser)

    A->>SIG: join-room { roomId, nickname }
    B->>SIG: join-room { roomId, nickname }
    SIG-->>A: room-joined { participants, isHost }
    SIG-->>B: room-joined { participants, isHost }

    Note over A,B: Lower socketId initiates the connection

    A->>SIG: offer { roomId, offer, to: B }
    SIG-->>B: offer { offer, from: A }
    B->>SIG: answer { roomId, answer, to: A }
    SIG-->>A: answer { answer, from: B }

    Note over A,B: Direct media stream (P2P audio/video)
```

### How this flow works in the app

1. **Join room (signaling)**: Both browsers connect to the Socket.io server and emit `join-room`. The server replies with current participants and host info.
2. **Choose initiator**: The client with the lower `socketId` acts as initiator to avoid glare (both offering at once).
3. **Offer/Answer exchange**: The initiator’s `SimplePeer` produces an SDP offer (includes codecs, tracks, and—because `trickle: false`—candidates). The responder applies the offer, generates an SDP answer, and sends it back.
4. **ICE**: Trickle ICE is disabled, so candidates are bundled inside the SDP; no separate candidate events are exchanged.
5. **P2P media**: After both sides set remote/local descriptions, the browsers establish a direct peer-to-peer connection and stream media directly.

---

## 2) Chat and File Upload (room-scoped)

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant API as Server (Express + Socket.io)
    participant FS as File Storage (/uploads)
    participant O as Other Clients

    rect rgb(245,245,245)
    Note over C,O: Chat message
    C->>API: chat-message { message }
    API-->>O: chat-message { id, socketId, nickname, message, timestamp }
    API-->>C: chat-message echo { id, ... }
    end

    rect rgb(245,245,245)
    Note over C,O: File upload via WebSocket (chunked) and broadcast
    C->>API: file-upload-start { roomId, originalName, mimeType, size }
    API-->>C: { ok, uploadId }
    loop for each chunk
        C->>API: file-upload-chunk { uploadId, chunk(binary) }
        API-->>C: { ok, received }
    end
    C->>API: file-upload-complete { uploadId }
    API->>FS: persist file → finalize
    API-->>C: { ok, file: { id, url, originalName, mimeType, size, uploadedAt } }

    Note over C,O: Broadcast file message to the room
    C->>API: chat-message { file }
    API-->>O: chat-message { id, socketId, nickname, file, timestamp }
    API-->>C: chat-message echo { id, ... }

    Note over O,FS: File is served statically
    O->>API: GET /uploads/{filename}
    API-->>O: file content
    end
```

### How this flow works in the app

- **Chat**: The client emits `chat-message` over WebSocket. The server creates a message object, stores it in memory (`room.messages`), and broadcasts it to everyone in the room.
- **File upload (WebSocket, chunked)**:
  - Client emits `file-upload-start { roomId, originalName, mimeType, size }` → server returns `{ ok, uploadId }`.
  - Client reads the file and sends multiple `file-upload-chunk { uploadId, chunk }` events (binary chunks). Server acks each with `{ ok, received }` and streams to disk.
  - Client emits `file-upload-complete { uploadId }`. Server finalizes the file, returns `{ ok, file }` with metadata `{ id, url, originalName, mimeType, size, uploadedAt }`.
  - Client then emits `chat-message { file }` so all participants receive the file message.

---

## What uses WebRTC vs WebSocket

- **WebRTC**: The actual audio/video streams between browsers after handshake (implemented in `client/src/hooks/useWebRTC.ts` and rendered by `VideoGrid`/`VideoTile`).
- **WebSocket (Socket.io)**: Signaling (`join-room`, `offer`, `answer`), app events (`chat-message`, `user-mute-changed`), and file uploads (`file-upload-start`, `file-upload-chunk`, `file-upload-complete`).

---

## Chat and File Transfer — WebSocket Upload Details

This section details the WebSocket-based file upload used by the app:

- Client-side
  - 1) User selects a file in the UI.
  - 2) Client emits `file-upload-start` and receives `uploadId`.
  - 3) Client slices the file and sends chunks via `file-upload-chunk { uploadId, chunk }` until complete.
  - 4) Client emits `file-upload-complete` and receives `file` metadata, then emits `chat-message { file }`.

- Server-side
  - 5) Server streams chunks to disk per `uploadId`, enforces size limits, and finalizes on `file-upload-complete`.
  - 6) Server returns file metadata (id, url/path, originalName, mimeType, size, uploadedAt).
  - 7) Upon client `chat-message { file }`, server broadcasts the message to the room.

- Other clients
  - 8) Peers receive the `chat-message` event and render the file message immediately.
  - 9) When a user clicks the file, the client downloads it either:
    - directly from the server path (if files are exposed statically), or
    - via a separate WebSocket download flow (server emits/sends file content back over Socket.io).
