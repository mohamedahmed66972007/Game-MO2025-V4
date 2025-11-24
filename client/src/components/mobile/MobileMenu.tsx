import { useState } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { Gamepad2, Users } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";

export function MobileMenu() {
  const { setMode, startSingleplayer } = useNumberGame();
  const [showSettings, setShowSettings] = useState(false);

  const handleSingleplayer = () => {
    setShowSettings(true);
  };

  const handleSettingsConfirm = (settings: { numDigits: number; maxAttempts: number }) => {
    startSingleplayer(settings);
    setShowSettings(false);
  };

  if (showSettings) {
    return <GameSettings onConfirm={handleSettingsConfirm} isMultiplayer={false} />;
  }

  const handleMultiplayer = () => {
    setMode("multiplayer");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800">
            لعبة التخمين
          </h1>
          
          <div className="space-y-2 text-gray-600">
            <p className="text-lg">خمن الرقم السري المكون من 4 أرقام</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSingleplayer}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
          >
            <Gamepad2 className="w-6 h-6" />
            <span className="text-lg">لعب فردي</span>
          </button>

          <button
            onClick={handleMultiplayer}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
          >
            <Users className="w-6 h-6" />
            <span className="text-lg">لعب متعدد اللاعبين</span>
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>📖</span>
            <span>كيف تلعب:</span>
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 text-right">
            <li>1. <strong>اختر رقمك السري:</strong> 4 أرقام يحاول الخصم تخمينها</li>
            <li>2. <strong>خمن الرقم:</strong> أدخل 4 أرقام من اختيارك</li>
            <li>3. <strong>الملاحظات:</strong> رقم أزرق = صح بأي موضع، رقم أخضر = صح بالموضع الصحيح</li>
            <li>4. من يخمن الرقم السري أولاً يفوز!</li>
            <li>5. يمكن تخصيص عدد الأرقام وعدد المحاولات في كل جولة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
