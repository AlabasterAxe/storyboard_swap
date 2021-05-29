export interface Room {
  id: string;
  participants: any[];
  history: GameSnapshot[];
}

export interface GameSnapshot {
  board: string[];
  playersTurn: Player;
  winner: Player | null;
  previousMove: PlayerMove | null;
}

export enum Player {
  X = "X",
  O = "O",
}

export enum PlayerPiece {
  small_1 = "1-1",
  small_2 = "1-2",
  medium_1 = "2-1",
  medium_2 = "2-2",
  large_1 = "3-1",
  large_2 = "3-2",
}

export interface PlayerMove {
  player: Player;
  piece: PlayerPiece;
  location: number;
}
