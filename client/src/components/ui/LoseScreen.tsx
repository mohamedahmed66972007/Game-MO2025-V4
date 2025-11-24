import { Button } from "./button";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";

export function LoseScreen() {
  const { mode, singleplayer, multiplayer, restartSingleplayer, setMode, setShowResults, setShowOpponentAttempts, resetMultiplayer, setChallengeStatus, setOpponentId, setOpponentName, setMySecretCode } = useNumberGame();
  
  const isSingleplayer = mode === "singleplayer";
  const attempts = isSingleplayer ? singleplayer.attempts.length : multiplayer.attempts.length;
  const timeElapsed = isSingleplayer
    ? (singleplayer.endTime ? Math.floor((singleplayer.endTime - singleplayer.startTime) / 1000) : 0)
    : (multiplayer.endTime ? Math.floor((multiplayer.endTime - multiplayer.startTime) / 1000) : 0);
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  const secretCode = isSingleplayer ? singleplayer.secretCode : multiplayer.opponentSecretCode;
  const isMultiplayer = mode === "multiplayer";

  const handleRematch = () => {
    send({ type: "request_rematch", opponentId: multiplayer.opponentId });
  };

  const handleBackToLobby = () => {
    if (isMultiplayer) {
      // Reset game state but keep multiplayer session
      setChallengeStatus("none");
      setOpponentId(null);
      setOpponentName("");
      setMySecretCode([]);
      setShowResults(false);
      resetMultiplayer();
    } else {
      setShowResults(false);
      setMode("menu");
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  const handleShowOpponentAttempts = () => {
    setShowOpponentAttempts(true);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 z-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
        <div className="text-6xl">😢</div>
        
        <div>
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            لقد خسرت
          </h2>
          {isMultiplayer && (
            <p className="text-gray-600">الخصم خمن الرقم السري في محاولات أقل</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl space-y-3 border border-red-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-semibold">محاولاتك:</span>
            <span className="text-2xl font-bold text-red-600">{attempts}</span>
          </div>
          
          {isMultiplayer && multiplayer.opponentAttempts && (
            <div className="flex justify-between items-center border-t border-red-200 pt-3">
              <span className="text-gray-700 font-semibold">محاولات الخصم:</span>
              <span className="text-2xl font-bold text-orange-600">{multiplayer.opponentAttempts.length}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-red-200 pt-3">
            <span className="text-gray-700 font-semibold">الوقت:</span>
            <span className="text-2xl font-bold text-pink-600">
              {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}ث`}
            </span>
          </div>

          {secretCode.length > 0 && (
            <div className="flex justify-between items-center border-t border-red-200 pt-3">
              <span className="text-gray-700 font-semibold">الرقم السري:</span>
              <span className="text-2xl font-mono font-bold text-red-600">{secretCode.join("")}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4">
          {isMultiplayer ? (
            <>
              <Button
                onClick={handleShowOpponentAttempts}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl"
              >
                عرض محاولات الخصم
              </Button>
              <Button
                onClick={handleRematch}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl"
              >
                طلب إعادة المباراة
              </Button>
              <Button
                onClick={handleBackToLobby}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl"
              >
                العودة للغرفة
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={restartSingleplayer}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl"
              >
                لعب مرة أخرى
              </Button>
              <Button
                onClick={() => {
                  setMode("menu");
                  setTimeout(() => {
                    window.location.reload();
                  }, 300);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl"
              >
                العودة للقائمة الرئيسية
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
