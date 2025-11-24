import { useState, useRef, useEffect } from "react";
import { Text, RoundedBox } from "@react-three/drei";
import { useNumberGame } from "@/lib/stores/useNumberGame";

export function AttemptsHistory() {
  const { mode, singleplayer, multiplayer } = useNumberGame();
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRef = useRef(0);

  if (mode !== "singleplayer" && mode !== "multiplayer") {
    return null;
  }

  const attempts = mode === "singleplayer" ? singleplayer.attempts : multiplayer.attempts;
  const numDigits = mode === "singleplayer" ? singleplayer.settings.numDigits : multiplayer.settings.numDigits;
  const maxAttempts = mode === "singleplayer" ? singleplayer.settings.maxAttempts : multiplayer.settings.maxAttempts;
  const attemptCount = attempts.length;
  const itemHeight = 0.65;
  const panelWidth = 5.5;
  const panelHeight = 4.5;
  const maxVisibleItems = 5;
  
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // التمرير بسرعة أكبر عشان يكون سلس زي التليفون
      const maxScroll = Math.max(0, attemptCount - maxVisibleItems) * itemHeight;
      scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current + e.deltaY * 0.008));
      setScrollOffset(scrollRef.current);
    };

    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.shiftKey)) {
        e.preventDefault();
        const maxScroll = Math.max(0, attemptCount - maxVisibleItems) * itemHeight;
        scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current + itemHeight * 2));
        setScrollOffset(scrollRef.current);
      } else if (e.key === 'PageUp' || (e.key === 'ArrowUp' && e.shiftKey)) {
        e.preventDefault();
        const maxScroll = Math.max(0, attemptCount - maxVisibleItems) * itemHeight;
        scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current - itemHeight * 2));
        setScrollOffset(scrollRef.current);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // كليك يمين مطول للسحب
      if (e.button === 2) { // 2 = right mouse button
        isDragging.current = true;
        dragStartY.current = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaY = e.clientY - dragStartY.current;
      const maxScroll = Math.max(0, attemptCount - maxVisibleItems) * itemHeight;
      // عكس الاتجاه - لما تسحب لأسفل يرفع للأعلى
      scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current - deltaY * 0.008));
      setScrollOffset(scrollRef.current);
      dragStartY.current = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      // منع ظهور القائمة الافتراضية للكليك اليمين
      e.preventDefault();
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyboard);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [attemptCount, maxVisibleItems, itemHeight]);

  const startIndex = Math.floor(scrollOffset / itemHeight);
  const visibleAttempts = attempts.slice(startIndex, startIndex + maxVisibleItems);

  const maxScroll = Math.max(0, (attemptCount - maxVisibleItems) * itemHeight);
  const scrollProgress = maxScroll > 0 ? scrollOffset / maxScroll : 0;

  return (
    <group position={[5, 2.5, -12.8]}>
      {/* خلفية اللوحة */}
      <RoundedBox
        args={[3.3, panelHeight, 0.25]}
        radius={0.18}
        smoothness={6}
        castShadow
      >
        <meshStandardMaterial 
          color="#f8fafc"
          metalness={0.15}
          roughness={0.6}
          emissive="#cbd5e1"
          emissiveIntensity={0.1}
        />
      </RoundedBox>

      {/* شريط التمرير الجانبي */}
      {attemptCount > maxVisibleItems && (
        <>
          {/* خلفية شريط التمرير */}
          <RoundedBox
            args={[0.18, panelHeight - 0.8, 0.08]}
            radius={0.09}
            smoothness={6}
            position={[1.45, -0.15, 0.08]}
          >
            <meshStandardMaterial 
              color="#e2e8f0"
              metalness={0.1}
              roughness={0.7}
            />
          </RoundedBox>

          {/* مؤشر التمرير */}
          <RoundedBox
            args={[0.16, Math.max(0.3, (panelHeight - 0.8) * (maxVisibleItems / attemptCount)), 0.09]}
            radius={0.08}
            smoothness={6}
            position={[1.45, (panelHeight / 2 - 1) - scrollProgress * (Math.max(0, panelHeight - 0.8 - ((panelHeight - 0.8) * (maxVisibleItems / attemptCount)))), 0.09]}
          >
            <meshStandardMaterial 
              color="#6366f1"
              metalness={0.2}
              roughness={0.3}
              emissive="#6366f1"
              emissiveIntensity={0.2}
            />
          </RoundedBox>
        </>
      )}

      {/* عنوان اللوحة */}
      <Text
        position={[0, panelHeight / 2 - 0.5, 0.15]}
        fontSize={0.32}
        color="#4338ca"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        محاولات ({attemptCount}/{maxAttempts})
      </Text>

      {/* خط فاصل */}
      <RoundedBox
        args={[3.2, 0.02, 0.02]}
        radius={0.01}
        smoothness={4}
        position={[0, panelHeight / 2 - 0.85, 0.12]}
      >
        <meshStandardMaterial 
          color="#818cf8"
          emissive="#818cf8"
          emissiveIntensity={0.5}
        />
      </RoundedBox>

      {/* قائمة المحاولات - مع clipping */}
      <group position={[0, 0, 0]}>
        {/* قناع clipping للمحاولات */}
        {visibleAttempts.map((attempt, visibleIndex) => {
          const globalIndex = startIndex + visibleIndex;
          const guessText = attempt.guess.join(" ");
          const yPosition = panelHeight / 2 - 1.5 - visibleIndex * itemHeight;
          
          const positionText = 
            attempt.correctPositionCount === 0 ? '0 مكانو صح' :
            attempt.correctPositionCount === 1 ? '1 مكانو صح' :
            `${attempt.correctPositionCount} مكانهم صح`;

          return (
            <group key={globalIndex} position={[0, yPosition, 0]}>
              {/* خلفية صف المحاولة */}
              <RoundedBox
                args={[3.05, itemHeight - 0.08, 0.08]}
                radius={0.1}
                smoothness={6}
                position={[0, 0, 0.08]}
              >
                <meshStandardMaterial 
                  color={globalIndex % 2 === 0 ? "#f0f4ff" : "#ffffff"}
                  transparent
                  opacity={0.7}
                  metalness={0.3}
                  roughness={0.2}
                />
              </RoundedBox>

              {/* الرقم المحاول - على اليمين */}
              <Text
                position={[1.35, 0, 0.15]}
                fontSize={0.24}
                color="#1e293b"
                anchorX="right"
                anchorY="middle"
                fontWeight="bold"
              >
                {guessText}
              </Text>

              {/* Badge: عدد الأرقام الصحيحة */}
              <RoundedBox
                args={[0.55, 0.28, 0.06]}
                radius={0.08}
                smoothness={6}
                position={[-0.25, 0.08, 0.12]}
              >
                <meshStandardMaterial 
                  color="#dbeafe"
                  metalness={0.2}
                  roughness={0.4}
                />
              </RoundedBox>
              <Text
                position={[-0.25, 0.08, 0.16]}
                fontSize={0.14}
                color="#1e40af"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
              >
                {attempt.correctCount} صح
              </Text>

              {/* Badge: الأرقام في مكانها الصحيح */}
              <RoundedBox
                args={[0.85, 0.28, 0.06]}
                radius={0.08}
                smoothness={6}
                position={[-0.95, 0.08, 0.12]}
              >
                <meshStandardMaterial 
                  color="#dcfce7"
                  metalness={0.2}
                  roughness={0.4}
                />
              </RoundedBox>
              <Text
                position={[-0.95, 0.08, 0.16]}
                fontSize={0.12}
                color="#166534"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
              >
                {positionText}
              </Text>
            </group>
          );
        })}
      </group>


      {attemptCount === 0 && (
        <Text
          position={[0, 0, 0.15]}
          fontSize={0.24}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          لا توجد محاولات بعد
        </Text>
      )}
    </group>
  );
}
