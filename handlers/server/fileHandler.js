import Logger from "../consoleHandler.js";
import fs from "fs";

export default class FileHandler {
  constructor(server) {
    this.#logger = new Logger([
      "serverHandler",
      `server ${server.serverNum}`,
      "fileHandler",
    ]);
    this.#server = server;
  }

  #getFile(fileName) {
    return files.find((e) => e.file == fileName);
  }
  #getPath(file) {
    return this.#server.path + file.path;
  }

  readFile(fileName) {
    const file = this.#getFile(fileName);
    const path = this.#getPath(file);
    this.#checkFile(file);
    let data = fs.readFileSync(path, "utf-8");
    if (file.isJSON) data = JSON.parse(data);
    return data;
  }

  writeFile(fileName, data) {
    return new Promise((resolve) => {
      const file = this.#getFile(fileName);
      const path = this.#getPath(file);
      this.#checkFile(file);
      if (file.isJSON) data = JSON.stringify(data);
      fs.writeFileSync(path, data);
      resolve();
    });
  }

  async watchFile(fileName, callback, interval = 5000) {
    const file = this.#getFile(fileName);
    const path = this.#getPath(file);

    this.#checkFile(file);

    fs.watchFile(path, { interval }, callback);
  }

  async unwatchFiles(...args) {
    args.forEach((fileName) => {
      const file = this.#getFile(fileName);
      const path = this.#getPath(file);
      fs.unwatchFile(path);
    });
  }

  #checkFile(file) {
    const path = this.#getPath(file);
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, file.fillFileWith);
      this.#logger.info(
        `Created ${file.path} and filled it with ${file.fillFileWith}`
      );
      return false;
    }
    return true;
  }

  #logger;
  #server;
}

const files = [
  {
    file: "usercache",
    path: "/usercache.json",
    fillFileWith: "[]",
    isJSON: true,
  },
  {
    file: "whitelist",
    path: "/whitelist.json",
    fillFileWith: "[]",
    isJSON: true,
  },
  {
    file: "ops",
    path: "/ops.json",
    fillFileWith: "[]",
    isJSON: true,
  },
  {
    file: "properties",
    path: "/server.properties",
    fillFileWith: "",
    isJSON: false,
  },
];
