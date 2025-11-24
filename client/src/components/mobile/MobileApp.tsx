import { useEffect, useState } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { reconnectToSession, connectWebSocket, reconnectWithRetry } from "@/lib/websocket";
import { MobileMenu } from "./MobileMenu";
import { MobileSingleplayer } from "./MobileSingleplayer";
import { MobileMultiplayer } from "./MobileMultiplayer";
import { MobileChallenge } from "./MobileChallenge";
import { useChallenge } from "@/lib/stores/useChallenge";

export function MobileApp() {
  const { mode, setMode, setPlayerName, setRoomId, setPlayerId, setIsConnecting, multiplayer, singleplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [showChallenge, setShowChallenge] = useState(false);
  const { startChallenge, resetChallenge, phase: challengePhase, generateHint } = useChallenge();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    const session = reconnectToSession();
    if (session && session.roomId && session.playerId && !multiplayer.roomId) {
      console.log("Reconnecting to session:", session);
      setPlayerName(session.playerName);
      
      // Restore game state if it was active
      if (session.gameState) {
        const store = useNumberGame.getState();
        if (session.gameState.gameStatus) {
          store.setGameStatus(session.gameState.gameStatus);
        }
        if (session.gameState.sharedSecret) {
          store.setSharedSecret(session.gameState.sharedSecret);
        }
        if (session.gameState.attempts) {
          useNumberGame.setState((state) => ({
            multiplayer: {
              ...state.multiplayer,
              attempts: session.gameState.attempts,
              startTime: session.gameState.startTime || 0,
            },
          }));
        }
      }
      
      setMode("multiplayer");
      setIsConnecting(true);
      reconnectWithRetry(session.playerName, session.playerId, session.roomId);
      
      setTimeout(() => {
        if (useNumberGame.getState().isConnecting) {
          console.error("Connection timeout");
          setIsConnecting(false);
          setMode("menu");
        }
      }, 3000);
    }
  }, []);

  const handleExitChallenge = () => {
    if (challengePhase === "won") {
      generateHint(singleplayer.secretCode);
    }
    setShowChallenge(false);
    resetChallenge();
  };

  if (showChallenge) {
    return <MobileChallenge onExit={handleExitChallenge} />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {mode === "menu" && <MobileMenu />}
      {mode === "singleplayer" && (
        <MobileSingleplayer 
          onStartChallenge={() => {
            setShowChallenge(true);
            startChallenge();
          }}
        />
      )}
      {mode === "multiplayer" && <MobileMultiplayer />}
    </div>
  );
}
