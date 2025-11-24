import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useNumberGame } from "@/lib/stores/useNumberGame";

export enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

export function FirstPersonControls() {
  const { camera, gl } = useThree();
  const isLocked = useRef(false);
  const firstMoveAfterLock = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const initialLook = useRef(false);
  
  const { singleplayer, multiplayer, mode } = useNumberGame();
  const [, getKeys] = useKeyboardControls<Controls>();

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Double check pointer lock is still active
      if (!isLocked.current || !document.pointerLockElement) return;

      // Skip the very first movement after lock to avoid large jump
      if (firstMoveAfterLock.current) {
        firstMoveAfterLock.current = false;
        // The pointer lock API automatically centers the cursor
        // We skip this first movement event to prevent jumping
        return;
      }

      const movementX = e.movementX || (e as any).mozMovementX || 0;
      const movementY = e.movementY || (e as any).mozMovementY || 0;

      // Get current euler angles
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.order = 'YXZ';

      // Update pitch (vertical rotation, clamped)
      euler.current.x -= movementY * 0.002;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

      // Update yaw (horizontal rotation, unclamped for free rotation)
      euler.current.y -= movementX * 0.002;

      // Apply the rotation to camera
      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
      if (isLocked.current) {
        firstMoveAfterLock.current = true;
        
        // توجيه الكاميرا لتنظر مباشرة للأزرار عند الدخول
        if (!initialLook.current) {
          initialLook.current = true;
          // توجيه الكاميرا للنظر للأمام قليلاً للأسفل (نحو الأزرار)
          euler.current.set(-0.1, 0, 0, 'YXZ');
          camera.quaternion.setFromEuler(euler.current);
        }
        
        console.log('Pointer lock activated - cursor automatically centered');
      } else {
        console.log('Pointer lock released');
      }
    };

    const handlePointerLockError = () => {
      console.error('Pointer lock error');
      isLocked.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only exit pointer lock if it's actually locked
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [camera, gl]);

  // عندما تنتهي اللعبة (فوز أو خسارة) نسرح الماوس تلقائياً
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const currentPhase = mode === "singleplayer" ? singleplayer.phase : multiplayer.phase;
    
    if ((currentPhase === "won" || currentPhase === "lost") && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [singleplayer.phase, multiplayer.phase, mode, gl]);

  useFrame((state, delta) => {
    if (!isLocked.current) return;

    const { forward, back, left, right } = getKeys();
    const speed = 6;
    
    direction.current.set(0, 0, 0);

    if (forward) direction.current.z -= 1;
    if (back) direction.current.z += 1;
    if (left) direction.current.x -= 1;
    if (right) direction.current.x += 1;

    if (direction.current.length() > 0) {
      direction.current.normalize();
      direction.current.applyQuaternion(camera.quaternion);
      direction.current.y = 0;
      direction.current.normalize();

      velocity.current.copy(direction.current).multiplyScalar(speed * delta);

      const newPosition = camera.position.clone().add(velocity.current);
      
      const roomBounds = 12;
      newPosition.x = Math.max(-roomBounds, Math.min(roomBounds, newPosition.x));
      newPosition.z = Math.max(-roomBounds, Math.min(roomBounds, newPosition.z));
      newPosition.y = 1.6;
      
      camera.position.copy(newPosition);
    }
  });

  return null;
}
