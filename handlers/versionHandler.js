import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
const logger = new Logger(["versionHandler"]);

const dataPath = `${process.cwd()}/data/versionHandler.json`;
export let data;

async function saveData() {
  fs.writeFile(dataPath, JSON.stringify(data, null, 2), (err) => {
    if (err) throw err;
  });
}

(() => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(
      dataPath,
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
  data = JSON.parse(fs.readFileSync(dataPath));
})();

export function getEditableServerSettings(type, version) {
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
}

export const allSettings = {
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
};

export async function getServerVersions() {
  await getPaperVersions();
  await getVanillaVersions();
  sortAllVersions();
  saveData();
}

function sortAllVersions() {
  data.allVersions.paper.sort(
    (a, b) => parseFloat(b.version.slice(2)) - parseFloat(a.version.slice(2))
  );
  data.allVersions.vanilla.sort((a, b) => b.timestamp - a.timestamp);
}


function getVanillaVersions() {
  return new Promise(async (resolve) => {
    const allVersions = data.allVersions.vanilla;
    const versions = (
      await getJsonFromLink(
        "https://launchermeta.mojang.com/mc/game/version_manifest.json"
      )
    ).versions;

    let count = 0;
    versions.forEach(async (e) => {
      if (!allVersions.find((a) => a.version == e.id)) {
        const jsonData = await getJsonFromLink(e.url);
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
      logger.info("Loaded vanilla versions");
      resolve();
    });
  });
}

function getPaperVersions() {
  return new Promise(async (resolve) => {
    const allVersions = data.allVersions.paper;
    const versions = (
      await getJsonFromLink("https://api.papermc.io/v2/projects/paper/")
    ).versions;

    let count = 0;
    versions.forEach(async (version) => {
      const jsonData = await getJsonFromLink(
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
        logger.error("updated build");
        thisAllVersions.latest_build = latest_build;
        thisAllVersions.url = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latest_build}/downloads/paper-${version}-${latest_build}.jar`;
      }

      count++;

      if (count != versions.length) return;
      logger.info("Loaded paper versions");
      resolve();
    });
  });
}

async function getJsonFromLink(link) {
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
}
