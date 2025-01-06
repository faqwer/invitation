import LiveServer from "live-server";

let serverRoot = `./dist/`;

const params = {
  port: 8082,
  open: false,
  root: serverRoot,
  // ignore: ["./src/common", "./src/**/*.fla"]
};

LiveServer.start(params);
