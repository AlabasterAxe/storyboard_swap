import React, { Component, lazy, Suspense } from "react";
import { BrowserRouter, Route, Link, Switch } from "react-router-dom";
import "./App.css";

const Game = lazy(() => import("./Game"));

function Home() {
  return <Link to="/g/new">Start Game</Link>;
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
