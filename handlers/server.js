import { spawn } from "child_process";
import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";
import FileHandler from "./server/fileHandler.js";
import SettingsHandler from "./server/settingsHandler.js";
import PlayerHandler from "./server/playerHandler.js";
import EventHandler from "./server/eventHandler.js";
import BackupHandler from "./server/backupHandler.js";
import ShutdownHandler from "./server/shutdownHandler.js";
import { updateServerDirSize } from "./usageHandler.js";

export default class Server {
  constructor(serverNum, data, status = "offline") {
    this.serverNum = serverNum;
    this.data = data;
    this.path = process.cwd() + "/data/servers/" + serverNum;
    this.status = status;
    this.#logger = new Logger(["serverHandler", `server ${serverNum}`]);
    this.fileHandler = new FileHandler(this);
    this.playerHandler = new PlayerHandler(this);
    this.eventHandler = new EventHandler(this);
    this.settingsHandler = new SettingsHandler(this);
    this.backupHandler = new BackupHandler(this);
    this.shutdownHandler = new ShutdownHandler(this);
    if (this.status !== "downloading") this.settingsHandler.init();
  }

  #logger;
  status;
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

  setServerStatus(newStatus) {
    if (this.status == "downloading") {
      if (newStatus == "offline") {
        this.settingsHandler.init();
      } else return;
    }

    this.status = newStatus;
    listener.emit("_statusUpdate" + this.serverNum, newStatus);
    this.emit("statusUpdate", newStatus);
    this.#logger.info("Server status is " + newStatus);
  }

  write(msg) {
    if (this.status !== "online") {
      this.#logger.error(
        "Tried to write in server console while server wasn't online..."
      );
      return;
    }
    this.server.stdin.write(msg + "\n");
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
