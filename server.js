import Logger from "./handlers/consoleHandler.js";
import express from "express";
import { Server } from "socket.io";
import http from "http";
import * as serverHandler from "./handlers/serverHandler.js";
import versionHandler from "./handlers/versionHandler.js";
import * as listener from "./handlers/listener.js";
import javaHandler from "./handlers/javaHandler.js";

const logger = new Logger(["webserver"]);
process.on("exit", (code) => {
  const text = `Exiting with code ${code}`;
  if (code == -1) logger.error(text);
  else logger.info(text);
});

// create webServer for website
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
const websitePath = process.cwd() + "/website";
app.use("/website", express.static(websitePath));

await serverHandler.init();

app.get("/", (req, res) => {
  res.redirect("/servers");
});

app.get("/servers", (req, res) => {
  res.render(websitePath + "/index.ejs", {
    versions: versionHandler.data.versions,
    servers: serverHandler.servers,
    statusToColor: (s) => {
      return [
        { s: "online", c: "lime" },
        { s: "offline", c: "grey" },
        { s: "starting", c: "cyan" },
        { s: "stopping", c: "cyan" },
        { s: "downloading", c: "yellow" },
      ].find((e) => e.s == s).c;
    },
  });
});

app.get("/servers/*/*", (req, res) => {
  const serverNum = parseInt(req.url.split("/")[2]);
  const pageType = req.url.split("/")[3];
  if (
    isNaN(serverNum) ||
    serverNum >= serverHandler.totalServers() ||
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
  const server = serverHandler.get(serverNum);
  if (!server) {
    res.redirect("/servers");
    return;
  }
  res.render(websitePath + "/server/server.ejs", {
    server,
    serverIp: serverHandler.ip,
  });
});

app.get("/newserver", (req, res) => {
  const data = req.query;
  const type = data.type;
  const version = data["version" + type];

  const serverData = {
    name: data.name,
    type,
    version,
    settings: {
      gamemode: data.gamemode,
      difficulty: data.difficulty,
      seed: data.seed,
    },
  };

  serverHandler
    .newServer(serverData, data.port, (server) => {
      res.redirect("/servers/" + server.data.num);
    })
    .catch((e) => {
      res.redirect("/servers");
    });
});

io.on("connection", (socket) => {
  listener.pipe(socket, "_");

  socket.on("startServer", (serverNum) => {
    const server = serverHandler.get(serverNum);
    if (!server || server.status != "offline") return;
    server.start();
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
    server.start();
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
      server.start();
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

  socket.on("deleteServer", (serverNum) => {
    console.log("dete");
    serverHandler.deleteServer(serverNum);
  });
});

const webServerPort = 3001;
server.listen(webServerPort, () => {
  logger.info(`Listening on port ${webServerPort}`);
});
