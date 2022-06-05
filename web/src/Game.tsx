import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Player,
} from "../../common/src/model";
import {
  CreateRoomResp,
  ServerCommand,
  ServerMessage,
} from "../../common/src/transfer";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { selectCurrentGameState, state } from "./app/store";
import "./Game.css";

// const SERVER_SPEC = "35.188.94.49:8080";
const SERVER_SPEC = "localhost:8080";

function Game() {
  const dispatch = useAppDispatch();
  const currentGameState = useAppSelector(selectCurrentGameState);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const { gameId } = useParams<{ gameId: string }>();

  useEffect(() => {
    (gameId === "new"
      ? fetch(`http://${SERVER_SPEC}/api/new_room`)
          .then((response) => response.json())
          .then((data: CreateRoomResp) => data.roomId)
      : Promise.resolve(gameId)
    ).then((gameId) => {
      window.history.replaceState(null, "Game", `/g/${gameId}`);
      const webby = new WebSocket(`ws://${SERVER_SPEC}/api/connect/${gameId}`);
      webby.onmessage = (event) => {
        console.log(event);
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.cmd) {
          case ServerCommand.state:
            dispatch(state(msg.payload.state));
            break;
          case ServerCommand.player:
            setMyPlayer(msg.payload.player);
            break;
          default:
            console.warn(`Unknown Command: ${(msg as any).cmd}`);
        }
      };
    });
  }, [dispatch, gameId]);

  return (
    <div className="game">
      <div className="game-board">
        <div>
          <div>{JSON.stringify(currentGameState)}</div>
          <div>{JSON.stringify(myPlayer)}</div>
        </div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
