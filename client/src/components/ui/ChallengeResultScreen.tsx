export function ChallengeResultScreen({
  won,
  onClose,
}: {
  won: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-[200]">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 text-center space-y-6">
        <div className="text-8xl mb-4">
          {won ? "🎉" : "😔"}
        </div>
        
        <h2 className="text-4xl font-bold" style={{ color: won ? "#22c55e" : "#ef4444" }}>
          {won ? "تهانينا! فزت" : "حاول مرة أخرى"}
        </h2>
        
        <p className="text-gray-700 text-lg">
          {won 
            ? "لقد أكملت التحدي بنجاح! يمكنك الآن رؤية التلميح فوق الباب"
            : "لم تستطع إكمال التحدي هذه المرة. حاول مرة أخرى لاحقاً"}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg text-lg"
        >
          {won ? "العودة للغرفة الرئيسية" : "العودة للقائمة"}
        </button>
      </div>
    </div>
  );
}
