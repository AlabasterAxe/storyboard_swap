import { ClientPlayer, GameSnapshot, Player } from "./model";

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

  join = "JOIN",
}

export type DonePayload = {
  projectUrl: string;
}

export type JoinPayload = {
  player: ClientPlayer; 
} 

export enum ServerCommand {
  // sends the next url to the player
  url = "URL",

  // sends the player their own information
  player = "PLAYER",

  state = "STATE",
}

export interface ClientMessageBase {
  cmd: ClientCommand;
  payload: DonePayload | JoinPayload;
}

export interface DoneMessage extends ClientMessageBase {
  cmd: ClientCommand.done;
  payload: DonePayload;
}

export interface JoinMessage extends ClientMessageBase {
  cmd: ClientCommand.join;
  payload: JoinPayload;
}

export type ClientMessage = DoneMessage | JoinMessage;

export interface UrlPayload {
  projectUrl: string;
}

export interface PlayerPayload {
  player: Player | undefined;
}

export interface StatePayload {
  state: GameSnapshot;
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
