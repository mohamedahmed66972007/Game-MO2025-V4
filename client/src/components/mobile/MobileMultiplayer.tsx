import { useState, useEffect } from "react";
import { MultiplayerResults } from "../ui/MultiplayerResults";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { send, connectWebSocket, disconnect } from "@/lib/websocket";
import { Home, Check, X, Users, Copy, Crown, Play, Settings, RefreshCw, Eye, Trophy, Maximize2, Minimize2 } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";
import { clearSession } from "@/lib/websocket";

export function MobileMultiplayer() {
  const {
    multiplayer,
    setMode,
    resetMultiplayer,
    addMultiplayerDigit,
    deleteMultiplayerDigit,
    submitMultiplayerGuess,
  } = useNumberGame();

  const { playDigit, playDelete, playConfirm, playError, successSound } = useAudio();
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [input, setInput] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const numDigits = multiplayer.settings.numDigits;

  useEffect(() => {
    const savedName = localStorage.getItem("lastPlayerName");
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("lastPlayerName", playerName);
    }
  }, [playerName]);

  useEffect(() => {
    setInput(new Array(numDigits).fill(""));
    setFocusedIndex(0);
  }, [numDigits]);

  useEffect(() => {
    if (multiplayer.currentGuess.length < numDigits) {
      const newInput = [...multiplayer.currentGuess.map(String), ...new Array(numDigits - multiplayer.currentGuess.length).fill("")];
      setInput(newInput);
      setFocusedIndex(multiplayer.currentGuess.length);
    } else if (multiplayer.currentGuess.length === numDigits) {
      setInput(multiplayer.currentGuess.map(String));
      setFocusedIndex(numDigits);
    }
  }, [multiplayer.currentGuess, numDigits]);

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    connectWebSocket(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    connectWebSocket(playerName.trim(), joinRoomId.trim().toUpperCase());
  };

  const handleStartGame = () => {
    if (multiplayer.isHost && multiplayer.players.length >= 2) {
      send({ type: "start_game" });
    }
  };

  const handleNumberInput = (num: string) => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (focusedIndex >= numDigits) return;

    playDigit(parseInt(num));
    addMultiplayerDigit(parseInt(num));
  };

  const handleBackspace = () => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (focusedIndex === 0) return;

    playDelete();
    deleteMultiplayerDigit();
  };

  const handleSubmit = () => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (input.some(val => val === "")) {
      playError();
      return;
    }

    playConfirm();
    send({
      type: "submit_guess",
      guess: multiplayer.currentGuess,
    });
    submitMultiplayerGuess();
  };

  const handleLeaveRoom = () => {
    send({ type: "leave_room" });
    clearSession();
    disconnect();
    resetMultiplayer();
  };

  const handleHome = () => {
    if (multiplayer.roomId) {
      handleLeaveRoom();
    }
    setMode("menu");
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(multiplayer.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRematchVote = (accepted: boolean) => {
    send({ type: "rematch_vote", accepted });
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

  const getCurrentDuration = () => {
    if (multiplayer.gameStatus === "playing" && multiplayer.startTime > 0) {
      return currentTime - multiplayer.startTime;
    }
    return 0;
  };

  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers].find(p => p.playerId === selectedPlayer)
    : null;

  // Check if current player has finished
  const playerFinished = multiplayer.phase === "won" || multiplayer.phase === "lost";
  
  // Show results screen if player finished or game is finished
  const shouldShowResults = playerFinished || multiplayer.gameStatus === "finished";

  // Initialize spectator mode when player finishes
  // Watching mode when player finishes
  useEffect(() => {
    if (playerFinished && !multiplayer.showResults) {
      // Player finished but results not shown yet - just wait
      console.log("Player finished, waiting for results...");
    }
  }, [playerFinished, multiplayer.showResults]);

  if (showSettings && multiplayer.isHost && multiplayer.gameStatus === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <GameSettings
          onConfirm={(settings) => {
            send({ 
              type: "update_settings", 
              settings: { numDigits: settings.numDigits, maxAttempts: settings.maxAttempts }
            });
            setShowSettings(false);
          }}
          isMultiplayer={true}
        />
      </div>
    );
  }

  if (shouldShowResults) {
    return <MultiplayerResults />;
  }

  if (selectedPlayer && playerDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{playerDetails.playerName}</h2>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">عدد المحاولات:</span>
                <span className="text-2xl font-bold text-blue-600">{playerDetails.attempts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">الوقت المستغرق:</span>
                <span className="text-xl font-bold text-green-600">{formatDuration(playerDetails.duration)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">المحاولات</h3>
            <div className="space-y-3">
              {playerDetails.attemptsDetails.map((attempt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                >
                  <span className="font-mono text-2xl font-bold text-gray-800">
                    {attempt.guess.join("")}
                  </span>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-blue-600">{attempt.correctCount}</span>
                      <span className="text-xs text-blue-600">صح</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                      <span className="text-xs text-green-600">مكانهم</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (false) { // Removed old finished game screen - use results component instead
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-md text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-purple-600 mb-6">نتائج اللعبة</h2>
            
            {multiplayer.winners.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-green-600 mb-3 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  الفائزون
                </h3>
                <div className="space-y-2">
                  {multiplayer.winners.map((winner, idx) => (
                    <button
                      key={winner.playerId}
                      onClick={() => setSelectedPlayer(winner.playerId)}
                      className="w-full flex items-center justify-between bg-gradient-to-r from-yellow-100 to-green-100 p-4 rounded-xl border-2 border-green-400 hover:border-green-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-purple-600">#{idx + 1}</span>
                        <Crown className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{winner.playerName}</p>
                        <p className="text-sm text-gray-600">
                          {winner.attempts} محاولات · {formatDuration(winner.duration)}
                        </p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {multiplayer.losers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-red-600 mb-3">لم يكملوا</h3>
                <div className="space-y-2">
                  {multiplayer.losers.map((loser) => (
                    <button
                      key={loser.playerId}
                      onClick={() => setSelectedPlayer(loser.playerId)}
                      className="w-full flex items-center justify-between bg-gray-100 p-4 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-colors"
                    >
                      <span className="font-bold text-gray-700">{loser.playerName}</span>
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {multiplayer.rematchState.requested && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                <p className="text-lg font-bold text-blue-800 mb-3">هل تريد إعادة المباراة؟</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRematchVote(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    نعم
                  </button>
                  <button
                    onClick={() => handleRematchVote(false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    لا
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              العودة للقائمة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show game while playing
  if (multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0) {
    return (
      <div className="min-h-screen p-4 pb-safe flex flex-col">
        <div className="max-w-2xl mx-auto w-full space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-row-reverse items-center justify-between bg-white rounded-xl p-4 shadow-md flex-shrink-0 gap-4">
            <button
              onClick={handleHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Home className="w-6 h-6 text-gray-700" />
            </button>
            <div className="text-right flex-1">
              <p className="text-sm text-gray-600">المحاولات المتبقية من {multiplayer.settings.maxAttempts}</p>
              <p className="text-2xl font-bold text-blue-600">{multiplayer.settings.maxAttempts - multiplayer.attempts.length}</p>
            </div>
            <div className="text-right flex-1 border-l-2 border-gray-300 pl-4">
              <p className="text-sm text-gray-600">الوقت المنقضي</p>
              <p className="text-2xl font-bold text-green-600">{formatDuration(getCurrentDuration())}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">أدخل {numDigits} أرقام</h3>
            
            <div className="flex gap-3 justify-center mb-6" dir="ltr">
              {input.map((digit, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-20 border-2 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                    focusedIndex === idx
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4" dir="ltr">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4" dir="ltr">
              {[4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4" dir="ltr">
              {[7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3" dir="ltr">
              <button
                onClick={handleBackspace}
                className="h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleNumberInput("0")}
                className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all col-span-1"
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                disabled={input.some(val => val === "")}
                className="h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>

          {multiplayer.attempts.length > 0 && !expandedAttempts && (
            <div className="bg-white rounded-xl p-4 shadow-md flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">محاولات ({multiplayer.attempts.length} / {multiplayer.settings.maxAttempts})</h3>
                <button
                  onClick={() => setExpandedAttempts(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div>
                {multiplayer.attempts.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-row-reverse">
                    <span className="font-mono text-lg font-bold text-gray-800">
                      {[...multiplayer.attempts].reverse()[0].guess.join("")}
                    </span>
                    <div className="flex gap-2 text-sm">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                        {[...multiplayer.attempts].reverse()[0].correctCount} صح
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold">
                        {[...multiplayer.attempts].reverse()[0].correctPositionCount === 0 && '0 مكانو صح'}
                        {[...multiplayer.attempts].reverse()[0].correctPositionCount === 1 && '1 مكانو صح'}
                        {[...multiplayer.attempts].reverse()[0].correctPositionCount > 1 && `${[...multiplayer.attempts].reverse()[0].correctPositionCount} مكانهم صح`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {expandedAttempts && (
            <div className="fixed inset-0 bg-black/50 flex items-end z-50 p-4">
              <div className="w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                  <h3 className="text-2xl font-bold text-gray-800">محاولات ({multiplayer.attempts.length} / {multiplayer.settings.maxAttempts})</h3>
                  <button
                    onClick={() => setExpandedAttempts(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Minimize2 className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
                <div className="overflow-y-scroll flex-1 p-4">
                  <div className="space-y-3">
                    {[...multiplayer.attempts].reverse().map((attempt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                      >
                        <span className="font-mono text-2xl font-bold text-gray-800">
                          {attempt.guess.join("")}
                        </span>
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-blue-600">{attempt.correctCount}</span>
                            <span className="text-xs text-blue-600">صح</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                            <span className="text-xs text-green-600">مكانهم</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedAttempts(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 m-4 rounded-xl transition-colors flex-shrink-0"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!multiplayer.roomId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <button
              onClick={handleHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-6 h-6 text-gray-700" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">لعب جماعي</h2>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                اسمك
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-right focus:outline-none focus:border-blue-500"
                dir="rtl"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              إنشاء غرفة جديدة
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">أو</span>
              </div>
            </div>

            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                disabled={!playerName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                الانضمام لغرفة
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="رمز الغرفة"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center focus:outline-none focus:border-blue-500 font-mono text-xl uppercase"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || !joinRoomId.trim() || joinRoomId.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    انضمام
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-6 h-6 text-gray-700" />
            </button>
            <div className="text-center flex-1">
              <h3 className="text-sm text-gray-600">رمز الغرفة</h3>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleCopyRoomId}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <p className="text-3xl font-mono font-bold text-blue-600">{multiplayer.roomId}</p>
              </div>
            </div>
            {multiplayer.isHost && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-700" />
              </button>
            )}
          </div>

          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">أرقام: {multiplayer.settings.numDigits} · محاولات: {multiplayer.settings.maxAttempts}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            اللاعبون ({multiplayer.players.length})
          </h3>
          <div className="space-y-2">
            {multiplayer.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {player.id === multiplayer.hostId && (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className={`font-bold ${player.id === multiplayer.playerId ? 'text-blue-600' : 'text-gray-800'}`}>
                    {player.name}
                    {player.id === multiplayer.playerId && ' (أنت)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {multiplayer.isHost && multiplayer.players.length >= 2 && multiplayer.gameStatus === "waiting" && (
          <button
            onClick={handleStartGame}
            disabled={multiplayer.gameStatus !== "waiting"}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-6 h-6" />
            بدء اللعبة
          </button>
        )}

        {!multiplayer.isHost && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-center">
            <p className="text-blue-800 font-bold">في انتظار المضيف لبدء اللعبة...</p>
          </div>
        )}

        {multiplayer.players.length < 2 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
            <p className="text-yellow-800 font-bold">يجب وجود لاعبين على الأقل لبدء اللعبة</p>
          </div>
        )}
      </div>
    </div>
  );
}
