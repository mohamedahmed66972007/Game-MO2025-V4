// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
var rooms = /* @__PURE__ */ new Map();
var players = /* @__PURE__ */ new Map();
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}
function generateSecretCode(numDigits) {
  return Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
}
function checkGuess(secret, guess) {
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
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === "/game") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });
  wss.on("connection", (ws) => {
    console.log("New game WebSocket connection");
    ws.on("message", (data) => {
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
          room.players = room.players.filter((p) => p.id !== player.id);
          if (room.game && room.game.status === "finished") {
            console.log(`Player ${player.name} disconnected from finished game - auto logout`);
            if (room.players.length === 0 && room.disconnectedPlayers.size === 0) {
              if (room.game?.rematchState.countdownHandle) {
                clearInterval(room.game.rematchState.countdownHandle);
              }
              rooms.delete(player.roomId);
              console.log(`Room ${player.roomId} deleted (all players left finished game)`);
            }
          } else {
            const disconnectTime = Date.now();
            player.disconnectTime = disconnectTime;
            const timeoutHandle = setTimeout(() => {
              const disconnected = room.disconnectedPlayers.get(player.id);
              if (disconnected) {
                room.disconnectedPlayers.delete(player.id);
                if (room.game && room.game.status === "playing") {
                  const playerData = room.game.players.get(player.id);
                  if (playerData && !playerData.finished) {
                    playerData.finished = true;
                    playerData.endTime = Date.now();
                    broadcastToRoom(room, {
                      type: "player_timeout",
                      playerId: player.id,
                      playerName: player.name
                    });
                    checkGameEnd(room);
                  }
                }
              }
              checkAndDeleteRoomIfNeeded(room);
            }, 5 * 60 * 1e3);
            room.disconnectedPlayers.set(player.id, { player, disconnectTime, timeoutHandle });
          }
          broadcastToRoom(room, {
            type: "player_disconnected",
            playerId: player.id,
            playerName: player.name
          });
          if (!checkAndDeleteRoomIfNeeded(room)) {
            if (room.hostId === player.id && room.players.length > 0) {
              room.hostId = room.players[0].id;
              broadcastToRoom(room, {
                type: "host_changed",
                newHostId: room.hostId
              });
            }
            broadcastToRoom(room, {
              type: "players_updated",
              players: room.players.map((p) => ({ id: p.id, name: p.name })),
              hostId: room.hostId
            });
          }
        }
        players.delete(ws);
      }
    });
  });
  function checkAndDeleteRoomIfNeeded(room) {
    const totalPlayers = room.players.length + room.disconnectedPlayers.size;
    if (totalPlayers <= 1) {
      if (room.players.length === 1) {
        const lastPlayer = room.players[0];
        send(lastPlayer.ws, {
          type: "room_deleted",
          message: "\u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u063A\u0627\u062F\u0631\u0648\u0627 \u0627\u0644\u063A\u0631\u0641\u0629"
        });
        console.log(`Kicking last player ${lastPlayer.name} from room ${room.id}`);
      }
      if (room.game?.rematchState.countdownHandle) {
        clearInterval(room.game.rematchState.countdownHandle);
      }
      if (room.game?.gameTimerHandle) {
        clearTimeout(room.game.gameTimerHandle);
      }
      room.disconnectedPlayers.forEach((disconnected) => {
        clearTimeout(disconnected.timeoutHandle);
      });
      rooms.delete(room.id);
      console.log(`Room ${room.id} deleted (insufficient players: ${totalPlayers})`);
      return true;
    }
    return false;
  }
  function sendResultsToAllFinishedPlayers(room, reason = "player_finished") {
    if (!room.game) return;
    const results = calculateGameResults(room);
    room.game.lastResults = {
      winners: results.winners,
      losers: results.losers,
      stillPlaying: results.stillPlaying,
      reason
    };
    room.players.forEach((player) => {
      const playerData = room.game.players.get(player.id);
      if (playerData && playerData.finished) {
        send(player.ws, {
          type: "game_results",
          winners: results.winners,
          losers: results.losers,
          stillPlaying: results.stillPlaying,
          sharedSecret: room.game.sharedSecret,
          reason
        });
      }
    });
  }
  function checkGameEnd(room) {
    if (!room.game || room.game.status !== "playing") return;
    const allGamePlayers = Array.from(room.game.players.values());
    const allPlayersFinished = allGamePlayers.every((p) => p.finished);
    if (allPlayersFinished && room.game) {
      room.game.status = "finished";
      room.game.endTime = Date.now();
      if (room.game.gameTimerHandle) {
        clearTimeout(room.game.gameTimerHandle);
        room.game.gameTimerHandle = void 0;
      }
      sendResultsToAllFinishedPlayers(room, "all_finished");
    }
  }
  function calculateGameResults(room) {
    if (!room.game) return { winners: [], losers: [], stillPlaying: [] };
    const winners = [];
    const losers = [];
    const stillPlaying = [];
    room.game.players.forEach((playerData) => {
      const endTime = playerData.endTime || Date.now();
      const playerInfo = {
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        attempts: playerData.attempts.length,
        duration: endTime - playerData.startTime,
        attemptsDetails: playerData.attempts
      };
      if (playerData.won) {
        winners.push(playerInfo);
      } else if (playerData.finished) {
        losers.push(playerInfo);
      } else {
        stillPlaying.push(playerInfo);
      }
    });
    winners.sort((a, b) => {
      if (a.attempts !== b.attempts) {
        return a.attempts - b.attempts;
      }
      return a.duration - b.duration;
    });
    losers.sort((a, b) => b.duration - a.duration);
    winners.forEach((winner, index) => {
      winner.rank = index + 1;
    });
    return { winners, losers, stillPlaying };
  }
  function handleMessage(ws, message) {
    switch (message.type) {
      case "create_room": {
        const roomId = generateRoomId();
        const playerId = generatePlayerId();
        const player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId
        };
        const room = {
          id: roomId,
          hostId: playerId,
          players: [player],
          disconnectedPlayers: /* @__PURE__ */ new Map(),
          game: null,
          settings: { numDigits: 4, maxAttempts: 20 }
        };
        rooms.set(roomId, room);
        players.set(ws, player);
        send(ws, {
          type: "room_created",
          roomId,
          playerId,
          hostId: playerId
        });
        break;
      }
      case "join_room": {
        const room = rooms.get(message.roomId);
        if (!room) {
          send(ws, { type: "error", message: "\u0627\u0644\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 - \u0644\u0631\u0628\u0645\u0627 \u062A\u0645 \u062D\u0630\u0641\u0647\u0627" });
          return;
        }
        if (room.players.length >= 10) {
          send(ws, { type: "error", message: "\u0627\u0644\u063A\u0631\u0641\u0629 \u0645\u0645\u062A\u0644\u0626\u0629" });
          return;
        }
        if (room.game && room.game.status === "playing") {
          send(ws, { type: "error", message: "\u0627\u0644\u0644\u0639\u0628\u0629 \u062C\u0627\u0631\u064A \u0627\u0644\u0622\u0646 - \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645" });
          return;
        }
        if (room.game && room.game.status === "finished") {
          send(ws, { type: "error", message: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0644\u0639\u0628\u0629 - \u064A\u0631\u062C\u0649 \u0625\u0646\u0634\u0627\u0621 \u063A\u0631\u0641\u0629 \u062C\u062F\u064A\u062F\u0629" });
          return;
        }
        if (room && room.players.length < 10) {
          const playerId = generatePlayerId();
          const player = {
            id: playerId,
            name: message.playerName,
            ws,
            roomId: room.id
          };
          if (!room.disconnectedPlayers) {
            room.disconnectedPlayers = /* @__PURE__ */ new Map();
          }
          room.players.push(player);
          players.set(ws, player);
          send(ws, {
            type: "room_joined",
            roomId: room.id,
            playerId,
            hostId: room.hostId,
            players: room.players.map((p) => ({ id: p.id, name: p.name }))
          });
          send(ws, {
            type: "settings_updated",
            settings: room.settings
          });
          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
            hostId: room.hostId
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
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can update settings" });
          return;
        }
        if (room.game && room.game.status === "playing") {
          send(ws, { type: "error", message: "Cannot update settings during game" });
          return;
        }
        room.settings = message.settings;
        broadcastToRoom(room, {
          type: "settings_updated",
          settings: message.settings
        });
        break;
      }
      case "start_game": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can start game" });
          return;
        }
        if (room.players.length < 2) {
          send(ws, { type: "error", message: "Need at least 2 players to start" });
          return;
        }
        const sharedSecret = generateSecretCode(room.settings.numDigits);
        const game = {
          sharedSecret,
          status: "playing",
          players: /* @__PURE__ */ new Map(),
          startTime: Date.now(),
          endTime: null,
          rematchState: {
            requested: false,
            votes: /* @__PURE__ */ new Map(),
            countdown: null
          }
        };
        room.players.forEach((p) => {
          game.players.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            attempts: [],
            startTime: Date.now(),
            endTime: null,
            won: false,
            finished: false
          });
        });
        const gameTimerHandle = setTimeout(() => {
          console.log(`5-minute timer expired for room ${room.id}`);
          if (room.game && room.game.status === "playing") {
            room.game.players.forEach((playerData) => {
              if (!playerData.finished) {
                playerData.finished = true;
                playerData.endTime = Date.now();
                playerData.won = false;
              }
            });
            room.game.status = "finished";
            room.game.endTime = Date.now();
            room.game.gameTimerHandle = void 0;
            sendResultsToAllFinishedPlayers(room, "time_expired");
          }
        }, 5 * 60 * 1e3);
        game.gameTimerHandle = gameTimerHandle;
        room.game = game;
        broadcastToRoom(room, {
          type: "game_started",
          sharedSecret,
          // All players get the same secret
          settings: room.settings
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
        if (playerData.finished) {
          send(ws, { type: "error", message: "You have already finished" });
          return;
        }
        if (playerData.attempts.length >= room.settings.maxAttempts) {
          send(ws, { type: "error", message: "\u0644\u0642\u062F \u0627\u0633\u062A\u0646\u0641\u0630\u062A \u062C\u0645\u064A\u0639 \u0645\u062D\u0627\u0648\u0644\u0627\u062A\u0643 \u0628\u0627\u0644\u0641\u0639\u0644" });
          return;
        }
        const { correctCount, correctPositionCount } = checkGuess(room.game.sharedSecret, message.guess);
        const attempt = {
          guess: message.guess,
          correctCount,
          correctPositionCount,
          timestamp: Date.now()
        };
        playerData.attempts.push(attempt);
        const won = correctPositionCount === room.settings.numDigits;
        const isLastAttempt = playerData.attempts.length >= room.settings.maxAttempts;
        if (won) {
          playerData.won = true;
          playerData.finished = true;
          playerData.endTime = Date.now();
        } else if (isLastAttempt) {
          playerData.won = false;
          playerData.finished = true;
          playerData.endTime = Date.now();
        }
        send(ws, {
          type: "guess_result",
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          attemptNumber: playerData.attempts.length,
          isLastAttempt
        });
        broadcastToRoom(room, {
          type: "player_attempt",
          playerId: player.id,
          playerName: player.name,
          attemptNumber: playerData.attempts.length,
          won
        }, ws);
        if (playerData.finished) {
          if (isLastAttempt && !won) {
            send(ws, {
              type: "max_attempts_reached",
              message: "\u0644\u0642\u062F \u0627\u0633\u062A\u0646\u0641\u0630\u062A \u062C\u0645\u064A\u0639 \u0645\u062D\u0627\u0648\u0644\u0627\u062A\u0643"
            });
          }
          sendResultsToAllFinishedPlayers(room, "player_finished");
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
          duration: targetPlayerData.endTime ? targetPlayerData.endTime - targetPlayerData.startTime : 0
        });
        break;
      }
      case "request_rematch": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;
        if (room.game.status !== "finished") {
          send(ws, { type: "error", message: "Game is not finished yet" });
          return;
        }
        if (room.game.rematchState.requested) {
          send(ws, { type: "error", message: "Rematch already requested" });
          return;
        }
        room.game.rematchState.requested = true;
        room.game.rematchState.votes.clear();
        room.game.rematchState.countdown = 10;
        room.game.rematchState.votes.set(player.id, true);
        broadcastToRoom(room, {
          type: "rematch_requested",
          countdown: 10,
          requestedBy: player.name,
          votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
            playerId,
            accepted
          }))
        });
        const countdownHandle = setInterval(() => {
          if (!room.game || !room.game.rematchState.countdown) {
            clearInterval(countdownHandle);
            return;
          }
          room.game.rematchState.countdown--;
          if (room.game.rematchState.countdown <= 0) {
            clearInterval(countdownHandle);
            const acceptedPlayers = Array.from(room.game.rematchState.votes.entries()).filter(([_, accepted]) => accepted).map(([playerId, _]) => playerId);
            if (acceptedPlayers.length >= 2) {
              const rejectedPlayers = room.players.filter(
                (p) => !acceptedPlayers.includes(p.id) && p.id !== room.hostId
              );
              rejectedPlayers.forEach((p) => {
                send(p.ws, {
                  type: "kicked_from_room",
                  message: "\u0644\u0645 \u062A\u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0628\u0627\u0631\u0627\u0629"
                });
              });
              room.players = room.players.filter(
                (p) => acceptedPlayers.includes(p.id) || p.id === room.hostId
              );
              room.game = null;
              broadcastToRoom(room, {
                type: "rematch_starting",
                players: room.players.map((p) => ({ id: p.id, name: p.name }))
              });
            } else {
              broadcastToRoom(room, {
                type: "rematch_cancelled",
                message: "\u0644\u0645 \u064A\u0643\u0646 \u0647\u0646\u0627\u0643 \u0644\u0627\u0639\u0628\u064A\u0646 \u0643\u0627\u0641\u064A\u064A\u0646"
              });
              room.game.rematchState.requested = false;
            }
          } else {
            broadcastToRoom(room, {
              type: "rematch_countdown",
              countdown: room.game.rematchState.countdown,
              votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
                playerId,
                accepted
              }))
            });
          }
        }, 1e3);
        room.game.rematchState.countdownHandle = countdownHandle;
        break;
      }
      case "request_rematch_state": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;
        if (room.game.rematchState && room.game.rematchState.requested && room.game.rematchState.countdown !== null) {
          send(ws, {
            type: "rematch_requested",
            countdown: room.game.rematchState.countdown,
            votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
              playerId,
              accepted
            }))
          });
        }
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
        broadcastToRoom(room, {
          type: "rematch_vote_update",
          playerId: player.id,
          accepted: message.accepted,
          votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
            playerId,
            accepted
          }))
        });
        const acceptedPlayers = Array.from(room.game.rematchState.votes.entries()).filter(([_, accepted]) => accepted).map(([playerId, _]) => playerId);
        if (acceptedPlayers.length >= 2) {
          if (room.game.rematchState.countdownHandle) {
            clearInterval(room.game.rematchState.countdownHandle);
          }
          const rejectedPlayers = room.players.filter(
            (p) => !acceptedPlayers.includes(p.id) && p.id !== room.hostId
          );
          rejectedPlayers.forEach((p) => {
            send(p.ws, {
              type: "kicked_from_room",
              message: "\u0644\u0645 \u062A\u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0628\u0627\u0631\u0627\u0629"
            });
          });
          room.players = room.players.filter(
            (p) => acceptedPlayers.includes(p.id) || p.id === room.hostId
          );
          rejectedPlayers.forEach((p) => {
            room.disconnectedPlayers?.delete(p.id);
          });
          room.game = null;
          broadcastToRoom(room, {
            type: "rematch_starting",
            players: room.players.map((p) => ({ id: p.id, name: p.name }))
          });
          const sharedSecret = generateSecretCode(room.settings.numDigits);
          const game = {
            sharedSecret,
            status: "playing",
            startTime: Date.now(),
            endTime: null,
            players: /* @__PURE__ */ new Map(),
            lastResults: void 0,
            gameTimerHandle: void 0,
            rematchState: {
              requested: false,
              votes: /* @__PURE__ */ new Map(),
              countdown: null
            }
          };
          room.players.forEach((p) => {
            game.players.set(p.id, {
              playerId: p.id,
              playerName: p.name,
              attempts: [],
              startTime: Date.now(),
              endTime: null,
              won: false,
              finished: false
            });
          });
          const gameTimerHandle = setTimeout(() => {
            console.log(`5-minute timer expired for room ${room.id}`);
            if (room.game && room.game.status === "playing") {
              room.game.players.forEach((playerData) => {
                if (!playerData.finished) {
                  playerData.finished = true;
                  playerData.endTime = Date.now();
                  playerData.won = false;
                }
              });
              room.game.status = "finished";
              room.game.endTime = Date.now();
              room.game.gameTimerHandle = void 0;
              sendResultsToAllFinishedPlayers(room, "time_expired");
            }
          }, 5 * 60 * 1e3);
          game.gameTimerHandle = gameTimerHandle;
          room.game = game;
          broadcastToRoom(room, {
            type: "game_started",
            sharedSecret,
            settings: room.settings
          });
        }
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
        clearTimeout(disconnected.timeoutHandle);
        room.disconnectedPlayers.delete(message.playerId);
        const reconnectedPlayer = {
          id: message.playerId,
          name: message.playerName,
          ws,
          roomId: room.id
        };
        room.players.push(reconnectedPlayer);
        players.set(ws, reconnectedPlayer);
        console.log(`Player ${message.playerName} reconnected to room ${room.id}`);
        send(ws, {
          type: "room_rejoined",
          roomId: room.id,
          playerId: message.playerId,
          hostId: room.hostId,
          players: room.players.map((p) => ({ id: p.id, name: p.name }))
        });
        if (room.game) {
          send(ws, {
            type: "game_state",
            sharedSecret: room.game.sharedSecret,
            status: room.game.status,
            settings: room.settings,
            gameStartTime: room.game.startTime
          });
          const playerData = room.game.players.get(message.playerId);
          if (playerData) {
            send(ws, {
              type: "player_game_state",
              attempts: playerData.attempts,
              finished: playerData.finished,
              won: playerData.won
            });
            if (playerData.finished && room.game.lastResults) {
              send(ws, {
                type: "game_results",
                winners: room.game.lastResults.winners,
                losers: room.game.lastResults.losers,
                stillPlaying: room.game.lastResults.stillPlaying,
                sharedSecret: room.game.sharedSecret,
                reason: room.game.lastResults.reason
              });
            }
          }
        }
        broadcastToRoom(room, {
          type: "player_reconnected",
          playerId: message.playerId,
          playerName: message.playerName
        }, ws);
        broadcastToRoom(room, {
          type: "players_updated",
          players: room.players.map((p) => ({ id: p.id, name: p.name })),
          hostId: room.hostId
        });
        break;
      }
      case "leave_room": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        if (room.game && room.game.status === "playing") {
          const playerData = room.game.players.get(player.id);
          if (playerData && !playerData.finished) {
            playerData.finished = true;
            playerData.endTime = Date.now();
            broadcastToRoom(room, {
              type: "player_quit",
              playerId: player.id,
              playerName: player.name
            }, ws);
            checkGameEnd(room);
          }
        }
        room.players = room.players.filter((p) => p.id !== player.id);
        if (!checkAndDeleteRoomIfNeeded(room)) {
          if (room.hostId === player.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
            broadcastToRoom(room, {
              type: "host_changed",
              newHostId: room.hostId
            });
          }
          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
            hostId: room.hostId
          });
        }
        players.delete(ws);
        break;
      }
    }
  }
  function send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  function broadcastToRoom(room, message, exclude) {
    room.players.forEach((player) => {
      if (player.ws !== exclude) {
        send(player.ws, message);
      }
    });
  }
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    glsl()
    // Add GLSL shader support
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    strictPort: true,
    hmr: {
      clientPort: 443
    },
    allowedHosts: true
  },
  preview: {
    host: "0.0.0.0",
    port: 5e3
  },
  // Add support for large models and audio files
  assetsInclude: ["**/*.gltf", "**/*.glb", "**/*.mp3", "**/*.ogg", "**/*.wav"]
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
