import {
  GameSnapshot,
  initialGameState,
  PlayerMove,
} from "../../common/src/model";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { put, takeEvery } from "redux-saga/effects";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function* incrementAsync() {
  yield delay(1000);
  yield put({ type: "INCREMENT" });
}

function* watchIncrementAsync() {
  yield takeEvery("INCREMENT_ASYNC", incrementAsync);
}

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
    clear: (state) => {
      state.history = [];
    },
  },
});
