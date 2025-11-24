export function Crosshair({ isHoveringButton = false }: { isHoveringButton?: boolean }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="relative">
        {/* نقطة احترافية */}
        <div 
          className="w-2 h-2 rounded-full transition-all duration-200 shadow-lg"
          style={{
            backgroundColor: isHoveringButton ? '#22c55e' : '#ffffff',
            boxShadow: isHoveringButton 
              ? '0 0 8px 2px rgba(34, 197, 94, 0.8)' 
              : '0 0 4px 1px rgba(255, 255, 255, 0.5)',
          }}
        />
        
        {/* حلقة خارجية رفيعة عند hover */}
        {isHoveringButton && (
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-green-400 opacity-60"
          />
        )}
      </div>
    </div>
  );
}
