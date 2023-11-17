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
import Logger from "./handlers/consoleHandler.js";
const logger = new Logger(["webserver"]);
import * as usageHandler from "./handlers/usageHandler.js";
import { callbackify } from "util";

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
    serverData.push(serverHandler.getData(i));
  }
  res.render(websitePath + "/index.ejs", {
    versions: versionHandler.allVersions,
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

  if (!["players", "settings"].includes(pageType)) {
    res.redirect("/servers/" + serverNum);
    return;
  }
  res.render(websitePath + `/${pageType}/${pageType}.ejs`, {
    serverData: serverHandler.getData(serverNum),
    serverNum,
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
    serverData: serverHandler.getData(serverNum),
    serverNum,
    serverIp: serverHandler.ip,
  });
});

app.get("/newserver", (req, res) => {
  const data = req.query;
  data.build = versionHandler.allVersions.paper.find(
    (e) => e.version == data.version
  ).latest_build;

  const newServerNum = serverHandler.totalServers;
  serverHandler.newServer(data);
  setTimeout(() => res.redirect("/servers/" + newServerNum), 500);
});

io.on("connection", (socket) => {
  listener.pipe(socket, "_");

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

  socket.on("addPlayerToWhitelist", (serverNum, playerName, callback) => {
    const serverData = serverHandler.getData(serverNum);
    if (serverData.status != "online") {
      serverHandler.addOnlineTodoItem(serverNum, {
        action: "addPlayerToWhitelist",
        value: playerName,
      });
      callback(true);
      return;
    }
    callback(serverHandler.addPlayerToWhitelist(serverNum, playerName));
  });

  socket.on("makePlayerOperator", (serverNum, playerName, callback) => {
    const serverData = serverHandler.getData(serverNum);
    if (serverData.status != "online") {
      serverHandler.addOnlineTodoItem(serverNum, {
        action: "makePlayerOperator",
        value: playerName,
      });
      callback(true);
      return;
    }
    callback(serverHandler.makePlayerOperator(serverNum, playerName));
  });

  socket.on("updateSettings", async (serverNum, newSettings, force) => {
    serverHandler.emitInServer(serverNum, "updateSettings", newSettings);
    if (force) {
      if (serverHandler.getData(serverNum).status != "online") return;
      await serverHandler.stop(serverNum);
      serverHandler.start(serverNum).catch(() => {
        socket.emit("startError", "data");
      });
    }
  });
});

server.listen(3000, () => {
  logger.info("Listening on *:3000");
});

process.on("beforeExit", (code) => {
  console.log("jaja");
  serverHandler.stopAllServers(() => {
    process.exit(code);
  });
});
