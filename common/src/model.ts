
export interface Room {
  id: string;
  participants: any[];
  history: GameSnapshot[];
  participantPlayerMap: Record<string, string>;
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

export interface Player {
  id: string;
  state: PlayerState;
  originalProjectUrl: string;

  pendingProjectUrls: string[];
}

export interface GameSnapshot {
  state: GameState;
  round: number;

  // simple map so that when a user indicates done
  // we can trivially know which player to send the
  // next url to.
  playerRecipientMap: Record<string, string>;
  players: Record<string, Player>;
}

export function initialGameState(): GameSnapshot {
  return {
    state: GameState.not_started,
    round: 0,
    players: {},
    playerRecipientMap: {},
  };
}

