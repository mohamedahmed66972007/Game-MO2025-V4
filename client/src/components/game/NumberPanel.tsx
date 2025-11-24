import { useRef, useState, useEffect, useCallback } from "react";
import { useFrame, ThreeEvent, useThree } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useNumberGame, GamePhase } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { send } from "@/lib/websocket";
import { toast } from "sonner";
import { DisplayPanel } from "./DisplayPanel";

interface ButtonProps {
  position: [number, number, number];
  digit: number;
  onClick: (digit: number) => void;
}

interface NumberButtonProps extends ButtonProps {
  isPointerLocked?: boolean;
  ref?: React.Ref<THREE.Mesh>;
}

const NumberButton = ({ position, digit, onClick, isPointerLocked }: NumberButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [isHoveredByCenter, setIsHoveredByCenter] = useState(false);
  const [buttonZ, setButtonZ] = useState(0);
  const meshRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const { camera } = useThree();

  useFrame(() => {
    if (isPointerLocked && meshRef.current) {
      const normalizedCoords = new THREE.Vector2(0, 0);
      raycaster.current.setFromCamera(normalizedCoords, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        setIsHoveredByCenter(true);
        meshRef.current.scale.setScalar(1.08);
        meshRef.current.position.z = 0.12;
        setButtonZ(0.12);
      } else {
        setIsHoveredByCenter(false);
        meshRef.current.scale.setScalar(1);
        meshRef.current.position.z = 0;
        setButtonZ(0);
      }
    } else if (meshRef.current && hovered && !isPointerLocked) {
      meshRef.current.scale.setScalar(1.08);
      meshRef.current.position.z = 0.12;
      setButtonZ(0.12);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
      meshRef.current.position.z = 0;
      setButtonZ(0);
    }
  });

  // Keyboard and mouse listener for center crosshair click
  useEffect(() => {
    if (!isPointerLocked || !isHoveredByCenter) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        onClick(digit);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(digit);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("mousedown", handleMouseDown, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isPointerLocked, isHoveredByCenter, digit, onClick]);

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[0.85, 0.85, 0.25]}
        radius={0.15}
        smoothness={6}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!isPointerLocked) {
            e.stopPropagation();
            onClick(digit);
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!isPointerLocked) {
            e.stopPropagation();
            setHovered(true);
          }
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          setHovered(false);
        }}
        castShadow
      >
        <meshStandardMaterial 
          color={hovered ? "#7c3aed" : "#8b5cf6"}
          metalness={0.2}
          roughness={0.4}
          emissive={hovered ? "#5b21b6" : "#000000"}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </RoundedBox>
      <Text
        position={[0, 0, 0.16 + buttonZ]}
        fontSize={0.48}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {digit}
      </Text>
    </group>
  );
};

interface DeleteButtonProps {
  position: [number, number, number];
  onClick: () => void;
  isPointerLocked?: boolean;
}

const DeleteButton = ({ position, onClick, isPointerLocked }: DeleteButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [isHoveredByCenter, setIsHoveredByCenter] = useState(false);
  const [buttonZ, setButtonZ] = useState(0);
  const meshRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const { camera } = useThree();

  useFrame(() => {
    if (isPointerLocked && meshRef.current) {
      const normalizedCoords = new THREE.Vector2(0, 0);
      raycaster.current.setFromCamera(normalizedCoords, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        setIsHoveredByCenter(true);
        meshRef.current.scale.setScalar(1.08);
        meshRef.current.position.z = 0.12;
        setButtonZ(0.12);
      } else {
        setIsHoveredByCenter(false);
        meshRef.current.scale.setScalar(1);
        meshRef.current.position.z = 0;
        setButtonZ(0);
      }
    } else if (meshRef.current && hovered && !isPointerLocked) {
      meshRef.current.scale.setScalar(1.08);
      meshRef.current.position.z = 0.12;
      setButtonZ(0.12);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
      meshRef.current.position.z = 0;
      setButtonZ(0);
    }
  });

  useEffect(() => {
    if (!isPointerLocked || !isHoveredByCenter) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        onClick();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      onClick();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isPointerLocked, isHoveredByCenter, onClick]);

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[0.85, 0.85, 0.25]}
        radius={0.15}
        smoothness={6}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!isPointerLocked) {
            e.stopPropagation();
            onClick();
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!isPointerLocked) {
            e.stopPropagation();
            setHovered(true);
          }
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          setHovered(false);
        }}
        castShadow
      >
        <meshStandardMaterial 
          color={hovered ? "#dc2626" : "#ef4444"}
          metalness={0.2}
          roughness={0.4}
          emissive={hovered ? "#991b1b" : "#000000"}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </RoundedBox>
      <Text
        position={[0, 0, 0.16 + buttonZ]}
        fontSize={0.42}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        ✕
      </Text>
    </group>
  );
};

interface ConfirmButtonProps {
  position: [number, number, number];
  onClick: () => void;
  enabled: boolean;
  isPointerLocked?: boolean;
}

const ConfirmButton = ({ position, onClick, enabled, isPointerLocked }: ConfirmButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [isHoveredByCenter, setIsHoveredByCenter] = useState(false);
  const [buttonZ, setButtonZ] = useState(0);
  const meshRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const { camera } = useThree();

  useFrame(() => {
    if (isPointerLocked && meshRef.current && enabled) {
      const normalizedCoords = new THREE.Vector2(0, 0);
      raycaster.current.setFromCamera(normalizedCoords, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        setIsHoveredByCenter(true);
        meshRef.current.scale.setScalar(1.08);
        meshRef.current.position.z = 0.12;
        setButtonZ(0.12);
      } else {
        setIsHoveredByCenter(false);
        meshRef.current.scale.setScalar(1);
        meshRef.current.position.z = 0;
        setButtonZ(0);
      }
    } else if (meshRef.current && hovered && enabled && !isPointerLocked) {
      meshRef.current.scale.setScalar(1.08);
      meshRef.current.position.z = 0.12;
      setButtonZ(0.12);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
      meshRef.current.position.z = 0;
      setButtonZ(0);
    }
  });

  useEffect(() => {
    if (!isPointerLocked || !isHoveredByCenter || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        onClick();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      onClick();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isPointerLocked, isHoveredByCenter, enabled, onClick]);

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[0.85, 0.85, 0.25]}
        radius={0.15}
        smoothness={6}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!isPointerLocked && enabled) {
            e.stopPropagation();
            onClick();
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!isPointerLocked) {
            e.stopPropagation();
            if (enabled) {
              setHovered(true);
            }
          }
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          setHovered(false);
        }}
        castShadow
      >
        <meshStandardMaterial 
          color={enabled ? (hovered ? "#059669" : "#10b981") : "#9ca3af"}
          metalness={0.2}
          roughness={0.4}
          emissive={enabled && hovered ? "#047857" : "#000000"}
          emissiveIntensity={enabled && hovered ? 0.4 : 0}
        />
      </RoundedBox>
      <Text
        position={[0, 0, 0.16 + buttonZ]}
        fontSize={0.42}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        ✓
      </Text>
    </group>
  );
};

interface NumberPanelProps {
  isPointerLocked?: boolean;
}

export function NumberPanel({ isPointerLocked = false }: NumberPanelProps) {
  const { mode, singleplayer, multiplayer, addDigitToGuess, deleteLastDigit, submitGuess, addMultiplayerDigit, deleteMultiplayerDigit, submitMultiplayerGuess } = useNumberGame();
  const { playDigit, playDelete, playSuccess, playError, playConfirm } = useAudio();
  
  const numDigits = mode === "singleplayer" ? singleplayer.settings.numDigits : multiplayer.settings.numDigits;

  // تشغيل صوت النجاح عند الفوز
  const [wonSoundPlayed, setWonSoundPlayed] = useState(false);
  const prevPhaseRef = useRef<GamePhase | null>(null);
  
  useEffect(() => {
    let currentPhase: GamePhase | null = null;
    
    if (mode === "singleplayer") {
      currentPhase = singleplayer.phase;
    } else if (mode === "multiplayer") {
      currentPhase = multiplayer.phase;
    }
    
    // تشغيل الصوت فقط عند التحول إلى "won" من حالة أخرى
    if (currentPhase === "won" && prevPhaseRef.current !== "won" && !wonSoundPlayed) {
      playSuccess();
      setWonSoundPlayed(true);
    }
    
    // إعادة تعيين العلم عند بدء لعبة جديدة
    if (currentPhase === "playing" && prevPhaseRef.current !== "playing") {
      setWonSoundPlayed(false);
    }
    
    prevPhaseRef.current = currentPhase;
  }, [mode, singleplayer.phase, multiplayer.phase, playSuccess, wonSoundPlayed]);

  const handleDigitClick = useCallback((digit: number) => {
    if (mode === "singleplayer") {
      if (singleplayer.phase === "playing") {
        playDigit(digit);
        addDigitToGuess(digit);
      }
    } else if (mode === "multiplayer") {
      if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") {
        toast.warning("اللعبة غير نشطة", { duration: 3000 });
        return;
      }
      playDigit(digit);
      addMultiplayerDigit(digit);
    }
  }, [mode, playDigit, addDigitToGuess, addMultiplayerDigit, multiplayer.gameStatus, multiplayer.phase, singleplayer.phase]);

  const handleDeleteClick = useCallback(() => {
    if (mode === "singleplayer") {
      if (singleplayer.phase === "playing") {
        playDelete();
        deleteLastDigit();
      }
    } else if (mode === "multiplayer") {
      if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") {
        return;
      }
      playDelete();
      deleteMultiplayerDigit();
    }
  }, [mode, playDelete, deleteLastDigit, deleteMultiplayerDigit, multiplayer.gameStatus, multiplayer.phase, singleplayer.phase]);

  const handleConfirmClick = useCallback(() => {
    if (mode === "singleplayer") {
      if (singleplayer.phase !== "playing") {
        return;
      }
      const currentGuess = singleplayer.currentGuess;
      if (currentGuess.length === numDigits) {
        playConfirm();
        submitGuess();
      } else {
        playError();
      }
    } else if (mode === "multiplayer") {
      if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") {
        toast.warning("اللعبة غير نشطة", { duration: 3000 });
        return;
      }
      const currentGuess = multiplayer.currentGuess;
      if (currentGuess.length === numDigits) {
        playConfirm();
        const guessToSend = [...currentGuess];
        submitMultiplayerGuess();
        send({
          type: "submit_guess",
          guess: guessToSend,
        });
      } else {
        playError();
      }
    }
  }, [mode, singleplayer.currentGuess, singleplayer.phase, multiplayer.gameStatus, multiplayer.phase, multiplayer.currentGuess, numDigits, playConfirm, playError, submitGuess, submitMultiplayerGuess]);

  // Keyboard input listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if game is active
      const isGameActive = mode === "singleplayer" || 
                          (mode === "multiplayer" && multiplayer.gameStatus === "playing");
      
      if (!isGameActive) return;
      
      // Numbers 0-9
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigitClick(parseInt(e.key));
      }
      // Backspace or Delete
      else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleDeleteClick();
      }
      // Enter or Space for submit
      else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleConfirmClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, multiplayer.gameStatus, handleDigitClick, handleDeleteClick, handleConfirmClick]);

  const currentGuess = mode === "singleplayer" ? singleplayer.currentGuess : multiplayer.currentGuess;
  const canConfirm = currentGuess.length === numDigits && (mode === "singleplayer" || multiplayer.gameStatus === "playing");

  return (
    <group position={[0, 3.5, -12.3]}>
      <DisplayPanel />

      {[1, 2, 3].map((digit, idx) => (
        <NumberButton
          key={digit}
          position={[(idx - 1) * 1.05, 0.8, -0.1]}
          digit={digit}
          onClick={handleDigitClick}
          isPointerLocked={isPointerLocked}
        />
      ))}
      
      {[4, 5, 6].map((digit, idx) => (
        <NumberButton
          key={digit}
          position={[(idx - 1) * 1.05, -0.3, -0.1]}
          digit={digit}
          onClick={handleDigitClick}
          isPointerLocked={isPointerLocked}
        />
      ))}

      {[7, 8, 9].map((digit, idx) => (
        <NumberButton
          key={digit}
          position={[(idx - 1) * 1.05, -1.4, -0.1]}
          digit={digit}
          onClick={handleDigitClick}
          isPointerLocked={isPointerLocked}
        />
      ))}

      <DeleteButton position={[-1.05, -2.5, -0.1]} onClick={handleDeleteClick} isPointerLocked={isPointerLocked} />
      <NumberButton
        position={[0, -2.5, -0.1]}
        digit={0}
        onClick={handleDigitClick}
        isPointerLocked={isPointerLocked}
      />
      <ConfirmButton position={[1.05, -2.5, -0.1]} onClick={handleConfirmClick} enabled={canConfirm} isPointerLocked={isPointerLocked} />
    </group>
  );
}
