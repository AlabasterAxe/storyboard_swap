import {
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
}

const initialState: ReduxGameState = {
  history: [initialGameState()],
};

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    state: (state, action: PayloadAction<GameSnapshot>) => {
      state.history = [...state.history, action.payload];
    },
    clear: (state) => {
      state.history = [initialGameState()];
    },
  },
});

export const { state, clear } = gameSlice.actions;

export const selectCurrentGameState = (state: RootState) => state.game.history.slice(-1)[0];

export type RootState = {
  game: ReduxGameState;
};

export const store = configureStore({
  reducer: {
    game: gameSlice.reducer,
  },
} as ConfigureStoreOptions);

export type AppDispatch = typeof store.dispatch;
