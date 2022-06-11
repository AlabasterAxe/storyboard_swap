import { GameSnapshot } from "./model";

export function getAssignedProjects(
  state: GameSnapshot,
  currentPlayerId: string | undefined
): string[] {
  if (!currentPlayerId) {
    return [];
  }

  const result = [];
  for (const [url, playerId] of Object.entries(state.projectAssignments)) {
    if (playerId === currentPlayerId) {
      result.push(url);
    }
  }
  return result;
}
