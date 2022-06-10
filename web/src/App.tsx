import React, { Component, lazy, Suspense, useState } from "react";
import {
  BrowserRouter,
  Route,
  Link,
  Switch,
  useHistory,
} from "react-router-dom";
import "./App.css";
import generate from "project-name-generator";

const Game = lazy(() => import("./Game"));

function Home() {
  const [roomName, setRoomName] = useState<string>(generate().dashed);
  const history = useHistory();
  return (
    <div className="game">
      <div className="game-board">
        <div className="game-body">
          <h1>Storyboard Swap</h1>
          <div>
            To create a new game or join an existing game, enter a game
            identifier and click 'Start Game'.
            Once your game is started, others can join with the link.
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              history.push(`/g/${roomName}`);
            }}
          >
            <input
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
              }}
            />
            <button type="submit">Start Game</button>
          </form>
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
