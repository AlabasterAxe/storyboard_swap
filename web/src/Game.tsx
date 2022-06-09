import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GameState } from "../../common/src/model";
import {
  ClientCommand,
  ServerCommand,
  ServerMessage,
} from "../../common/src/transfer";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import {
  clear,
  player,
  selectCurrentGameId,
  selectCurrentGameState,
  selectPlayer,
  state,
} from "./app/store";
import "./Game.css";
import { GameService, getGameService } from "./service/GameService";

const validProjectRegex =
  /^((https:\/\/)?web.descript.com\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{5}))?$/i;

function Game() {
  const dispatch = useAppDispatch();
  const currentGameState = useAppSelector(selectCurrentGameState);
  const reduxGameId = useAppSelector(selectCurrentGameId);
  const currentPlayer = useAppSelector(selectPlayer);
  const { gameId } = useParams<{ gameId: string }>();
  const [gameService, setGameService] = React.useState<GameService | undefined>(
    undefined
  );
  const [invalidProjectUrl, setInvalidProjectUrl] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "Game", `/g/${gameId}`);
    if (gameId !== reduxGameId) {
      dispatch(clear({ gameId }));
    }
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
    return () => {
      gameService.shutdown();
      unsubscribeCallback();
    };
  }, [gameId, dispatch, reduxGameId]);

  let body = <div>Loading...</div>;
  if (!currentPlayer || currentPlayer.roomId !== gameId) {
    body = (
      <>
        <div>Create a project and paste the URL here to join:</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !currentPlayer?.originalProjectUrl ||
              !validProjectRegex.test(currentPlayer?.originalProjectUrl)
            ) {
              setInvalidProjectUrl(true);
              return;
            }

            setInvalidProjectUrl(false);
            if (gameService) {
              gameService.join();
            }
          }}
        >
          <input
            style={{ backgroundColor: invalidProjectUrl ? "pink" : "white" }}
            value={currentPlayer?.originalProjectUrl ?? ""}
            onChange={(e) => {
              if (
                currentPlayer?.originalProjectUrl &&
                validProjectRegex.test(currentPlayer?.originalProjectUrl)
              ) {
                setInvalidProjectUrl(false);
              }
              dispatch(player({ originalProjectUrl: e.target.value }));
            }}
          />
          <button type="submit" disabled={!currentPlayer?.originalProjectUrl}>
            Join
          </button>
        </form>
      </>
    );
  } else {
    switch (currentGameState.state) {
      case GameState.not_started:
        body = (
          <>
            <span>
              Waiting for players to join. Click "Start" once everybody is in.
            </span>
            <br />
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
                Add your magic to{" "}
                <a
                  href={currentPlayer.pendingProjectUrls[0] + "?lite=true"}
                  target="_blank"
                >
                  this project
                </a>{" "}
                and then come back and click "Done"
              </span>
              <br />
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
              <span>Waiting for the other player to finish their project.</span>
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
          <div className="game-body">{body}</div>
        </div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
