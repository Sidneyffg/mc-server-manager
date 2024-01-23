import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";
import * as listener from "./listener.js";
import javaHandler from "./javaHandler.js";
import versionHandler from "./versionHandler.js";
import * as uuid from "uuid";
import portHandler from "./portHandler.js";

const logger = new Logger(["serverHandler"]);
export const servers = [];
export let ip;
export function totalServers() {
  return servers.length;
}

export async function init() {
  logger.info("Initializing...");
  const timestamp = Date.now();

  const path = `${process.cwd()}/data`;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    logger.info("Created data folder");
  }

  ip = await getIp();
  logger.info("Server ip: " + ip);

  await versionHandler.init();
  javaHandler.init();

  const serversPath = path + "/servers";
  if (!fs.existsSync(serversPath)) {
    fs.mkdirSync(serversPath);
    logger.info("Created server folder");
  }
  const serverFolders = fs.readdirSync(serversPath);
  serverFolders.forEach((folder) => {
    if (!uuid.validate(folder)) return;
    const server = new Server(folder);
    servers.push(server);
  });
  logger.info("Initialized all servers");

  const duration = Date.now() - timestamp;
  logger.info(`Initialized successfully (${duration} ms)`);
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
  return servers.find((e) => e.id == serverData);
}

/**
 * Creates a new Minecraft server.
 * @param {serverHandler.data} data
 * @param {() => Server} callbackOnFirstStart
 * @returns {Promise<Server>}
 */

export function newServer(data, port, callbackOnFirstStart = null) {
  return new Promise(async (resolve) => {
    const id = uuid.v4();
    let path = `${process.cwd()}/data/servers/${id}`;
    fs.mkdirSync(path);
    path += "/server";
    fs.mkdirSync(path);

    const currentServer = addServerObject(id, data);
    portHandler.bind(port, currentServer.id);

    if (callbackOnFirstStart) callbackOnFirstStart(currentServer);

    const javaVersion = javaHandler.getVersion(data.type, data.version);
    await javaHandler.downloadIfMissing(javaVersion);

    writeServerProperties(data, port, path);
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
    resolve(currentServer);
  });
}

/**
 *
 * @param {serverHandler.data} data
 * @returns {Server}
 */
function addServerObject(id, data) {
  const serverNum = getNewServerNum();
  const newData = {
    ...data,
    num: serverNum,
    creationDate: Date.now(),
    dirSize: 0,
  };
  const server = new Server(id, true, newData);
  servers.push(server);
  return server;
}

function getNewServerNum() {
  let idx = 0;
  const usedNums = servers.map((server) => server.data.num);
  while (true) {
    if (!usedNums.includes(idx)) return idx;
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
function writeServerProperties(data, port, serverPath) {
  let propertiesData = `motd=${data.name}\nquery.port=${port}\nserver-port=${port}\nspawn-protection=0\nview-distance=20\nsimulation-distance=20`;
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
    servers.splice(servers.indexOf(server), 1);
    logger.info(`Deleted server ${serverNum}`);
    resolve();
  });
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
