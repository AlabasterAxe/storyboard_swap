import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { GameState } from "../../common/src/model";
import {
  ClientCommand,
  CreateRoomResp,
  ServerCommand,
  ServerMessage,
} from "../../common/src/transfer";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import {
  player,
  selectCurrentGameState,
  selectPlayer,
  state,
} from "./app/store";
import "./Game.css";

const SERVER_SPEC = process.env.NODE_ENV === "development" ? "localhost:8080" : "storyboardswap.com";

function getWebsocketUrl(gameId: string) {
    return `${process.env.NODE_ENV === "development" ? 'ws':'wss'}://${SERVER_SPEC}/api/connect/${gameId}`;
}

function Game() {
  const dispatch = useAppDispatch();
  const currentGameState = useAppSelector(selectCurrentGameState);
  const currentPlayer = useAppSelector(selectPlayer);
  const { gameId } = useParams<{ gameId: string }>();
  const [ws, setWs] = React.useState<WebSocket | undefined>(undefined);

  useEffect(() => {
    (gameId === "new"
      ? fetch(`http://${SERVER_SPEC}/api/new_room`)
          .then((response) => response.json())
          .then((data: CreateRoomResp) => data.roomId)
      : Promise.resolve(gameId)
    ).then((gameId) => {
      window.history.replaceState(null, "Game", `/g/${gameId}`);
      const webby = new WebSocket(getWebsocketUrl(gameId));
      webby.onmessage = (event) => {
        console.log(event);
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.cmd) {
          case ServerCommand.state:
            dispatch(state(msg.payload.state));
            break;
          case ServerCommand.player:
            dispatch(player(msg.payload.player));
            break;
          default:
            console.warn(`Unknown Command: ${(msg as any).cmd}`);
        }
      };

      setWs(webby);
    });
  }, []);

  let body = <div>Loading...</div>;
  if (currentPlayer && currentPlayer.roomId !== gameId) {
    body = (
      <>
        <div>Create a project and paste the URL here to join:</div>
        <input
          value={currentPlayer?.originalProjectUrl ?? ""}
          onChange={(e) => {
            dispatch(player({ originalProjectUrl: e.target.value }));
          }}
        />
        <button onClick={()=>{
          if (ws) {
            ws.send(
              JSON.stringify({
                cmd: ClientCommand.join,
                payload: {
                  player: currentPlayer,
                },
              })
            );
          }
        }}>Join</button>
      </>
    );
  } else {
    switch (currentGameState.state) {
      case GameState.not_started:
        body = (
          <>
            <span>
              Waiting for players to join. Click Start once everybody is in.
            </span>
            <button
              onClick={() =>
                ws?.send(JSON.stringify({ cmd: ClientCommand.start }))
              }
            >
              Start
            </button>
          </>
        );
        break;
      case GameState.in_progress:
        if (
          currentPlayer?.pendingProjectUrls &&
          currentPlayer.pendingProjectUrls.length > 0
        ) {
          body = (
            <>
              <span>
                Add your magic to this project and then come back and click
                "Done"
              </span>
              <button
                onClick={() => {
                  if (
                    currentPlayer?.pendingProjectUrls &&
                    currentPlayer.pendingProjectUrls.length > 0
                  ) {
                    ws?.send(
                      JSON.stringify({
                        cmd: ClientCommand.done,
                        payload: {
                          projectUrl: currentPlayer.pendingProjectUrls[0],
                        },
                      })
                    );
                  }
                }}
              >
                Done
              </button>
            </>
          );
        } else {
          body = (
            <>
              <span>Waiting for your project.</span>
            </>
          );
        }
    }
  }

  return (
    <div className="game">
      <div className="game-board">
        <div>
          {process.env.NODE_ENV === "development" && <div className="debug-info">
            <div>{JSON.stringify(currentGameState)}</div>
            <div>{JSON.stringify(currentPlayer)}</div>
          </div>}
          <div>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
