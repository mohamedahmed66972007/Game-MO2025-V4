import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Text, RoundedBox } from "@react-three/drei";
import { FirstPersonControls, Controls } from "./FirstPersonControls";
import { NumberPanel } from "./NumberPanel";
import { DisplayPanel } from "./DisplayPanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { AttemptsHistory } from "./AttemptsHistory";
import { CurrentGuessDisplay } from "./CurrentGuessDisplay";
import { Crosshair } from "../ui/Crosshair";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { ChallengeDoor } from "./ChallengeDoor";

function BackWallStatus() {
  return null;
}

function PendingWinStatus() {
  return null;
}

function Scene({ onLockChange, isPointerLocked = false, onEnterChallenge }: { onLockChange?: (locked: boolean) => void; isPointerLocked?: boolean; onEnterChallenge?: () => void }) {
  const mode = useNumberGame((state) => state.mode);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      onLockChange?.(isLocked);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [onLockChange]);

  return (
    <>
      {/* خلفية بيضاء فاتحة */}
      <color attach="background" args={["#f8f9fa"]} />
      
      {/* إضاءة محيطة ناعمة */}
      <ambientLight intensity={2.0} />
      
      {/* إضاءة رئيسية من الأعلى */}
      <directionalLight 
        position={[0, 10, 0]} 
        intensity={3.5} 
        color="#ffffff"
        castShadow
      />
      
      {/* إضاءة جانبية لإظهار الانعكاسات */}
      <pointLight position={[8, 3, 0]} intensity={1.5} color="#ffedd5" />
      <pointLight position={[-8, 3, 0]} intensity={1.5} color="#dbeafe" />
      <pointLight position={[0, 3, 8]} intensity={1.2} color="#ffffff" />
      <pointLight position={[0, 3, -8]} intensity={1.2} color="#ffffff" />
      
      {/* أرضية بيضاء مع انعكاس */}
      <mesh 
        position={[0, 0, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#ffffff" 
          metalness={0.2}
          roughness={0.05}
          envMapIntensity={1}
        />
      </mesh>

      {/* الحائط الأمامي (الذي يواجه اللاعب) - سيحتوي على لوحة الأرقام */}
      <mesh position={[0, 4, -13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الخلفي */}
      <mesh position={[0, 4, 13]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الأيمن */}
      <mesh position={[13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* الحائط الأيسر */}
      <mesh position={[-13, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[27, 8, 0.5]} />
        <meshStandardMaterial 
          color="#e0e7ff" 
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* السقف */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27, 27]} />
        <meshStandardMaterial 
          color="#fafafa" 
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>

      <NumberPanel isPointerLocked={isPointerLocked} />
      <FeedbackPanel />
      <AttemptsHistory />
      <CurrentGuessDisplay />
      <BackWallStatus />
      
      {mode === "singleplayer" && onEnterChallenge && (
        <ChallengeDoor onEnterChallenge={onEnterChallenge} />
      )}
      
      <FirstPersonControls />
    </>
  );
}

const keyMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

export function GameScene({ onEnterChallenge }: { onEnterChallenge?: () => void }) {
  const [isLocked, setIsLocked] = useState(false);

  return (
    <>
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{
            position: [0, 1.6, 0],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
          }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            
            const handleClick = () => {
              if (!document.pointerLockElement) {
                canvas.requestPointerLock();
              }
            };
            
            canvas.addEventListener('click', handleClick);
            
            return () => {
              canvas.removeEventListener('click', handleClick);
            };
          }}
        >
          <Scene onLockChange={setIsLocked} isPointerLocked={isLocked} onEnterChallenge={onEnterChallenge} />
        </Canvas>
      </KeyboardControls>
      {!isLocked && (
        <div className="fixed inset-0 flex flex-col items-center justify-start pointer-events-none z-40 pt-8">
          <div className="text-white text-sm bg-black bg-opacity-50 p-4 rounded">
            <p className="mb-2">اضغط على الشاشة لقفل المؤشر</p>
          </div>
        </div>
      )}
      
      <Crosshair />
    </>
  );
}
