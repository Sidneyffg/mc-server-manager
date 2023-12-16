import { spawn } from "child_process";
import fs from "fs";
import Logger from "./consoleHandler.js";

const javaHandler = {
  async init() {
    await this.checker.init();
  },
  checker: {
    async init() {
      if (!fs.existsSync(this.path)) {
        fs.writeFileSync(this.path, "");
      }
      await this.run();
    },
    run() {
      return new Promise((resolve) => {
        const program = spawn(this.path);
        const versions = [];
        program.stdout.on("data", (data) => {
          data = data.toString().replaceAll("\r", "").trim();
          if (
            !data.includes("Eclipse Adoptium") &&
            !data.includes("Eclipse Foundation")
          )
            return;
          const version = this.getVersion(data);
          versions.push({ version, path: data });
        });
        program.on("exit", () => {
          this.lastCheck = { timestamp: Date.now(), versions };
          this.saveLastCheck();
          resolve();
        });
      });
    },
    getVersion(path) {
      const name =
        "Eclipse " +
        (path.includes("Eclipse Adoptium") ? "Adoptium" : "Foundation");
      const version = parseInt(path.split(`\\${name}\\jdk-`)[1].split(".")[0]);
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
  downloader: {
    genLinkForVersion(version) {
      return this.downloadLink.replace("${version}", version);
    },
    downloadLink:
      "https://adoptium.net/en-GB/temurin/releases/?version=${version}&os=windows",
  },
  versionChecker: {
    check(version, type) {
      switch (type) {
        case "vanilla":
          return this.vanilla(version);
        case "paper":
          return this.vanilla(version); //paper has same scheme as vanilla
      }
    },
    vanilla(version) {
      version = this.getBigVersion(version);
      if (version <= 16) return 11;
      else if (version == 17) return 16;
      else return 17;
    },
    getBigVersion(version) {
      return parseInt(version.split(/[.-]+/)[1]);
    },
  },
  getJavaPath(version) {
    const pathObj = this.checker.lastCheck.versions.find(
      (e) => e.version == version
    );
    if (!pathObj) {
      this.logger.error(
        `Requested java version ${version}, but it doesn't exist...`
      );
      return "java";
    }
    return pathObj.path;
  },
  path: `${process.cwd()}/data/javaHandler`,
  logger: new Logger(["javaHandler"]),
};
export default javaHandler;
