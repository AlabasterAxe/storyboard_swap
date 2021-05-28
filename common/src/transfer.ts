import { Player } from "./model";

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

  // sends the which player they are
  player = "PLAYER",
}

export interface MovePayload {
  player: Player;
  location: number;
}

export interface BoardPayload {
  board: string[];
}

export interface PlayerPayload {
  player: Player;
}

export interface ClientMessage {
  cmd: ClientCommand;
  payload: MovePayload;
}

interface ServerMessageBase {
  cmd: ServerCommand;
  payload: BoardPayload | PlayerPayload;
}

export interface BoardMessage extends ServerMessageBase {
  cmd: ServerCommand.board;
  payload: BoardPayload;
}

export interface PlayerMessage extends ServerMessageBase {
  cmd: ServerCommand.player;
  payload: PlayerPayload;
}

export type ServerMessage = BoardMessage | PlayerMessage;
