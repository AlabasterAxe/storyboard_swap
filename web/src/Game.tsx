import React, { useEffect, useState } from "react";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { GameSnapshot, GameState, Player } from "../../common/src/model";
import { getAssignedProjects } from "../../common/src/queries";
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
import { Timer } from "./components/Timer";
import "./Game.css";
import { GameService, getGameService } from "./service/GameService";

const validProjectRegex =
  /^((https:\/\/)?web.descript.com\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{5}))?$/i;

function getOwnerForProject(
  players: Player[],
  projectUrl: string
): Player | undefined {
  for (const player of players) {
    if (player.originalProjectUrl === projectUrl) {
      return player;
    }
  }
  return undefined;
}

function getBlockingPlayerName(
  currentGameState: GameSnapshot,
  currentPlayerId: string | undefined
): string | undefined {
  for (const [senderId, recipientId] of Object.entries(
    currentGameState.playerRecipientMap
  )) {
    if (recipientId === currentPlayerId) {
      return currentGameState.players[senderId].displayName;
    }
  }
  return undefined;
}

function getProjectDisplayString(
  currentPlayer: Player,
  allPlayers: Player[],
  projectUrl: string
): string {
  if (currentPlayer.originalProjectUrl === projectUrl) {
    return "your Project";
  }

  const owner = getOwnerForProject(allPlayers, projectUrl);
  if (owner) {
    return `${owner.displayName}'s Project`;
  }

  return "a mysterious Project";
}

function InitialRoundPrompt({
  assignedUrl,
  currentPlayer,
  gameState,
}: {
  assignedUrl: string;
  currentPlayer: Player;
  gameState: GameSnapshot;
}) {
  return (
    <span>
      Start{" "}
      <a href={assignedUrl + "?lite=true"} target="_blank" rel="noreferrer">
        {getProjectDisplayString(
          currentPlayer as Player,
          Object.values(gameState.players),
          assignedUrl
        )}
      </a>{" "}
      with a sentence or two of Overdubbed audio. When you're finished come back
      and click "Done".
    </span>
  );
}

function SubsequentRoundPrompt({
  assignedUrl,
  currentPlayer,
  gameState,
}: {
  assignedUrl: string;
  currentPlayer: Player;
  gameState: GameSnapshot;
}) {
  return (
    <span>
      Add B-roll and sound effects for the previous Scene in{" "}
      <a href={assignedUrl + "?lite=true"} target="_blank" rel="noreferrer">
        {getProjectDisplayString(
          currentPlayer as Player,
          Object.values(gameState.players),
          assignedUrl
        )}
      </a>{" "}
      and continue the story a sentence or two of your own. Don't forget to
      overdub your new text! When you're finished come back and click "Done".
    </span>
  );
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

  useEffect(() => {
    window.history.replaceState(null, "Game", `/g/${gameId}`);
    if (gameId !== reduxGameId) {
      dispatch(clear({ gameId }));
    }
    const gameService = getGameService(gameId);

    const unsubscribeCallback = gameService.subscribe((msg: ServerMessage) => {
      switch (msg.cmd) {
        case ServerCommand.state:
          dispatch(state(msg.payload));
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

  const onDoneClick = useCallback(() => {
    const assignedProjects = getAssignedProjects(
      currentGameState.projectAssignments,
      currentPlayer?.id
    );
    if (assignedProjects.length > 0) {
      gameService?.send({
        cmd: ClientCommand.done,
        payload: {
          projectUrl: assignedProjects[0].url,
        },
      });
    }
  }, [currentPlayer, currentGameState]);

  let body = <div>Loading...</div>;
  if (!currentPlayer || currentPlayer.roomId !== gameId) {
    body = (
      <>
        <div>Enter your name below and click "Join".</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (gameService) {
              gameService.join();
            }
          }}
        >
          <div>Your Name:</div>
          <input
            value={currentPlayer?.displayName ?? ""}
            onChange={(e) => {
              dispatch(player({ displayName: e.target.value }));
            }}
          />
          <button type="submit">Join</button>
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
            <button
              disabled={Object.keys(currentGameState.players).length < 2}
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
        const assignedProjects = getAssignedProjects(
          currentGameState.projectAssignments,
          currentPlayer?.id
        );
        if (assignedProjects.length > 0) {
          const assignment = assignedProjects[0];
          body = (
            <>
              <Timer
                durationMs={120000}
                startTimestamp={assignment.assignmentTimestamp}
              />
              {currentGameState.projects[assignment.url].turns === 0 ? (
                <InitialRoundPrompt
                  assignedUrl={assignment.url}
                  currentPlayer={currentPlayer as Player}
                  gameState={currentGameState}
                />
              ) : (
                <SubsequentRoundPrompt
                  assignedUrl={assignment.url}
                  currentPlayer={currentPlayer as Player}
                  gameState={currentGameState}
                />
              )}
              <button onClick={onDoneClick}>Done</button>
            </>
          );
        } else {
          body = (
            <>
              <span>
                Waiting for{" "}
                {getBlockingPlayerName(currentGameState, currentPlayer?.id) ||
                  "the other player"}{" "}
                to finish their project.
              </span>
            </>
          );
        }
    }
  }

  return (
    <div className="game">
      <div className="game-board">
        {process.env.NODE_ENV === "development" && (
          <div className="debug-info">
            <div>{JSON.stringify(currentGameState)}</div>
            <div>{JSON.stringify(currentPlayer)}</div>
          </div>
        )}
        {currentGameState?.players &&
          currentPlayer?.id &&
          Object.keys(currentGameState?.players).includes(currentPlayer.id) && (
            <div className="player-container">
              <div className="player-tab">
                <h2>Players: </h2>
                <ul>
                  {Object.values(currentGameState.players).map((p) => (
                    <li key={p.id}>
                      <a
                        href={p.originalProjectUrl + "?lite=true"}
                        target="_blank"
                        rel="noreferrer"
                        title={`${
                          p.id === currentPlayer?.id
                            ? "Your"
                            : p.displayName + "'s"
                        } project`}
                      >
                        {p.displayName}
                      </a>

                      {p.id === currentPlayer?.id ? " (you)" : ""}
                      <span
                        className="kick-button"
                        onClick={() => {
                          if (gameService) {
                            gameService.send({
                              cmd: ClientCommand.kick,
                              payload: {
                                playerId: p.id,
                              },
                            });
                            if (p.id === currentPlayer?.id) {
                              dispatch(clear({ gameId }));
                            }
                          }
                        }}
                      >
                        ✖
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        <div className="game-body">{body}</div>
      </div>
    </div>
  );
}

// ========================================

export default Game;
