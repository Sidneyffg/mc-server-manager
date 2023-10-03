import fs from "fs";
import https from "https";
import { spawn } from "child_process";

export default class ServerHandler {
  constructor() {
    try {
      this.serverData = JSON.parse(fs.readFileSync("./data/data.json"));
    } catch (err) {
      throw err;
    }
    console.log(FgGreen, this.serverData);

    this.servers = new Array(this.serverData.servers.length);
    this.servers.fill({
      status: "offline",
      server: null,
      log: "",
    });
  }

  newServer(type, version, build) {
    return new Promise((resolve) => {
      const serverNum = this.serverData.servers.length;

      this.servers.push({
        status: "offline",
        server: null,
        log: "",
      });
      this.setServerStatus(serverNum, "downloading");

      const path = `${process.cwd()}/data/servers/${serverNum}`;
      fs.mkdirSync(path);
      fs.writeFileSync(path + "/eula.txt", "eula=true");
      fs.writeFileSync(
        path + "/start.bat",
        `cd "./data/servers/${serverNum}"\njava -Xmx1024M -Xms1024M -jar server.jar nogui`
      );
      const url = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`;
      https.get(url, (res) => {
        const filePath = fs.createWriteStream(path + "/server.jar");
        res.pipe(filePath);
        filePath.on("finish", async () => {
          filePath.close();
          console.log(FgGreen, "Downloaded server jar");
          await this.startServer(serverNum);
          await this.stopServer(serverNum);
          this.serverData.servers.push({
            type: type,
            version: version,
            creationDate: Date.now(),
          });
          this.#saveServerData();
          resolve();
        });
      });
    });
  }

  startServer(serverNum) {
    return new Promise((resolve, reject) => {
      const currentServer = this.servers[serverNum];
      if (currentServer.server) {
        console.log(FgGreen, "Server already running...");
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

        console.log(Reset, data);
        if (data.includes("Closing Server")) {
          this.setServerStatus(serverNum, "offline");
          currentServer.server = null;
        }
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
    this.emit("_statusUpdate" + serverNum,newStatus)
    console.log(FgGreen, `Server ${serverNum} is ` + newStatus);
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
      if (event.startsWith(e.prefix)) e.socket?.emit(event.replace(e.prefix, ""), data);
    });
  }

  pipe(socket, prefix = "") {
    this.pipers.push({
      socket,
      prefix,
    });
  }
}

const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";
const FgGray = "\x1b[90m";

const BgBlack = "\x1b[40m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgYellow = "\x1b[43m";
const BgBlue = "\x1b[44m";
const BgMagenta = "\x1b[45m";
const BgCyan = "\x1b[46m";
const BgWhite = "\x1b[47m";
const BgGray = "\x1b[100m";
