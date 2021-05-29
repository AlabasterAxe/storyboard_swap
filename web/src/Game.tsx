import React, { Component } from "react";
import { GameSnapshot, Player, PlayerPiece } from "../../common/src/model";
import {
  ClientCommand,
  ClientMessage,
  CreateRoomResp,
  ServerCommand,
  ServerMessage,
} from "../../common/src/transfer";
import "./Game.css";
import {ReactComponent as X} from "./X.svg";
import {ReactComponent as O} from "./O.svg";

// const SERVER_SPEC = "35.188.94.49:8080";
const SERVER_SPEC = "localhost:8080";

interface SquareProps {
  value: string;
  onClick: () => void;
}

function Square(props: SquareProps) {
  let contents: any = "";
  if (props.value) {
    const [player, size, id] = props.value.split("-");
    contents = player === "X" ? <X className={`size-${size}`} /> : <O className={`size-${size}`}/>;
  }
  return (
    <button className="square" onClick={props.onClick}>
      {contents}
    </button>
  );
}

interface BoardProps {
  squares: string[];
  xIsNext: boolean;
  squareClick: (arg: number) => void;
}

class Board extends Component<BoardProps, {}> {
  renderSquare(i: number) {
    return (
      <Square
        value={this.props.squares[i]}
        onClick={() => this.props.squareClick(i)}
      />
    );
  }

  render() {
    return (
      <div className="board-grid">
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

interface GameState {
  history: GameSnapshot[];
  currentMoveIdx: number;
  ws: WebSocket | null;
  myPlayer: Player | null;
  remainingMoves: PlayerPiece[];
  selectedMove: PlayerPiece | null;
}

interface GameProps {
  match: { params: { gameId: string } };
}

class Game extends Component<GameProps, GameState> {
  constructor(props: GameProps) {
    super(props);

    this.state = {
      history: [
        {
          board: Array(9).fill(null),
          playersTurn: Player.X,
          previousMove: null,
          winner: null,
        }
      ],
      currentMoveIdx: 0,
      ws: null,
      myPlayer: null,
      remainingMoves: [
        PlayerPiece.large_1,
        PlayerPiece.large_2,
        PlayerPiece.medium_1,
        PlayerPiece.medium_2,
        PlayerPiece.small_1,
        PlayerPiece.small_2,
      ],
      selectedMove: null,
    };

    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    const gameId = this.props.match.params.gameId;

    (gameId === "new"
      ? fetch(`http://${SERVER_SPEC}/api/new_room`)
          .then((response) => response.json())
          .then((data: CreateRoomResp) => data.roomId)
      : Promise.resolve(gameId)
    ).then((gameId) => {
      window.history.replaceState(null, "Game", `/g/${gameId}`)
      const webby = new WebSocket(`ws://${SERVER_SPEC}/api/connect/${gameId}`);
      webby.onmessage = (event) => {
        console.log(event);
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.cmd) {
          switch (msg.cmd) {
            case ServerCommand.board:
              const newBoardState = msg.payload.board;
              this.setState({
                history: this.state.history.concat([
                  newBoardState
                ]),
                currentMoveIdx: this.state.currentMoveIdx + 1,
              });
              break;
            case ServerCommand.history:
              this.setState({
                history: msg.payload.history,
                currentMoveIdx: msg.payload.history.length - 1,
              });
              break;
            case ServerCommand.player:
              this.setState({
                myPlayer: msg.payload.player,
              })
          }
        }
      };
      this.setState({ ws: webby });
    });
  }

  get currentBoardState(): GameSnapshot {
    return this.state.history[this.state.currentMoveIdx];
  }

  isMovePossible(currentValue: string, proposedMove: PlayerPiece): boolean {
    if (!currentValue) {
      return true;
    }
    const [existingPlayer, existingSize] = currentValue.split("-");
    const [proposedSize] = proposedMove.split("-");

    // even if the size is larger we won't let you play over your own piece because that's dumb.
    if (existingPlayer === this.state.myPlayer) {
      return false;
    }

    return (parseInt(proposedSize) > parseInt(existingSize));
  }

  handleClick(i: number) {
    // Users are not allowed to modify the past (see grandfather paradox).
    // TODO: warn users when no move is selected
    if (this.state.currentMoveIdx !== this.state.history.length - 1 ||

      // it's the other players turn
      this.currentBoardState.playersTurn !== this.state.myPlayer || 

      // the player hasn't selected a piece
      !this.state.selectedMove ||

      // there's a winner
      this.currentBoardState.winner ||

      // the person is a spectator
      !this.state.myPlayer 
      ) {
      return false;
    }

    if (this.isMovePossible(this.currentBoardState.board[i], this.state.selectedMove)) {
      if (this.state.ws) {
        const clientMsg: ClientMessage = {cmd: ClientCommand.move, payload: { playerMove: {location: i, player: this.currentBoardState.playersTurn, piece: this.state.selectedMove} }}
        this.state.ws.send(JSON.stringify(clientMsg));
        const newRemainingMoves = [...this.state.remainingMoves];
        newRemainingMoves.splice(newRemainingMoves.indexOf(this.state.selectedMove), 1);
        this.setState({
          selectedMove: null,
          remainingMoves: newRemainingMoves,
        });
      }
    }
  }

  jumpTo(moveNum: number) {
    this.setState({
      currentMoveIdx: moveNum,
    });
  }

  getPlayerIndicator(player: string) {
    return <span className={`${player} indicator`}></span>
  }

  render() {
    let status;
    if (this.currentBoardState.winner) {
      status = <span><span>Winner:</span> {this.getPlayerIndicator(this.currentBoardState.winner[0])}</span>;
    } else {
      status = <span><span>Next player:</span>{this.getPlayerIndicator(this.currentBoardState.playersTurn)}</span>;
    }

    const moves = this.state.history.map((step, move) => {
      const desc = move ? "Go to move #" + move : "Go to game start";
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    const moveOptions = this.state.remainingMoves.map((move) => {
      const [size] = (move as string).split("-");
      const classes = ["piece-square"];
      if (this.state.selectedMove === move) {
        classes.push("selected")
      }
      return (
        <div className={classes.join(" ")} key={move} onClick={()=>{ this.setState({selectedMove: move})}}>
          {this.state.myPlayer === Player.X ? <X className={`size-${size}`} /> : <O className={`size-${size}`}/>}
        </div>
      );
    });

    return (
      <div className="game">
        <div className="game-board">
          <Board
            squares={this.currentBoardState.board}
            xIsNext={this.currentBoardState.playersTurn === Player.X}
            squareClick={this.handleClick}
          />
          <div>
            <div>{status}</div>
            {this.state.myPlayer ? (<div><div>Your Remaining Pieces:</div>
            <div className="move-option-row">
              {moveOptions}
            </div></div>): <div></div>}
          </div>
        </div>
        {/* <div className="game-info">
          <ol>{moves}</ol>
        </div> */}
      </div>
    );
  }
}

// ========================================

export default Game;
