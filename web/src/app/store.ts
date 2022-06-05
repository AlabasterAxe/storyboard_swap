import {
  ClientPlayer,
  GameSnapshot,
  initialGameState,
} from "../../../common/src/model";
import {
  configureStore,
  ConfigureStoreOptions,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";


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

export type RootState = {
  game: ReduxGameState;
};

export const store = configureStore({
  reducer: {
    game: gameSlice.reducer,
  },
} as ConfigureStoreOptions);

export type AppDispatch = typeof store.dispatch;
