import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GameState, Player } from "../../common/src/model";
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

function getOwnerForProject(players: Player[], projectUrl: string): Player | undefined {
    for (const player of players) {
        if (player.originalProjectUrl === projectUrl) {
            return player;
        }
    }
    return undefined;
}

function getProjectDisplayString(currentPlayer: Player, allPlayers: Player[], projectUrl: string): string {
  if (currentPlayer.originalProjectUrl === projectUrl) {
    return "your own Project";
  }

  const owner = getOwnerForProject(allPlayers, projectUrl);
  if (owner) {
    return `${owner.displayName}'s Project`;
  }

  return "a mysterious Project";
}

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
          <div>Name:</div>
          <input
            value={currentPlayer?.displayName ?? ""}
            onChange={(e) => {
              if (
                currentPlayer?.originalProjectUrl &&
                validProjectRegex.test(currentPlayer?.originalProjectUrl)
              ) {
                setInvalidProjectUrl(false);
              }
              dispatch(player({ displayName: e.target.value }));
            }}
          />
        <div>Create a Storyboard + Live Collab Project, give edit access to Descript HQ, and paste the URL here to join:</div>
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
          const assignedUrl = currentPlayer.pendingProjectUrls[0];
          body = (
            <>
              <span>
                {currentGameState.projects[assignedUrl].turns === 0 ? "Start your story with a sentence or two of Overdubbed audio" : "Add B-roll and sound effects for the previous Scene and add a sentence or two of your own"} to{" "}
                <a
                  href={assignedUrl + "?lite=true"}
                  target="_blank"
                >
                  {getProjectDisplayString(currentPlayer as Player, Object.values(currentGameState.players), assignedUrl)}
                </a>{" "}
                and then come back and click "Done".
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
