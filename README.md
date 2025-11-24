# Overview

This is a 3D guessing game application built with React and Three.js. Players attempt to guess a secret numerical code through multiple attempts, receiving feedback on correctness and position accuracy. The game supports both single-player and multiplayer modes with real-time WebSocket communication.

The application features:
- **Single-player mode**: Play against the computer with customizable difficulty
- **Multiplayer mode**: Real-time competitive gameplay via WebSocket connections
- **3D environment**: Immersive first-person perspective built with React Three Fiber
- **Challenge mini-game**: Pattern-matching memory game with audio-visual elements
- **Mobile responsive**: Separate mobile UI for touch-based interactions
- **Arabic language support**: UI text in Arabic (right-to-left layout)

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
- Session persistence via sessionStorage for reconnection
- Message types: challenge_player, set_secret_code, make_guess, turn_timeout, request_rematch

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
- Turn-based gameplay with 60-second turn timer
- Secret code validation with correctness/position feedback
- Player matching and challenge system
- Automatic timeout handling and game state synchronization

**WebSocket Message Flow:**
1. Player creates/joins room → Server assigns room and player ID
2. Challenge initiation → Server notifies opponent
3. Secret code exchange → Both players set codes before game starts
4. Turn-based guessing → Server validates and broadcasts results
5. Game completion → Winner determination and rematch handling

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
- Room state maintained in server memory (Map structures)
- Client-side session persistence for reconnection after refresh
- 30-minute session timeout for inactive games

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