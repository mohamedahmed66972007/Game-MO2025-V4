# Overview

This project is a 3D guessing game built with React and Three.js, where players guess a secret numerical code. It features single-player and real-time multiplayer modes via WebSockets, an immersive 3D environment, a challenge mini-game, and mobile responsiveness. Key capabilities include Arabic language support, a live timer with a 5-minute game timeout, and a reconnection system that preserves game state for disconnected players for up to 5 minutes. The game aims to provide an engaging and competitive experience with intuitive UI for both desktop and mobile users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- React Three Fiber and Drei for 3D rendering
- Vite for build and development
- TailwindCSS for styling
- Radix UI for accessible components
- Zustand for client-side state management

**Rendering Strategy:**
- **Desktop:** Full 3D first-person environment with pointer lock.
- **Mobile:** 2D touch-optimized interface with a custom number pad, detected via `useIsMobile` hook (768px breakpoint).

**Key 3D Components:**
- `FirstPersonControls`: Custom FPS camera.
- `NumberPanel`: Interactive 3D number input.
- `AttemptsHistory`: 3D display of past guesses.
- `ChallengeDoor` & `ChallengeRoom`: For mini-game integration.

**State Management:**
- `useNumberGame`: Manages main game state (single-player and multiplayer).
- `useChallenge`: Manages challenge mini-game state.
- `useAudio`: Handles audio feedback.

**Client-Server Communication:**
- Real-time multiplayer via WebSocket.
- Session persistence via sessionStorage for reconnection.

## Backend Architecture

**Technology Stack:**
- Express.js with TypeScript
- `ws` library for WebSocket communication
- Neon serverless PostgreSQL with Drizzle ORM (for future use)

**Server Structure:**
- `server/index.ts`: Express app and middleware.
- `server/routes.ts`: WebSocket server and game logic.
- `server/db.ts`: Database connection setup.
- `server/storage.ts`: Storage interface (currently in-memory).

**Game Logic:**
- Room-based multiplayer with unique IDs.
- Independent, simultaneous guessing.
- Auto-generated shared secret codes.
- Comprehensive reconnection system:
  - Disconnected players stored with a 5-minute timeout.
  - Game data (attempts, score) preserved.
  - Automatic cleanup of abandoned rooms and player timeouts.

## Data Storage

**Database:**
- PostgreSQL via Neon serverless (configured but not fully implemented for authentication).
- Drizzle ORM for type-safe queries.

**Session Management:**
- WebSocket connections tracked per player.
- Room state maintained in server memory (Map structures).
- Client-side session storage for reconnection after refresh (30-minute expiry).
- 5-minute timeout for disconnected players in active games.

## System Design Choices

**UI/UX:**
- Responsive design for both desktop (3D immersive) and mobile (2D touch-optimized).
- Arabic language support with right-to-left layouts.
- Rematch voting system with responsive UI and instant game start upon approval.
- Redesigned results screen with ranking and confetti animations.

**Technical Implementations:**
- Live timer with 100ms updates and a 5-minute game timeout.
- Immediate loss detection when max attempts are reached.
- Robust reconnection system that restores full game state.
- Challenge mini-games: "Light Sequence Challenge," "Memory Board," and a "Direction Sorting Challenge" with visual/audio feedback and input variations for mobile/desktop.

# External Dependencies

**3D Graphics & Rendering:**
- `@react-three/fiber`, `@react-three/drei`, `three`, `@react-three/postprocessing`, `vite-plugin-glsl`.

**UI Component Library:**
- `@radix-ui/*` (for accessible primitives).

**Database & Backend:**
- `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `ws`.

**Styling:**
- `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.

**State & Data Fetching:**
- `@tanstack/react-query` (server state), `zustand` (client state).

**Fonts & Assets:**
- `@fontsource/inter`, custom font JSON for 3D text.

**Development Tools:**
- `@replit/vite-plugin-runtime-error-modal`, `tsx`, `esbuild`, `vite`.