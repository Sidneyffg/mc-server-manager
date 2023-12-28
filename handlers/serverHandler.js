import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";
import * as listener from "./listener.js";
import javaHandler from "./javaHandler.js";
import versionHandler from "./versionHandler.js";
import { v4 as uuidV4 } from "uuid";
import { getServerDirSize } from "./usageHandler.js";
const logger = new Logger(["serverHandler"]);
export const servers = [];
let serverData;
export let ip;
export function totalServers() {
  return servers.length;
}

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

  for (let i = 0; i < serverData.length; i++) {
    const server = new Server(serverData[i]);
    servers.push(server);
    saveOnExit(server);
  }
  logger.info("Initialized all servers");

  await versionHandler.init();
  javaHandler.init();

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

/**
 *
 * @param {string|number} num
 * @returns
 */
function strictParseInt(num) {
  if (typeof num != "string") num = num.toString();
  if (num !== parseInt(num).toString()) return NaN;
  return parseInt(num);
}

/**
 * Gets server based on id or num
 * @param {number|string} serverData
 * @returns {Server}
 */
export function get(serverData) {
  if (strictParseInt(serverData) != NaN)
    return servers.find((e) => e.data.num == serverData);
  return servers.find((e) => e.data.id == serverData);
}

/**
 * Creates a new Minecraft server.
 * @param {serverHandler.data} data
 * @param {() => Server} callbackOnFirstStart
 * @returns {Promise<Server>}
 */

export function newServer(data, callbackOnFirstStart = null) {
  return new Promise(async (resolve) => {
    data.id = uuidV4();
    let path = `${process.cwd()}/data/servers/${data.id}`;
    fs.mkdirSync(path);
    path += "/server";
    fs.mkdirSync(path);
    const currentServer = addServerObject(data);

    if (callbackOnFirstStart) callbackOnFirstStart(currentServer);

    const javaVersion = javaHandler.getVersion(data.type, data.version);
    await javaHandler.downloadIfMissing(javaVersion);

    writeServerProperties(data, path);
    const url = versionHandler.getVersionData(data.type, data.version).url;
    await downloadServerJar(path, url);
    fs.writeFileSync(path + "/eula.txt", "eula=true");

    const serverStarted = await currentServer.start();
    if (!serverStarted) {
      logger.error("Failed to create server...");
      return;
    }

    await currentServer.shutdownHandler.stopServer();
    await currentServer.updateDirSize();
    saveServerData();
    saveOnExit(currentServer);
    resolve(currentServer);
  });
}

/**
 *
 * @param {serverHandler.data} data
 * @returns {Server}
 */
function addServerObject(data) {
  const serverNum = getNewServerNum();
  const newData = {
    ...data,
    num: serverNum,
    creationDate: Date.now(),
    dirSize: 0,
  };
  serverData.push(newData);
  const server = new Server(newData, "downloading");
  servers.push(server);
  return server;
}

function getNewServerNum() {
  let idx = 0;
  while (true) {
    if (!serverData.find((e) => e.num == idx)) return idx;
    idx++;
  }
}

function downloadServerJar(path, url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const filePath = fs.createWriteStream(path + "/server.jar");
      res.pipe(filePath);
      filePath.on("finish", async () => {
        filePath.close();
        logger.info("Downloaded server jar");
        resolve();
      });
    });
  });
}

/**
 *
 * @param {Object} server
 * @param {serverHandler.data} data
 */
function writeServerProperties(data, serverPath) {
  let propertiesData = `motd=${data.name}\nquery.port=${data.port}\nserver-port=${data.port}\nspawn-protection=0\nview-distance=20\nsimulation-distance=20`;
  if (data.settings.difficulty)
    propertiesData += `difficulty=${data.settings.difficulty}\n`;
  if (data.settings.seed != "") {
    propertiesData += "\nlevel-seed=" + data.settings.seed;
  }
  if (data.settings.gamemode == "hardcore") {
    propertiesData += "\ngamemode=survival\nhardcore=true";
  } else {
    propertiesData += "\ngamemode=" + data.settings.gamemode;
  }
  fs.writeFileSync(serverPath + "/server.properties", propertiesData);
}

function saveOnExit(server) {
  server.on("statusUpdate", (newStatus) => {
    if (newStatus == "offline") saveServerData();
  });
}

export function deleteServer(serverNum) {
  return new Promise(async (resolve) => {
    logger.info(`Deleting server ${serverNum}`);
    const server = get(serverNum);
    if (!server)
      return logger.error("Tried to delete server that doesn't exist...");
    try {
      await server.deleteFiles();
    } catch {
      logger.error("Aborting server deletion...");
      return;
    }
    const data = serverData.find((e) => e.num == serverNum);
    serverData.splice(serverData.indexOf(data), 1);
    servers.splice(servers.indexOf(server), 1);
    saveServerData();
    logger.info(`Deleted server ${serverNum}`);
    resolve();
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
