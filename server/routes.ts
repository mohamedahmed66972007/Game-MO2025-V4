import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string;
  disconnectTime?: number;
  timeoutHandle?: NodeJS.Timeout;
}

interface PlayerAttempt {
  guess: number[];
  correctCount: number;
  correctPositionCount: number;
  timestamp: number;
}

interface PlayerGameData {
  playerId: string;
  playerName: string;
  attempts: PlayerAttempt[];
  startTime: number;
  endTime: number | null;
  won: boolean;
  finished: boolean;
}

interface RematchVote {
  playerId: string;
  accepted: boolean;
}

interface GameSession {
  sharedSecret: number[];
  status: "waiting" | "playing" | "finished";
  players: Map<string, PlayerGameData>;
  startTime: number;
  endTime: number | null;
  rematchState: {
    requested: boolean;
    votes: Map<string, boolean>; // playerId -> accepted
    countdown: number | null;
    countdownHandle?: NodeJS.Timeout;
  };
}

interface Room {
  id: string;
  hostId: string;
  players: Player[];
  disconnectedPlayers: Map<string, { player: Player; disconnectTime: number; timeoutHandle: NodeJS.Timeout }>;
  game: GameSession | null;
  settings: { numDigits: number; maxAttempts: number };
  roomTimeoutHandle?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const players = new Map<WebSocket, Player>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateSecretCode(numDigits: number): number[] {
  return Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
}

function checkGuess(secret: number[], guess: number[]): { correctCount: number; correctPositionCount: number } {
  let correctCount = 0;
  let correctPositionCount = 0;

  const secretCopy = [...secret];
  const guessCopy = [...guess];
  const length = Math.min(secret.length, guess.length);

  for (let i = 0; i < length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

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
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname === "/game") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New game WebSocket connection");

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("close", () => {
      const player = players.get(ws);
      if (player) {
        const room = rooms.get(player.roomId);
        if (room) {
          // Remove from active players
          room.players = room.players.filter((p) => p.id !== player.id);
          
          // If game is finished, delete the player immediately (auto logout from results screen)
          if (room.game && room.game.status === "finished") {
            // Just remove the player, don't add to disconnected list
            console.log(`Player ${player.name} disconnected from finished game - auto logout`);
            
            // Delete room if it's completely empty
            if (room.players.length === 0 && room.disconnectedPlayers.size === 0) {
              if (room.game?.rematchState.countdownHandle) {
                clearInterval(room.game.rematchState.countdownHandle);
              }
              rooms.delete(player.roomId);
              console.log(`Room ${player.roomId} deleted (all players left finished game)`);
            }
          } else {
            // If game is active, keep the disconnected player for 5 minutes
            const disconnectTime = Date.now();
            player.disconnectTime = disconnectTime;
            
            // Add to disconnected players with 5-minute timeout
            const timeoutHandle = setTimeout(() => {
              const disconnected = room.disconnectedPlayers.get(player.id);
              if (disconnected) {
                room.disconnectedPlayers.delete(player.id);
                
                // If player is in active game, mark them as quit
                if (room.game && room.game.status === "playing") {
                  const playerData = room.game.players.get(player.id);
                  if (playerData && !playerData.finished) {
                    playerData.finished = true;
                    playerData.endTime = Date.now();
                    
                    // Notify others player timed out
                    broadcastToRoom(room, {
                      type: "player_timeout",
                      playerId: player.id,
                      playerName: player.name,
                    });
                    
                    checkGameEnd(room);
                  }
                }
              }
              
              // Delete room if it's completely empty
              const isRoomEmpty = room.players.length === 0 && room.disconnectedPlayers.size === 0;
              if (isRoomEmpty) {
                if (room.game?.rematchState.countdownHandle) {
                  clearInterval(room.game.rematchState.countdownHandle);
                }
                rooms.delete(player.roomId);
              }
            }, 5 * 60 * 1000); // 5 minutes
            
            room.disconnectedPlayers.set(player.id, { player, disconnectTime, timeoutHandle });
          }
          
          // Notify others that player disconnected
          broadcastToRoom(room, {
            type: "player_disconnected",
            playerId: player.id,
            playerName: player.name,
          });
          
          // Update players list for remaining players
          if (room.players.length > 0) {
            // If host left, assign new host
            if (room.hostId === player.id && room.players.length > 0) {
              room.hostId = room.players[0].id;
              broadcastToRoom(room, {
                type: "host_changed",
                newHostId: room.hostId,
              });
            }
            
            broadcastToRoom(room, {
              type: "players_updated",
              players: room.players.map((p) => ({ id: p.id, name: p.name })),
              hostId: room.hostId,
            });
          }
        }
        players.delete(ws);
      }
    });
  });

  function checkGameEnd(room: Room) {
    if (!room.game || room.game.status !== "playing") return;
    
    const allGamePlayers = Array.from(room.game.players.values());
    const activePlayers = allGamePlayers.filter(p => !p.finished);
    const allPlayersFinished = allGamePlayers.every(p => p.finished);
    
    // If only one player remains, declare them winner automatically
    if (activePlayers.length === 1) {
      const lastPlayer = activePlayers[0];
      lastPlayer.won = true;
      lastPlayer.finished = true;
      lastPlayer.endTime = Date.now();
      
      room.game.status = "finished";
      room.game.endTime = Date.now();
      
      const results = calculateGameResults(room);
      
      // Send results ONLY to finished players (winners/losers)
      room.players.forEach((player) => {
        const playerData = room.game!.players.get(player.id);
        if (playerData && playerData.finished) {
          send(player.ws, {
            type: "game_results",
            winners: results.winners,
            losers: results.losers,
            stillPlaying: results.stillPlaying,
            sharedSecret: room.game!.sharedSecret,
            reason: "last_player_standing",
          });
        }
      });
    } else if (allPlayersFinished && room.game) {
      room.game.status = "finished";
      room.game.endTime = Date.now();
      
      const results = calculateGameResults(room);
      
      // Send results to ALL players only when everyone is finished
      broadcastToRoom(room, {
        type: "game_results",
        winners: results.winners,
        losers: results.losers,
        stillPlaying: results.stillPlaying,
        sharedSecret: room.game.sharedSecret,
      });
    }
  }

  function calculateGameResults(room: Room) {
    if (!room.game) return { winners: [], losers: [], stillPlaying: [] };
    
    const winners: any[] = [];
    const losers: any[] = [];
    const stillPlaying: any[] = [];
    
    room.game.players.forEach((playerData) => {
      const endTime = playerData.endTime || Date.now();
      const playerInfo = {
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        attempts: playerData.attempts.length,
        duration: endTime - playerData.startTime,
        attemptsDetails: playerData.attempts,
      };
      
      if (playerData.won) {
        winners.push(playerInfo);
      } else if (playerData.finished) {
        losers.push(playerInfo);
      } else {
        stillPlaying.push(playerInfo);
      }
    });
    
    // Sort winners: first by attempts (ascending), then by duration (ascending)
    winners.sort((a, b) => {
      if (a.attempts !== b.attempts) {
        return a.attempts - b.attempts;
      }
      return a.duration - b.duration;
    });
    
    // Sort losers by duration (ascending) - those who lasted longer are ranked better among losers
    losers.sort((a, b) => b.duration - a.duration);
    
    // Assign ranks to winners
    winners.forEach((winner, index) => {
      winner.rank = index + 1;
    });
    
    return { winners, losers, stillPlaying };
  }

  function handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "create_room": {
        const roomId = generateRoomId();
        const playerId = generatePlayerId();
        const player: Player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId,
        };

        const room: Room = {
          id: roomId,
          hostId: playerId,
          players: [player],
          disconnectedPlayers: new Map(),
          game: null,
          settings: { numDigits: 4, maxAttempts: 20 },
        };

        rooms.set(roomId, room);
        players.set(ws, player);

        send(ws, {
          type: "room_created",
          roomId,
          playerId,
          hostId: playerId,
        });
        break;
      }

      case "join_room": {
        const room = rooms.get(message.roomId);
        if (room && room.players.length < 10) {
          // Don't allow joining if game is in progress
          if (room.game && room.game.status === "playing") {
            send(ws, { type: "error", message: "Game already in progress" });
            return;
          }
          
          // Don't allow joining if game is finished (results screen)
          if (room.game && room.game.status === "finished") {
            send(ws, { type: "error", message: "This game has finished. Please create a new room" });
            return;
          }
          
          const playerId = generatePlayerId();
          const player: Player = {
            id: playerId,
            name: message.playerName,
            ws,
            roomId: room.id,
          };

          if (!room.disconnectedPlayers) {
            room.disconnectedPlayers = new Map();
          }

          room.players.push(player);
          players.set(ws, player);

          send(ws, {
            type: "room_joined",
            roomId: room.id,
            playerId,
            hostId: room.hostId,
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
          });

          send(ws, {
            type: "settings_updated",
            settings: room.settings,
          });

          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
            hostId: room.hostId,
          });
        } else {
          send(ws, { type: "error", message: "Room not found or full" });
        }
        break;
      }

      case "update_settings": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Only host can update settings
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can update settings" });
          return;
        }

        // Can't update during active game
        if (room.game && room.game.status === "playing") {
          send(ws, { type: "error", message: "Cannot update settings during game" });
          return;
        }

        room.settings = message.settings;

        broadcastToRoom(room, {
          type: "settings_updated",
          settings: message.settings,
        });
        break;
      }

      case "start_game": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Only host can start game
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can start game" });
          return;
        }

        // Need at least 2 players
        if (room.players.length < 2) {
          send(ws, { type: "error", message: "Need at least 2 players to start" });
          return;
        }

        // Generate shared secret
        const sharedSecret = generateSecretCode(room.settings.numDigits);
        
        // Initialize game session
        const game: GameSession = {
          sharedSecret,
          status: "playing",
          players: new Map(),
          startTime: Date.now(),
          endTime: null,
          rematchState: {
            requested: false,
            votes: new Map(),
            countdown: null,
          },
        };

        // Initialize player data
        room.players.forEach((p) => {
          game.players.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            attempts: [],
            startTime: Date.now(),
            endTime: null,
            won: false,
            finished: false,
          });
        });

        room.game = game;

        // Broadcast game start to all players
        broadcastToRoom(room, {
          type: "game_started",
          sharedSecret, // All players get the same secret
          settings: room.settings,
        });
        break;
      }

      case "submit_guess": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        const playerData = room.game.players.get(player.id);
        if (!playerData) return;

        // Check if player already finished
        if (playerData.finished) {
          send(ws, { type: "error", message: "You have already finished" });
          return;
        }

        // Check if max attempts reached
        if (playerData.attempts.length >= room.settings.maxAttempts) {
          playerData.finished = true;
          playerData.endTime = Date.now();
          
          send(ws, {
            type: "max_attempts_reached",
            message: "لقد استنفذت جميع محاولاتك",
          });
          
          // Set 5-minute timeout for losing player
          const timeoutHandle = setTimeout(() => {
            console.log(`Timeout reached for loser ${player.name} in room ${player.roomId}`);
            // Game end will be checked when timeout expires if other players are still active
            checkGameEnd(room);
          }, 5 * 60 * 1000); // 5 minutes
          
          // Mark timeout handle on player data so we can clear it if they reconnect
          (playerData as any).timeoutHandle = timeoutHandle;
          
          checkGameEnd(room);
          return;
        }

        const { correctCount, correctPositionCount } = checkGuess(room.game.sharedSecret, message.guess);
        
        const attempt: PlayerAttempt = {
          guess: message.guess,
          correctCount,
          correctPositionCount,
          timestamp: Date.now(),
        };

        playerData.attempts.push(attempt);

        const won = correctPositionCount === room.settings.numDigits;
        
        if (won) {
          playerData.won = true;
          playerData.finished = true;
          playerData.endTime = Date.now();
        }

        // Send result to the player
        send(ws, {
          type: "guess_result",
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          attemptNumber: playerData.attempts.length,
        });

        // Broadcast to others that this player made an attempt
        broadcastToRoom(room, {
          type: "player_attempt",
          playerId: player.id,
          playerName: player.name,
          attemptNumber: playerData.attempts.length,
          won,
        }, ws);

        // Check if game should end
        if (won) {
          checkGameEnd(room);
        }
        break;
      }

      case "request_attempt_details": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        const targetPlayerData = room.game.players.get(message.targetPlayerId);
        if (!targetPlayerData) return;

        send(ws, {
          type: "player_details",
          playerId: targetPlayerData.playerId,
          playerName: targetPlayerData.playerName,
          attempts: targetPlayerData.attempts,
          duration: targetPlayerData.endTime ? targetPlayerData.endTime - targetPlayerData.startTime : 0,
        });
        break;
      }

      case "request_rematch": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        // Only host can request rematch
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can request rematch" });
          return;
        }

        // Game must be finished
        if (room.game.status !== "finished") {
          send(ws, { type: "error", message: "Game is not finished yet" });
          return;
        }

        // Initialize rematch state
        room.game.rematchState.requested = true;
        room.game.rematchState.votes.clear();
        room.game.rematchState.countdown = 10;
        
        // Host automatically votes yes
        room.game.rematchState.votes.set(player.id, true);

        // Broadcast rematch request
        broadcastToRoom(room, {
          type: "rematch_requested",
          countdown: 10,
        });

        // Start countdown
        const countdownHandle = setInterval(() => {
          if (!room.game || !room.game.rematchState.countdown) {
            clearInterval(countdownHandle);
            return;
          }

          room.game.rematchState.countdown--;

          if (room.game.rematchState.countdown <= 0) {
            clearInterval(countdownHandle);
            
            // Process rematch
            const acceptedPlayers = Array.from(room.game.rematchState.votes.entries())
              .filter(([_, accepted]) => accepted)
              .map(([playerId, _]) => playerId);
            
            // Need at least 2 players who accepted
            if (acceptedPlayers.length >= 2) {
              // Remove players who didn't accept
              const rejectedPlayers = room.players.filter(
                p => !acceptedPlayers.includes(p.id) && p.id !== room.hostId
              );
              
              rejectedPlayers.forEach(p => {
                send(p.ws, {
                  type: "kicked_from_room",
                  message: "لم تقبل إعادة المباراة",
                });
              });
              
              room.players = room.players.filter(p => 
                acceptedPlayers.includes(p.id) || p.id === room.hostId
              );
              
              // Reset game
              room.game = null;
              
              broadcastToRoom(room, {
                type: "rematch_starting",
                players: room.players.map((p) => ({ id: p.id, name: p.name })),
              });
            } else {
              broadcastToRoom(room, {
                type: "rematch_cancelled",
                message: "لم يكن هناك لاعبين كافيين",
              });
              room.game.rematchState.requested = false;
            }
          } else {
            broadcastToRoom(room, {
              type: "rematch_countdown",
              countdown: room.game.rematchState.countdown,
              votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
                playerId,
                accepted,
              })),
            });
          }
        }, 1000);

        room.game.rematchState.countdownHandle = countdownHandle;
        break;
      }

      case "rematch_vote": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        if (!room.game.rematchState.requested) {
          send(ws, { type: "error", message: "No rematch requested" });
          return;
        }

        room.game.rematchState.votes.set(player.id, message.accepted);

        // Broadcast updated votes
        broadcastToRoom(room, {
          type: "rematch_vote_update",
          playerId: player.id,
          accepted: message.accepted,
          votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
            playerId,
            accepted,
          })),
        });
        break;
      }

      case "reconnect": {
        const room = rooms.get(message.roomId);
        if (!room) {
          send(ws, { type: "error", message: "Room not found" });
          return;
        }
        
        const disconnected = room.disconnectedPlayers?.get(message.playerId);
        if (!disconnected) {
          send(ws, { type: "error", message: "Player session not found or expired" });
          return;
        }
        
        // Clear the timeout since player reconnected
        clearTimeout(disconnected.timeoutHandle);
        room.disconnectedPlayers.delete(message.playerId);
        
        // Restore player to active
        const reconnectedPlayer: Player = {
          id: message.playerId,
          name: message.playerName,
          ws,
          roomId: room.id,
        };
        
        room.players.push(reconnectedPlayer);
        players.set(ws, reconnectedPlayer);
        
        console.log(`Player ${message.playerName} reconnected to room ${room.id}`);
        
        send(ws, {
          type: "room_rejoined",
          roomId: room.id,
          playerId: message.playerId,
          hostId: room.hostId,
          players: room.players.map((p) => ({ id: p.id, name: p.name })),
        });
        
        if (room.game) {
          send(ws, {
            type: "game_state",
            sharedSecret: room.game.sharedSecret,
            status: room.game.status,
            settings: room.settings,
            gameStartTime: room.game.startTime,
          });
          
          // Send current game data for this player
          const playerData = room.game.players.get(message.playerId);
          if (playerData) {
            send(ws, {
              type: "player_game_state",
              attempts: playerData.attempts,
              finished: playerData.finished,
              won: playerData.won,
            });
          }
        }
        
        // Notify others of reconnection
        broadcastToRoom(room, {
          type: "player_reconnected",
          playerId: message.playerId,
          playerName: message.playerName,
        }, ws);
        
        broadcastToRoom(room, {
          type: "players_updated",
          players: room.players.map((p) => ({ id: p.id, name: p.name })),
          hostId: room.hostId,
        });
        break;
      }

      case "leave_room": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Handle cleanup (same as disconnect)
        if (room.game && room.game.status === "playing") {
          const playerData = room.game.players.get(player.id);
          if (playerData && !playerData.finished) {
            playerData.finished = true;
            playerData.endTime = Date.now();
            
            broadcastToRoom(room, {
              type: "player_quit",
              playerId: player.id,
              playerName: player.name,
            }, ws);
            
            checkGameEnd(room);
          }
        }
        
        room.players = room.players.filter((p) => p.id !== player.id);
        
        if (room.players.length === 0) {
          if (room.game?.rematchState.countdownHandle) {
            clearInterval(room.game.rematchState.countdownHandle);
          }
          rooms.delete(player.roomId);
        } else {
          if (room.hostId === player.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
            broadcastToRoom(room, {
              type: "host_changed",
              newHostId: room.hostId,
            });
          }
          
          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
            hostId: room.hostId,
          });
        }
        
        players.delete(ws);
        break;
      }
    }
  }

  function send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcastToRoom(room: Room, message: any, exclude?: WebSocket) {
    room.players.forEach((player) => {
      if (player.ws !== exclude) {
        send(player.ws, message);
      }
    });
  }

  return httpServer;
}
