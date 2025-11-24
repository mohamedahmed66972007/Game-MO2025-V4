import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useChallenge } from "./useChallenge";

export type GameMode = "menu" | "singleplayer" | "multiplayer";
export type GamePhase = "playing" | "won" | "lost";
export type GameStatus = "waiting" | "playing" | "finished";

interface Attempt {
  guess: number[];
  correctCount: number;
  correctPositionCount: number;
}

interface GameSettings {
  numDigits: number;
  maxAttempts: number;
}

interface SingleplayerState {
  secretCode: number[];
  currentGuess: number[];
  attempts: Attempt[];
  phase: GamePhase;
  startTime: number;
  endTime: number | null;
  settings: GameSettings;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  attempts: number;
  duration: number;
  attemptsDetails: Attempt[];
  rank?: number;
}

interface RematchVote {
  playerId: string;
  accepted: boolean;
}

interface MultiplayerState {
  roomId: string;
  playerId: string;
  playerName: string;
  hostId: string;
  isHost: boolean;
  players: { id: string; name: string }[];
  gameStatus: GameStatus;
  sharedSecret: number[];
  currentGuess: number[];
  attempts: Attempt[];
  phase: GamePhase;
  startTime: number;
  endTime: number | null;
  winners: PlayerResult[];
  losers: PlayerResult[];
  stillPlaying: PlayerResult[];
  showResults: boolean;
  rematchState: {
    requested: boolean;
    countdown: number | null;
    votes: RematchVote[];
  };
  settings: GameSettings;
}

interface NumberGameState {
  mode: GameMode;
  isConnecting: boolean;
  connectionError: string | null;
  singleplayer: SingleplayerState;
  multiplayer: MultiplayerState;

  // Mode actions
  setMode: (mode: GameMode) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Singleplayer actions
  startSingleplayer: (settings: GameSettings) => void;
  addDigitToGuess: (digit: number) => void;
  deleteLastDigit: () => void;
  submitGuess: () => void;
  restartSingleplayer: () => void;
  setSingleplayerSettings: (settings: GameSettings) => void;

  // Multiplayer actions
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: string) => void;
  setPlayerName: (name: string) => void;
  setHostId: (hostId: string) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayers: (players: { id: string; name: string }[]) => void;
  setGameStatus: (status: GameStatus) => void;
  setSharedSecret: (secret: number[]) => void;
  addMultiplayerDigit: (digit: number) => void;
  deleteMultiplayerDigit: () => void;
  submitMultiplayerGuess: () => void;
  addMultiplayerAttempt: (attempt: Attempt) => void;
  setMultiplayerPhase: (phase: GamePhase) => void;
  setMultiplayerStartTime: () => void;
  setMultiplayerEndTime: () => void;
  setGameResults: (winners: PlayerResult[], losers: PlayerResult[], sharedSecret: number[]) => void;
  setShowResults: (show: boolean) => void;
  setRematchRequested: (requested: boolean, countdown: number | null) => void;
  setRematchVotes: (votes: RematchVote[]) => void;
  setRematchCountdown: (countdown: number | null) => void;
  resetMultiplayer: () => void;
  resetMultiplayerGame: () => void;
  setMultiplayerSettings: (settings: GameSettings) => void;
}

const generateSecretCode = (numDigits: number = 4): number[] => {
  return Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
};

const checkGuess = (secret: number[], guess: number[]): { correctCount: number; correctPositionCount: number } => {
  let correctCount = 0;
  let correctPositionCount = 0;

  const secretCopy = [...secret];
  const guessCopy = [...guess];
  const length = Math.min(secret.length, guess.length);

  // First pass: check correct positions
  for (let i = 0; i < length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  // Second pass: check correct digits in wrong positions
  for (let i = 0; i < length; i++) {
    if (guessCopy[i] !== -2) {
      const index = secretCopy.indexOf(guessCopy[i]);
      if (index !== -1) {
        correctCount++;
        secretCopy[index] = -1;
      }
    }
  }

  correctCount += correctPositionCount;

  return { correctCount, correctPositionCount };
};

export const useNumberGame = create<NumberGameState>()(
  subscribeWithSelector((set, get) => ({
    mode: "menu",
    isConnecting: false,
    connectionError: null,
    singleplayer: {
      secretCode: [],
      currentGuess: [],
      attempts: [],
      phase: "playing",
      startTime: 0,
      endTime: null,
      settings: { numDigits: 4, maxAttempts: 20 },
    },
    multiplayer: {
      roomId: "",
      playerId: "",
      playerName: "",
      hostId: "",
      isHost: false,
      players: [],
      gameStatus: "waiting",
      sharedSecret: [],
      currentGuess: [],
      attempts: [],
      phase: "playing",
      startTime: 0,
      endTime: null,
      winners: [],
      losers: [],
      stillPlaying: [],
      showResults: false,
      rematchState: {
        requested: false,
        countdown: null,
        votes: [],
      },
      settings: { numDigits: 4, maxAttempts: 20 },
    },

    setMode: (mode) => set({ mode }),
    setIsConnecting: (isConnecting) => set({ isConnecting }),
    setConnectionError: (error) => set({ connectionError: error }),

    startSingleplayer: (settings: GameSettings = { numDigits: 4, maxAttempts: 20 }) => {
      const secretCode = generateSecretCode(settings.numDigits);
      console.log("Secret code generated:", secretCode);
      set({
        mode: "singleplayer",
        singleplayer: {
          secretCode,
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: Date.now(),
          endTime: null,
          settings,
        },
      });
    },

    addDigitToGuess: (digit) => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length < singleplayer.settings.numDigits && singleplayer.phase === "playing" && singleplayer.attempts.length < singleplayer.settings.maxAttempts) {
        set({
          singleplayer: {
            ...singleplayer,
            currentGuess: [...singleplayer.currentGuess, digit],
          },
        });
      }
    },

    deleteLastDigit: () => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length > 0 && singleplayer.phase === "playing") {
        set({
          singleplayer: {
            ...singleplayer,
            currentGuess: singleplayer.currentGuess.slice(0, -1),
          },
        });
      }
    },

    submitGuess: () => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length === singleplayer.settings.numDigits && singleplayer.phase === "playing") {
        const { correctCount, correctPositionCount } = checkGuess(
          singleplayer.secretCode,
          singleplayer.currentGuess
        );

        const newAttempt: Attempt = {
          guess: singleplayer.currentGuess,
          correctCount,
          correctPositionCount,
        };

        const won = correctPositionCount === singleplayer.settings.numDigits;
        const newAttempts = [...singleplayer.attempts, newAttempt];
        const lost = newAttempts.length >= singleplayer.settings.maxAttempts && !won;

        set({
          singleplayer: {
            ...singleplayer,
            attempts: newAttempts,
            currentGuess: [],
            phase: won ? "won" : (lost ? "lost" : "playing"),
            endTime: (won || lost) ? Date.now() : null,
          },
        });
      }
    },

    restartSingleplayer: () => {
      const { singleplayer } = get();
      useChallenge.getState().resetChallenge();
      const newSecretCode = generateSecretCode(singleplayer.settings.numDigits);
      console.log("Secret code generated:", newSecretCode);
      set({
        singleplayer: {
          secretCode: newSecretCode,
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: Date.now(),
          endTime: null,
          settings: singleplayer.settings,
        },
      });
    },

    setSingleplayerSettings: (settings) => set((state) => ({ singleplayer: { ...state.singleplayer, settings } })),

    setRoomId: (roomId) => set((state) => ({ multiplayer: { ...state.multiplayer, roomId } })),
    setPlayerId: (playerId) => set((state) => ({ multiplayer: { ...state.multiplayer, playerId } })),
    setPlayerName: (playerName) => set((state) => ({ multiplayer: { ...state.multiplayer, playerName } })),
    setHostId: (hostId) => set((state) => ({ 
      multiplayer: { 
        ...state.multiplayer, 
        hostId,
        isHost: hostId === state.multiplayer.playerId,
      } 
    })),
    setIsHost: (isHost) => set((state) => ({ multiplayer: { ...state.multiplayer, isHost } })),
    setPlayers: (players) => set((state) => ({ multiplayer: { ...state.multiplayer, players } })),
    setGameStatus: (gameStatus) => set((state) => ({ multiplayer: { ...state.multiplayer, gameStatus } })),
    setSharedSecret: (sharedSecret) => set((state) => ({ multiplayer: { ...state.multiplayer, sharedSecret } })),

    addMultiplayerDigit: (digit) => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length < multiplayer.settings.numDigits && 
          multiplayer.attempts.length < multiplayer.settings.maxAttempts &&
          multiplayer.phase === "playing") {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: [...multiplayer.currentGuess, digit],
          },
        });
      }
    },

    deleteMultiplayerDigit: () => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length > 0) {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: multiplayer.currentGuess.slice(0, -1),
          },
        });
      }
    },

    submitMultiplayerGuess: () => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length === multiplayer.settings.numDigits) {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: [],
          },
        });
      }
    },

    addMultiplayerAttempt: (attempt) => {
      const { multiplayer } = get();
      set({
        multiplayer: {
          ...multiplayer,
          attempts: [...multiplayer.attempts, attempt],
        },
      });
    },

    setMultiplayerPhase: (phase) => set((state) => ({ multiplayer: { ...state.multiplayer, phase } })),
    setMultiplayerStartTime: () => set((state) => ({ multiplayer: { ...state.multiplayer, startTime: Date.now() } })),
    setMultiplayerEndTime: () => set((state) => ({ multiplayer: { ...state.multiplayer, endTime: Date.now() } })),
    
    setGameResults: (winners, losers, sharedSecret) => set((state) => ({ 
      multiplayer: { 
        ...state.multiplayer, 
        winners, 
        losers,
        sharedSecret,
        showResults: true,
        gameStatus: "finished",
      } 
    })),
    
    setShowResults: (showResults) => set((state) => ({ multiplayer: { ...state.multiplayer, showResults } })),
    
    setRematchRequested: (requested, countdown) => set((state) => ({ 
      multiplayer: { 
        ...state.multiplayer, 
        rematchState: {
          ...state.multiplayer.rematchState,
          requested,
          countdown,
        }
      } 
    })),
    
    setRematchVotes: (votes) => set((state) => ({ 
      multiplayer: { 
        ...state.multiplayer, 
        rematchState: {
          ...state.multiplayer.rematchState,
          votes,
        }
      } 
    })),
    
    setRematchCountdown: (countdown) => set((state) => ({ 
      multiplayer: { 
        ...state.multiplayer, 
        rematchState: {
          ...state.multiplayer.rematchState,
          countdown,
        }
      } 
    })),

    resetMultiplayer: () =>
      set((state) => ({
        multiplayer: {
          ...state.multiplayer,
          roomId: "",
          playerId: "",
          hostId: "",
          isHost: false,
          players: [],
          gameStatus: "waiting",
          sharedSecret: [],
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: 0,
          endTime: null,
          winners: [],
          losers: [],
          showResults: false,
          isWatching: false,
          watchingPlayerId: null,
          rematchState: {
            requested: false,
            countdown: null,
            votes: [],
          },
        },
      })),
    
    resetMultiplayerGame: () =>
      set((state) => ({
        multiplayer: {
          ...state.multiplayer,
          gameStatus: "waiting",
          sharedSecret: [],
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: 0,
          endTime: null,
          winners: [],
          losers: [],
          stillPlaying: [],
          showResults: false,
          rematchState: {
            requested: false,
            countdown: null,
            votes: [],
          },
        },
      })),

    setMultiplayerSettings: (settings) => set((state) => ({ multiplayer: { ...state.multiplayer, settings } })),
  }))
);
