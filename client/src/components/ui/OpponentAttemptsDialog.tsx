import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { X } from "lucide-react";

export function OpponentAttemptsDialog() {
  const showOpponentAttempts = useNumberGame((state) => state.multiplayer.showOpponentAttempts);
  const setShowOpponentAttempts = useNumberGame((state) => state.setShowOpponentAttempts);
  const opponentAttempts = useNumberGame((state) => state.multiplayer.opponentAttempts);

  return (
    <Dialog open={showOpponentAttempts} onOpenChange={setShowOpponentAttempts}>
      <DialogContent className="max-w-md max-h-96 overflow-y-auto bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-0">
        <DialogHeader className="p-6 pb-0 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800">محاولات الخصم</DialogTitle>
            <button
              onClick={() => setShowOpponentAttempts(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>
        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
          {opponentAttempts.length > 0 ? (
            opponentAttempts.map((attempt, index) => {
              const positionText = 
                attempt.correctPositionCount === 0 ? '0 مكانو صح' :
                attempt.correctPositionCount === 1 ? '1 مكانو صح' :
                `${attempt.correctPositionCount} مكانهم صح`;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-row-reverse border border-gray-200"
                >
                  <span className="font-mono text-lg font-bold text-gray-800">
                    {attempt.guess.join("")}
                  </span>
                  <div className="flex gap-2 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                      {attempt.correctCount} صح
                    </span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold">
                      {positionText}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 py-4">لا توجد محاولات</p>
          )}
        </div>
        <div className="p-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowOpponentAttempts(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            العودة
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
