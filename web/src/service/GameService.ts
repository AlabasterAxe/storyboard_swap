import {
  ClientCommand,
  ClientMessage,
  ClientMessageResponse,
  ServerMessage,
} from "../../../common/src/transfer";
import { RootState, store } from "../app/store";

const SERVER_SPEC =
  process.env.NODE_ENV === "development"
    ? "localhost:8080"
    : "storyboardswap.com";

const MAX_RETRY_LIMIT = 10;

function getWebsocketUrl(gameId: string) {
  return `${
    process.env.NODE_ENV === "development" ? "ws" : "wss"
  }://${SERVER_SPEC}/api/connect/${gameId}`;
}

function getGameMessageEndpoint(gameId: string) {
  return `${
    process.env.NODE_ENV === "development" ? "http" : "https"
  }://${SERVER_SPEC}/api/game/${gameId}/message`;
}

export class GameService {
  private readonly callbacks: ((message: ServerMessage) => void)[] = [];
  private ws: WebSocket;
  private watchdogTimeout: ReturnType<typeof setTimeout> | undefined;
  private connectionFailures = 0;

  constructor(readonly gameId: string) {
    // defined so that ws is always defined but this is actually immediately closed
    this.ws = new WebSocket(getWebsocketUrl(gameId));
    this.reconnect();
  }

  private reconnect(): void {
    if (this.connectionFailures > MAX_RETRY_LIMIT) {
      return;
    }

    this.ws.close();
    this.ws = new WebSocket(getWebsocketUrl(this.gameId));
    this.ws.onmessage = (event) => {
      console.log(event);
      this.connectionFailures = 0;
      clearTimeout(this.watchdogTimeout);
      this.watchdogTimeout = setTimeout(() => {
        this.reconnect();
      }, 10000);
      const msg: ServerMessage = JSON.parse(event.data);
      for (const callback of this.callbacks) {
        callback(msg);
      }
    };
    this.ws.onopen = () => {
      const state: RootState = store.getState();
      if (state.game.player && state.game.player.roomId === this.gameId) {
        this.send({
          cmd: ClientCommand.join,
          payload: { player: state.game.player },
        });
      }
    };
    this.ws.onerror = () => {
      this.connectionFailures++;
      if (this.connectionFailures > MAX_RETRY_LIMIT) {
        console.error("too many connection failures");
      }
    };
  }

  send(message: ClientMessage): void {
    if (message.cmd === ClientCommand.join) {
      this.ws.send(JSON.stringify(message));
    } else {
      fetch(getGameMessageEndpoint(this.gameId), {
        method: "POST",
        body: JSON.stringify({
          message,
          playerId: store.getState().game.player?.id,
        }),
      })
        .then((resp: Response) => resp.json())
        .then((resp: ClientMessageResponse) => {
          if (resp.messages) {
            for (const msg of resp.messages) {
              for (const callback of this.callbacks) {
                callback(msg);
              }
            }
          }
        });
    }
  }

  // returns an unsubscribe callback
  subscribe(callback: (message: ServerMessage) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  shutdown(): void {
    this.ws.close();
  }
}

let _gameService: GameService | undefined;

export function getGameService(gameId: string): GameService {
  if (!_gameService || _gameService?.gameId === gameId) {
    _gameService?.shutdown();
    _gameService = new GameService(gameId);
  }
  return _gameService;
}
