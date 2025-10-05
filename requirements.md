# Requirements and Guidance for Building a Google Meet Clone App

This document provides detailed requirements and guidance for an AI agent to develop a web-based video conferencing application that clones the core functionality of Google Meet. The app will support real-time video calls, audio, screen sharing, and basic chat features for multiple users in virtual rooms. The development must adhere to the specified technical stack: **Socket.io** for real-time bidirectional communication, **Vite.js** for the frontend build and development setup, and **Node.js** for the backend server.

The guidance is structured into sections for clarity: overview, functional requirements, non-functional requirements, technical architecture, implementation steps, and testing guidelines. The AI agent should follow these specifications iteratively, starting with setup and prototyping core features before adding polish.

## 1. Project Overview

### Objective
Create a responsive, real-time video conferencing app where users can:
- Create or join meeting rooms via unique links or codes.
- Participate in group video/audio calls with up to 10 participants (scalable to more with optimization).
- Share screens, mute/unmute, and chat in real-time.

### Target Users
- Individuals or small teams for virtual meetings.
- Web browsers (Chrome, Firefox, Safari) on desktop and mobile.

### Key Differentiators from Basic Video Apps
- Grid-based video layout that adapts to participant count (e.g., spotlight active speaker).
- Persistent rooms with join links.
- Simple authentication via nicknames (no full user accounts initially).

### Deliverables
- A deployable full-stack application.
- Source code in a Git repository structure.
- Documentation for setup and usage.
- Demo video or screenshots.

## 2. Functional Requirements

### Core Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Room Creation & Joining** | Users can create a room (generates unique ID/link) or join via ID. Display room code prominently. Enforce max participants (e.g., 10). | High |
| **Video/Audio Streaming** | Peer-to-peer video/audio using WebRTC. Fallback to server relay if P2P fails. Support mute/unmute, camera toggle. | High |
| **Participant Management** | Show list of participants with nicknames, video thumbnails, and status (e.g., muted, sharing screen). Handle join/leave events with notifications. | High |
| **Screen Sharing** | Allow one user to share screen/tab/window. Broadcast to all participants. Stop sharing button. | Medium |
| **Real-Time Chat** | Text chat sidebar for messages. Support emojis, timestamps. Messages sync across all users. | Medium |
| **Meeting Controls** | End call for all (host only), leave call, full-screen mode. Timer for meeting duration. | High |
| **Active Speaker Detection** | Highlight or spotlight the current speaker in the video grid. | Low |

### User Flows
1. **Landing Page**: Enter nickname → Create Room → Share link.
2. **Join Flow**: Enter room ID and nickname → Connect to stream.
3. **In-Meeting**: Grid of videos → Controls bar at bottom → Chat toggle.
4. **Post-Meeting**: Option to end and return to lobby.

### Edge Cases
- Handle network disconnections with reconnection logic.
- Graceful degradation if browser lacks WebRTC support (show error).
- Prevent duplicate nicknames in a room.

## 3. Non-Functional Requirements

| Category | Requirement | Details |
|----------|-------------|---------|
| **Performance** | < 2s latency for audio/video sync. Support 720p video at 30fps. | Optimize with VP8 codec; limit to 10 participants initially. |
| **Security** | Encrypt streams (WebRTC default). No persistent data storage. Use HTTPS in production. | Validate room IDs server-side; rate-limit joins. |
| **Scalability** | Handle 100 concurrent rooms. | Use Socket.io rooms for isolation; consider Redis for scaling later. |
| **Accessibility** | WCAG 2.1 AA compliant. Keyboard navigation for controls. | ARIA labels for video elements; high-contrast mode. |
| **Usability** | Mobile-responsive (use CSS Grid/Flexbox). Intuitive UI mimicking Google Meet's clean design. | Dark/light theme toggle. |
| **Reliability** | 99% uptime in dev. Error logging to console. | Graceful error handling (e.g., "Connection lost" toast). |

## 4. Technical Stack and Architecture

### Frontend (Vite.js)
- **Framework**: React 18+ with hooks for state management and functional components.
- **Build Tool**: Vite.js for hot module replacement, fast builds, and optimized bundling.
- **Styling**: Tailwind CSS 3.x for utility-first styling with custom design system.
- **UI Components**: Custom components built with Tailwind, Heroicons for icons, Headless UI for accessible components.
- **Real-Time**: Socket.io-client for events (e.g., 'user-joined', 'new-message').
- **Media**: WebRTC via `simple-peer` library for P2P connections.
- **State Management**: React Context API with useReducer for complex state, useState for local state.
- **Routing**: React Router v6 for client-side navigation.
- **Notifications**: React Hot Toast for user feedback and notifications.
- **Structure**:
  ```
  src/
  ├── components/
  │   ├── ui/ (Button, Modal, Input, etc.)
  │   ├── video/ (VideoGrid, VideoTile, VideoControls)
  │   ├── chat/ (ChatPanel, MessageList, MessageInput)
  │   ├── layout/ (Header, Sidebar, MainLayout)
  │   └── common/ (Loading, ErrorBoundary, Toast)
  ├── hooks/ (useWebRTC, useSocket, useMedia, useTheme)
  ├── pages/ (Home, Room, NotFound)
  ├── contexts/ (SocketContext, ThemeContext, MediaContext)
  ├── utils/ (roomIdGenerator, mediaUtils, validation)
  ├── styles/ (globals.css, tailwind.config.js)
  └── types/ (TypeScript interfaces and types)
  ```

### Backend (Node.js)
- **Runtime**: Node.js 18+ with Express.js for HTTP server.
- **Real-Time**: Socket.io for WebSocket handling.
- **Media Signaling**: Socket.io to negotiate WebRTC SDP offers/answers/ICE candidates.
- **Dependencies**: `express`, `socket.io`, `cors`, `uuid` for room IDs.
- **Structure**:
  ```
  server/
  ├── routes/ (rooms.js for API)
  ├── sockets/ (handleConnection.js)
  ├── models/ (Room.js for in-memory storage)
  └── index.js (main server)
  ```
- **API Endpoints** (REST for initial setup):
  - `POST /create-room`: Returns room ID.
  - `GET /room/:id`: Validate room existence.

### Architecture Diagram (Conceptual)
- **Client** ↔ **Socket.io (Signaling)** ↔ **Node.js Server**.
- **P2P Streams**: Direct WebRTC between clients; server only for signaling and chat relay.
- Database: In-memory (Map) for rooms; no external DB needed for MVP.

### Integration Points
- Frontend connects to backend via `ws://localhost:3001` in dev.
- Environment vars: `PORT=3001`, `CLIENT_URL=http://localhost:5173`.

## 5. UI/UX Design Requirements

### Design System
- **Color Palette**: 
  - Primary: Blue (#1a73e8) - Google Meet inspired
  - Secondary: Green (#34a853) - for active/success states
  - Danger: Red (#ea4335) - for errors/leave actions
  - Neutral: Gray scale (#f8f9fa to #202124)
  - Background: White (#ffffff) / Dark (#121212)
- **Typography**: 
  - Primary: 'Google Sans', 'Roboto', system-ui, sans-serif
  - Weights: 400 (regular), 500 (medium), 600 (semibold)
  - Sizes: 12px, 14px, 16px, 18px, 24px, 32px
- **Spacing**: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px)
- **Border Radius**: 4px (small), 8px (medium), 12px (large), 50% (circular)
- **Shadows**: Subtle elevation with `shadow-sm`, `shadow-md`, `shadow-lg`

### Component Design Specifications

#### Landing Page
- **Layout**: Centered card design with max-width 400px
- **Elements**: 
  - Logo/brand name at top
  - Input fields for nickname and room code
  - Primary CTA buttons (Create Room, Join Room)
  - Clean, minimal design with ample whitespace
- **Responsive**: Stack elements vertically on mobile, maintain readability

#### Video Conference Room
- **Video Grid**: 
  - Adaptive layout: 1x1, 2x2, 3x3, 4x4 based on participant count
  - Minimum video size: 200x150px
  - Active speaker highlighting with blue border
  - Participant name overlay at bottom of each video
- **Control Bar**: 
  - Fixed at bottom of screen
  - Circular buttons with icons (mic, camera, share, chat, leave)
  - Muted/disabled states with visual feedback
  - Hover effects and smooth transitions
- **Chat Panel**: 
  - Slide-out from right side
  - Message bubbles with timestamps
  - Input field with send button
  - Scroll to bottom on new messages

#### Interactive States
- **Hover**: Subtle scale (1.05) and shadow increase
- **Active**: Scale down (0.95) for button press feedback
- **Focus**: Blue outline for accessibility
- **Loading**: Skeleton screens and spinners
- **Error**: Red border and error message display

### Responsive Design
- **Breakpoints**:
  - Mobile: 320px - 768px
  - Tablet: 768px - 1024px
  - Desktop: 1024px+
- **Mobile Adaptations**:
  - Touch-friendly button sizes (44px minimum)
  - Swipe gestures for chat panel
  - Optimized video grid for small screens
  - Bottom navigation for controls

### Accessibility Requirements
- **WCAG 2.1 AA Compliance**:
  - Color contrast ratio minimum 4.5:1
  - Keyboard navigation support
  - Screen reader compatibility
  - Focus indicators visible
- **ARIA Labels**: All interactive elements properly labeled
- **High Contrast Mode**: Support for system preference
- **Reduced Motion**: Respect `prefers-reduced-motion` setting

### Animation and Transitions
- **Duration**: 150ms for micro-interactions, 300ms for page transitions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural feel
- **Transitions**: 
  - Fade in/out for modals and overlays
  - Slide animations for chat panel
  - Scale animations for button interactions
  - Smooth video grid layout changes

### Dark Mode Support
- **Theme Toggle**: Accessible toggle in header/settings
- **Color Adaptation**: All colors have dark mode variants
- **System Preference**: Auto-detect and respect user preference
- **Persistence**: Remember user's theme choice

### Performance Considerations
- **Lazy Loading**: Load video components only when needed
- **Image Optimization**: Optimize avatars and icons
- **Bundle Size**: Keep initial bundle under 500KB
- **Smooth Scrolling**: 60fps animations and transitions

## 6. Implementation Guidance (Step-by-Step for AI Agent)

### Phase 1: Setup (1-2 hours)
1. Initialize backend: `npm init -y`, install deps (`express`, `socket.io`, `cors`, `uuid`), create `index.js` with basic server and Socket.io setup.
2. Initialize frontend: `npm create vite@latest -- --template react-ts`, install dependencies:
   ```bash
   npm install socket.io-client simple-peer react-router-dom react-hot-toast
   npm install -D tailwindcss postcss autoprefixer @types/simple-peer
   npm install @headlessui/react @heroicons/react
   ```
3. Configure TailwindCSS:
   ```bash
   npx tailwindcss init -p
   ```
   Update `tailwind.config.js` with custom design system:
   ```js
   module.exports = {
     content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
     darkMode: 'class',
     theme: {
       extend: {
         colors: {
           primary: '#1a73e8',
           secondary: '#34a853',
           danger: '#ea4335',
         },
         fontFamily: {
           sans: ['Google Sans', 'Roboto', 'system-ui', 'sans-serif'],
         },
         spacing: {
           '18': '4.5rem',
         }
       }
     },
     plugins: []
   }
   ```
4. Run both: Backend on port 3001, frontend on 5173. Test Socket.io echo.

### Phase 2: Core Backend (2-4 hours)
1. Implement room creation/join logic in Socket.io: Use `io.to(roomId).emit()` for broadcasts.
2. Handle WebRTC signaling: Events like `offer`, `answer`, `ice-candidate`.
3. Add chat relay: `socket.on('chat-message', ...)`.

### Phase 3: Frontend Basics (4-6 hours)
1. **Setup TailwindCSS and Base Components**:
   - Create `src/styles/globals.css` with Tailwind directives
   - Build reusable UI components: `Button`, `Input`, `Modal`, `Loading`
   - Implement theme context for dark/light mode switching
   - Create responsive layout components

2. **Landing Page Development**:
   - Design centered card layout with max-width 400px
   - Implement nickname and room code input forms
   - Add form validation with error states
   - Create primary/secondary button components
   - Add loading states and success feedback

3. **Socket Integration**:
   - Create SocketContext with useSocket hook
   - Implement connection management (connect, disconnect, reconnect)
   - Add error handling and connection status indicators
   - Create room management context

4. **Video Components Foundation**:
   - Create VideoGrid component with responsive layout
   - Implement VideoTile component for individual participants
   - Add placeholder states for loading/connecting
   - Set up basic video element structure

### Phase 4: WebRTC Integration (4-6 hours)
1. Use `simple-peer` for P2P: On user join, create peer connections.
2. Handle media permissions: `navigator.mediaDevices.getUserMedia()`.
3. Add controls: Mute via `stream.getAudioTracks()[0].enabled = false`.

### Phase 5: Advanced Features (3-5 hours)
1. **Screen Sharing Implementation**:
   - Use `getDisplayMedia()` API for screen capture
   - Add screen share button with visual feedback
   - Implement screen share overlay with stop button
   - Handle screen share permissions and errors

2. **Active Speaker Detection**:
   - Emit audio levels via Socket.io using Web Audio API
   - Highlight active speaker with blue border and scale effect
   - Implement smooth transitions between speakers
   - Add visual indicators for speaking status

3. **Chat System**:
   - Create slide-out chat panel with smooth animations
   - Implement message bubbles with timestamps
   - Add emoji support and message formatting
   - Create message input with send button and Enter key support
   - Add scroll-to-bottom functionality for new messages

4. **Enhanced UI Components**:
   - Implement control bar with circular buttons
   - Add hover effects and smooth transitions
   - Create loading skeletons for video tiles
   - Add toast notifications for user actions

### Phase 6: Polish and Responsiveness (2-3 hours)
1. **Design System Implementation**:
   - Apply Google Meet-inspired color scheme and typography
   - Implement consistent spacing and border radius
   - Add proper shadows and elevation for depth
   - Create cohesive button and input styles

2. **Responsive Design**:
   - Implement mobile-first approach with Tailwind breakpoints
   - Optimize video grid for different screen sizes
   - Add touch-friendly controls for mobile devices
   - Implement swipe gestures for chat panel on mobile

3. **Accessibility Enhancements**:
   - Add proper ARIA labels and roles
   - Implement keyboard navigation support
   - Ensure color contrast meets WCAG standards
   - Add focus indicators and screen reader support

4. **Animation and Micro-interactions**:
   - Add smooth transitions for all interactive elements
   - Implement loading states and skeleton screens
   - Create hover and active state animations
   - Add page transition effects

5. **Error Handling and Feedback**:
   - Implement comprehensive error toasts with `react-hot-toast`
   - Add connection status indicators
   - Create user-friendly error messages
   - Implement retry mechanisms for failed operations

6. **Performance Optimization**:
   - Implement lazy loading for video components
   - Optimize bundle size and loading times
   - Add proper error boundaries
   - Implement efficient re-rendering strategies

### Best Practices
- **TypeScript**: Use TypeScript for type safety and better development experience.
- **Modular Architecture**: Separate concerns (e.g., WebRTC utils, socket handlers, UI components).
- **Component Design**: Create reusable, composable components with clear props interfaces.
- **State Management**: Use React Context for global state, local state for component-specific data.
- **Error Handling**: Implement comprehensive error boundaries and user-friendly error messages.
- **Performance**: Use React.memo, useMemo, and useCallback for optimization.
- **Accessibility**: Follow WCAG guidelines and test with screen readers.
- **Responsive Design**: Mobile-first approach with Tailwind's responsive utilities.
- **Code Quality**: Use ESLint and Prettier for consistent code formatting.
- **Logging**: Console.log for dev; avoid in prod; implement proper error tracking.
- **Version Control**: Commit after each phase with descriptive commit messages.

### Frontend Dependencies Summary
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "socket.io-client": "^4.6.0",
    "simple-peer": "^9.11.1",
    "react-hot-toast": "^2.4.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/simple-peer": "^9.11.0",
    "@vitejs/plugin-react": "^3.1.0",
    "vite": "^4.1.0",
    "tailwindcss": "^3.2.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^4.9.0"
  }
}
```

## 7. Testing and Deployment Guidelines

### Testing
- **Unit Tests**: Jest for React components (e.g., mock Socket.io).
- **E2E Tests**: Cypress for user flows (create room → join → video).
- **Manual**: Test with 2+ browsers/tabs; simulate disconnects.
- Coverage: Aim for 80% on core logic.

