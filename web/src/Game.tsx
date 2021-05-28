import React, {Component} from "react";
import { ServerCommand, ServerMessage } from "../../common/src/transfer";
import "./Game.css";

interface SquareProps {
  value: string  
  onClick: () => void
}

function Square(props: SquareProps) {
    return (
      <button className="square" onClick={props.onClick}>
        {props.value ? props.value: ""}
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
    return <Square value={this.props.squares[i]} onClick={ ()=>this.props.squareClick(i) } />;
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
  history: {squares: string[]}[];
  xIsNext: boolean;
  currentMoveIdx: number;
  ws: WebSocket | null;
}

interface GameProps {
  match: {params: {gameId: string}}
}

class Game extends Component<GameProps,GameState> {

  constructor(props: GameProps) {
    super(props);

    this.state = {
      history: [{
        squares: Array(9).fill(null),
      }],
      xIsNext: true,
      currentMoveIdx: 0,
      ws: null,
    }

    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    const webby = new WebSocket(`ws://localhost:3001/connect/${this.props.match.params.gameId}`);
    webby.onmessage = (event) => {
      console.log(event);
      const msg: ServerMessage = JSON.parse(event.data)
      if (msg.cmd) {
        switch (msg.cmd) {
          case ServerCommand.board:
            const newBoardState = msg.payload.board
            this.setState({
              history: this.state.history.concat([{
                squares: newBoardState,
              }]),
              xIsNext: !this.state.xIsNext,
              currentMoveIdx: this.state.currentMoveIdx + 1,
            });
        }
      }
    };
    this.setState({ws: webby});
  }

  get currentBoardState() : string[] {
    return this.state.history[this.state.currentMoveIdx].squares;
  }

  handleClick(i: number) {
    // Users are not allowed to modify the past (see grandfather paradox).
    if (this.state.currentMoveIdx !== this.state.history.length - 1) {
      return;
    }

    if (!this.currentBoardState[i]) {
      this.setState(()=>{
        const newBoardState = [ ...this.currentBoardState ];
        newBoardState[i] = this.state.xIsNext ? "X" : "O";
        return {
          history: this.state.history.concat([{
            squares: newBoardState,
          }]),
          xIsNext: !this.state.xIsNext,
          currentMoveIdx: this.state.currentMoveIdx + 1,
        };
      });
    }
  }

  calculateWinner(squares: string[]): string | null {
    const lines = [
      [0,1,2],
      [3,4,5],
      [6,7,8],
      [0,3,6],
      [1,4,7],
      [2,5,8],
      [0, 4, 8],
      [2, 4, 6],
    ]

    for (const line of lines) {
      const [a,b,c] = line;
      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[b] === squares[c]) {
        return squares[a];
      }
    }

    return null;
  }

  jumpTo(moveNum: number) {
    this.setState({
      currentMoveIdx: moveNum,
    })
  }

  render() {
    const winner = this.calculateWinner(this.currentBoardState);
    let status;
    if (winner) {
      status = `Winner: ${winner}`;
    } else {
      status = `Next player: ${this.state.xIsNext ? "X" : "O"}`;
    }

    const moves = this.state.history.map((step, move) => {
      const desc = move ?
        'Go to move #' + move :
        'Go to game start';
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    return (<div className="game">
        <div className="game-board">
          <Board
          squares={this.currentBoardState}
          xIsNext={this.state.xIsNext}
          squareClick={this.handleClick}
          />
        </div>
        <div className="game-info">
          <div>{status}</div>
          <ol>{moves}</ol>
        </div>
      </div>);
  }
}

// ========================================

export default Game;

