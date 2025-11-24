import { useState } from "react";
import { Button } from "./button";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send, clearSession, disconnect } from "@/lib/websocket";
import { Users, Copy, LogOut, Settings, Crown, Play } from "lucide-react";
import { GameSettings } from "./GameSettings";

export function MultiplayerLobby() {
  const { multiplayer, setMode, resetMultiplayer } = useNumberGame();
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLeaveRoom = () => {
    send({ type: "leave_room" });
    clearSession();
    disconnect();
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleStartGame = () => {
    if (multiplayer.isHost && multiplayer.players.length >= 2) {
      send({ type: "start_game" });
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(multiplayer.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render GameSettings if showSettings is true
  if (showSettings && multiplayer.isHost) {
    return (
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
    );
  }

  // Main lobby view
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <div className="w-full max-w-4xl bg-white border-2 border-gray-200 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
        {/* Compact Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          {/* Right side - Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">غرفة اللعب الجماعي</h1>
              <p className="text-xs text-gray-600">اللاعبون: {multiplayer.players.length}/10</p>
            </div>
          </div>

          {/* Left side - Room ID and Settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gradient-to-br from-blue-50 to-purple-50 px-3 py-2 rounded-lg border border-blue-200">
              <input
                type="text"
                readOnly
                value={multiplayer.roomId}
                className="w-24 bg-transparent text-gray-800 font-mono font-bold text-sm text-center focus:outline-none"
              />
              <Button
                onClick={handleCopyRoomId}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md flex items-center gap-1 h-7"
              >
                <Copy className="w-3 h-3" />
                {copied ? '✓' : 'نسخ'}
              </Button>
            </div>
            {multiplayer.isHost && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="الإعدادات"
              >
                <Settings className="w-5 h-5 text-blue-600" />
              </button>
            )}
          </div>
        </div>

        {/* Settings Info */}
        <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 flex items-center justify-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">عدد الأرقام:</span>
            <span className="bg-white px-2 py-0.5 rounded font-bold text-blue-600 border border-blue-300">
              {multiplayer.settings.numDigits}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">المحاولات:</span>
            <span className="bg-white px-2 py-0.5 rounded font-bold text-blue-600 border border-blue-300">
              {multiplayer.settings.maxAttempts}
            </span>
          </div>
        </div>
        
        {/* Players List - Main content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-2xl border-2 border-gray-200 h-full">
            <h3 className="text-gray-800 font-bold text-base flex items-center mb-3">
              <Users className="w-4 h-4 ml-2" />
              قائمة اللاعبين ({multiplayer.players.length})
            </h3>

            <div className="space-y-2">
              {multiplayer.players.map((player) => {
                const isHost = player.id === multiplayer.hostId;
                const isYou = player.id === multiplayer.playerId;
                
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl flex items-center justify-between transition-all duration-200 ${
                      isYou
                        ? "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 shadow-md"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    <span className="text-gray-800 font-medium flex items-center">
                      {isHost && (
                        <Crown className="w-4 h-4 ml-2 text-yellow-500 fill-yellow-500" />
                      )}
                      {!isHost && (
                        <span className="w-4 h-4 ml-2 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                          👤
                        </span>
                      )}
                      <span className="font-bold text-sm">{player.name}</span>
                      {isYou && (
                        <span className="mr-2 text-blue-700 text-xs bg-blue-200 px-2 py-0.5 rounded-lg font-semibold">
                          (أنت)
                        </span>
                      )}
                      {isHost && (
                        <span className="mr-2 text-yellow-700 text-xs bg-yellow-200 px-2 py-0.5 rounded-lg font-semibold">
                          (المضيف)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {multiplayer.players.length < 2 && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border-2 border-blue-300 mt-3">
                <p className="text-blue-800 text-center font-medium text-sm">
                  🕒 في انتظار انضمام لاعبين آخرين... (يتطلب لاعبين على الأقل)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          {multiplayer.isHost && (
            <Button
              onClick={handleStartGame}
              disabled={multiplayer.players.length < 2}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-5 h-5" />
              ابدأ اللعبة
            </Button>
          )}

          {!multiplayer.isHost && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border-2 border-purple-300">
              <p className="text-purple-800 text-center font-semibold text-sm">
                ⏳ في انتظار بدء المضيف للعبة...
              </p>
            </div>
          )}

          <Button
            onClick={handleLeaveRoom}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            مغادرة الغرفة
          </Button>
        </div>
      </div>
    </div>
  );
}
