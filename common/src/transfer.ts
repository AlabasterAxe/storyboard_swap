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
  board = "BOARD",
}

export interface MovePayload {
  player: Player;
  location: number;
}

export interface BoardPayload {
  board: string[];
}

export interface ClientMessage {
  cmd: ClientCommand;
  payload: MovePayload;
}

export interface ServerMessage {
  cmd: ServerCommand;
  payload: BoardPayload;
}
