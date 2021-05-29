import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { v4 as uuidv4 } from "uuid";
import * as WebSocket from "ws";
import { Player, Room } from "../../common/src/model";
import {
  BoardPayload,
  ClientCommand,
  ClientMessage,
  CreateRoomResp,
  PlayerPayload,
  ServerCommand,
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
  });

  await server.register(require("hapi-plugin-websocket"));
  await server.register(require("@hapi/inert"));

  server.route({
    method: "GET",
    path: "/{param*}",
    handler: {
      directory: {
        path: STATIC_ROOT,
        index: ["index.html"],
      },
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
        board: Array(9).fill(null),
      };
      rooms.set(newRoom.id, newRoom);

      const resp: CreateRoomResp = {
        roomId: newRoom.id,
      };

      return resp;
    },
  });

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
        let player = Player.X;
        const room = rooms.get(roomId);
        if (room) {
          room.participants.push(ws);
          if (room.participants.length > 1) {
            player = Player.O;
          }
        }
        ctx.roomId = roomId;
        const payload: PlayerPayload = {
          player,
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
        case ClientCommand.move:
          const room = rooms.get(ctx.roomId);

          if (room) {
            const peers = room.participants;
            room.board[
              message.payload.location
            ] = `${message.payload.player}-${message.payload.move}`;
            peers.forEach((peer: any) => {
              const msgPayload: BoardPayload = {
                board: room.board,
              };
              peer.send(
                JSON.stringify({
                  cmd: ServerCommand.board,
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

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
