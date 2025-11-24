import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";

export function GameHUD() {
  const { mode, singleplayer, multiplayer } = useNumberGame();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update timer every 100ms for smooth display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Render based on mode
  if (mode === "singleplayer") {
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm text-gray-300">المحاولات: {singleplayer.attempts.length}/{singleplayer.settings.maxAttempts}</p>
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  if (mode === "multiplayer") {
    const timeElapsed = multiplayer.startTime > 0 && multiplayer.gameStatus === "playing"
      ? Math.floor((currentTime - multiplayer.startTime) / 1000)
      : 0;
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;

    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-300">
            لعبة جماعية
          </p>
          <p className="text-sm text-gray-300">
            محاولاتك: {multiplayer.attempts.length}/{multiplayer.settings.maxAttempts}
          </p>
          {multiplayer.gameStatus === "playing" && multiplayer.startTime > 0 && (
            <p className="text-sm text-yellow-400">
              الوقت: {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
          )}
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  return null;
}
