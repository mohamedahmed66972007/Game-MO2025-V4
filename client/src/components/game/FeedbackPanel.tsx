import { Text } from "@react-three/drei";
import { useNumberGame } from "@/lib/stores/useNumberGame";

function getFeedbackText(correctCount: number, correctPositionCount: number, numDigits: number): string {
  if (correctCount === 0) {
    return "ولا رقم صح";
  }
  
  const correctInWrongPosition = correctCount - correctPositionCount;
  
  if (correctPositionCount === numDigits) {
    return "كل الأرقام صحيحة!";
  }
  
  if (correctPositionCount === 0 && correctCount > 0) {
    if (correctCount === 1) return "رقم صح ومكانه غلط";
    if (correctCount === 2) return "رقمين صح ومكانهم غلط";
    if (correctCount === 3) return "3 صح ومكانهم غلط";
    return `${correctCount} صح ومكانهم غلط`;
  }
  
  if (correctPositionCount > 0 && correctInWrongPosition === 0) {
    if (correctPositionCount === 1) return "رقم صح ومكانه صح";
    if (correctPositionCount === 2) return "رقمين صح ومكانهم صح";
    if (correctPositionCount === 3) return "3 صح ومكانهم صح";
  }
  
  if (correctPositionCount === 1 && correctInWrongPosition === 1) {
    return "رقمين صح و واحد مكانه صح";
  }
  
  return `${correctCount} صح و ${correctPositionCount} مكانهم صح`;
}

export function FeedbackPanel() {
  return null;
}
