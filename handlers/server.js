import { spawn } from "child_process";
import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";
import PlayerHandler from "./playerHandler.js";
import EventHandler from "./eventHandler.js";
import { updateServerDirSize } from "./usageHandler.js";

export default class Server {
  constructor(serverNum, data) {
    this.serverNum = serverNum;
    this.data = data;
    this.path = process.cwd() + "/data/servers/" + serverNum;
    this.#logger = new Logger(["serverHandler", `server ${serverNum}`]);
    this.playerHandler = new PlayerHandler(this);
    this.eventHandler = new EventHandler(this);
  }

  #logger;
  status = "offline";
  consoleLog = "";
  server = null;
  path;
  dirSizeIntervalId;

  start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return;
      }

      this.consoleLog = "";
      this.server = spawn(
        `${process.cwd()}/data/servers/${this.serverNum}/start.bat`
      );
      this.setServerStatus("starting");
      
      this.server.stdout.on("data", (data) => {
        data = data.toString();
        this.eventHandler.handle(data, resolve);
        this.consoleLog += data;
      });
      this.server.on("close", (code) => {
        if (this.status != "online") reject();
        this.setServerStatus("offline");
        this.server = null;
        clearInterval(this.dirSizeIntervalId);
      });
      this.server.stderr.on("data", (data) => {
        data = data.toString();
        this.eventHandler.handleErr(data);
        this.consoleLog += data;
      });

      this.dirSizeIntervalId = setInterval(async () => {
        await updateServerDirSize(this.serverNum);
        this.#logger.info("Updated server dir size");
      }, 600000);
    });
  }
  async stop() {
    this.setServerStatus("stopping");
    this.server.stdin.write("stop\n");
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (this.status == "offline") return;
    }
  }
  setServerStatus(newStatus) {
    if (this.status == "downloading" && newStatus != "offline") return;

    this.status = newStatus;
    listener.emit("_statusUpdate" + this.serverNum, newStatus);
    this.emit("statusUpdate", newStatus);
    this.#logger.info("Server status is " + newStatus);
  }

  #listeners = [];
  on(event, callback) {
    this.#listeners.push({ event, callback });
  }

  emit(event, data, serverNum) {
    this.#listeners.forEach((e) => {
      if (e.event == event.replace()) {
        e.callback(data, serverNum);
      }
    });
  }
}
