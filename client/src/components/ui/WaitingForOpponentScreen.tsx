import { useNumberGame } from "@/lib/stores/useNumberGame";

export function WaitingForOpponentScreen() {
  const { multiplayer } = useNumberGame();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
      <div className="text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            {/* Outer rotating circle */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 animate-spin"></div>
            
            {/* Inner waiting circle */}
            <div className="absolute inset-2 rounded-full border-4 border-blue-200 flex items-center justify-center">
              <span className="text-5xl animate-pulse">⏳</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-4xl font-bold text-gray-800">جاري الانتظار</h2>
          <p className="text-xl text-gray-600">
            في انتظار <span className="font-bold text-blue-600">{multiplayer.opponentName}</span>
          </p>
          <p className="text-gray-500 text-sm">
            يقوم الخصم بإدخال رقمه السري...
          </p>
        </div>

        <div className="flex justify-center gap-2 pt-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
}
