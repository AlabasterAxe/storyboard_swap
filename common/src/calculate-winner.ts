import { Player } from "./model";

export function calculateWinner(squares: string[]): Player | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (
      squares[a] &&
      squares[b] &&
      squares[c] &&
      squares[a][0] === squares[b][0] &&
      squares[b][0] === squares[c][0]
    ) {
      return squares[a] as Player;
    }
  }

  return null;
}
