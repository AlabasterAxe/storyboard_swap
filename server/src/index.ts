import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { v4 as uuidv4 } from "uuid";
import { Room } from "./model";
import { ConnectRqst, CreateRoomResp } from "./transfer";
import * as WebSocket from "ws";

// hapi-plugin-websocket doesn't have types :/
const HAPIWebSocket = require("hapi-plugin-websocket");

const rooms = new Map<string, Room>();

const init = async () => {
  const server = Hapi.server({
    port: 3001,
    host: "localhost",
    state: {
      strictHeader: false,
    },
  });

  await server.register(HAPIWebSocket);

  server.route({
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return "Hello, world";
    },
  });

  server.route({
    method: "GET",
    path: "/new_room",
    handler: (request, h) => {
      const newRoom: Room = {
        id: uuidv4(),
        participants: [],
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
    path: "/connect/{roomId}",
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
        if (rooms.has(roomId)) {
          const room = rooms.get(roomId);
          if (room) {
            room.participants.push(ws);
          }
        }
        ctx.roomId = roomId;
        ws.send(JSON.stringify({ cmd: "HELLO" }));
        return "";
      }

      if (typeof request.payload !== "object" || request.payload === null) {
        return Boom.badRequest("invalid request");
      }
      if (typeof (request.payload as any).cmd !== "string") {
        return Boom.badRequest("must supply cmd field on req object");
      }
      switch ((request.payload as any).cmd) {
        case "PING":
          return { result: "PONG" };
        case "AWAKE-ALL":
          const room = rooms.get(ctx.roomId);
          if (room) {
            const peers = room.participants;
            peers.forEach((peer: any) => {
              peer.send(JSON.stringify({ cmd: "AWAKE" }));
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
