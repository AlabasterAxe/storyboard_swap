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
    path: "/connect",
    options: {
      response: { emptyStatusCode: 204 },
      payload: { output: "data", parse: true, allow: "application/json" },
      plugins: {
        websocket: {
          initially: true,
          connect: ({ ctx, ws }: { ctx: any; ws: any }) => {
            ctx.to = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ cmd: "PING" }));
              }
            }, 5000);
          },
          disconnect: ({ ctx }: { ctx: any }) => {
            if (ctx.to !== null) {
              clearInterval(ctx.to);
              ctx.to = null;
            }
          },
        },
      },
    },
    handler: (request, h) => {
      // todo see if we can type this somehow.
      const { initially, ws } = (request as any).websocket();

      if (initially) {
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
          const peers = (request as any).websocket().peers;
          peers.forEach((peer: any) => {
            peer.send(JSON.stringify({ cmd: "AWAKE" }));
          });
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
