import Hapi from "@hapi/hapi";

const init = async () => {
  const server = Hapi.server({
    port: 3001,
    host: "localhost",
    state: {
      strictHeader: false,
    },
  });

  server.route({
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return "Hello, world";
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
