import { useState } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";
import { Check, X } from "lucide-react";

export function SecretCodeSetup() {
  const { multiplayer, setMySecretCode } = useNumberGame();
  const [code, setCode] = useState<string[]>(Array(multiplayer.settings.numDigits).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const numDigits = multiplayer.settings.numDigits;

  const handleSecretNumberInput = (num: string) => {
    if (focusedIndex >= numDigits) return;
    const newInput = [...code];
    newInput[focusedIndex] = num;
    setCode(newInput);
    if (focusedIndex < numDigits - 1) {
      setFocusedIndex(focusedIndex + 1);
    }
  };

  const handleSecretBackspace = () => {
    if (focusedIndex > 0) {
      const newInput = [...code];
      if (code[focusedIndex] === "") {
        newInput[focusedIndex - 1] = "";
        setFocusedIndex(focusedIndex - 1);
      } else {
        newInput[focusedIndex] = "";
      }
      setCode(newInput);
    } else if (code[0] !== "") {
      const newInput = [...code];
      newInput[0] = "";
      setCode(newInput);
    }
  };

  const handleSubmitSecretCode = () => {
    if (code.length !== numDigits || code.some(val => val === "")) return;
    const numCode = code.map(Number);
    setMySecretCode(numCode);
    setIsSubmitted(true);
    send({
      type: "set_secret_code",
      code: numCode,
      opponentId: multiplayer.opponentId,
    });
  };

  const isCodeComplete = code.length === numDigits && code.every(val => val !== "");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">اختر رقمك السري</h2>
          <p className="text-sm text-gray-600">اختر {numDigits} أرقام لتخمينها خصمك</p>
        </div>
        
        <div className="flex gap-3 justify-center mb-6" dir="ltr">
          {Array.from({ length: numDigits }, (_, idx) => (
            <div
              key={idx}
              className={`w-16 h-20 border-2 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                focusedIndex === idx
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              {code[idx] || ""}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4" dir="ltr">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleSecretNumberInput(num.toString())}
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
              onClick={() => handleSecretNumberInput(num.toString())}
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
              onClick={() => handleSecretNumberInput(num.toString())}
              className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3" dir="ltr">
          <button
            onClick={handleSecretBackspace}
            className="h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleSecretNumberInput("0")}
            className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all col-span-1"
          >
            0
          </button>
          <button
            onClick={handleSubmitSecretCode}
            disabled={!isCodeComplete}
            className="h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>

        {isSubmitted && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-md animate-pulse">
            <div className="flex items-center justify-center mb-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-blue-700 text-center font-semibold text-lg">
              في انتظار الخصم...
            </p>
            <p className="text-blue-600 text-center text-sm mt-2">
              يرجى الانتظار حتى يدخل خصمك رقمه السري
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
