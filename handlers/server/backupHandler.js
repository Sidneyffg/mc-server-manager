import Logger from "../consoleHandler.js";
import fs from "fs";
import { v4 as uuidV4 } from "uuid";
import * as listener from "../listener.js";

export default class BackupHandler {
  constructor(server) {
    this.#server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "backupHandler",
    ]);

    this.data = this.#server.data.backupHandler;
    if (!this.data) {
      this.#server.data.backupHandler = {
        backups: [],
        timeSinceLastAutomaticBackup: 0,
        timeBetweenAutomaticBackups: -1,
        deleteAutomaticBackupAfter: -1,
      };
      this.data = this.#server.data.backupHandler;
    }
    this.path = `${this.#server.dirPath}/backups`;
    this.#checkBackupFolder();

    this.#server.on("statusUpdate", (newStatus) => {
      if (this.data.timeBetweenAutomaticBackups == -1) return;
      switch (newStatus) {
        case "online":
          this.#startTimeout();
          break;
        case "stopping":
          if (this.#timeoutReached || !this.#backupTimeoutId) break;
          this.#stopTimeout();
          this.data.timeSinceLastAutomaticBackup +=
            Date.now() - this.#serverOnlineTimestamp;
          break;
      }
    });
  }

  updateAutomaticBackupSettings(data) {
    this.#stopTimeout();
    this.data.timeSinceLastAutomaticBackup = 0;
    if (!data.automaticBackup) {
      this.data.timeBetweenAutomaticBackups = -1;
      this.data.deleteAutomaticBackupAfter = -1;
    } else {
      this.data.timeBetweenAutomaticBackups = data.backupTime * 36e5; //hours to millis
      if (data.deleteBackupTime == "") {
        this.data.deleteAutomaticBackupAfter = -1;
      } else {
        this.data.deleteAutomaticBackupAfter = data.deleteBackupTime * 36e5;
      }
      if (this.#server.status == "online") this.#startTimeout();
    }
    listener.emit("_automaticBackupSettingsUpdate" + this.#server.serverNum, {
      timeBetweenAutomaticBackups: this.data.timeBetweenAutomaticBackups,
      deleteAutomaticBackupAfter: this.data.deleteAutomaticBackupAfter,
    });
    this.#server.saveData();
  }

  #backupTimeoutId = null;
  #timeoutReached = false;
  #startTimeout() {
    this.#timeoutReached = false;
    this.#serverOnlineTimestamp = Date.now();

    const timeToNextBackup =
      this.data.timeBetweenAutomaticBackups -
      this.data.timeSinceLastAutomaticBackup;

    this.#backupTimeoutId = setTimeout(() => {
      this.#timeoutReached = true;
      this.#server.shutdownHandler.stopServerIn(
        async (timeTooEarly) => {
          this.#timeoutReached = false;
          this.data.timeSinceLastAutomaticBackup = 0 - timeTooEarly;
          await this.createBackup();
        },
        1e4,
        true
      ); //10 mins in millis
    }, timeToNextBackup - 6e5); // timeout 10 mins before actual backup
  }

  #stopTimeout() {
    if (!this.#backupTimeoutId) return;
    clearTimeout(this.#backupTimeoutId);
    this.#backupTimeoutId = null;
  }

  async createBackup() {
    const id = uuidV4();
    const timestamp = Date.now();
    this.#logger.info(`Creating backup with id "${id}"`);
    this.data.backups.unshift({
      id,
      timestamp,
    });
    listener.emit("backupUpdate" + this.#server.serverNum, this.data.backups);
    const backupPath = `${this.path}/${id}`;
    fs.mkdirSync(backupPath);

    await this.#copyBackupFolder(`${this.#server.path}`, `${backupPath}`);

    const time = Date.now() - timestamp;
    this.#logger.info(`Finished backup (${time} ms)`);
    listener.emit("_backupUpdate" + this.#server.serverNum, this.data.backups);
    this.#server.saveData();
  }

  async deleteBackup(id) {
    const backup = this.data.backups.find((e) => e.id == id);
    if (!backup) {
      this.#logger.error(`Tried to delete nonexistent backup "${id}"`);
      return;
    }
    const backupIdx = this.data.backups.indexOf(backup);
    const path = `${this.path}/${id}`;
    if (!fs.existsSync(path)) {
      this.#logger.error(`Backup files not found (${id})`);
      this.data.backups.splice(backupIdx, 1);
      return;
    }

    this.#logger.info(`Deleting backup with id "${id}"`);
    fs.rm(path, { recursive: true }, (err) => {
      if (err) {
        this.#logger.error("Failed to delete backup");
        this.#logger.error("-> " + err);
      }
    });
    this.data.backups.splice(backupIdx, 1);
    listener.emit("_backupUpdate" + this.#server.serverNum, this.data.backups);
    this.#server.saveData();
  }

  async restoreBackup(id) {
    if (this.#server.status !== "offline")
      return this.#logger.error(
        "Tried to restore backup while server isn't offline..."
      );
    this.#server.setServerStatus("updating");

    this.emptyServerFolder();

    const backupPath = `${this.path}/${id}`;
    this.#copyBackupFolder(backupPath, this.#server.path);

    this.#server.setServerStatus("offline");
  }

  emptyServerFolder() {
    const filenames = fs.readdirSync(this.#server.path);
    filenames.forEach((filename) => {
      const path = `${this.#server.path}/${filename}`;
      fs.rmSync(path, { force: true, recursive: true });
    });
  }

  #copyBackupFolder(src, dest) {
    return new Promise((resolve, reject) => {
      fs.cp(src, dest, { recursive: true }, (err) => {
        if (err) {
          this.#logger.error(err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  #checkBackupFolder() {
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path);
    }
  }

  #serverOnlineTimestamp;
  #logger;
  /**
   * @type {import("../server.js").default}
   */
  #server;
}
