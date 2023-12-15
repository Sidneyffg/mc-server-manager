import { spawn } from "child_process";
import fs from "fs";
import Logger from "./consoleHandler.js";

const javaHandler = {
  async init() {
    await this.javaChecker.init();
  },
  javaChecker: {
    async init() {
      if (!fs.existsSync(this.path)) {
        fs.writeFileSync(this.path, "");
      }
      await this.run();
    },
    run() {
      return new Promise((resolve) => {
        const program = spawn(this.path);
        const paths = [];
        program.stdout.on("data", (data) => {
          data = data.toString().replaceAll("\r", "").trim();
          if (!data.includes("Eclipse Adoptium")) return;
          const version = this.getVersion(data);
          paths.push({ version, path: data });
        });
        program.on("exit", () => {
          this.lastCheck = { timestamp: Date.now(), paths };
          this.saveLastCheck();
          resolve();
        });
      });
    },
    getVersion(path) {
      const version = parseInt(
        path.split(`\\Eclipse Adoptium\\jdk-`)[1].split(".")[0]
      );
      if (isNaN(version)) {
        javaHandler.logger.error(`Failed to find version in path: "${path}"`);
        return -1;
      }
      return version;
    },
    saveLastCheck() {
      fs.writeFileSync(
        javaHandler.path + "/lastCheck.json",
        JSON.stringify(this.lastCheck, null, 2)
      );
    },
    path: `${process.cwd()}/data/javaHandler/javaChecker.bat`,
    lastCheck: null,
  },
  path: `${process.cwd()}/data/javaHandler`,
  logger: new Logger(["javaHandler"]),
};
export default javaHandler;
