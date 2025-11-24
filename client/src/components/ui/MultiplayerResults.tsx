import { useState } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send, clearSession, disconnect } from "@/lib/websocket";
import { Trophy, Medal, XCircle, RefreshCw, Home, Eye, Crown } from "lucide-react";
import { Button } from "./button";
import Confetti from "react-confetti";

export function MultiplayerResults() {
  const { multiplayer, setMode, resetMultiplayer } = useNumberGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  const isWinner = multiplayer.winners.some(w => w.playerId === multiplayer.playerId);
  const isLoser = multiplayer.losers.some(l => l.playerId === multiplayer.playerId);
  const myResult = [...multiplayer.winners, ...multiplayer.losers].find(r => r.playerId === multiplayer.playerId);
  const hasNoWinners = multiplayer.winners.length === 0;

  const handleRequestRematch = () => {
    if (multiplayer.isHost) {
      send({ type: "request_rematch" });
    }
  };

  const handleBackToMenu = () => {
    send({ type: "leave_room" });
    clearSession();
    disconnect();
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500 fill-orange-500" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // Get player details
  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers].find(p => p.playerId === selectedPlayer)
    : null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4 overflow-y-auto">
      {showConfetti && isWinner && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border-2 border-gray-200 my-8">
        {/* Header */}
        <div className={`p-8 text-center border-b-2 ${isWinner ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : isLoser ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300'}`}>
          <div className="flex justify-center mb-4">
            {isWinner ? (
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Trophy className="w-10 h-10 text-white fill-white" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${isWinner ? 'text-green-800' : isLoser ? 'text-red-800' : 'text-blue-800'}`}>
            {isWinner ? '🎉 مبروك! لقد فزت!' : isLoser ? '😢 للأسف، لقد خسرت' : '⏳ المباراة جارية...'}
          </h1>
          {myResult && (
            <div className="flex justify-center gap-6 mt-4">
              <div className="bg-white bg-opacity-70 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">محاولاتك</p>
                <p className="text-2xl font-bold text-blue-600">{myResult.attempts}</p>
              </div>
              <div className="bg-white bg-opacity-70 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600">الوقت</p>
                <p className="text-2xl font-bold text-purple-600">{formatDuration(myResult.duration)}</p>
              </div>
              {myResult.rank && (
                <div className="bg-white bg-opacity-70 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-600">الترتيب</p>
                  <p className="text-2xl font-bold text-yellow-600">#{myResult.rank}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secret Code */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50" dir="ltr">
          <h3 className="text-center text-gray-700 font-semibold mb-3">🔐 الرقم السري هو:</h3>
          <div className="flex justify-center gap-2">
            {multiplayer.sharedSecret.map((digit, idx) => (
              <div
                key={idx}
                className="w-14 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              >
                {digit}
              </div>
            ))}
          </div>
        </div>

        {/* No Winners Yet Message */}
        {hasNoWinners && !isWinner && (
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <h3 className="text-center text-xl font-bold text-blue-700">
              🔄 لم يفوز أحد بعد
            </h3>
            <p className="text-center text-gray-600 mt-2">اللاعبون يلعبون الآن...</p>
          </div>
        )}

        {/* Winners List */}
        {multiplayer.winners.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
              <Trophy className="w-6 h-6 ml-2 text-yellow-500 fill-yellow-500" />
              الفائزون ({multiplayer.winners.length})
            </h3>
            <div className="space-y-2">
              {multiplayer.winners.map((winner) => (
                <div
                  key={winner.playerId}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(winner.rank || 1)}
                    <div>
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                        {winner.playerName}
                        {winner.playerId === multiplayer.playerId && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {winner.playerId === multiplayer.hostId && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {winner.attempts} محاولات • {formatDuration(winner.duration)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPlayer(winner.playerId)}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    تفاصيل
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Losers List */}
        {multiplayer.losers.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
              <XCircle className="w-6 h-6 ml-2" />
              الخاسرون ({multiplayer.losers.length})
            </h3>
            <div className="space-y-2">
              {multiplayer.losers.map((loser) => (
                <div
                  key={loser.playerId}
                  className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                        {loser.playerName}
                        {loser.playerId === multiplayer.playerId && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {loser.playerId === multiplayer.hostId && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {loser.attempts} محاولات • {formatDuration(loser.duration)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPlayer(loser.playerId)}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    تفاصيل
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Still Playing List */}
        {multiplayer.stillPlaying.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center">
              <span className="text-2xl ml-2">🎮</span>
              اللاعبون المتبقيون ({multiplayer.stillPlaying.length})
            </h3>
            <div className="space-y-2">
              {multiplayer.stillPlaying.map((player) => (
                <div
                  key={player.playerId}
                  className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 flex items-center gap-3"
                >
                  <span className="text-2xl animate-pulse">⏳</span>
                  <div>
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      {player.playerName}
                      {player.playerId === multiplayer.playerId && (
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                      )}
                      {player.playerId === multiplayer.hostId && (
                        <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </p>
                    <p className="text-sm text-gray-600">في مبارة...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 space-y-3">
          {(isWinner || isLoser) && multiplayer.isHost && !multiplayer.rematchState.requested && (
            <Button
              onClick={handleRequestRematch}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              طلب إعادة مباراة
            </Button>
          )}

          <Button
            onClick={handleBackToMenu}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            العودة للقائمة
          </Button>
        </div>
      </div>

      {/* Player Details Modal */}
      {playerDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{playerDetails.playerName}</h2>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">النتيجة</p>
                <p className="text-xl font-bold text-blue-600">
                  {playerDetails.rank ? `#${playerDetails.rank} - فائز` : 'خاسر'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">المحاولات</p>
                  <p className="text-2xl font-bold text-purple-600">{playerDetails.attempts}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">الوقت</p>
                  <p className="text-2xl font-bold text-green-600">{formatDuration(playerDetails.duration)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl" dir="rtl">
                <h3 className="font-bold text-gray-800 mb-3">سجل المحاولات</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {playerDetails.attemptsDetails.map((attempt, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700">المحاولة {idx + 1}</span>
                        {attempt.correctPositionCount === multiplayer.settings.numDigits && (
                          <span className="text-green-600 font-bold">✓ فوز</span>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2" dir="ltr">
                        {attempt.guess.map((digit, digitIdx) => (
                          <div
                            key={digitIdx}
                            className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700"
                          >
                            {digit}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>✓ صحيح: {attempt.correctCount}</span>
                        <span>📍 موقع صحيح: {attempt.correctPositionCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
