import { create } from "zustand";

export type ChallengePhase = "menu" | "playing" | "won" | "lost";
export type HintType = "digit" | "description";

export interface Hint {
  type: HintType;
  value: string | number;
  position?: number;
}

interface ChallengeState {
  currentLevel: number;
  sequence: number[];
  playerSequence: number[];
  phase: ChallengePhase;
  challengeCompleted: boolean;
  hint: Hint | null;
  isShowingSequence: boolean;
  canInput: boolean;
  startTime: number;
  timeoutHandle: NodeJS.Timeout | null;

  startChallenge: () => void;
  addToPlayerSequence: (buttonIndex: number) => void;
  checkSequence: () => void;
  nextLevel: () => void;
  failChallenge: () => void;
  completeChallenge: () => void;
  resetChallenge: () => void;
  setIsShowingSequence: (showing: boolean) => void;
  setCanInput: (canInput: boolean) => void;
  generateHint: (secretCode: number[]) => void;
}

const generateSequence = (level: number): number[] => {
  const length = 3 + level;
  return Array.from({ length }, () => Math.floor(Math.random() * 8));
};

const generateRandomHint = (secretCode: number[]): Hint => {
  const numDigits = secretCode.length;
  const hintChoice = Math.random();
  
  if (hintChoice < 0.4) {
    // نوع 1: رقم محدد في خانة محددة
    const position = Math.floor(Math.random() * numDigits);
    const digit = secretCode[position];
    return {
      type: "digit",
      value: digit,
      position,
    };
  } else if (hintChoice < 0.7) {
    // نوع 2: خانة واحدة مع وصف even/odd
    const position = Math.floor(Math.random() * numDigits);
    const digit = secretCode[position];
    const isEven = digit % 2 === 0;
    const parity = isEven ? 'زوجي' : 'فردي';
    
    return {
      type: "description",
      value: `الخانة ${position + 1} رقم ${parity}`,
    };
  } else {
    // نوع 3: خانتان عشوائيتان مع وصف even/odd لكل واحدة
    const positions = [];
    const availablePositions = Array.from({ length: numDigits }, (_, i) => i);
    
    // اختيار خانتين عشوائيتين
    const pos1Index = Math.floor(Math.random() * availablePositions.length);
    const pos1 = availablePositions[pos1Index];
    availablePositions.splice(pos1Index, 1);
    
    const pos2Index = Math.floor(Math.random() * availablePositions.length);
    const pos2 = availablePositions[pos2Index];
    
    const digit1 = secretCode[pos1];
    const digit2 = secretCode[pos2];
    const parity1 = digit1 % 2 === 0 ? 'زوجي' : 'فردي';
    const parity2 = digit2 % 2 === 0 ? 'زوجي' : 'فردي';
    
    const hint1 = `الخانة ${pos1 + 1} رقم ${parity1}`;
    const hint2 = `الخانة ${pos2 + 1} رقم ${parity2}`;
    
    return {
      type: "description",
      value: `${hint1} و ${hint2}`,
    };
  }
};

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('challenge-storage');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.state && data.state.challengeCompleted) {
        console.log("💾 Loaded challengeCompleted from storage:", data.state.challengeCompleted);
      }
    } catch (e) {
      console.error("Error loading challenge storage:", e);
    }
  }
}

export const useChallenge = create<ChallengeState>()(
  (set, get) => ({
      currentLevel: 0,
      sequence: [],
      playerSequence: [],
      phase: "menu",
      challengeCompleted: false,
      hint: null,
      isShowingSequence: false,
      canInput: false,
      startTime: 0,
      timeoutHandle: null,

      startChallenge: () => {
        console.log("🎮 Starting challenge - preserving hint and challengeCompleted");
        const sequence = generateSequence(0);
        const { hint, challengeCompleted, timeoutHandle } = get();
        
        // Clear previous timeout if exists
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        // Set 5-minute timeout (300 seconds)
        const newTimeoutHandle = setTimeout(() => {
          console.log("⏰ Challenge timeout - 5 minutes elapsed");
          set({
            phase: "lost",
            canInput: false,
          });
        }, 5 * 60 * 1000);
        
        set({
          currentLevel: 0,
          sequence,
          playerSequence: [],
          phase: "playing",
          isShowingSequence: true,
          canInput: false,
          hint,
          challengeCompleted,
          startTime: Date.now(),
          timeoutHandle: newTimeoutHandle,
        });
      },

      addToPlayerSequence: (buttonIndex: number) => {
        const { playerSequence, canInput, sequence, currentLevel } = get();
        if (!canInput) return;
        
        const newPlayerSequence = [...playerSequence, buttonIndex];
        const currentIndex = playerSequence.length;
        
        if (sequence[currentIndex] !== buttonIndex) {
          get().failChallenge();
          return;
        }
        
        set({
          playerSequence: newPlayerSequence,
        });
        
        if (newPlayerSequence.length === sequence.length) {
          const nextLevelNum = get().currentLevel + 1;
          if (nextLevelNum >= 5) {
            setTimeout(() => {
              get().completeChallenge();
            }, 500);
          } else {
            setTimeout(() => {
              get().nextLevel();
            }, 1000);
          }
        }
      },

      checkSequence: () => {
      },

      nextLevel: () => {
        const { currentLevel } = get();
        const newLevel = currentLevel + 1;
        const newSequence = generateSequence(newLevel);
        
        set({
          currentLevel: newLevel,
          sequence: newSequence,
          playerSequence: [],
          isShowingSequence: true,
          canInput: false,
        });
      },


      completeChallenge: () => {
        console.log("🎯 Challenge Completed! Setting to true");
        const { timeoutHandle } = get();
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        set({
          phase: "won",
          challengeCompleted: true,
          canInput: false,
          timeoutHandle: null,
        });
        setTimeout(() => {
          const state = get();
          console.log("✅ Challenge state after set:", {
            challengeCompleted: state.challengeCompleted,
            hint: state.hint,
            phase: state.phase
          });
        }, 100);
      },

      failChallenge: () => {
        const { timeoutHandle } = get();
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        set({
          phase: "lost",
          playerSequence: [],
          canInput: false,
          timeoutHandle: null,
        });
      },

      resetChallenge: () => {
        const { hint, challengeCompleted, timeoutHandle } = get();
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        console.log("🔄 Resetting challenge - preserving hint and challengeCompleted");
        set({
          currentLevel: 0,
          sequence: [],
          playerSequence: [],
          phase: "menu",
          isShowingSequence: false,
          canInput: false,
          hint,
          challengeCompleted,
          startTime: 0,
          timeoutHandle: null,
        });
      },

      setIsShowingSequence: (showing: boolean) => {
        set({ isShowingSequence: showing });
      },

      setCanInput: (canInput: boolean) => {
        set({ canInput });
      },

      generateHint: (secretCode: number[]) => {
        const hint = generateRandomHint(secretCode);
        console.log("💡 Hint Generated:", hint);
        set({ hint });
        setTimeout(() => {
          const state = get();
          console.log("✅ Hint state after set:", {
            hint: state.hint,
            challengeCompleted: state.challengeCompleted
          });
        }, 100);
      },
    })
);
