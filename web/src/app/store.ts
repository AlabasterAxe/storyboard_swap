import {
  ClientPlayer,
  GameSnapshot,
  initialGameState,
  Player,
} from "../../../common/src/model";
import {
  combineReducers,
  configureStore,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { save, load } from "redux-localstorage-simple"
import { ClientMessage } from "../../../common/src/transfer";


export interface ReduxGameState {
  history: {state: GameSnapshot, message?: ClientMessage}[];
  player: Partial<Player>| undefined;
  gameId: string | undefined;
}

const initialState: ReduxGameState = {
  history: [{state: initialGameState(), message: undefined}],
  player: undefined,
  gameId: undefined,
};

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    state: (state, action: PayloadAction<{state: GameSnapshot, message?: ClientMessage}>) => {
      state.history = [...state.history, action.payload];

      // if we see a new player state in the game state, update the player
      if (state.player?.id && state.player.id in action.payload.state.players) {
        state.player = action.payload.state.players[state.player.id];
      }
    },
    player: (state, action: PayloadAction<Partial<Player>|undefined>) =>{
      if (action.payload) {
        state.player = {...state.player, ...action.payload};
      } else {
        state.player = undefined;
      }
    },
    clear: (state, action: PayloadAction<{gameId: string}>) => {
      state.history = [{state: initialGameState(), message: undefined}];
      state.gameId = action.payload.gameId;
      state.player = undefined;
    },
  },
});

export const { state, player, clear } = gameSlice.actions;

export const selectCurrentGameState = (state: RootState) => state.game.history.slice(-1)[0].state;
export const selectCurrentGameId = (state: RootState) => state.game.gameId;
export const selectPlayer = (state: RootState) => state.game.player;

const rootReducer = combineReducers({
  game: gameSlice.reducer
})

export type RootState = ReturnType<typeof rootReducer>;

function initStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    middleware: [save()],
    preloadedState,
  })
}

export const store = initStore(
  load(),
)

export type AppDispatch = typeof store.dispatch;
