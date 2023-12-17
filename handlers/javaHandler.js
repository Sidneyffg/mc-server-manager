import fs from "fs";
import Logger from "./consoleHandler.js";
import AdmZip from "adm-zip";
import followRedirects from "follow-redirects";
const https = followRedirects.https;

const javaHandler = {
  init() {
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path);
      fs.mkdirSync(this.path + "/versions");
      fs.mkdirSync(this.path + "/versions/temp");
      fs.writeFileSync(this.path + "/versions/javaVersions.json", "[]");
    }
    this.versions = JSON.parse(
      fs.readFileSync(this.path + "/versions/javaVersions.json")
    );
    console.log(JSON.stringify(this.versions));
    this.logger.info("Initialized");
  },

  downloader: {
    download(version) {
      return new Promise(async (resolve, reject) => {
        if (!this.downloadLinks.find((e) => e.version == version)) {
          reject("Requested java download with nonexisting url...");
          return;
        }
        const url = this.downloadLinks.find((e) => e.version == version).url;
        const zipPath = `${this.path}/temp/java${version}.zip`;
        await this.downloadZip(url, zipPath);
        await this.unzip(zipPath, this.path, version);
        this.deleteZip(zipPath);
        resolve();
      });
    },
    downloadZip(url, path) {
      return new Promise((resolve) => {
        https.get(url, (res) => {
          const filePath = fs.createWriteStream(path);
          res.pipe(filePath);
          filePath.on("finish", () => {
            filePath.close();
            javaHandler.logger.info("Downloaded java.zip");
            resolve();
          });
        });
      });
    },
    unzip(path, dest, version) {
      return new Promise((resolve) => {
        const zip = new AdmZip(path);
        const fileName = zip.getEntries()[0].entryName.replace("/", "");
        javaHandler.versions.push({
          fileName,
          version,
          timestamp: Date.now(),
        });
        javaHandler.saveVersions();
        zip.extractAllTo(dest);
        javaHandler.logger.info("Extracted java.zip");
        resolve();
      });
    },
    deleteZip(path) {
      fs.unlink(path, (err) => {
        if (err) javaHandler.logger.error("Failed to delete java.zip");
        else javaHandler.logger.info("Deleted java.zip");
      });
    },
    delete(version) {
      const obj = javaHandler.versions.find((e) => e.version == version);
      if (!obj) {
        javaHandler.logger.error(
          `Tried to delete nonexisting Java version (${version})`
        );
        return;
      }
      const path = `${this.path}/${obj.fileName}`;
      if (!fs.existsSync(path)) {
        javaHandler.logger.error(`Files not found for Java ${version}...`);
        return;
      }
      fs.rm(path, { recursive: true }, (err) => {
        if (err)
          javaHandler.logger.error(`Failed to remove Java ${version}...`);
        else javaHandler.logger.info(`Deleted Java ${version}`);
      });
      javaHandler.versions.splice(javaHandler.versions.indexOf(obj), 1);
      javaHandler.saveVersions();
    },
    downloadLinks: [
      {
        version: 11,
        url: "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jre_x64_windows_hotspot_11.0.21_9.zip",
      },
      {
        version: 16,
        url: "https://github.com/adoptium/temurin16-binaries/releases/download/jdk-16.0.2%2B7/OpenJDK16U-jdk_x64_windows_hotspot_16.0.2_7.zip",
      },
      {
        version: 17,
        url: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9.1/OpenJDK17U-jre_x64_windows_hotspot_17.0.9_9.zip",
      },
    ],
    path: `${process.cwd()}/data/javaHandler/versions`,
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
  saveVersions() {
    fs.writeFile(
      this.path + "/versions/javaVersions.json",
      JSON.stringify(this.versions, null, 2),
      (err) => {
        if (err) throw err;
      }
    );
  },
  versions: null,
  path: `${process.cwd()}/data/javaHandler`,
  logger: new Logger(["javaHandler"]),
};
export default javaHandler;
