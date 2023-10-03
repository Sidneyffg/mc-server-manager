import express from "express";
const app = express();
import { Server } from "socket.io";
import http from "http";
const server = http.createServer(app);
const io = new Server(server);

import ServerHandler from "./handlers/serverHandler.js";
import VersionHandler from "./handlers/versionHandler.js";
import PlayerHandler from "./handlers/playerHandler.js";

app.set("view engine", "ejs");
const websitePath = process.cwd() + "/website";

app.use("/website", express.static(websitePath));

const versionHandler = new VersionHandler();
await versionHandler.getServerVersions();
const serverHandler = new ServerHandler();
const playerHandler = new PlayerHandler(serverHandler);

app.get("/", (req, res) => {
  res.redirect("/servers");
});

app.get("/servers", (req, res) => {
  res.render(websitePath + "/index.ejs");
});

app.get("/servers/*", (req, res) => {
  const serverNum = parseInt(req.url.split("/")[2]);

  if (
    isNaN(serverNum) ||
    serverNum >= serverHandler.serverData.servers.length ||
    serverNum < 0
  ) {
    res.redirect("/servers");
    return;
  }
  const currentServer = serverHandler.servers[serverNum];
  res.render(websitePath + "/server.ejs", {
    serverLog: currentServer.log,
    players: playerHandler.onlinePlayers[serverNum],
    serverNum,
    serverStatus: currentServer.status,
  });
});

io.on("connection", (socket) => {
  console.log("connection");
  serverHandler.pipe(socket, "_");
  playerHandler.pipe(socket, "_");
});

setTimeout(() => {
  serverHandler.startServer(0);
}, 5000);

setTimeout(() => {
  //serverHandler.stopServer(0);
}, 60000);

//genNewServer();
async function genNewServer() {
  await serverHandler.newServer(
    "paper",
    "1.20.1",
    versionHandler.versions.paper.find((e) => e.version == "1.20.1")
      .latest_build
  );
  console.log("finished");
}

server.listen(3000, () => {
  console.log("Listening on *:3000");
});
