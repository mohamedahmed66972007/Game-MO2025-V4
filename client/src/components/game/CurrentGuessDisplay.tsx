import { Text } from "@react-three/drei";
import { useNumberGame } from "@/lib/stores/useNumberGame";

export function CurrentGuessDisplay() {
  const { mode, singleplayer, multiplayer } = useNumberGame();

  let feedbackText = "";
  let feedbackColor = "#4338ca";
  
  if (mode === "singleplayer" && singleplayer.attempts.length > 0) {
    const lastAttempt = singleplayer.attempts[singleplayer.attempts.length - 1];
    const correctCount = lastAttempt.correctCount;
    const correctPositionCount = lastAttempt.correctPositionCount;
    const numDigits = singleplayer.settings.numDigits;
    
    if (correctCount === 0) {
      feedbackText = "ولا رقم صح";
      feedbackColor = "#ef4444";
    } else if (correctPositionCount === numDigits) {
      feedbackText = "فوز!";
      feedbackColor = "#10b981";
    } else if (correctPositionCount === 0) {
      feedbackText = `${correctCount} صح - مكان غلط`;
      feedbackColor = "#f97316";
    } else if (correctCount === correctPositionCount) {
      feedbackText = `${correctPositionCount} صح - مكان صح`;
      feedbackColor = "#10b981";
    } else {
      feedbackText = `${correctCount} صح - ${correctPositionCount} مكان صح`;
      feedbackColor = "#f97316";
    }
  } else if (mode === "multiplayer" && multiplayer.attempts.length > 0) {
    const lastAttempt = multiplayer.attempts[multiplayer.attempts.length - 1];
    const correctCount = lastAttempt.correctCount;
    const correctPositionCount = lastAttempt.correctPositionCount;
    const numDigits = multiplayer.settings.numDigits;
    
    if (correctCount === 0) {
      feedbackText = "ولا رقم صح";
      feedbackColor = "#ef4444";
    } else if (correctPositionCount === numDigits) {
      feedbackText = "فوز!";
      feedbackColor = "#10b981";
    } else if (correctPositionCount === 0) {
      feedbackText = `${correctCount} صح - مكان غلط`;
      feedbackColor = "#f97316";
    } else if (correctCount === correctPositionCount) {
      feedbackText = `${correctPositionCount} صح - مكان صح`;
      feedbackColor = "#10b981";
    } else {
      feedbackText = `${correctCount} صح - ${correctPositionCount} مكان صح`;
      feedbackColor = "#f97316";
    }
  }

  if (!feedbackText) return null;

  return (
    <Text
      position={[0, 0.5, -7.9]}
      fontSize={0.4}
      color={feedbackColor}
      anchorX="center"
      anchorY="middle"
      fontWeight="bold"
      maxWidth={8}
    >
      {feedbackText}
    </Text>
  );
}
