import { Player } from "../../../common/src/model";

export function WaitingPlayers(props: { players: Record<string, Player> }) {
  const playerElements = Object.keys(props.players)
    .sort()
    .map((playerId, index, arr) => {
      return (
        <div
          style={{ left: `${((index + 1) / (arr.length + 1)) * 100}%` }}
          className="waiting-player"
        >
            {props.players[playerId].displayName}
        </div>
      );
    });

  return <div className="waiting-players-container">{playerElements}</div>;
}
