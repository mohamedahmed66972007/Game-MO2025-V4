import { useEffect, useRef, useState } from "react";
import { useChallenge } from "@/lib/stores/useChallenge";
import { Home } from "lucide-react";

const BUTTON_COLORS = [
  { name: "أحمر", color: "#ef4444", sound: 261.63 },
  { name: "أزرق", color: "#3b82f6", sound: 293.66 },
  { name: "أخضر", color: "#22c55e", sound: 329.63 },
  { name: "أصفر", color: "#eab308", sound: 349.23 },
  { name: "بنفسجي", color: "#a855f7", sound: 392.00 },
  { name: "برتقالي", color: "#f97316", sound: 440.00 },
  { name: "وردي", color: "#ec4899", sound: 493.88 },
  { name: "سماوي", color: "#06b6d4", sound: 523.25 },
];

export function MobileChallenge({ onExit }: { onExit: () => void }) {
  const {
    sequence,
    playerSequence,
    currentLevel,
    phase,
    isShowingSequence,
    canInput,
    addToPlayerSequence,
    setIsShowingSequence,
    setCanInput,
  } = useChallenge();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (frequency: number, duration: number = 0.3) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + duration
    );

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  useEffect(() => {
    if (isShowingSequence && sequence.length > 0) {
      let index = 0;
      const delay = Math.max(600 - currentLevel * 50, 300);

      const showNext = () => {
        if (index < sequence.length) {
          const buttonIndex = sequence[index];
          setActiveButton(buttonIndex);
          playSound(BUTTON_COLORS[buttonIndex].sound);

          setTimeout(() => {
            setActiveButton(null);
            index++;
            setTimeout(showNext, delay);
          }, 500);
        } else {
          setIsShowingSequence(false);
          setCanInput(true);
        }
      };

      setTimeout(showNext, 1000);
    }
  }, [isShowingSequence, sequence, currentLevel]);


  const handleButtonClick = (index: number) => {
    if (!canInput || isShowingSequence) return;
    
    setActiveButton(index);
    playSound(BUTTON_COLORS[index].sound);
    addToPlayerSequence(index);

    setTimeout(() => {
      setActiveButton(null);
    }, 300);
  };

  if (phase === "won") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-green-500/30 p-8 text-center space-y-6">
          <div className="text-8xl animate-bounce">🎉</div>
          <h2 className="text-4xl font-bold text-green-400">مبروك! فزت</h2>
          <p className="text-gray-300 text-lg">
            لقد أكملت جميع المستويات الخمسة بنجاح!
          </p>
          <p className="text-green-300 font-semibold">
            سيظهر لك التلميح الآن
          </p>
          <button
            onClick={onExit}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-green-500/50"
          >
            العودة للعبة
          </button>
        </div>
      </div>
    );
  }

  if (phase === "lost") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 p-8 text-center space-y-6">
          <div className="text-8xl">😔</div>
          <h2 className="text-4xl font-bold text-red-400">خسرت!</h2>
          <p className="text-gray-300 text-lg">
            لم تستطع إكمال التحدي هذه المرة
          </p>
          <button
            onClick={onExit}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-red-500/50"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 overflow-hidden relative">
      {/* خلفية متحركة */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/30 via-slate-950 to-blue-950/30 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm hover:bg-slate-800 border border-red-500/30 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            <span>خروج</span>
          </button>
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-xl px-6 py-3 border border-purple-500/30 shadow-lg shadow-purple-500/20">
            <p className="text-white font-bold text-lg">
              المستوى: {currentLevel + 1} / 5
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 max-w-lg mx-auto">
          <div className="flex gap-2 justify-center">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                  i < currentLevel + 1
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800/50 border border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-8 text-center">
          {isShowingSequence && (
            <div className="bg-gradient-to-r from-yellow-900/80 to-amber-900/80 backdrop-blur-xl border border-yellow-500/50 rounded-2xl p-5 shadow-2xl shadow-yellow-500/20 max-w-md mx-auto">
              <p className="text-yellow-200 font-bold text-2xl">⏳ راقب التسلسل...</p>
            </div>
          )}
          {canInput && (
            <div className="bg-gradient-to-r from-green-900/80 to-emerald-900/80 backdrop-blur-xl border border-green-500/50 rounded-2xl p-5 shadow-2xl shadow-green-500/20 max-w-md mx-auto">
              <p className="text-green-200 font-bold text-2xl">
                ✨ دورك! ({playerSequence.length} / {sequence.length})
              </p>
            </div>
          )}
          {!isShowingSequence && !canInput && playerSequence.length === 0 && (
            <div className="bg-gradient-to-r from-blue-900/80 to-indigo-900/80 backdrop-blur-xl border border-blue-500/50 rounded-2xl p-5 shadow-2xl shadow-blue-500/20 max-w-md mx-auto">
              <p className="text-blue-200 font-bold text-2xl">🎯 استعد...</p>
            </div>
          )}
        </div>

        {/* Color Buttons - شبكة 4x2 */}
        <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
          {BUTTON_COLORS.map((btn, index) => (
            <button
              key={index}
              onClick={() => handleButtonClick(index)}
              disabled={!canInput || isShowingSequence}
              className="aspect-square rounded-2xl shadow-2xl transform transition-all duration-200 active:scale-90 disabled:opacity-40 relative overflow-hidden border-2"
              style={{
                backgroundColor: btn.color,
                borderColor: activeButton === index ? '#ffffff' : `${btn.color}80`,
                boxShadow: activeButton === index 
                  ? `0 0 40px 15px ${btn.color}, 0 0 80px 20px ${btn.color}80` 
                  : `0 8px 25px ${btn.color}40, inset 0 2px 10px ${btn.color}80`,
                transform: activeButton === index ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {/* توهج داخلي */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"
                style={{
                  opacity: activeButton === index ? 0.8 : 0.3,
                }}
              />
              
              {/* حلقة نيون */}
              {activeButton === index && (
                <div 
                  className="absolute inset-0 rounded-2xl animate-ping"
                  style={{
                    border: `3px solid ${btn.color}`,
                    boxShadow: `0 0 20px ${btn.color}`,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Info Panel */}
        <div className="mt-8 max-w-lg mx-auto">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl">
            <p className="text-slate-300 text-sm text-center leading-relaxed">
              🎮 اضغط على الأزرار بنفس الترتيب الذي ظهرت به
              <br />
              💫 كل مستوى يزيد السرعة والصعوبة!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
