export interface Room {
  id: string;
  participants: any[];
  board: string[];
}

export enum Player {
  X = "X",
  O = "O",
}
