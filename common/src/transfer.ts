import { GameSnapshot, Player } from "./model";

export interface CreateRoomRqst {}

export interface CreateRoomResp {
  roomId: string;
}

export interface ConnectRqst {
  roomId: string;
}

export enum ClientCommand {
  // any client can decide to start the game
  start = "START",

  // this is used by players to indicate that they're done with their current
  // storyboard
  done = "DONE",
}

export type DonePayload = {
  projectUrl: string;
}

export enum ServerCommand {
  // sends the next url to the player
  url = "URL",

  // sends the player their own information
  player = "PLAYER",

  state = "STATE",
}

export interface UrlPayload {
  projectUrl: string;
}

export interface PlayerPayload {
  player: Player | null;
}

export interface StatePayload {
  state: GameSnapshot;
}

export interface ClientMessage {
  cmd: ClientCommand;
  payload: DonePayload;
}

interface ServerMessageBase {
  cmd: ServerCommand;
  payload: UrlPayload | PlayerPayload | StatePayload;
}

export interface UrlMessage extends ServerMessageBase {
  cmd: ServerCommand.url;
  payload: UrlPayload;
}

export interface PlayerMessage extends ServerMessageBase {
  cmd: ServerCommand.player;
  payload: PlayerPayload;
}

export interface StateMessage extends ServerMessageBase {
  cmd: ServerCommand.state;
  payload: StatePayload;
}

export type ServerMessage = UrlMessage | PlayerMessage | StateMessage;
