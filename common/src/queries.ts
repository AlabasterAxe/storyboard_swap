import { GameSnapshot, ProjectAssignment } from "./model";

export function getAssignedProjectsFromSnapshot(
  state: GameSnapshot,
  playerId: string | undefined
): { url: string; assignmentTimestamp: number }[] {
  return getAssignedProjects(state.projectAssignments, playerId);
}

export function getAssignedProjects(
  assignments: Record<string, ProjectAssignment>,
  playerId: string | undefined
): { url: string; assignmentTimestamp: number }[] {
  if (!playerId) {
    return [];
  }

  const result = [];
  for (const [url, assignment] of Object.entries(assignments)) {
    if (assignment.playerId === playerId) {
      result.push({ url, assignmentTimestamp: assignment.assignmentTimestamp });
    }
  }
  return result;
}
