import {
  ClientPlayer,
  GameSnapshot,
  initialGameState,
} from "../../../common/src/model";
import {
  combineReducers,
  configureStore,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { save, load } from "redux-localstorage-simple"


export interface ReduxGameState {
  history: GameSnapshot[];
  player: ClientPlayer | undefined
}

const initialState: ReduxGameState = {
  history: [initialGameState()],
  player: undefined,
};

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    state: (state, action: PayloadAction<GameSnapshot>) => {
      state.history = [...state.history, action.payload];
    },
    player: (state, action: PayloadAction<ClientPlayer|undefined>) =>{
      state.player = action.payload;
    },
    clear: (state) => {
      state.history = [initialGameState()];
    },
  },
});

export const { state, player, clear } = gameSlice.actions;

export const selectCurrentGameState = (state: RootState) => state.game.history.slice(-1)[0];
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
