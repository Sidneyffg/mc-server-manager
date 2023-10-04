import fs from "fs";
import https from "https";
import { spawn } from "child_process";
import log from "./consoleHandler.js";

import UsageHandler from "./usageHandler.js";
const usageHandler = new UsageHandler();

export default class ServerHandler {
  constructor() {
    try {
      this.serverData = JSON.parse(fs.readFileSync("./data/data.json"));
    } catch (err) {
      throw err;
    }
    log("serverHandler", "INFO", {
      text: "Loaded server data.",
    });

    this.servers = new Array(this.serverData.servers.length);
    this.servers.fill({
      status: "offline",
      server: null,
      log: "",
    });
    setInterval(async () => {
      this.emit("_usageUpdate", {
        cpuUsage: await usageHandler.getCpu(),
        memUsage: await usageHandler.getMemory(),
      });
    }, 1000);
  }

  newServer(data) {
    this.serverData.servers.push({
      ...data,
      creationDate: Date.now(),
    });
    this.#saveServerData();

    this.servers.push({
      status: "offline",
      server: null,
      log: "",
    });
    return new Promise((resolve) => {
      const serverNum = this.serverData.servers.length - 1;

      this.setServerStatus(serverNum, "downloading");

      const path = `${process.cwd()}/data/servers/${serverNum}`;
      fs.mkdirSync(path);

      let propertiesData = `motd=${data.name}\nquery.port=${data.port}\ndifficulty=${data.difficulty}\nserver-port=${data.port}`;
      if (data.seed != "") {
        propertiesData += "\nlevel-seed=" + data.seed;
      }
      if (data.gamemode == "hardcore") {
        propertiesData += "\ngamemode=survival\nhardcore=true";
      } else {
        propertiesData += "\ngamemode=" + data.gamemode;
      }
      //fs.writeFileSync(path + "/server.properties", propertiesData);
      fs.writeFileSync(path + "/eula.txt", "eula=true");
      fs.writeFileSync(
        path + "/start.bat",
        `cd "./data/servers/${serverNum}"\njava -Xmx1024M -Xms1024M -jar server.jar nogui`
      );
      const url = `https://api.papermc.io/v2/projects/paper/versions/${data.version}/builds/${data.build}/downloads/paper-${data.version}-${data.build}.jar`;
      https.get(url, (res) => {
        const filePath = fs.createWriteStream(path + "/server.jar");
        res.pipe(filePath);
        filePath.on("finish", async () => {
          filePath.close();
          log("serverHandler", "INFO", {
            text: "Downloaded server jar",
            serverNum,
          });
          try {
            await this.startServer(serverNum);
          } catch {
            log("serverHandler", "ERROR", {
              text: "Failed to create server...",
              serverNum,
            });
            return;
          }
          await this.stopServer(serverNum);
          resolve();
        });
      });
    });
  }

  startServer(serverNum) {
    return new Promise((resolve, reject) => {
      const currentServer = this.servers[serverNum];
      if (currentServer.server) {
        return;
      }

      currentServer.log = "";
      currentServer.server = spawn(
        `${process.cwd()}/data/servers/${serverNum}/start.bat`
      );
      this.setServerStatus(serverNum, "starting");

      currentServer.server.stdout.on("data", (data) => {
        data = data.toString();
        currentServer.log += data;

        this.emit("_consoleUpdate" + serverNum, data);

        log("serverHandler", "INFO", {
          text: data,
          serverNum,
          type: "spawnLog",
        });
        if (data.includes("Timings Reset")) {
          this.setServerStatus(serverNum, "online");
          resolve();
        }
        if (data.includes("UUID of player ")) {
          const dataArr = data.split(" ");
          this.emit(
            "playerConnected",
            {
              name: dataArr[5],
              uuid: dataArr[7],
            },
            serverNum
          );
        }
        if (data.includes(" lost connection: ")) {
          const name = data.split(" ")[2];
          this.emit("playerDisconnected", { name }, serverNum);
        }
      });
      currentServer.server.on("close", (code) => {
        if (this.servers[serverNum].status != "online") reject();
        this.setServerStatus(serverNum, "offline");
        currentServer.server = null;
      });
      currentServer.server.stderr.on("data", (data) => {
        data = data.toString();
        log("serverHandler", "ERROR", {
          text: data,
          serverNum,
        });
        this.emit("_consoleUpdate" + serverNum, data);
      });
    });
  }
  async stopServer(serverNum) {
    const currentServer = this.servers[serverNum];
    this.setServerStatus(serverNum, "stopping");
    currentServer.server.stdin.write("stop\n");
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (currentServer.status == "offline") return;
    }
  }
  setServerStatus(serverNum, newStatus) {
    const currentServer = this.servers[serverNum];
    if (currentServer.status == "downloading" && newStatus != "offline") return;

    currentServer.status = newStatus;
    this.emit("_statusUpdate" + serverNum, newStatus);
    log("serverHandler", "INFO", {
      text: "Server is " + newStatus,
      serverNum,
    });
  }

  async #saveServerData() {
    fs.writeFileSync(
      "./data/data.json",
      JSON.stringify(this.serverData, null, 2),
      (err) => {
        if (err) throw err;
      }
    );
  }

  listeners = [];
  pipers = [];

  /**
   * @param {string} event format `eventName0`
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data, serverNum) {
    this.listeners.forEach((e) => {
      if (e.event == event.replace()) {
        e.callback(data, serverNum);
      }
    });
    this.pipers.forEach((e) => {
      if (event.startsWith(e.prefix))
        e.socket?.emit(event.replace(e.prefix, ""), data);
    });
  }

  pipe(socket, prefix = "") {
    this.pipers.push({
      socket,
      prefix,
    });
  }
}
