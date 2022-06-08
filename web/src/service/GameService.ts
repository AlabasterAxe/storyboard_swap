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
  private _ws: WebSocket | undefined;
  private watchdogTimeout: ReturnType<typeof setTimeout> | undefined;
  private connectionFailures = 0;

  constructor(readonly gameId: string) {
    this.reconnect();
  }

  private reconnect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.connectionFailures > MAX_RETRY_LIMIT) {
        reject("Too many connection failures");
      }
      if (this._ws) {
        this._ws.close();
      }
      this._ws = new WebSocket(getWebsocketUrl(this.gameId));
      this._ws.onmessage = (event) => {
        console.log(event);
        // we consider connection failures
        // if we have to reconnect without getting
        // any messages from the server
        // so we reset connectionFailures
        // if we get a message from the server
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
      this._ws.onopen = () => {
        const state: RootState = store.getState();
        if (state.game.player && state.game.player.roomId === this.gameId) {
          this.send({
            cmd: ClientCommand.join,
            payload: { player: state.game.player },
          });
        }
        resolve(this._ws as WebSocket);
      };
      this._ws.onerror = () => {
        this.connectionFailures++;
        if (this.connectionFailures > MAX_RETRY_LIMIT) {
          console.error("too many connection failures");
        }
      };
    });
  }

  async send(message: ClientMessage): Promise<void> {
    if (message.cmd === ClientCommand.join) {
      (await this.reconnect()).send(JSON.stringify(message));
    } else {
      const resp = await fetch(getGameMessageEndpoint(this.gameId), {
        method: "POST",
        body: JSON.stringify({
          message,
          playerId: store.getState().game.player?.id,
        }),
      });
      const json = await resp.json();
      if (json.messages) {
        for (const msg of json.messages) {
          for (const callback of this.callbacks) {
            callback(msg);
          }
        }
      }
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
    if (this._ws) {
      this._ws.close();
    }
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
