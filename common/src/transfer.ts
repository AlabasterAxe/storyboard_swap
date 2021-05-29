import { GameSnapshot, Player, PlayerMove, PlayerPiece } from "./model";

export interface CreateRoomRqst {}

export interface CreateRoomResp {
  roomId: string;
}

export interface ConnectRqst {
  roomId: string;
}

export enum ClientCommand {
  move = "MOVE",
}

export enum ServerCommand {
  // sends the current board to the player
  board = "BOARD",

  // sends the whole history of the board
  history = "HISTORY",

  // sends the which player they are
  player = "PLAYER",
}

export interface MovePayload {
  playerMove: PlayerMove;
}

export interface BoardPayload {
  board: GameSnapshot;
}

export interface HistoryPayload {
  history: GameSnapshot[];
}

export interface PlayerPayload {
  player: Player | null;
}

export interface ClientMessage {
  cmd: ClientCommand;
  payload: MovePayload;
}

interface ServerMessageBase {
  cmd: ServerCommand;
  payload: BoardPayload | PlayerPayload | HistoryPayload;
}

export interface BoardMessage extends ServerMessageBase {
  cmd: ServerCommand.board;
  payload: BoardPayload;
}

export interface PlayerMessage extends ServerMessageBase {
  cmd: ServerCommand.player;
  payload: PlayerPayload;
}

export interface HistoryMessage extends ServerMessageBase {
  cmd: ServerCommand.history;
  payload: HistoryPayload;
}

export type ServerMessage = BoardMessage | PlayerMessage | HistoryMessage;
