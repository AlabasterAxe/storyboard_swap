import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { v4 as uuidv4 } from "uuid";
import * as WebSocket from "ws";
import {
  ClientPlayer,
  GameSnapshot,
  GameState,
  initialGameState,
  Player,
  PlayerState,
  ProjectInfo,
  Room,
} from "../../common/src/model";
import {
  ClientCommand,
  ClientMessage,
  ClientMessageRequest,
  ServerCommand,
  ServerMessage,
  StateMessage,
  StatePayload,
} from "../../common/src/transfer";

const rooms = new Map<string, Room>();

const STATIC_ROOT = "../web/build";

// this function returns the set of server messages that should be sent
// sent to the calling user. It may also broadcast to all members of the room.
function handleMessage(
  roomId: string,
  senderPlayerId: string,
  message: ClientMessage
): ServerMessage[] {
  const res: ServerMessage[] = [];

  const room = rooms.get(roomId);
  switch (message.cmd) {
    case ClientCommand.join:
      console.log("join is websocket-specific");
      break;

    case ClientCommand.start:
      if (room) {
        const latestSnapshot = room.history[room.history.length - 1];

        const newSnapshot: GameSnapshot = {
          ...latestSnapshot,
          state: GameState.in_progress,
        };

        room.history.push(newSnapshot);

        const stateMsg: ServerMessage = {
          cmd: ServerCommand.state,
          payload: { state: newSnapshot },
        };
        room.participants.forEach((peer: any) => {
          peer.send(JSON.stringify(stateMsg));
        });
        res.push(stateMsg);
      }
      break;

    case ClientCommand.done:
      if (room) {
        if (!senderPlayerId) {
          throw new Error("no senderPlayerIdfor context id; have you joined?");
        }
        const latestSnapshot = room.history[room.history.length - 1];
        const player = latestSnapshot.players[senderPlayerId];
        if (!player) {
          throw new Error("no player found for playerId");
        }
        const nextPlayerId = latestSnapshot.playerRecipientMap[senderPlayerId];
        if (!nextPlayerId) {
          throw new Error(
            `no recipient configured for playerId: ${senderPlayerId}`
          );
        }
        const nextPlayer = latestSnapshot.players[nextPlayerId];
        const completedUrl = message.payload.projectUrl;
        if (!player.pendingProjectUrls.includes(completedUrl)) {
          console.warn("player can't complete projectUrl it doesn't have");
          // we send the state back to the user since it looks like they
          // have out of date state
          res.push({
            cmd: ServerCommand.state,
            payload: { state: latestSnapshot },
          });
          return res;
        }
        const newPlayer = {
          ...player,
          pendingProjectUrls: player.pendingProjectUrls.filter(
            (url) => url !== completedUrl
          ),
        };
        const newNextPlayer = {
          ...nextPlayer,
          pendingProjectUrls: [...nextPlayer.pendingProjectUrls, completedUrl],
        };
        const newSnapshot = {
          ...latestSnapshot,
          projects: {
            ...latestSnapshot.projects,
            [completedUrl]: {
              ...latestSnapshot.projects[completedUrl],
              turns: latestSnapshot.projects[completedUrl].turns + 1,
            }
          },
          players: {
            ...latestSnapshot.players,
            [senderPlayerId]: newPlayer,
            [nextPlayerId]: newNextPlayer,
          },
        };

        room.history.push(newSnapshot);
        const stateMessage: ServerMessage = {
          cmd: ServerCommand.state,
          payload: { state: newSnapshot },
        };
        res.push(stateMessage);
        room.participants.forEach((peer: any) => {
          peer.send(JSON.stringify(stateMessage));
        });
      }
      break;
    default:
      throw new Error("unknown command");
  }
  return res;
}

const LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

const RANDOM_NAME_PREFIX = "Player ";

function getLetterName(roomId: string): string {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error("no room found for roomId");
  }
  const usedLetters = new Set();
  for (const player of Object.values(
    room.history[room.history.length - 1].players
  )) {
    if (player.displayName.startsWith(RANDOM_NAME_PREFIX)) {
      usedLetters.add(player.displayName.substring(RANDOM_NAME_PREFIX.length));
    }
  }

  if (usedLetters.size === LETTERS.length) {
    return "Matt's Bug";
  }

  // grab a random letter that isn't used
  let candidate;
  do {
    candidate = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  } while (usedLetters.has(candidate));
  return `${RANDOM_NAME_PREFIX}${candidate}`;
}

// generates a new player but without the originalProjectUrl since that has to come from the
// client
function newPlayer(
  roomId: string,
  originalProjectUrl: string,
  displayName?: string
): Player {
  return {
    roomId,
    id: uuidv4(),
    state: PlayerState.ready,
    pendingProjectUrls: [originalProjectUrl],
    originalProjectUrl: originalProjectUrl,
    displayName: displayName || getLetterName(roomId),
  };
}

const init = async () => {
  const server = Hapi.server({
    port: 8080,
    host: "0.0.0.0",
    state: {
      strictHeader: false,
    },
    routes: {
      files: {
        relativeTo: STATIC_ROOT,
      },
    },
  });

  await server.register(require("hapi-plugin-websocket"));
  await server.register(require("@hapi/inert"));

  server.route({
    method: "POST",
    path: "/api/connect/{roomId}",
    options: {
      response: { emptyStatusCode: 204 },
      payload: { output: "data", parse: true, allow: "application/json" },
      plugins: {
        websocket: {
          initially: true,
          connect: (blah: any) => {
            blah.ctx.to = setInterval(() => {
              if (blah.ws.readyState === WebSocket.OPEN) {
                blah.ws.send(JSON.stringify({ cmd: ServerCommand.ping }));
              }
            }, 5000);
            console.log("player connected");
            blah.ctx.id = uuidv4();
          },
          disconnect: (blah: any) => {
            if (blah.ctx.to) {
              clearInterval(blah.ctx.to);
              blah.ctx.to = null;
            }
            if (blah.ctx.roomId) {
              const room = rooms.get(blah.ctx.roomId);
              if (room) {
                delete room.participantPlayerMap[blah.ctx.id];
                room.participants.splice(room.participants.indexOf(blah.ws), 1);
              }
            }
          },
        },
      },
    },
    handler: (request, h) => {
      // todo see if we can type this somehow.
      const { initially, ws, ctx } = (request as any).websocket();

      if (initially) {
        const roomId = request.params.roomId;

        let room: Room | undefined = rooms.get(roomId);
        if (!room) {
          room = {
            id: roomId,
            participants: [],
            history: [initialGameState()],
            participantPlayerMap: {},
          };
          rooms.set(room.id, room);
        }

        room.participants.push(ws);

        ctx.roomId = roomId;
        const stateMessage: StateMessage = {
          cmd: ServerCommand.state,
          payload: {
            state: room.history.slice(-1)[0],
          },
        };
        ws.send(JSON.stringify(stateMessage));

        return "";
      }

      if (typeof request.payload !== "object" || request.payload === null) {
        return Boom.badRequest("invalid request");
      }
      const message = request.payload as ClientMessage;
      if (typeof message.cmd !== "string") {
        return Boom.badRequest("must supply cmd field on req object");
      }
      const room = rooms.get(ctx.roomId);

      // should never happen
      if (!room) {
        return Boom.badRequest("no room found");
      }

      if (message.cmd === ClientCommand.join) {
        const clientPlayer: ClientPlayer = message.payload.player;
        // we initialize a new player assigned to their own project url but we defer to the provided
        // client fields if they exist.
        let player: Player = {
          ...newPlayer(
            room.id,
            clientPlayer.originalProjectUrl,
            clientPlayer.displayName
          ),
          ...(clientPlayer.roomId === room.id ? clientPlayer : {}),
        };

        room.participantPlayerMap[ctx.id] = player.id;

        const latestSnapshot = room.history[room.history.length - 1];

        const newPlayers = {
          ...latestSnapshot.players,
          [player.id]: player,
        };

        const newSnapshot = {
          ...latestSnapshot,
          players: newPlayers,
        };

        if (!(player.id in latestSnapshot.players)) {
          const newProjects: Record<string, ProjectInfo> = {
            ...latestSnapshot.projects,
            [player.originalProjectUrl]: {
              ownerId: player.id,
              url: player.originalProjectUrl,
              turns: 0,
            },
          };

          newSnapshot.projects = newProjects;
          const newPlayerRecipientMap: Record<string, string> = {};
          if (Object.keys(newPlayers).length > 1) {
            let lastPlayerId: string | undefined = undefined;
            let firstPlayerId: string | undefined = undefined;
            for (const playerId of Object.keys(newPlayers)) {
              if (!lastPlayerId) {
                firstPlayerId = playerId;
              } else {
                newPlayerRecipientMap[playerId] = lastPlayerId;
              }
              lastPlayerId = playerId;
            }
            if (firstPlayerId && lastPlayerId) {
              newPlayerRecipientMap[firstPlayerId] = lastPlayerId;
            }
          }
          newSnapshot.playerRecipientMap = newPlayerRecipientMap;
        }

        room.history.push(newSnapshot);

        room.participants.forEach((peer: any) => {
          const msgPayload: StatePayload = {
            state: newSnapshot,
          };
          peer.send(
            JSON.stringify({
              cmd: ServerCommand.state,
              payload: msgPayload,
            })
          );
        });

        ws.send(
          JSON.stringify({ cmd: ServerCommand.player, payload: { player } })
        );
      } else {
        const senderPlayerId = room.participantPlayerMap[ctx.id];
        try {
          const responseMessages = handleMessage(
            ctx.roomId,
            senderPlayerId,
            message
          );
          for (const message of responseMessages) {
            ws.send(JSON.stringify(message));
          }
        } catch (e) {
          console.error(e);
          return Boom.badRequest((e as Error).message);
        }
      }
      return "";
    },
  });

  server.route({
    method: "GET",
    path: "/api/ok",
    handler: (request, h) => {
      return "ok";
    },
  });

  server.route({
    method: "GET",
    path: "/{param*}",
    handler: {
      directory: {
        path: ".",
        index: "index.html",
      },
    },
  });

  server.route({
    method: "POST",
    path: "/api/game/{roomId}/message",
    options: {
      cors: true,
    },
    handler: (request, h) => {
      const rqst = JSON.parse(
        request.payload as string
      ) as ClientMessageRequest;
      const roomId = request.params.roomId;
      try {
        const responseMessages = handleMessage(
          roomId,
          rqst.playerId,
          rqst.message
        );
        return {
          messages: responseMessages,
        };
      } catch (e) {
        return Boom.badRequest((e as Error).message);
      }
    },
  });

  // redirect not founds to index
  server.ext("onPreResponse", (request, h: any) => {
    const response = request.response;
    if (response instanceof Error && response.output.statusCode === 404) {
      return h.file("index.html");
    }

    return h.continue;
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
