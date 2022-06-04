
export type Participant = {
  id: string;
  projectUrl: string;
}

export interface Room {
  id: string;
  participants: Participant[];
  history: GameSnapshot[];
}

export enum PlayerState {
  ready,
  working,
};

export enum GameState {
  not_started,
  in_progress,
  completed,
};

export type Player = {
  id: string;
  participantId: string;
  state: PlayerState;
}

export interface GameSnapshot {
  state: GameState;
  round: number;
  playerOrder: string[];
}

export function initialGameState(): GameSnapshot {
  return {
    state: GameState.not_started,
    round: 0,
    playerOrder: undefined,
  };
}

