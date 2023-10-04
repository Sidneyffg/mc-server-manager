import express from "express";
const app = express();
import { Server } from "socket.io";
import http from "http";
const server = http.createServer(app);
const io = new Server(server);

import ServerHandler from "./handlers/serverHandler.js";
import VersionHandler from "./handlers/versionHandler.js";
import PlayerHandler from "./handlers/playerHandler.js";
import log from "./handlers/consoleHandler.js";

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
  res.render(websitePath + "/index.ejs", {
    versions: versionHandler.versions,
    servers: serverHandler.serverData.servers,
  });
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

app.get("/newserver", (req, res) => {
  const data = req.query;
  data.build = versionHandler.versions.paper.find(
    (e) => e.version == data.version
  ).latest_build;

  playerHandler.onlinePlayers.push([]);
  const newServerNum = serverHandler.servers.length;
  serverHandler.newServer(data);
  res.redirect("/servers/" + newServerNum);
});

io.on("connection", (socket) => {
  serverHandler.pipe(socket, "_");
  playerHandler.pipe(socket, "_");

  socket.on("startServer", (serverNum) => {
    if (serverHandler.servers[serverNum].status != "offline") return;
    serverHandler.startServer(serverNum).catch(() => {
      socket.emit("startError", "data");
    });
  });

  socket.on("stopServer", (serverNum) => {
    if (serverHandler.servers[serverNum].status != "online") return;
    serverHandler.stopServer(serverNum);
  });

  socket.on("restartServer", async (serverNum) => {
    if (serverHandler.servers[serverNum].status != "online") return;
    await serverHandler.stopServer(serverNum);
    serverHandler.startServer(serverNum).catch(() => {
      socket.emit("startError", "data");
    });
  });
});

server.listen(3000, () => {
  log("webServer", "INFO", {
    text: "Listening on *:3000",
  });
});
