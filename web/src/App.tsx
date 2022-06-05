import React, { Component, lazy, Suspense, useState } from "react";
import { BrowserRouter, Route, Link, Switch } from "react-router-dom";
import "./App.css";

const Game = lazy(() => import("./Game"));

function Home() {
  const [roomName, setRoomName] = useState<string>("");
  const [projectUrl, setProjectUrl] = useState<string>("");
  return (<div className="contentColumn">
    <div>Room Name</div>
    <input onChange={(e)=>{setRoomName(e.target.value)}}/>
    <div>Project Url</div>
    <input onChange={(e)=>{setProjectUrl(e.target.value)}}/>
    <Link to={"/g/" + roomName || "new"}>Start Game</Link>
  </div>);
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
