import { useNumberGame } from "./stores/useNumberGame";
import { toast } from "sonner";

let socket: WebSocket | null = null;

const saveSessionToStorage = (playerName: string, playerId: string, roomId: string) => {
  const store = useNumberGame.getState();
  const isInGame = store.multiplayer.gameStatus === "playing";
  sessionStorage.setItem("multiplayerSession", JSON.stringify({
    playerName,
    playerId,
    roomId,
    timestamp: Date.now(),
    gameState: isInGame ? {
      gameStatus: store.multiplayer.gameStatus,
      sharedSecret: store.multiplayer.sharedSecret,
      attempts: store.multiplayer.attempts,
      startTime: store.multiplayer.startTime,
      settings: store.multiplayer.settings,
    } : null,
  }));
  localStorage.setItem("lastPlayerName", playerName);
};

export const getLastPlayerName = () => {
  return localStorage.getItem("lastPlayerName") || "";
};

const getSessionFromStorage = () => {
  const session = sessionStorage.getItem("multiplayerSession");
  if (session) {
    try {
      const parsed = JSON.parse(session);
      // Only consider sessions less than 30 minutes old as valid
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed;
      } else {
        sessionStorage.removeItem("multiplayerSession");
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const connectWebSocket = (playerName: string, roomId?: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/game`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
    if (roomId) {
      send({ type: "join_room", roomId, playerName });
    } else {
      send({ type: "create_room", playerName });
    }
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};

export const send = (message: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const clearSession = () => {
  sessionStorage.removeItem("multiplayerSession");
};

export const disconnect = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
  clearSession();
};

export const reconnectToSession = () => {
  const session = getSessionFromStorage();
  if (session && session.playerId && session.roomId) {
    return session;
  }
  return null;
};

export const reconnectWithRetry = (playerName: string, playerId: string, roomId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/game`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected - attempting reconnect");
    send({ 
      type: "reconnect", 
      playerId, 
      playerName,
      roomId 
    });
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};

const handleMessage = (message: any) => {
  const store = useNumberGame.getState();

  console.log("Received message:", message);

  switch (message.type) {
    case "room_created":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      if (message.players) {
        store.setPlayers(message.players);
      }
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room created:", message.roomId, "Host:", message.hostId);
      break;

    case "room_joined":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      store.setPlayers(message.players);
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room joined:", message.roomId, "Host:", message.hostId);
      break;

    case "players_updated":
      store.setPlayers(message.players);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      break;

    case "host_changed":
      store.setHostId(message.newHostId);
      break;

    case "settings_updated":
      store.setMultiplayerSettings(message.settings);
      break;

    case "game_started":
      store.setGameStatus("playing");
      store.setSharedSecret(message.sharedSecret);
      store.setMultiplayerPhase("playing");
      store.setMultiplayerStartTime();
      saveSessionToStorage(store.multiplayer.playerName, store.multiplayer.playerId, store.multiplayer.roomId);
      console.log("Game started with shared secret, startTime:", Date.now(), "phase:", store.multiplayer.phase);
      break;

    case "room_rejoined":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      store.setHostId(message.hostId);
      store.setPlayers(message.players);
      store.setIsConnecting(false);
      console.log("Successfully reconnected to room", message.roomId);
      break;

    case "game_state":
      store.setGameStatus(message.status);
      store.setSharedSecret(message.sharedSecret);
      // Restore settings
      if (message.settings) {
        store.setMultiplayerSettings(message.settings);
      }
      // Keep existing attempts and game data
      console.log("Received game state after reconnect");
      break;

    case "player_game_state":
      // Restore player's game data after reconnect
      message.attempts.forEach((attempt: any) => {
        store.addMultiplayerAttempt(attempt);
      });
      if (message.finished) {
        if (message.won) {
          store.setMultiplayerPhase("won");
        } else {
          store.setMultiplayerPhase("lost");
        }
      }
      console.log("Restored player game state");
      break;

    case "player_disconnected":
      toast.info(`اللاعب ${message.playerName} انقطع اتصاله`, {
        duration: 5000,
        icon: "📡",
      });
      break;

    case "player_reconnected":
      toast.success(`اللاعب ${message.playerName} عاد للعبة ✅`, {
        duration: 5000,
      });
      break;

    case "player_timeout":
      toast.warning(`اللاعب ${message.playerName} انقطع اتصاله نهائياً (انتهت مهلة 5 دقائق)`, {
        duration: 7000,
        icon: "⏱️",
      });
      break;

    case "guess_result":
      const attempt = {
        guess: message.guess,
        correctCount: message.correctCount,
        correctPositionCount: message.correctPositionCount,
      };
      store.addMultiplayerAttempt(attempt);
      
      if (message.won) {
        store.setMultiplayerPhase("won");
        store.setMultiplayerEndTime();
      }
      break;

    case "max_attempts_reached":
      store.setMultiplayerPhase("lost");
      store.setMultiplayerEndTime();
      console.log("Max attempts reached - game lost, waiting for final results...");
      break;

    case "player_attempt":
      // Another player made an attempt - update spectators
      console.log(`Player ${message.playerName} made attempt #${message.attemptNumber}${message.won ? ' and won!' : ''}`);
      // Spectators can see other players' attempts
      break;

    case "player_quit":
      console.log(`Player ${message.playerName} quit the game`);
      toast.info(`اللاعب ${message.playerName} انسحب من المباراة`, {
        duration: 5000,
        icon: "🚪",
      });
      break;

    case "game_results":
      // Show results to ALL players at the same time
      const currentState = useNumberGame.getState();
      store.setGameResults(message.winners, message.losers, message.sharedSecret);
      // Update still playing list
      useNumberGame.setState({
        multiplayer: {
          ...currentState.multiplayer,
          winners: message.winners,
          losers: message.losers,
          stillPlaying: message.stillPlaying || [],
          sharedSecret: message.sharedSecret,
          showResults: true,
          gameStatus: "finished",
        },
      });
      console.log("Game finished - results received", { winners: message.winners.length, losers: message.losers.length, stillPlaying: message.stillPlaying?.length });
      
      if (message.reason === "last_player_standing") {
        toast.success("انتهت المباراة! أنت اللاعب الوحيد المتبقي 🏆", {
          duration: 7000,
        });
      }
      break;

    case "player_details":
      // Could store this in a temporary state for showing details modal
      console.log("Player details received:", message);
      break;

    case "rematch_requested":
      store.setRematchRequested(true, message.countdown);
      break;

    case "rematch_countdown":
      store.setRematchCountdown(message.countdown);
      store.setRematchVotes(message.votes);
      break;

    case "rematch_vote_update":
      store.setRematchVotes(message.votes);
      break;

    case "rematch_starting":
      store.resetMultiplayerGame();
      store.setPlayers(message.players);
      console.log("Rematch starting - game reset");
      break;

    case "rematch_cancelled":
      store.setRematchRequested(false, null);
      console.log("Rematch cancelled:", message.message);
      break;

    case "kicked_from_room":
      console.log("Kicked from room:", message.message);
      store.resetMultiplayer();
      store.setMode("menu");
      break;

    case "error":
      console.error("Server error:", message.message);
      
      // Map server errors to user-friendly Arabic messages
      let errorMessage = message.message;
      if (message.message.includes("Room not found")) {
        errorMessage = "❌ الغرفة غير موجودة - جميع اللاعبين غادروا اللعبة";
      } else if (message.message.includes("full")) {
        errorMessage = "❌ الغرفة ممتلئة - لا يمكن الانضمام";
      } else if (message.message.includes("session not found")) {
        errorMessage = "❌ الجلسة انتهت - يرجى محاولة مرة أخرى";
      }
      
      store.setConnectionError(errorMessage);
      store.setIsConnecting(false);
      store.setRoomId("");
      store.setPlayerId("");
      clearSession();
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
};
