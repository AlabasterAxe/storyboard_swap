import React, { Component } from 'react';
import { BrowserRouter, Route, Link} from 'react-router-dom';
import './App.css';
import Game from './Game';


function Home() {
  return (
    <Link to="/g/new">Start Game</Link>
  )
}

class App extends Component<{}, {}> {
  render() {
    return (
      <BrowserRouter>
        <Route exact={true} path="/" component={Home}/>
        <Route path="/g/:gameId" component={Game} />
      </BrowserRouter>
    );
    
  }
}

export default App;

