import React, { Component } from 'react';
import { BrowserRouter, Route, Link} from 'react-router-dom';
import './App.css';
import Game from './Game';


function Home() {
  return (
    <Link to="/g/95209318-e004-4ce9-a875-97d55709642d">Start Game</Link>
  )
}

class App extends Component<{}, {}> {
  constructor(props: {}) {
    super(props);
  }
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

