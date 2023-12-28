import fs from "fs";
import { spawn } from "child_process";
import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";
import FileHandler from "./server/fileHandler.js";
import SettingsHandler from "./server/settingsHandler.js";
import PlayerHandler from "./server/playerHandler.js";
import EventHandler from "./server/eventHandler.js";
import BackupHandler from "./server/backupHandler.js";
import ShutdownHandler from "./server/shutdownHandler.js";
import { getServerDirSize } from "./usageHandler.js";
import javaHandler from "./javaHandler.js";
import portHandler from "./portHandler.js";

export default class Server {
  constructor(data, status = "offline") {
    this.data = data;
    this.serverNum = this.data.num;
    this.#logger = new Logger(["serverHandler", `server ${this.serverNum}`]);
    this.#logger.info(`Initializing...`);

    this.dirPath = `${process.cwd()}/data/servers/${this.data.id}`;
    this.path = `${this.dirPath}/server`;
    this.status = status;

    portHandler.bind(this.data.port, this.data.id);

    this.#checkServer();
    this.#initHandlers();
  }

  #checkServer() {
    if (!fs.existsSync(this.dirPath))
      this.#logger.exitWithError("Failed to find server dir");
  }

  #initHandlers() {
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

  resolveStart = () => null;

  async start() {
    const res = await new Promise((resolve) => {
      this.resolveStart = (started) => resolve(started);
      if (this.server) {
        this.#logger.error("Tried to start already online server...");
        return resolve(false);
      }

      this.consoleLog = "";
      const javaVersion = javaHandler.versionChecker.check(
        this.data.version,
        "paper"
      );
      const javaPath = javaHandler.versions.find(
        (e) => e.version == javaVersion
      ).path;

      this.server = spawn(
        `"${process.cwd()}/data/startServer.bat"`,
        [this.data.id, `"${javaPath}"`],
        { shell: true }
      );

      this.setServerStatus("starting");
      portHandler.activate(this.data.id);

      this.server.stdout.on("data", (data) => this.#handleData(data));
      this.server.stderr.on("data", (data) => this.#handleData(data));
      this.server.on("close", () => {
        if (this.status == "downloading") resolve(false);
        this.setServerStatus("offline");
        portHandler.deactivate(this.data.id);
        this.server = null;
        clearInterval(this.dirSizeIntervalId);
      });

      this.dirSizeIntervalId = setInterval(() => this.updateDirSize(), 6e5); // every 10 minutes
    });
    this.resolveStart = () => null;
    return res;
  }

  #handleData(data) {
    if (!data) return;
    data = data.toString().trim().replaceAll("\r", "").split("\n");
    data.forEach((e) => {
      e = e.trim();
      this.eventHandler.handle(e);
      this.consoleLog += e + "\n";
    });
  }

  async updateDirSize() {
    const dirSize = await getServerDirSize(this.data.id);
    this.data.dirSize = dirSize;
    listener.emit("_serverDirSizeUpdate" + this.serverNum, dirSize);
    this.#logger.info("Updated server dir size");
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
    if (!["online", "downloading"].includes(this.status)) {
      this.#logger.error(
        "Tried to write in server console while server wasn't online..."
      );
      return;
    }
    this.server.stdin.write(msg + "\n");
  }

  deleteFiles() {
    return new Promise((resolve, reject) => {
      fs.rm(this.dirPath, { recursive: true }, (err) => {
        if (err) {
          this.#logger.error("Failed to delete server files:\n" + err);
          return reject();
        }
        resolve();
      });
    });
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
