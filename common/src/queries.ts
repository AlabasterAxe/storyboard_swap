import { GameSnapshot, ProjectAssignment } from "./model";

export function getAssignedProjects(
  state: GameSnapshot,
  currentPlayerId: string | undefined
): {url: string, assignmentTimestamp: number}[] {
  if (!currentPlayerId) {
    return [];
  }

  const result = [];
  for (const [url, assignment] of Object.entries(state.projectAssignments)) {
    if (assignment.playerId === currentPlayerId) {
      result.push({url, assignmentTimestamp: assignment.assignmentTimestamp});
    }
  }
  return result;
}
