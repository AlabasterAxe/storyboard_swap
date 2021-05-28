export interface Room {
  id: string;
  participants: any[];
  board: string[];
}

export enum Player {
  X = "X",
  O = "O",
}

export enum PlayerMove {
  small_1 = "1-1",
  small_2 = "1-2",
  medium_1 = "2-1",
  medium_2 = "2-2",
  large_1 = "3-1",
  large_2 = "3-2",
}
