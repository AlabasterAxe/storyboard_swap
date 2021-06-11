import { PlayerPiece } from "./model";

export function isMoveLegal(
  currentValue: string,
  proposedMove: PlayerPiece
): boolean {
  if (!currentValue) {
    return true;
  }
  const [existingPlayer, existingSize] = currentValue.split("-");
  const [proposedSize] = proposedMove.split("-");

  return parseInt(proposedSize) > parseInt(existingSize);
}
