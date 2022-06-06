import React, { Component, lazy, Suspense, useState } from "react";
import { BrowserRouter, Route, Link, Switch } from "react-router-dom";
import "./App.css";
import { v4 as uuidv4 } from "uuid";

const Game = lazy(() => import("./Game"));

function Home() {
  const [roomName, setRoomName] = useState<string>(uuidv4());
  return (
    <div className="game">
      <div className="game-board">
        <div className="game-body">
          <div>Room Name</div>
          <input
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
            }}
          />
          <Link to={"/g/" + roomName}>
            <button>Start Game</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

class App extends Component<{}, {}> {
  render() {
    return (
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <Switch>
            <Route path="/g/:gameId" component={Game} />
            <Route path="/" component={Home} />
          </Switch>
        </Suspense>
      </BrowserRouter>
    );
  }
}

export default App;
