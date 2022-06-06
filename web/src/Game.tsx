import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { GameState } from "../../common/src/model";
import {
  ClientCommand,
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
import { GameService, getGameService } from "./service/GameService";

function Game() {
  const dispatch = useAppDispatch();
  const currentGameState = useAppSelector(selectCurrentGameState);
  const currentPlayer = useAppSelector(selectPlayer);
  const { gameId } = useParams<{ gameId: string }>();
  const [gameService, setGameService] = React.useState<GameService | undefined>(
    undefined
  );

  useEffect(() => {
    window.history.replaceState(null, "Game", `/g/${gameId}`);
    const gameService = getGameService(gameId);

    const unsubscribeCallback = gameService.subscribe((msg: ServerMessage) => {
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
    });

    setGameService(gameService);
    return ()=>{
      unsubscribeCallback();
    }
  }, [gameId, dispatch]);

  let body = <div>Loading...</div>;
  if (!currentPlayer || currentPlayer.roomId !== gameId) {
    body = (
      <>
        <div>Create a project and paste the URL here to join:</div>
        <input
          value={currentPlayer?.originalProjectUrl ?? ""}
          onChange={(e) => {
            dispatch(player({ originalProjectUrl: e.target.value }));
          }}
        />
        <button
          disabled={!currentPlayer?.originalProjectUrl}
          onClick={() => {
            if (gameService && currentPlayer) {
              gameService.send({
                cmd: ClientCommand.join,
                payload: {
                  player: currentPlayer,
                },
              });
            }
          }}
        >
          Join
        </button>
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
              onClick={() => {
                if (gameService) {
                  gameService.send({
                    cmd: ClientCommand.start,
                  });
                }
              }}
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
                    gameService?.send({
                      cmd: ClientCommand.done,
                      payload: {
                        projectUrl: currentPlayer.pendingProjectUrls[0],
                      },
                    });
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
          {process.env.NODE_ENV === "development" && (
            <div className="debug-info">
              <div>{JSON.stringify(currentGameState)}</div>
              <div>{JSON.stringify(currentPlayer)}</div>
            </div>
          )}
          <div>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
