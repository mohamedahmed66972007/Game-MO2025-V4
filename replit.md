# Overview

This is a 3D guessing game application built with React and Three.js. Players attempt to guess a secret numerical code through multiple attempts, receiving feedback on correctness and position accuracy. The game supports both single-player and multiplayer modes with real-time WebSocket communication.

The application features:
- **Single-player mode**: Play against the computer with customizable difficulty
- **Multiplayer mode**: Real-time competitive gameplay via WebSocket connections
- **3D environment**: Immersive first-person perspective built with React Three Fiber
- **Challenge mini-game**: Pattern-matching memory game with audio-visual elements
- **Mobile responsive**: Separate mobile UI for touch-based interactions
- **Arabic language support**: UI text in Arabic (right-to-left layout)
- **Live timer**: Real-time elapsed time counter during gameplay (updates every 100ms)
- **Spectator mode**: Finished players can watch active players with live updates
- **Reconnection system**: Players can reconnect within 5 minutes and resume their game with all data preserved

# Recent Changes (November 23, 2025)

**Reconnection System with 5-Minute Timeout:**
- Players who disconnect can rejoin within 5 minutes with all game data preserved
  - Attempts, current score, game state all restored
  - If player doesn't reconnect within 5 minutes → kicked from room
- Server tracks disconnected players separately:
  - Active players in `room.players`
  - Disconnected players in `room.disconnectedPlayers` with timeout tracking
  - Automatic cleanup of abandoned rooms after all timeouts expire
- New WebSocket messages:
  - Client sends: `reconnect` message with playerId, playerName, roomId
  - Server sends: `room_rejoined`, `game_state`, `player_game_state`
  - Broadcast: `player_disconnected`, `player_reconnected`, `player_timeout`
- Client-side:
  - Session stored in sessionStorage (30-minute expiry)
  - `reconnectWithRetry()` function connects and sends reconnect message
  - Game data restored from server response

**Previous Session Changes:**
- Added live timer with 100ms updates in mobile multiplayer interface
- Fixed mousedown listener bug in NumberPanel.tsx preventing HMR errors
- Implemented spectator mode for finished players
- Results screen shows only for finished/watching players

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for UI components
- React Three Fiber (@react-three/fiber) and Drei for 3D rendering
- Vite as build tool and development server
- TailwindCSS with custom theme for styling
- Radix UI components for accessible UI primitives
- Zustand for client-side state management

**Rendering Strategy:**
- Desktop: Full 3D first-person environment with pointer lock controls
- Mobile: 2D touch-optimized interface with custom number pad
- Responsive detection via `useIsMobile` hook (768px breakpoint)

**3D Scene Components:**
- FirstPersonControls: Custom FPS camera with pointer lock and keyboard movement
- NumberPanel: Interactive 3D buttons for number input in game scene
- DisplayPanel: Shows current guess in 3D space
- AttemptsHistory: Scrollable 3D panel displaying guess history
- ChallengeDoor: Portal to mini-game challenge room
- ChallengeRoom: Separate 3D environment for pattern-matching game

**State Management:**
- `useNumberGame`: Main game state (Zustand store)
  - Manages single-player and multiplayer game states separately
  - Tracks attempts, secret codes, settings, and game phases
  - Handles game mode transitions
- `useChallenge`: Challenge mini-game state
  - Pattern sequence generation and validation
  - Hint system for main game integration
- `useAudio`: Audio feedback management
  - Sound effects for button presses and game events

**Client-Server Communication:**
- WebSocket connection for real-time multiplayer
- Session persistence via sessionStorage for reconnection (30-min expiry)
- Message types: create_room, join_room, reconnect, start_game, submit_guess, leave_room, etc.
- Automatic data restoration on reconnect

## Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- WebSocket (ws library) for real-time communication
- Neon serverless PostgreSQL with Drizzle ORM
- Session-based architecture with in-memory storage fallback

**Server Structure:**
- `server/index.ts`: Express app setup, middleware, error handling
- `server/routes.ts`: WebSocket server and game logic
- `server/db.ts`: Database connection with Neon serverless
- `server/storage.ts`: Storage interface with MemStorage implementation
- `server/vite.ts`: Vite integration for development HMR

**Game Logic:**
- Room-based multiplayer system with unique room IDs
- Independent simultaneous guessing (no turns/timers)
- Auto-generated shared secret code
- Secret code validation with correctness/position feedback
- Host controls for settings and game start
- Automatic winner/loser determination
- Spectator mode for finished players
- **Reconnection system**:
  - Disconnected players stored with 5-minute timeout
  - Game data preserved in `room.game.players` Map
  - Automatic cleanup and player timeout after 5 minutes
  - Reconnected players restore full game state

**WebSocket Message Flow:**
1. Player creates/joins room → Server assigns room and player ID
2. Host starts game → Server generates shared secret code
3. All players guess simultaneously → Server validates and broadcasts results
4. **Player disconnects** → Added to disconnectedPlayers (5-min timeout)
5. **Player reconnects** → Checks disconnectedPlayers, clears timeout, restores game state
6. Players finish → Spectator mode enabled
7. Game completion → Results display with rankings

## Data Storage

**Database Schema (Drizzle ORM):**
- Users table: `id`, `username`, `password` (authentication ready but not fully implemented)
- PostgreSQL dialect via Neon serverless connection
- Schema location: `shared/schema.ts` for type sharing between client/server

**Storage Pattern:**
- `IStorage` interface defines CRUD operations
- `MemStorage` class provides in-memory fallback
- Database operations ready for future authentication implementation

**Session Management:**
- WebSocket connections tracked per player
- Room state maintained in server memory (Map structures):
  - `room.players`: Active connected players
  - `room.disconnectedPlayers`: Disconnected players with timeout tracking
- Client-side session persistence for reconnection after refresh
- 30-minute session timeout for inactive games
- 5-minute timeout for disconnected players in active games

## External Dependencies

**3D Graphics & Rendering:**
- `@react-three/fiber`: React renderer for Three.js
- `@react-three/drei`: Helper components for Three.js (Text, RoundedBox, KeyboardControls)
- `@react-three/postprocessing`: Post-processing effects
- `vite-plugin-glsl`: GLSL shader support
- `three`: Core 3D library (peer dependency)

**UI Component Library:**
- `@radix-ui/*`: Comprehensive set of unstyled, accessible primitives
  - Dialogs, dropdowns, tooltips, accordions, and 20+ other components
  - Provides accessibility and keyboard navigation out of the box

**Database & Backend:**
- `@neondatabase/serverless`: PostgreSQL client optimized for serverless/edge
- `drizzle-orm`: TypeScript ORM with type-safe queries
- `drizzle-kit`: Schema migrations and push commands
- `ws`: WebSocket server implementation
- `connect-pg-simple`: PostgreSQL session store (configured but not actively used)

**Styling:**
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Component variant management
- `clsx` / `tailwind-merge`: Conditional class utilities

**State & Data Fetching:**
- `@tanstack/react-query`: Server state management and caching
- `zustand`: Lightweight client state management

**Fonts & Assets:**
- `@fontsource/inter`: Self-hosted Inter font family
- Custom font JSON for 3D text rendering (troika-three-text format)

**Development Tools:**
- `@replit/vite-plugin-runtime-error-modal`: Error overlay for Replit environment
- `tsx`: TypeScript execution for development
- `esbuild`: Fast bundler for production builds
- `vite`: Frontend build tool with HMR

**Build Configuration:**
- Development: `tsx server/index.ts` (direct TypeScript execution)
- Production: Vite build + esbuild bundle → Node.js execution
- Database: `drizzle-kit push` for schema synchronization

# Mobile vs Desktop Interfaces

**Desktop (3D Mode):**
- First-person 3D environment with interactive number buttons
- Pointer lock for FPS-style mouse controls
- Full spatial audio and 3D effects

**Mobile (2D Mode - Auto-detected at 768px):**
- Touch-optimized grid layout for number pad
- Game interface matches desktop gameplay exactly
- Lobby and results screens differ slightly for mobile constraints
- Swipe-friendly buttons with large touch targets

# Reconnection Behavior

**When Player Disconnects:**
1. Server marks player as disconnected (doesn't delete immediately)
2. Remaining players notified with `player_disconnected` message
3. Timeout starts (5 minutes)
4. All game data preserved (attempts, state, start time)

**When Player Reconnects Within 5 Minutes:**
1. Client sends `reconnect` message with playerId, playerName, roomId
2. Server validates session exists and hasn't timed out
3. Clears the timeout, removes from disconnectedPlayers
4. Restores player to active players list
5. Sends player their complete game state (attempts, game status, etc.)
6. Other players notified with `player_reconnected` message

**When 5-Minute Timeout Expires:**
1. Player is marked as finished in game
2. All players notified with `player_timeout` message
3. Game end checked (may trigger winner if last player)
4. Player data removed from disconnectedPlayers
5. Room deleted if empty

# Known Limitations & Future Enhancements

**Current Limitations:**
- Authentication system designed but not fully implemented
- Database integration optional (works without DATABASE_URL)
- Single-player challenge mini-game available but not integrated into main flow

**Future Enhancements:**
- User accounts and persistent statistics
- Leaderboards and ranking system
- Custom room settings UI for non-host players
- Audio/visual preferences
- Game replay system
- Auto-reconnect with exponential backoff
