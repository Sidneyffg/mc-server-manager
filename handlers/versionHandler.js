import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";

const versionHandler = {
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
            "sortedVersions": {
              "paper": [],
              "vanilla": []
            }
          }`
        );
      }
      this.data = JSON.parse(fs.readFileSync(this.path));
    },
    get() {
      return this.data;
    },
    async save() {
      fs.writeFile(this.path, JSON.stringify(this.data, null, 2), (err) => {
        if (err) throw err;
      });
    },
    path: `${process.cwd()}/data/versionHandler.json`,
    data: null,
  },
  async getServerVersions() {
    await this.getPaperVersions();
    await this.getVanillaVersions();
    this.sortAllVersions();
    this.data.save();
  },
  sortAllVersions() {
    this.data
      .get()
      .allVersions.paper.sort(
        (a, b) =>
          parseFloat(b.version.slice(2)) - parseFloat(a.version.slice(2))
      );
    this.data
      .get()
      .allVersions.vanilla.sort((a, b) => b.timestamp - a.timestamp);
  },
  getVanillaVersions() {
    return new Promise(async (resolve) => {
      const allVersions = this.data.get().allVersions.vanilla;
      const versions = (
        await this.getJsonFromLink(
          "https://launchermeta.mojang.com/mc/game/version_manifest.json"
        )
      ).versions;

      let count = 0;
      versions.forEach(async (e) => {
        if (!allVersions.find((a) => a.version == e.id)) {
          const jsonData = await this.getJsonFromLink(e.url);
          let url = null;
          let timestamp = null;
          if (jsonData.downloads.server) {
            url = jsonData.downloads.server.url;
            timestamp = new Date(jsonData.releaseTime).getTime();
          }
          allVersions.push({ version: e.id, url, type: e.type, timestamp });
        }
        count++;
        if (count != versions.length) return;
        this.logger.info("Loaded vanilla versions");
        resolve();
      });
    });
  },
  getPaperVersions() {
    return new Promise(async (resolve) => {
      const allVersions = this.data.get().allVersions.paper;
      const versions = (
        await this.getJsonFromLink("https://api.papermc.io/v2/projects/paper/")
      ).versions;

      let count = 0;
      versions.forEach(async (version) => {
        const jsonData = await this.getJsonFromLink(
          "https://api.papermc.io/v2/projects/paper/versions/" + version
        );
        const latest_build = jsonData.builds.pop();

        const thisAllVersions = allVersions.find((e) => e.version == version);
        if (!thisAllVersions)
          allVersions.push({
            version,
            latest_build,
            url: `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latest_build}/downloads/paper-${version}-${latest_build}.jar`,
          });
        else if (thisAllVersions.latest_build != latest_build) {
          thisAllVersions.latest_build = latest_build;
          thisAllVersions.url = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latest_build}/downloads/paper-${version}-${latest_build}.jar`;
        }

        count++;

        if (count != versions.length) return;
        this.logger.info("Loaded paper versions");
        resolve();
      });
    });
  },
  getEditableServerSettings(type, version) {
    const editableSettings = [
      "query.port",
      "gamemode",
      "enable-command-block",
      "motd",
      "pvp",
      "difficulty",
      "max-players",
      "allow-flight",
      "server-port",
      "view-distance",
      "allow-nether",
      "simulation-distance",
      "player-idle-timeout",
      "spawn-monsters",
      "spawn-protection",
    ];
    return editableSettings;
  },
  allSettings: {
    "query.port": {
      type: "int",
      min: 0,
      max: 65535,
    },
    "server-port": {
      type: "int",
      min: 0,
      max: 65535,
    },
    gamemode: {
      type: "option",
      options: ["survival", "creative", "hardcore"],
    },
    "enable-command-block": { type: "bool" },
    motd: { type: "string" },
    pvp: { type: "bool" },
    difficulty: {
      type: "option",
      options: ["hard", "normal", "easy", "peaceful"],
    },
    "max-players": { type: "int", min: 1, max: 99999 },
    "allow-flight": { type: "bool" },
    "view-distance": { type: "int", min: 3, max: 32 },
    "allow-nether": { type: "bool" },
    "simulation-distance": { type: "int", min: 3, max: 32 },
    "player-idle-timeout": { type: "int", min: 0, max: 99999 },
    "spawn-monsters": { type: "bool" },
    "spawn-protection": { type: "int", min: 0, max: 2147483647 },
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
versionHandler.data.init();
export default versionHandler;
