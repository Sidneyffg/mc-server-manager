import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";

const versionHandler = {
  async init() {
    this.data.init();
    this.vanilla.init();
    this.paper.init();
    await this.getServerVersions();
    this.logger.info("Initialized");
  },
  getVersionData(type, version) {
    return this.data.versions[type].find((e) => e.version == version);
  },
  data: {
    init() {
      if (!fs.existsSync(this.path)) {
        fs.writeFileSync(
          this.path,
          `{
            "allVersions": {
              "lastChecked": 0,
              "paper": [],
              "vanilla": []
            },
            "versions": {
              "paper": [],
              "vanilla": []
            }
          }`
        );
      }
      this.data = JSON.parse(fs.readFileSync(this.path));
      this.allVersions = this.data.allVersions;
      this.versions = this.data.versions;
    },
    async save() {
      fs.writeFile(this.path, JSON.stringify(this.data, null, 2), (err) => {
        if (err) throw err;
      });
    },
    path: `${process.cwd()}/data/versionHandler.json`,
    data: null,
    versions: null,
    allVersions: null,
  },
  async getServerVersions() {
    await this.paper.getAllVersions();
    await this.vanilla.getAllVersions();
    this.data.save();
  },
  vanilla: {
    init() {
      this.allVersions = versionHandler.data.allVersions.vanilla;
      this.versions = versionHandler.data.versions.vanilla;
    },
    getAllVersions() {
      return new Promise(async (resolve) => {
        const versions = (
          await versionHandler.getJsonFromLink(
            "https://launchermeta.mojang.com/mc/game/version_manifest.json"
          )
        ).versions;

        let madeChange = false;
        let count = 0;
        versions.forEach(async (e) => {
          if (!this.allVersions.find((a) => a.version == e.id)) {
            const jsonData = await versionHandler.getJsonFromLink(e.url);
            let url = jsonData.downloads.server?.url ?? null;
            let timestamp = new Date(jsonData.releaseTime).getTime();
            this.allVersions.push({
              version: e.id,
              url,
              type: e.type,
              timestamp,
            });
            madeChange = true;
          }
          count++;
          if (count != versions.length) return;
          if (madeChange) {
            this.sort();
            this.genVersions();
          }
          versionHandler.logger.info("Loaded vanilla versions");
          resolve();
        });
      });
    },
    sort() {
      this.allVersions.sort((a, b) => b.timestamp - a.timestamp);
    },
    genVersions() {
      this.versions.length = 0;
      let reachedRelease = false;
      this.allVersions.forEach((versionData) => {
        if (!versionData.url) return;
        if (reachedRelease && versionData.type != "release") return;
        this.versions.push(versionData);
        if (versionData.type == "release") reachedRelease = true;
      });
    },
    allVersions: null,
    versions: null,
  },
  paper: {
    init() {
      this.allVersions = versionHandler.data.allVersions.paper;
      this.versions = versionHandler.data.versions.paper;
    },
    getAllVersions() {
      return new Promise(async (resolve) => {
        const versions = (
          await versionHandler.getJsonFromLink(
            "https://api.papermc.io/v2/projects/paper/"
          )
        ).versions;

        let madeChange = false;
        let count = 0;
        versions.forEach(async (version) => {
          const jsonData = await versionHandler.getJsonFromLink(
            "https://api.papermc.io/v2/projects/paper/versions/" + version
          );
          const build = jsonData.builds.pop();

          const thisAllVersions = this.allVersions.find(
            (e) => e.version == version
          );
          if (!thisAllVersions) {
            this.allVersions.push({
              version,
              build,
              url: `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`,
            });
            madeChange = true;
          } else if (thisAllVersions.build != build) {
            thisAllVersions.build = build;
            thisAllVersions.url = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`;
            madeChange = true;
          }

          count++;

          if (count != versions.length) return;
          if (madeChange) {
            this.sort();
            this.genVersions();
          }
          versionHandler.logger.info("Loaded paper versions");
          resolve();
        });
      });
    },
    sort() {
      this.allVersions.sort((a, b) => {
        const vA = a.version.split(/[.-]+/);
        const vB = b.version.split(/[.-]+/);
        let vANum = parseInt(vA[1]);
        if (vA.length == 3) {
          let vANums = vA[2].replace(/\D/g, "");
          if (vA[2].includes("pre")) vANum -= parseInt(vANums) / 100;
          else vANum += parseInt(vANums) / 10;
        }
        let vBNum = parseInt(vB[1]);
        if (vB.length == 3) {
          let vBNums = vB[2].replace(/\D/g, "");
          if (vB[2].includes("pre")) vBNum -= parseInt(vBNums) / 100;
          else vBNum += parseInt(vBNums) / 10;
        }
        return vBNum - vANum;
      });
    },
    genVersions() {
      this.versions.length = 0;
      this.allVersions.forEach((e) => {
        this.versions.push(e);
      });
    },

    allVersions: null,
    versions: null,
  },
  getJsonFromLink(link) {
    return new Promise(async (resolve, reject) => {
      https.get(link, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            let json = JSON.parse(body);
            resolve(json);
          } catch (err) {
            reject(err.message);
          }
        });
      });
    });
  },
  logger: new Logger(["versionHandler"]),
};

export default versionHandler;
