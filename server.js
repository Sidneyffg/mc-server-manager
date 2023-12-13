import Logger from "./handlers/consoleHandler.js";
const logger = new Logger(["webserver"]);
process.on("exit", (code) => {
  const text = `Exiting with code ${code}`;
  if (code == -1) logger.error(text);
  else logger.info(text);
});

import express from "express";
const app = express();
import { Server } from "socket.io";
import http from "http";
const server = http.createServer(app);
const io = new Server(server);

import * as serverHandler from "./handlers/serverHandler.js";
await serverHandler.init();
import * as versionHandler from "./handlers/versionHandler.js";
import * as listener from "./handlers/listener.js";

app.set("view engine", "ejs");
const websitePath = process.cwd() + "/website";

app.use("/website", express.static(websitePath));

await versionHandler.getServerVersions();

function statusToColor(s) {
  return [
    { s: "online", c: "lime" },
    { s: "offline", c: "grey" },
    { s: "starting", c: "cyan" },
    { s: "stopping", c: "cyan" },
    { s: "downloading", c: "yellow" },
  ].find((e) => e.s == s).c;
}

app.get("/", (req, res) => {
  res.redirect("/servers");
});

app.get("/servers", (req, res) => {
  let serverData = [];
  for (let i = 0; i < serverHandler.totalServers; i++) {
    serverData.push(serverHandler.get(i));
  }
  res.render(websitePath + "/index.ejs", {
    versions: versionHandler.data.allVersions,
    serverData,
    statusToColor,
  });
});

app.get("/servers/*/*", (req, res) => {
  const serverNum = parseInt(req.url.split("/")[2]);
  const pageType = req.url.split("/")[3];
  if (
    isNaN(serverNum) ||
    serverNum >= serverHandler.totalServers ||
    serverNum < 0
  ) {
    res.redirect("/servers");
    return;
  }

  if (!["players", "settings", "backups"].includes(pageType)) {
    res.redirect("/servers/" + serverNum);
    return;
  }
  res.render(websitePath + `/${pageType}/${pageType}.ejs`, {
    serverData: serverHandler.get(serverNum),
    serverIp: serverHandler.ip,
  });
});

app.get("/servers/*", (req, res) => {
  const serverNum = parseInt(req.url.split("/")[2]);

  if (
    isNaN(serverNum) ||
    serverNum >= serverHandler.totalServers ||
    serverNum < 0
  ) {
    res.redirect("/servers");
    return;
  }
  res.render(websitePath + "/server/server.ejs", {
    serverData: serverHandler.get(serverNum),
    serverIp: serverHandler.ip,
  });
});

app.get("/newserver", (req, res) => {
  const data = req.query;
  data.build = versionHandler.data.allVersions.paper.find(
    (e) => e.version == data.version
  ).latest_build;

  const newServerNum = serverHandler.totalServers;
  serverHandler.newServer(data);
  setTimeout(() => res.redirect("/servers/" + newServerNum), 500);
});

io.on("connection", (socket) => {
  listener.pipe(socket, "_");

  socket.on("startServer", (serverNum) => {
    const server = serverHandler.get(serverNum);
    if (!server || server.status != "offline") return;
    server.start().catch(() => {
      socket.emit("startError", "data");
    });
  });

  socket.on("stopServer", (serverNum) => {
    const server = serverHandler.get(serverNum);
    if (server.status != "online") return;
    server.shutdownHandler.stopServer();
  });

  socket.on("stopServerIn", (serverNum, ms) => {
    const server = serverHandler.get(serverNum);
    if (server.status != "online") return;
    server.shutdownHandler.stopServerIn(() => {}, ms, false);
  });

  socket.on("restartServer", async (serverNum) => {
    const server = serverHandler.get(serverNum);
    if (server.status != "online") return;
    await server.shutdownHandler.stopServer();
    server.start().catch(() => {
      socket.emit("startError", "data");
    });
  });

  socket.on("addPlayerToWhitelist", (serverNum, playerName, callback) => {
    const server = serverHandler.get(serverNum);
    if (server.status != "online") {
      server.eventHandler.addOnlineTodoItem({
        action: "addPlayerToWhitelist",
        value: playerName,
      });
      callback(true);
      return;
    }
    callback(server.playerHandler.addPlayerToWhitelist(playerName));
  });

  socket.on("makePlayerOperator", (serverNum, playerName, callback) => {
    const server = serverHandler.get(serverNum);
    if (server.status != "online") {
      server.eventHandler.addOnlineTodoItem({
        action: "makePlayerOperator",
        value: playerName,
      });
      callback(true);
      return;
    }
    callback(server.playerHandler.makePlayerOperator(playerName));
  });

  socket.on("updateSettings", async (serverNum, newSettings, force) => {
    const server = serverHandler.get(serverNum);
    server.emit("updateSettings", newSettings);
    if (force) {
      if (server.status != "online") return;
      await server.shutdownHandler.stopServer();
      server.start().catch(() => {
        socket.emit("startError", "data");
      });
    }
  });

  socket.on("updateBackupSettings", (serverNum, newSettings) => {
    const server = serverHandler.get(serverNum);
    server.backupHandler.updateAutomaticBackupSettings(newSettings);
  });

  socket.on("createBackup", (serverNum, createInMs = null) => {
    const server = serverHandler.get(serverNum);
    if (!server) return;

    if (server.status == "offline") {
      server.backupHandler.createBackup();
      return;
    }
    if (createInMs === null) return;

    if (createInMs == 0) {
      server.shutdownHandler.restart(async () => {
        await server.backupHandler.createBackup();
      });
      return;
    }
    server.shutdownHandler.stopServerIn(
      async () => {
        await server.backupHandler.createBackup();
      },
      createInMs,
      true
    );
  });

  socket.on("deleteBackup", (serverNum, backupId) => {
    const server = serverHandler.get(serverNum);
    server.backupHandler.deleteBackup(backupId);
  });
});

server.listen(3000, () => {
  logger.info("Listening on *:3000");
});
