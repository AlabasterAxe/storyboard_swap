import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { isMoveLegal } from "../../common/src/is-move-legal";
import {
  GameSnapshot,
  initialGameState,
  Player,
  PlayerPiece,
} from "../../common/src/model";
import {
  ClientCommand,
  ClientMessage,
  CreateRoomResp,
  ServerCommand,
  ServerMessage,
} from "../../common/src/transfer";
import "./Game.css";
import { ReactComponent as O } from "./O.svg";
import { ReactComponent as X } from "./X.svg";

// const SERVER_SPEC = "35.188.94.49:8080";
const SERVER_SPEC = "localhost:8080";

interface SquareProps {
  value: string;
  onClick: () => void;
}

const StyledButton = styled.button`
  background: #fff;
  border: 1px solid #999;
  float: left;
  font-size: 24px;
  font-weight: bold;
  line-height: 34px;
  height: 100%;
  margin-right: -1px;
  margin-top: -1px;
  padding: 0;
  text-align: center;
  width: 33%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

function Square(props: SquareProps) {
  let contents: any = "";
  if (props.value) {
    const [player, size] = props.value.split("-");
    contents =
      player === "X" ? (
        <X className={`size-${size}`} />
      ) : (
        <O className={`size-${size}`} />
      );
  }
  return <StyledButton onClick={props.onClick}>{contents}</StyledButton>;
}

interface BoardProps {
  squares: string[];
  squareClick: (arg: number) => void;
}

function Board(props: BoardProps) {
  const renderSquare = (i: number) => {
    return (
      <Square value={props.squares[i]} onClick={() => props.squareClick(i)} />
    );
  };

  return (
    <div className="board-grid">
      <div className="board-row">
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
      </div>
      <div className="board-row">
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
      </div>
      <div className="board-row">
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
    </div>
  );
}

interface GameState {
  history: GameSnapshot[];
  currentMoveIdx: number;
  ws: WebSocket | null;
  myPlayer: Player | null;
  selectedMove: PlayerPiece | null;
}

function Game() {
  const [history, setHistory] = useState([initialGameState()]);
  const [currentMoveIdx, setCurrentMove] = useState(0);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<PlayerPiece | null>(null);
  const [ws, setWS] = useState<WebSocket | null>(null);
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
          case ServerCommand.board:
            const newBoardState = msg.payload.board;
            setHistory(history.concat([newBoardState]));
            setCurrentMove(currentMoveIdx + 1);
            break;
          case ServerCommand.history:
            setHistory(msg.payload.history);
            setCurrentMove(msg.payload.history.length - 1);
            break;
          case ServerCommand.player:
            setMyPlayer(msg.payload.player);
            break;
          default:
            console.warn(`Unknown Command: ${(msg as any).cmd}`);
        }
      };
      setWS(webby);
    });
  }, []);

  const gameState = history[currentMoveIdx];

  const handleClick = (i: number) => {
    if (
      // Users are not allowed to modify the past (see grandfather paradox).
      currentMoveIdx !== history.length - 1 ||
      // it's the other players turn
      gameState.playersTurn !== myPlayer ||
      // the player hasn't selected a piece
      // TODO: warn users when no move is selected
      !selectedPiece ||
      // there's a winner
      gameState.winner
    ) {
      return false;
    }

    if (isMoveLegal(gameState.board[i], selectedPiece)) {
      if (ws) {
        const clientMsg: ClientMessage = {
          cmd: ClientCommand.move,
          payload: {
            playerMove: {
              location: i,
              player: gameState.playersTurn,
              piece: selectedPiece,
            },
          },
        };
        ws.send(JSON.stringify(clientMsg));

        setSelectedPiece(null);
      }
    }
  };

  function getPlayerIndicator(player: string) {
    return <span className={`${player} indicator`}></span>;
  }

  let status;
  if (gameState.winner) {
    status = (
      <span>
        <span>Winner:</span> {getPlayerIndicator(gameState.winner[0])}
      </span>
    );
  } else {
    status = (
      <span>
        <span>Next player:</span>
        {getPlayerIndicator(gameState.playersTurn)}
      </span>
    );
  }

  const moves = history.map((step, move) => {
    const desc = move ? "Go to move #" + move : "Go to game start";
    return (
      <li key={move}>
        <button onClick={() => setCurrentMove(move)}>{desc}</button>
      </li>
    );
  });

  const moveOptions = (
    myPlayer === Player.X
      ? gameState.remainingPiecesX
      : gameState.remainingPiecesO
  ).map((move) => {
    const [size] = (move as string).split("-");
    const classes = ["piece-square"];
    if (selectedPiece === move) {
      classes.push("selected");
    }
    return (
      <div
        className={classes.join(" ")}
        key={move}
        onClick={() => {
          setSelectedPiece(move);
        }}
      >
        {myPlayer === Player.X ? (
          <X className={`size-${size}`} />
        ) : (
          <O className={`size-${size}`} />
        )}
      </div>
    );
  });

  return (
    <div className="game">
      <div className="game-board">
        <Board squares={gameState.board} squareClick={handleClick} />
        <div>
          <div>{status}</div>
          {myPlayer ? (
            <div>
              <div>Your Remaining Pieces:</div>
              <div className="move-option-row">{moveOptions}</div>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
      {/* <div className="game-info">
          <ol>{moves}</ol>
        </div> */}
    </div>
  );
}

// ========================================

export default Game;
