import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";
import { useState } from "react";

export function GameOverScreen() {
  const { multiplayer, setMode, resetMultiplayer, setChallengeStatus, setOpponentId, setOpponentName, setMySecretCode } = useNumberGame();
  const [showOpponentAttempts, setShowOpponentAttempts] = useState(false);

  const isTie = multiplayer.gameResult === "tie";
  const isWinner = multiplayer.phase === "won" && !isTie;
  
  // When you win, subtract 1 because the last attempt was correct
  // When you lose or tie, show full count or subtract 1 for opponent who won
  let myAttempts = multiplayer.attempts.length;
  let opponentAttempts = multiplayer.opponentAttempts.length;
  
  if (isWinner) {
    // I won - my last attempt was correct, so subtract 1
    myAttempts = Math.max(0, myAttempts - 1);
  } else if (isTie) {
    // Tie - both our last attempts were correct, subtract 1 from each
    myAttempts = Math.max(0, myAttempts - 1);
    opponentAttempts = Math.max(0, opponentAttempts - 1);
  } else {
    // I lost - opponent's last attempt was correct, subtract 1 from opponent
    opponentAttempts = Math.max(0, opponentAttempts - 1);
  }
  
  const timeElapsed = multiplayer.endTime && multiplayer.startTime
    ? Math.floor((multiplayer.endTime - multiplayer.startTime) / 1000)
    : 0;
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;

  const handleRematch = () => {
    if (multiplayer.opponentId) {
      send({ type: "request_rematch", opponentId: multiplayer.opponentId });
    }
  };

  if (showOpponentAttempts) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 overflow-auto" dir="rtl">
        <Card className="w-full max-w-lg mx-4 my-6 bg-gradient-to-br from-purple-900 to-pink-900 border-2 border-purple-500">
          <CardHeader>
            <CardTitle className="text-center text-white text-2xl">محاولات الخصم 🔍</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {multiplayer.opponentAttempts.length === 0 ? (
              <p className="text-center text-gray-300">لم يكن هناك محاولات</p>
            ) : (
              multiplayer.opponentAttempts.map((attempt, index) => (
                <div key={index} className="bg-purple-800 bg-opacity-50 p-3 rounded-lg text-right">
                  <p className="text-purple-200 text-sm">المحاولة {index + 1}</p>
                  <p className="text-white text-2xl font-bold tracking-widest">
                    {attempt.guess.length > 0 ? attempt.guess.map(d => d).reverse().join(" ") : "محاولة فارغة"}
                  </p>
                  <div className="text-purple-300 text-sm mt-2 space-y-1">
                    <p>✓ في الموضع الصحيح: <span className="text-white font-bold">{attempt.correctPositionCount}</span></p>
                    <p>✓ الرقم صحيح لكن الموضع خطأ: <span className="text-white font-bold">{Math.max(0, attempt.correctCount - attempt.correctPositionCount)}</span></p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <div className="p-4 border-t border-purple-500">
            <Button
              onClick={() => setShowOpponentAttempts(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
            >
              العودة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 overflow-auto" dir="rtl">
      <Card
        className={`w-full max-w-lg mx-4 my-6 ${
          isTie
            ? "bg-gradient-to-br from-yellow-900 to-yellow-950 border-yellow-600"
            : isWinner
            ? "bg-gradient-to-br from-green-900 to-green-950 border-green-600"
            : "bg-gradient-to-br from-red-900 to-red-950 border-red-600"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-center text-white text-3xl">
            {isTie ? "🤝 تعادل!" : isWinner ? "🎉 فزت! 🎉" : "😔 خسرت"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div
              className={`${
                isTie ? "bg-yellow-800" : isWinner ? "bg-green-800" : "bg-red-800"
              } bg-opacity-50 p-4 rounded-lg`}
            >
              <p
                className={`${
                  isTie ? "text-yellow-200" : isWinner ? "text-green-200" : "text-red-200"
                } text-lg`}
              >
                عدد محاولاتك
              </p>
              <p className="text-white text-4xl font-bold">{myAttempts}</p>
            </div>

            {timeElapsed > 0 && (
              <div
                className={`${
                  isTie ? "bg-yellow-800" : isWinner ? "bg-green-800" : "bg-red-800"
                } bg-opacity-50 p-4 rounded-lg`}
              >
                <p
                  className={`${
                    isTie ? "text-yellow-200" : isWinner ? "text-green-200" : "text-red-200"
                  } text-lg`}
                >
                  الوقت المستغرق
                </p>
                <p className="text-white text-4xl font-bold">
                  {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`}
                </p>
              </div>
            )}

            <div
              className={`${
                isTie ? "bg-yellow-800" : isWinner ? "bg-green-800" : "bg-red-800"
              } bg-opacity-50 p-4 rounded-lg`}
            >
              <p
                className={`${
                  isTie ? "text-yellow-200" : isWinner ? "text-green-200" : "text-red-200"
                } text-lg`}
              >
                الرقم السري الصحيح كان
              </p>
              <p className="text-white text-4xl font-bold tracking-wider">
                {multiplayer.opponentSecretCode.length > 0 
                  ? [...multiplayer.opponentSecretCode].reverse().join(" ") 
                  : "غير معروف"}
              </p>
            </div>

            <div
              className={`${
                isTie ? "bg-yellow-800" : isWinner ? "bg-green-800" : "bg-red-800"
              } bg-opacity-50 p-4 rounded-lg`}
            >
              <p
                className={`${
                  isTie ? "text-yellow-200" : isWinner ? "text-green-200" : "text-red-200"
                } text-lg`}
              >
                محاولات الخصم
              </p>
              <p className="text-white text-4xl font-bold">{opponentAttempts}</p>
            </div>

            <Button
              onClick={() => setShowOpponentAttempts(true)}
              className={`w-full font-bold ${
                isTie ? "bg-yellow-600 hover:bg-yellow-700" : isWinner ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              👀 عرض محاولات الخصم بالتفصيل
            </Button>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleRematch}
              className={`w-full ${
                isTie
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : isWinner
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white font-semibold`}
              size="lg"
            >
              <span className="mr-2">🔄</span>
              طلب إعادة المباراة
            </Button>

            <Button
              onClick={() => {
                setChallengeStatus("none");
                setOpponentId(null);
                setOpponentName("");
                setMySecretCode([]);
                resetMultiplayer();
              }}
              className={`w-full ${
                isTie
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : isWinner
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
              size="lg"
            >
              العودة للغرفة
            </Button>

            <Button
              onClick={() => {
                const { resetMultiplayer } = useNumberGame.getState();
                resetMultiplayer();
                setMode("menu");
                setTimeout(() => {
                  window.location.reload();
                }, 300);
              }}
              className={`w-full ${
                isTie
                  ? "bg-yellow-700 hover:bg-yellow-800"
                  : isWinner
                  ? "bg-green-700 hover:bg-green-800"
                  : "bg-red-700 hover:bg-red-800"
              } text-white`}
              size="lg"
            >
              القائمة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
