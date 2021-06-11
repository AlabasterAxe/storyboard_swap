import { PlayerPiece } from "./model";

export function isMoveLegal(
  currentValue: string,
  proposedMove: PlayerPiece
): boolean {
  if (!currentValue) {
    return true;
  }
  const [_, existingSize] = currentValue.split("-");
  const [proposedSize] = proposedMove.split("-");

  return parseInt(proposedSize) > parseInt(existingSize);
}
