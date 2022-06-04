import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { v4 as uuidv4 } from "uuid";
import * as WebSocket from "ws";
import { initialGameState, Player, PlayerState, Room } from "../../common/src/model";
import {
  ClientCommand,
  ClientMessage,
  CreateRoomResp,
  PlayerPayload,
  ServerCommand,
  StateMessage,
  StatePayload,
} from "../../common/src/transfer";

const rooms = new Map<string, Room>();

const STATIC_ROOT = "../web/build";

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
                blah.ws.send(JSON.stringify({ cmd: "PING" }));
              }
            }, 5000);
            console.log("player connected");
          },
          disconnect: (blah: any) => {
            if (blah.ctx.to) {
              clearInterval(blah.ctx.to);
              blah.ctx.to = null;
            }
            if (blah.ctx.roomId) {
              const room = rooms.get(blah.ctx.roomId);
              if (room) {
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
        // todo validate project url
        const projectUrl = request.params.projectUrl;
        const room = rooms.get(roomId);
        const playerId = uuidv4();
        if (room) {
          room.participants.push(ws);

          room.participantPlayerMap[ws.id] = playerId;

          const stateMessage: StateMessage = {
            cmd: ServerCommand.state,
            payload: {
              state: room.history.slice(-1)[0],
            },
          };
          ws.send(JSON.stringify(stateMessage));
        }

        let player: Player = {
          id: playerId,
          state: PlayerState.ready,
          originalProjectUrl: projectUrl,
          pendingProjectUrls: [projectUrl]
        };

        ctx.roomId = roomId;
        const payload: PlayerPayload = {
          player
        };
        ws.send(JSON.stringify({ cmd: ServerCommand.player, payload }));

        return "";
      }

      if (typeof request.payload !== "object" || request.payload === null) {
        return Boom.badRequest("invalid request");
      }
      const message = request.payload as ClientMessage;
      if (typeof message.cmd !== "string") {
        return Boom.badRequest("must supply cmd field on req object");
      }
      switch (message.cmd) {
        case ClientCommand.done:
          const room = rooms.get(ctx.roomId);

          if (room) {
            const playerId = room.participantPlayerMap[ws.id];
            const latestSnapshot = room.history[room.history.length - 1];
            const player = latestSnapshot.players[playerId];
            const nextPlayerId = latestSnapshot.playerRecipientMap[playerId];
            const nextPlayer = latestSnapshot.players[nextPlayerId];
            const completedUrl = message.payload.projectUrl;
            const newPlayer = {...player, pendingProjectUrls: player.pendingProjectUrls.filter(url => url !== completedUrl)};
            const newNextPlayer = {...nextPlayer, pendingProjectUrls: [...nextPlayer.pendingProjectUrls, completedUrl]};
            const newSnapshot = { ...latestSnapshot, players: { ...latestSnapshot.players, [playerId]: newPlayer, [nextPlayerId]: newNextPlayer} };

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
          }
          return "";
        default:
          return Boom.badRequest("unknown command");
      }
    },
  });

  server.route({
    method: "GET",
    path: "/api/new_room",
    options: {
      cors: true,
    },
    handler: (request, h) => {
      const newRoom: Room = {
        id: uuidv4(),
        participants: [],
        history: [initialGameState()],
        participantPlayerMap: {},
      };
      rooms.set(newRoom.id, newRoom);

      const resp: CreateRoomResp = {
        roomId: newRoom.id,
      };

      return resp;
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
