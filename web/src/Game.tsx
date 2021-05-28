import React, { Component } from "react";
import { Player, PlayerMove } from "../../common/src/model";
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
      <div>
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
  history: { squares: string[] }[];
  playersTurn: Player;
  currentMoveIdx: number;
  ws: WebSocket | null;
  myPlayer: Player | null;
  remainingMoves: PlayerMove[];
  selectedMove: PlayerMove | null;
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
          squares: Array(9).fill(null),
        },
      ],
      playersTurn: Player.X,
      currentMoveIdx: 0,
      ws: null,
      myPlayer: null,
      remainingMoves: [
        PlayerMove.large_1,
        PlayerMove.large_2,
        PlayerMove.medium_1,
        PlayerMove.medium_2,
        PlayerMove.small_1,
        PlayerMove.small_2,
      ],
      selectedMove: null,
    };

    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    const gameId = this.props.match.params.gameId;

    (gameId === "new"
      ? fetch("http://localhost:3001/new_room")
          .then((response) => response.json())
          .then((data: CreateRoomResp) => data.roomId)
      : Promise.resolve(gameId)
    ).then((gameId) => {
      window.history.replaceState(null, "Game", `/g/${gameId}`)
      const webby = new WebSocket(`ws://localhost:3001/connect/${gameId}`);
      webby.onmessage = (event) => {
        console.log(event);
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.cmd) {
          switch (msg.cmd) {
            case ServerCommand.board:
              const newBoardState = msg.payload.board;
              this.setState({
                history: this.state.history.concat([
                  {
                    squares: newBoardState,
                  },
                ]),
                playersTurn:  this.state.playersTurn === Player.X ? Player.O : Player.X,
                currentMoveIdx: this.state.currentMoveIdx + 1,
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

  get currentBoardState(): string[] {
    return this.state.history[this.state.currentMoveIdx].squares;
  }

  isMovePossible(currentValue: string, proposedMove: PlayerMove): boolean {
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
      this.state.playersTurn !== this.state.myPlayer ||
      !this.state.selectedMove
      ) {
      return;
    }

    if (this.isMovePossible(this.currentBoardState[i], this.state.selectedMove)) {
      if (this.state.ws) {
        const clientMsg: ClientMessage = {cmd: ClientCommand.move, payload: {location: i, player: this.state.playersTurn, move: this.state.selectedMove}}
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

  calculateWinner(squares: string[]): string | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (
        squares[a] && squares[b] && squares[c] &&
        squares[a][0] === squares[b][0] &&
        squares[b][0] === squares[c][0]
      ) {
        return squares[a];
      }
    }

    return null;
  }

  jumpTo(moveNum: number) {
    this.setState({
      currentMoveIdx: moveNum,
    });
  }

  render() {
    const winner = this.calculateWinner(this.currentBoardState);
    let status;
    if (winner) {
      status = `Winner: ${winner[0]}`;
    } else {
      status = `Next player: ${this.state.playersTurn}`;
    }

    const playerStatus = `I am: ${this.state.myPlayer}`;

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
      const classes = ["square"];
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
            squares={this.currentBoardState}
            xIsNext={this.state.playersTurn === Player.X}
            squareClick={this.handleClick}
          />
          <div>Your Remaining Moves:</div>
          <div className="move-option-row">
            {moveOptions}
          </div>
        </div>
        <div className="game-info">
          <div>{status}</div>
          <div>{playerStatus}</div>
          <ol>{moves}</ol>
        </div>
      </div>
    );
  }
}

// ========================================

export default Game;
