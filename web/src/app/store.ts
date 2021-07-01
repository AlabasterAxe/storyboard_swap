import {
  GameSnapshot,
  initialGameState,
  PlayerMove,
} from "../../../common/src/model";
import {
  applyMiddleware,
  configureStore,
  ConfigureStoreOptions,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { all, put, takeEvery } from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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
    move: (state, action: PayloadAction<PlayerMove>) => {
      //TODO: implement async call to backend
    },
    board: (state, action: PayloadAction<GameSnapshot>) => {
      state.history = [...state.history, action.payload];
    },
    clear: (state) => {
      state.history = [initialGameState()];
    },
  },
});

export const { move, board, clear } = gameSlice.actions;

function* incrementAsync() {
  console.log("Incrementing async...");
}

function* watchIncrementAsync() {
  yield takeEvery(board.type, incrementAsync);
}

// notice how we now only export the rootSaga
// single entry point to start all Sagas at once
export default function* rootSaga() {
  yield all([watchIncrementAsync()]);
}

const sagaMiddleware = createSagaMiddleware();

export const selectHistory = (state: RootState) => state.game.history;

export const store = configureStore({
  reducer: {
    game: gameSlice.reducer,
  },
  middleware: [sagaMiddleware],
} as ConfigureStoreOptions);

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
