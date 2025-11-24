import { useEffect, useState } from "react";
import { useNumberGame } from "./lib/stores/useNumberGame";
import { useAudio } from "./lib/stores/useAudio";
import { send, reconnectToSession, connectWebSocket, reconnectWithRetry } from "./lib/websocket";
import { useIsMobile } from "./hooks/use-is-mobile";
import { MobileApp } from "./components/mobile/MobileApp";
import { GameScene } from "./components/game/GameScene";
import { Menu } from "./components/ui/Menu";
import { WinScreen } from "./components/ui/WinScreen";
import { LoseScreen } from "./components/ui/LoseScreen";
import { MultiplayerLobby } from "./components/ui/MultiplayerLobby";
import { MultiplayerResults } from "./components/ui/MultiplayerResults";
import { GameHUD } from "./components/ui/GameHUD";
import { ChallengeRoom } from "./components/game/ChallengeRoom";
import { ChallengeResultScreen } from "./components/ui/ChallengeResultScreen";
import { useChallenge } from "./lib/stores/useChallenge";
import "@fontsource/inter";

function App() {
  const isMobile = useIsMobile();
  const { mode, singleplayer, multiplayer, connectionError, setMode, isConnecting, setIsConnecting, setPlayerName, setRoomId, setPlayerId, setConnectionError, resetMultiplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [showChallengeRoom, setShowChallengeRoom] = useState(false);
  const { startChallenge, phase: challengePhase, resetChallenge, generateHint } = useChallenge();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    const session = reconnectToSession();
    if (session && session.roomId && session.playerId && !multiplayer.roomId) {
      // Only auto-reconnect if game is actively playing (not finished/results shown)
      const isGameActive = session.gameState && session.gameState.gameStatus === "playing";
      
      if (isGameActive) {
        console.log("Reconnecting to active session:", session);
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
          if (session.gameState.settings) {
            store.setMultiplayerSettings(session.gameState.settings);
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
        
        // Attempt reconnection with retry
        const ws = reconnectWithRetry(session.playerName, session.playerId, session.roomId);
        
        // Add timeout to prevent infinite loading (network issues only)
        setTimeout(() => {
          if (useNumberGame.getState().isConnecting) {
            console.error("Connection timeout - redirecting to menu");
            setIsConnecting(false);
            setMode("menu");
          }
        }, 3000);
      } else {
        // Game is finished, clear the session
        sessionStorage.removeItem("multiplayerSession");
      }
    }
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  const isMultiplayerGameActive = multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0;

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {mode === "menu" && <Menu />}

      {mode === "singleplayer" && (
        <>
          {singleplayer.secretCode.length > 0 && !showChallengeRoom && (
            <>
              <GameScene onEnterChallenge={() => {
                setShowChallengeRoom(true);
                startChallenge();
              }} />
              <GameHUD />
              {singleplayer.phase === "won" && <WinScreen />}
              {singleplayer.phase === "lost" && <LoseScreen />}
            </>
          )}
          {showChallengeRoom && (
            <>
              <ChallengeRoom onExit={() => {
                if (challengePhase === "won") {
                  generateHint(singleplayer.secretCode);
                }
                setShowChallengeRoom(false);
                resetChallenge();
              }} />
              {(challengePhase === "won" || challengePhase === "lost") && (
                <ChallengeResultScreen
                  won={challengePhase === "won"}
                  onClose={() => {
                    if (challengePhase === "won") {
                      generateHint(singleplayer.secretCode);
                    }
                    setShowChallengeRoom(false);
                    resetChallenge();
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      {mode === "multiplayer" && (
        <>
          {/* Show connection error */}
          {connectionError && (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 z-50">
              <div className="text-center relative max-w-md mx-4">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="text-6xl">❌</div>
                </div>
                <p className="text-gray-800 text-xl font-semibold mb-4">{connectionError}</p>
                <button
                  onClick={() => {
                    setConnectionError(null);
                    resetMultiplayer();
                    setMode("menu");
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  العودة للقائمة الرئيسية
                </button>
              </div>
            </div>
          )}

          {/* Show loading screen while connecting */}
          {isConnecting && !connectionError && (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
              <div className="text-center relative">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
                </div>
                <p className="text-gray-800 text-xl font-semibold">جاري الاتصال...</p>
                <p className="text-gray-600 text-sm mt-2">يرجى الانتظار</p>
              </div>
            </div>
          )}

          {/* Show lobby when not in game */}
          {!isConnecting && multiplayer.roomId && multiplayer.gameStatus === "waiting" && !multiplayer.showResults && (
            <MultiplayerLobby />
          )}
          
          {/* Show game */}
          {isMultiplayerGameActive && !multiplayer.showResults && (
            <>
              <GameScene />
              <GameHUD />
              <HomeButton />
            </>
          )}
          
          {/* Show results */}
          {multiplayer.showResults && <MultiplayerResults />}

          {/* Rematch countdown dialog */}
          {multiplayer.rematchState.requested && multiplayer.rematchState.countdown !== null && (
            <RematchDialog />
          )}
          
          {!isConnecting && !multiplayer.roomId && <Menu />}
        </>
      )}
    </div>
  );
}

function RematchDialog() {
  const { multiplayer } = useNumberGame();
  const myVote = multiplayer.rematchState.votes.find(v => v.playerId === multiplayer.playerId);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 border border-gray-200 mx-4">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">إعادة مباراة</h2>
        <div className="text-4xl font-bold text-blue-600">{multiplayer.rematchState.countdown}s</div>
        
        {!myVote && (
          <div className="space-y-3">
            <button
              onClick={() => send({ type: "rematch_vote", accepted: true })}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              قبول
            </button>
            <button
              onClick={() => send({ type: "rematch_vote", accepted: false })}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              رفض
            </button>
          </div>
        )}
        
        {myVote && (
          <div className={`p-4 rounded-xl ${myVote.accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-bold">
              {myVote.accepted ? '✓ لقد قبلت إعادة المباراة' : '✗ لقد رفضت إعادة المباراة'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-semibold">حالة اللاعبين:</p>
          {multiplayer.players.map(player => {
            const vote = multiplayer.rematchState.votes.find(v => v.playerId === player.id);
            return (
              <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-800">{player.name}</span>
                {vote ? (
                  <span className={vote.accepted ? 'text-green-600' : 'text-red-600'}>
                    {vote.accepted ? '✓' : '✗'}
                  </span>
                ) : (
                  <span className="text-gray-400">...</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HomeButton() {
  const { setMode, resetMultiplayer } = useNumberGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQuit = () => {
    import("@/lib/websocket").then(({ send, clearSession, disconnect }) => {
      send({ type: "leave_room" });
      clearSession();
      disconnect();
    });
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (showConfirm) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-900 border-2 border-red-600 rounded-lg p-4 shadow-lg">
        <p className="text-white font-semibold mb-3">هل تريد الانسحاب؟</p>
        <div className="flex gap-2">
          <button
            onClick={handleQuit}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
          >
            نعم
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold"
          >
            لا
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="fixed top-4 right-4 z-40 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center shadow-lg text-xl transition-transform duration-200 hover:scale-110"
      title="البيت"
    >
      🏠
    </button>
  );
}

export default App;
