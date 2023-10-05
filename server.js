import express from "express";
const app = express();
import { Server } from "socket.io";
import http from "http";
const server = http.createServer(app);
const io = new Server(server);

import * as serverHandler from "./handlers/serverHandler.js";
serverHandler.init();
import VersionHandler from "./handlers/versionHandler.js";
import * as listener from "./handlers/listener.js";
import Logger from "./handlers/consoleHandler.js";
const logger = new Logger(["webserver"]);

app.set("view engine", "ejs");
const websitePath = process.cwd() + "/website";

app.use("/website", express.static(websitePath));

const versionHandler = new VersionHandler();
await versionHandler.getServerVersions();

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
  res.render(websitePath + "/server.ejs", {
    ...serverHandler.getData(serverNum),
    players: [], //playerHandler.onlinePlayers[serverNum],
    serverNum,
  });
});

app.get("/newserver", (req, res) => {
  const data = req.query;
  data.build = versionHandler.versions.paper.find(
    (e) => e.version == data.version
  ).latest_build;

  const newServerNum = serverHandler.serverData.servers.length;
  serverHandler.newServer(data);
  res.redirect("/servers/" + newServerNum);
});

io.on("connection", (socket) => {
  listener.pipe(socket, "_");
  //playerHandler.pipe(socket, "_");

  socket.on("startServer", (serverNum) => {
    if (serverHandler.getData(serverNum).status != "offline") return;
    serverHandler.start(serverNum).catch(() => {
      socket.emit("startError", "data");
    });
  });

  socket.on("stopServer", (serverNum) => {
    if (serverHandler.getData(serverNum).status != "online") return;
    serverHandler.stop(serverNum);
  });

  socket.on("restartServer", async (serverNum) => {
    if (serverHandler.getData(serverNum).status != "online") return;
    await serverHandler.stop(serverNum);
    serverHandler.start(serverNum).catch(() => {
      socket.emit("startError", "data");
    });
  });
});

server.listen(3000, () => {
  logger.info("Listening on *:3000");
});
