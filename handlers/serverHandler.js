import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";
import * as listener from "./listener.js";
import javaHandler from "./javaHandler.js";
const logger = new Logger(["serverHandler"]);
const servers = [];
let serverData;
export let totalServers;
export let ip;
export async function init() {
  logger.info("Initializing...");
  initServerData();

  ip = await getIp();
  logger.info("Server ip: " + ip);

  const path = `${process.cwd()}/data`;

  if (!fs.existsSync(path + "/servers")) {
    fs.mkdirSync(path + "/servers");
    logger.info("Created server folder");
  }
  if (!fs.existsSync(path + "/backups")) {
    fs.mkdirSync(path + "/backups");
    logger.info("Created backup folder");
  }

  totalServers = serverData.length;
  for (let i = 0; i < serverData.length; i++) {
    servers.push(new Server(i, serverData[i]));
    saveOnExit(servers[i]);
  }

  setTimeout(() => saveServerData(), 6e5); //every ten minutes
  logger.info("Initialized successfully");
}

function initServerData() {
  if (fs.existsSync("./data/serverData.json")) {
    try {
      serverData = JSON.parse(fs.readFileSync("./data/serverData.json"));
    } catch (err) {
      logger.error("Failed to load serverData...");
      logger.error(`-> ${err}`);
      process.exit(1);
    }
    logger.info("Successfully loaded serverData");
  } else {
    fs.writeFileSync("./data/serverData.json", "[]");
    serverData = [];
    logger.info(`Created serverData.json and filled it with []`);
  }
}

export function get(serverNum) {
  return servers[serverNum];
}

export function newServer(data, callbackOnFirstStart = null) {
  return new Promise(async (resolve) => {
    const javaVersion = javaHandler.versionChecker.check(
      data.versionData.version,
      data.versionData.type
    );
    if (!javaHandler.versions.find((e) => e.version == javaVersion)) {
      await javaHandler.downloader.download(javaVersion);
    }

    serverData.push({
      name: data.name,
      versionData: data.versionData,
      creationDate: Date.now(),
      dirSize: 0,
    });

    totalServers++;

    const serverNum = serverData.length - 1;

    const path = `${process.cwd()}/data/servers/${serverNum}`;
    fs.mkdirSync(path);

    servers.push(new Server(serverNum, serverData[serverNum], "downloading"));
    const currentServer = servers[serverNum];

    if (callbackOnFirstStart) callbackOnFirstStart();

    writeServerProperties(currentServer);
    fs.writeFileSync(path + "/eula.txt", "eula=true");
    const url = data.versionData.url;
    https.get(url, (res) => {
      const filePath = fs.createWriteStream(path + "/server.jar");
      res.pipe(filePath);
      filePath.on("finish", async () => {
        filePath.close();
        logger.info("Downloaded server jar");
        try {
          await currentServer.start();
        } catch {
          logger.error("Failed to create server...");
          return;
        }

        await currentServer.shutdownHandler.stopServer();
        resolve();

        await currentServer.updateDirSize();
        saveServerData();
        saveOnExit(currentServer);
      });
    });
  });
}

function writeServerProperties(server) {
  let propertiesData = `motd=${server.data.name}\nquery.port=${server.data.versionData.port}\ndifficulty=${server.data.difficulty}\nserver-port=${server.data.versionData.port}\nspawn-protection=0\nview-distance=32\nsimulation-distance=32`;
  if (server.data.seed != "") {
    propertiesData += "\nlevel-seed=" + server.data.seed;
  }
  if (server.data.gamemode == "hardcore") {
    propertiesData += "\ngamemode=survival\nhardcore=true";
  } else {
    propertiesData += "\ngamemode=" + server.data.gamemode;
  }
  const path = `${process.cwd()}/data/servers/${
    server.serverNum
  }/server.properties`;
  fs.writeFileSync(path, propertiesData);
}

function saveOnExit(server) {
  server.on("statusUpdate", (newStatus) => {
    if (newStatus == "offline") saveServerData();
  });
}

listener.on("saveServerData", () => saveServerData());

export async function saveServerData() {
  fs.writeFileSync(
    "./data/serverData.json",
    JSON.stringify(serverData, null, 2),
    (err) => {
      if (err) throw err;
    }
  );
}

function getIp() {
  return new Promise((resolve) => {
    https.get("https://ipv4.icanhazip.com/", (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve(body.trim());
      });
    });
  });
}
