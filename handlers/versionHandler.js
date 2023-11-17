import https from "https";
import Logger from "./consoleHandler.js";
const logger = new Logger(["versionHandler"]);

export const allVersions = {
  paper: [],
};

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
  const paperVersions = (
    await getJsonFromLink("https://api.papermc.io/v2/projects/paper/")
  ).versions;
  await getServerBuilds(paperVersions);
  allVersions.paper.sort(
    (a, b) => parseFloat(b.version.slice(2)) - parseFloat(a.version.slice(2))
  );
}

function getServerBuilds(versions) {
  let count = 0;
  return new Promise((resolve) => {
    versions.forEach(async (version) => {
      const latest_build = (
        await getJsonFromLink(
          "https://api.papermc.io/v2/projects/paper/versions/" + version
        )
      ).builds.pop();
      if (version != "1.13-pre7") {
        allVersions.paper.push({
          version: version,
          latest_build: latest_build,
        });
      }
      count++;

      if (count == versions.length) {
        logger.info("Loaded paper versions");
        resolve();
      }
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
