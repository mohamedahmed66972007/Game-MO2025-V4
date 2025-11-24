import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { Home, Check, X, Maximize2, Minimize2, Lightbulb } from "lucide-react";
import { useChallenge } from "@/lib/stores/useChallenge";

export function MobileSingleplayer({ onStartChallenge }: { onStartChallenge?: () => void }) {
  const {
    singleplayer,
    setMode,
    restartSingleplayer,
  } = useNumberGame();
  const challengeCompleted = useChallenge((state) => state.challengeCompleted);
  const hint = useChallenge((state) => state.hint);
  const { startChallenge, generateHint } = useChallenge();
  
  const { playDigit, playDelete, playError, successSound } = useAudio();
  const numDigits = singleplayer.settings.numDigits;
  const [input, setInput] = useState<string[]>(Array(numDigits).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [expandedAttemptIndex, setExpandedAttemptIndex] = useState(singleplayer.attempts.length - 1);

  useEffect(() => {
    if (!singleplayer.secretCode || singleplayer.secretCode.length === 0) {
      restartSingleplayer();
    }
  }, [singleplayer.secretCode, restartSingleplayer]);

  useEffect(() => {
    setInput(Array(numDigits).fill(""));
    setFocusedIndex(0);
  }, [numDigits]);

  useEffect(() => {
    if (singleplayer.phase === "won" && challengeCompleted && !hint && singleplayer.secretCode) {
      generateHint(singleplayer.secretCode);
    }
  }, [singleplayer.phase, challengeCompleted, hint, singleplayer.secretCode, generateHint]);

  const handleNumberInput = (num: string) => {
    if (focusedIndex >= numDigits) return;
    
    playDigit(parseInt(num));
    const newInput = [...input];
    newInput[focusedIndex] = num;
    setInput(newInput);
    
    if (focusedIndex < numDigits - 1) {
      setFocusedIndex(focusedIndex + 1);
    }
  };

  const handleBackspace = () => {
    playDelete();
    if (focusedIndex > 0) {
      const newInput = [...input];
      if (input[focusedIndex] === "") {
        newInput[focusedIndex - 1] = "";
        setFocusedIndex(focusedIndex - 1);
      } else {
        newInput[focusedIndex] = "";
      }
      setInput(newInput);
    } else if (input[0] !== "") {
      const newInput = [...input];
      newInput[0] = "";
      setInput(newInput);
    }
  };

  const handleSubmit = () => {
    if (input.some(val => val === "")) {
      return;
    }

    const guess = input.map(Number);
    let correctCount = 0;
    let correctPositionCount = 0;

    const secretCopy = [...singleplayer.secretCode];
    const guessCopy = [...guess];
    const numDigits = singleplayer.settings.numDigits;

    for (let i = 0; i < numDigits; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        correctPositionCount++;
        secretCopy[i] = -1;
        guessCopy[i] = -2;
      }
    }

    for (let i = 0; i < numDigits; i++) {
      if (guessCopy[i] !== -2) {
        const index = secretCopy.indexOf(guessCopy[i]);
        if (index !== -1) {
          correctCount++;
          secretCopy[index] = -1;
        }
      }
    }

    correctCount += correctPositionCount;

    useNumberGame.setState((state) => ({
      singleplayer: {
        ...state.singleplayer,
        attempts: [...state.singleplayer.attempts, { guess, correctCount, correctPositionCount }],
      },
    }));

    if (correctPositionCount === numDigits) {
      if (successSound) {
        successSound.currentTime = 0;
        successSound.play();
      }
      useNumberGame.setState((state) => ({
        singleplayer: {
          ...state.singleplayer,
          phase: "won",
        },
      }));
    } else if (singleplayer.attempts.length >= singleplayer.settings.maxAttempts - 1) {
      useNumberGame.setState((state) => ({
        singleplayer: {
          ...state.singleplayer,
          phase: "lost",
        },
      }));
    }

    setInput(Array(numDigits).fill(""));
    setFocusedIndex(0);
  };

  const handleHome = () => {
    const { resetChallenge } = useChallenge.getState();
    resetChallenge();
    restartSingleplayer();
    setMode("menu");
  };

  useEffect(() => {
    if (singleplayer.phase === "won") {
      console.log("🏆 Player won - challengeCompleted:", challengeCompleted, "hint:", hint);
      if (challengeCompleted && !hint && singleplayer.secretCode) {
        console.log("📝 Generating hint on win...");
        generateHint(singleplayer.secretCode);
      }
    }
  }, [singleplayer.phase, challengeCompleted, hint, singleplayer.secretCode, generateHint]);

  const hintText = hint
    ? hint.type === "digit"
      ? `الخانة ${(hint.position || 0) + 1}: ${hint.value}`
      : String(hint.value)
    : "";

  if (singleplayer.phase === "won") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-green-600">مبروك! فزت</h2>
          <p className="text-gray-600 text-lg">
            عدد المحاولات: <span className="font-bold text-blue-600">{singleplayer.attempts.length}</span>
          </p>
          <p className="text-gray-700">
            الرقم السري كان: <span className="font-mono text-xl font-bold text-purple-600">{singleplayer.secretCode.join("")}</span>
          </p>
          {challengeCompleted && hint && (
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl p-4 shadow-lg">
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2 justify-center">
                <Lightbulb className="w-5 h-5" />
                التلميح:
              </h3>
              <p className="text-white text-base font-bold">{hintText}</p>
            </div>
          )}
          <div className="space-y-3">
            {!challengeCompleted ? (
              <button
                onClick={() => startChallenge()}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 justify-center"
              >
                <Lightbulb className="w-5 h-5" />
                تحدي
              </button>
            ) : (
              <div className="w-full bg-green-100 border-2 border-green-500 text-green-800 font-bold py-3 px-6 rounded-xl flex items-center gap-2 justify-center">
                <span>✓</span>
                <span>تم اكمال التحدي</span>
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

  if (singleplayer.phase === "lost") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="text-6xl">😢</div>
          <h2 className="text-3xl font-bold text-red-600">خسرت!</h2>
          <p className="text-gray-700">
            الرقم السري كان: <span className="font-mono text-xl font-bold text-purple-600">{singleplayer.secretCode.join("")}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={restartSingleplayer}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              لعب مرة أخرى
            </button>
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

  const attemptsLeft = singleplayer.settings.maxAttempts - singleplayer.attempts.length;

  return (
    <div className="min-h-screen p-4 pb-safe flex flex-col">
      <div className="max-w-2xl mx-auto w-full space-y-4 flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-row-reverse items-center justify-between bg-white rounded-xl p-4 shadow-md flex-shrink-0">
          <button
            onClick={handleHome}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home className="w-6 h-6 text-gray-700" />
          </button>
          <div className="text-right">
            <p className="text-sm text-gray-600">المحاولات المتبقية من {singleplayer.settings.maxAttempts}</p>
            <p className="text-2xl font-bold text-blue-600">{attemptsLeft}</p>
          </div>
        </div>


        {/* زر التحدي أو مربع التلميح في الأعلى */}
        {onStartChallenge && (
          !challengeCompleted ? (
            <button
              onClick={onStartChallenge}
              className="w-full flex items-center gap-2 justify-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md flex-shrink-0"
            >
              <Lightbulb className="w-6 h-6" />
              <span className="text-lg">تحدي</span>
            </button>
          ) : hint ? (
            <div className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl p-4 shadow-md flex-shrink-0">
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                التلميح:
              </h3>
              <p className="text-white text-base font-bold">{hint.type === "digit" ? `في الخانة ${(hint.position || 0) + 1}: رقم ${hint.value}` : String(hint.value)}</p>
            </div>
          ) : null
        )}

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

        {singleplayer.attempts.length > 0 && !expandedAttempts && (
          <div className="bg-white rounded-xl p-4 shadow-md flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">محاولات ({singleplayer.attempts.length} / {singleplayer.settings.maxAttempts})</h3>
              <button
                onClick={() => setExpandedAttempts(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div>
              {singleplayer.attempts.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-row-reverse">
                  <span className="font-mono text-lg font-bold text-gray-800">
                    {[...singleplayer.attempts].reverse()[0].guess.join("")}
                  </span>
                  <div className="flex gap-2 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                      {[...singleplayer.attempts].reverse()[0].correctCount} صح
                    </span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold">
                      {[...singleplayer.attempts].reverse()[0].correctPositionCount === 0 && '0 مكانو صح'}
                      {[...singleplayer.attempts].reverse()[0].correctPositionCount === 1 && '1 مكانو صح'}
                      {[...singleplayer.attempts].reverse()[0].correctPositionCount > 1 && `${[...singleplayer.attempts].reverse()[0].correctPositionCount} مكانهم صح`}
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
                <h3 className="text-2xl font-bold text-gray-800">محاولات ({singleplayer.attempts.length} / {singleplayer.settings.maxAttempts})</h3>
                <button
                  onClick={() => setExpandedAttempts(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-scroll flex-1 p-4">
                <div className="space-y-3">
                  {[...singleplayer.attempts].reverse().map((attempt, idx) => (
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
