import { useRef, useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useChallenge } from "@/lib/stores/useChallenge";
import { useNumberGame } from "@/lib/stores/useNumberGame";

export function ChallengeDoor({ onEnterChallenge }: { onEnterChallenge: () => void }) {
  const buttonRef = useRef<THREE.Mesh>(null);
  const hintBoxRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [isHovering, setIsHovering] = useState(false);
  const challengeCompleted = useChallenge((state) => state.challengeCompleted);
  const hint = useChallenge((state) => state.hint);
  const { generateHint } = useChallenge();
  const { singleplayer } = useNumberGame();
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    if (challengeCompleted && !hint && singleplayer.secretCode) {
      console.log("🚪 Door: Generating hint, secretCode:", singleplayer.secretCode);
      generateHint(singleplayer.secretCode);
    }
  }, [challengeCompleted, hint, generateHint, singleplayer.secretCode]);

  useEffect(() => {
    console.log("🚪 Door state - challengeCompleted:", challengeCompleted, "hint:", hint);
  }, [challengeCompleted, hint]);

  useEffect(() => {
    const handlePointerDown = () => {
      if (challengeCompleted) return;
      
      raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycasterRef.current.far = Infinity;
      
      let clickedButton = false;
      if (buttonRef.current) {
        const intersectsButton = raycasterRef.current.intersectObject(buttonRef.current, true);
        if (intersectsButton.length > 0) clickedButton = true;
      }
      if (hintBoxRef.current && !clickedButton) {
        const intersectsHint = raycasterRef.current.intersectObject(hintBoxRef.current, true);
        if (intersectsHint.length > 0) clickedButton = true;
      }
      
      if (clickedButton) {
        onEnterChallenge();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [onEnterChallenge, camera, challengeCompleted]);

  useFrame((state) => {
    if (!buttonRef.current && !hintBoxRef.current) return;

    raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycasterRef.current.far = Infinity;
    
    let isHover = false;
    if (buttonRef.current) {
      const intersectsButton = raycasterRef.current.intersectObject(buttonRef.current, true);
      if (intersectsButton.length > 0) isHover = true;
    }
    if (hintBoxRef.current) {
      const intersectsHint = raycasterRef.current.intersectObject(hintBoxRef.current, true);
      if (intersectsHint.length > 0) isHover = true;
    }
    
    if (isHover !== isHovering) {
      setIsHovering(isHover);
    }

    if (buttonRef.current) {
      const targetScale = isHovering && !challengeCompleted ? 1.1 : 1.0;
      buttonRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.15
      );
    }
  });

  const handleDoorClick = () => {
    onEnterChallenge();
  };

  const hintText = hint
    ? hint.type === "digit"
      ? `${hint.value}`
      : String(hint.value)
    : "";

  return (
    <group position={[11, 2, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
      {/* مربع التلميح العلوي الشفاف */}
      <group position={[0, 2.0, 0]}>
        {/* الخلفية الشفافة */}
        <mesh ref={hintBoxRef}>
          <boxGeometry args={[2.3, 1.3, 0.15]} />
          <meshStandardMaterial
            color="#6366f1"
            transparent
            opacity={0.3}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>

        {/* حدود ذهبية علوية */}
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[2.4, 1.4, 0.05]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={1}
            roughness={0.1}
            emissive="#fbbf24"
            emissiveIntensity={0.7}
          />
        </mesh>

        {/* النص */}
        {challengeCompleted ? (
          <>
            <Text
              position={[0, 0.35, 0.15]}
              fontSize={0.2}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              التلميح:
            </Text>
            {hint && (
              <Text
                position={[0, -0.15, 0.15]}
                fontSize={0.16}
                color="#fbbf24"
                anchorX="center"
                anchorY="middle"
                maxWidth={2.1}
                lineHeight={1.3}
                fontWeight="bold"
              >
                {hintText}
              </Text>
            )}
          </>
        ) : (
          <Text
            position={[0, 0, 0.15]}
            fontSize={0.24}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            التلميح
          </Text>
        )}
      </group>

      {/* الزر المربع الرئيسي الطافي الشفاف */}
      <mesh 
        ref={buttonRef}
        position={[0, 0, 0.1]}
      >
        <boxGeometry args={[2.0, 2.0, 0.15]} />
        <meshStandardMaterial
          color={challengeCompleted ? "#999999" : isHovering ? "#8b5cf6" : "#6366f1"}
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.2}
          emissive={challengeCompleted ? "#999999" : isHovering ? "#8b5cf6" : "#4f46e5"}
          emissiveIntensity={challengeCompleted ? 0.3 : isHovering ? 0.8 : 0.5}
        />
      </mesh>

      {/* حدود ذهبية للزر الرئيسي */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[2.1, 2.1, 0.04]} />
        <meshStandardMaterial
          color="#fbbf24"
          metalness={1}
          roughness={0.1}
          emissive="#fbbf24"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* رمز المصباح */}
      <Text
        position={[0, 0.4, 0.2]}
        fontSize={0.55}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        💡
      </Text>

      {/* نص "تلميح" */}
      <Text
        position={[0, -0.45, 0.2]}
        fontSize={0.32}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        تلميح
      </Text>
    </group>
  );
}
