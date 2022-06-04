import { GameSnapshot, Player } from "./model";

export interface CreateRoomRqst {}

export interface CreateRoomResp {
  roomId: string;
}

export interface ConnectRqst {
  roomId: string;
}

export enum ClientCommand {
  done = "done",
}

export enum ServerCommand {
  // sends the next url to the player
  url = "URL",

  player = "PLAYER",
}

export interface UrlPayload {
  url: string;
}

export interface PlayerPayload {
  player: Player | null;
}

export interface ClientMessage {
  cmd: ClientCommand;
}

interface ServerMessageBase {
  cmd: ServerCommand;
  payload: UrlPayload | PlayerPayload;
}

export interface UrlMessage extends ServerMessageBase {
  cmd: ServerCommand.url;
  payload: UrlPayload;
}

export interface PlayerMessage extends ServerMessageBase {
  cmd: ServerCommand.player;
  payload: PlayerPayload;
}

export type ServerMessage = UrlMessage | PlayerMessage;
