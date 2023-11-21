import Logger from "../consoleHandler.js";
import fs from "fs";

export default class BackupHandler {
  constructor(server) {
    this.#server = server;
    this.#logger = new Logger([
      "serverManager",
      "server " + server.serverNum,
      "eventHandler",
    ]);

    this.data = server.data.backupHandler;
    if (!this.data) {
      this.#server.data.backupHandler = {
        backups: [],
      };
      this.data = server.data.backupHandler;
    }
    this.path = `${process.cwd()}/data/backups/${this.#server.serverNum}`;
    this.#checkBackupFolder();
  }

  async createBackup() {
    const time = Date.now();
    const backupPath = `${this.path}/${time}`;
    fs.mkdirSync(backupPath);

    await this.#copyBackupFolder(
      `${this.#server.path}/world`,
      `${backupPath}/world`
    );
    await this.#copyBackupFolder(
      `${this.#server.path}/world_nether`,
      `${backupPath}/world_nether`
    );
    await this.#copyBackupFolder(
      `${this.#server.path}/world_the_end`,
      `${backupPath}/world_the_end`
    );
  }

  #copyBackupFolder(src, dest) {
    return new Promise((resolve, reject) => {
      fs.cp(src, dest, { recursive: true }, (err) => {
        if (err) {
          console.log(err);
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

  #logger;
  #server;
}
