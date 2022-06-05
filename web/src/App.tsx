import React, { Component, lazy, Suspense, useState } from "react";
import { BrowserRouter, Route, Link, Switch } from "react-router-dom";
import "./App.css";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { player, selectPlayer } from "./app/store";
import { v4 as uuidv4 } from "uuid";

const Game = lazy(() => import("./Game"));

function Home() {
  const [roomName, setRoomName] = useState<string>(uuidv4());
  const dispatch = useAppDispatch();
  const currentPlayer = useAppSelector(selectPlayer);
  return (<div className="contentColumn">
    <div>Room Name</div>
    <input value={roomName} onChange={(e)=>{setRoomName(e.target.value)}}/>
    <div>Project Url</div>
    <input value={currentPlayer?.originalProjectUrl ?? ""} onChange={(e)=>{dispatch(player({originalProjectUrl: e.target.value}))}}/>
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
