import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { GameState } from "../../common/src/model";
import {
  ClientCommand,
  CreateRoomResp,
  ServerCommand,
  ServerMessage
} from "../../common/src/transfer";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { player, selectCurrentGameState, selectPlayer, state } from "./app/store";
import "./Game.css";

// const SERVER_SPEC = "35.188.94.49:8080";
const SERVER_SPEC = "localhost:8080";

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
      const webby = new WebSocket(`ws://${SERVER_SPEC}/api/connect/${gameId}`);
      webby.onopen = () => {
        webby.send(JSON.stringify({
          cmd: ClientCommand.join,
          payload: {
            player: currentPlayer
          }
        }));
      }
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
  }, [dispatch, gameId]);

  let body = <div>Loading...</div>;
  switch (currentGameState.state) {
    case GameState.not_started: 
      body = <>
        <span>Waiting for players to join. Click Start once everybody is in.</span>
        <button onClick={()=>ws?.send(JSON.stringify({cmd: ClientCommand.start}))}>Start</button>
      </>;
  }

  return (
    <div className="game">
      <div className="game-board">
        <div>
          <div>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
