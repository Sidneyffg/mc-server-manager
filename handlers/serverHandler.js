import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";
import * as listener from "./listener.js";

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

export function start(serverNum) {
  return new Promise(async (resolve, reject) => {
    try {
      await servers[serverNum].start();
    } catch {
      reject();
      return;
    }
    resolve();
  });
}

export function get(serverNum) {
  return servers[serverNum];
}

export function newServer(data) {
  return new Promise((resolve) => {
    totalServers++;

    serverData.push({
      ...data,
      creationDate: Date.now(),
      dirSize: 0,
    });

    const serverNum = serverData.length - 1;

    const path = `${process.cwd()}/data/servers/${serverNum}`;
    fs.mkdirSync(path);

    servers.push(new Server(serverNum, serverData[serverNum], "downloading"));
    const currentServer = servers[serverNum];

    let propertiesData = `motd=${data.name}\nquery.port=${data.port}\ndifficulty=${data.difficulty}\nserver-port=${data.port}\nspawn-protection=0\nview-distance=32\nsimulation-distance=32`;
    if (data.seed != "") {
      propertiesData += "\nlevel-seed=" + data.seed;
    }
    if (data.gamemode == "hardcore") {
      propertiesData += "\ngamemode=survival\nhardcore=true";
    } else {
      propertiesData += "\ngamemode=" + data.gamemode;
    }
    fs.writeFileSync(path + "/server.properties", propertiesData);
    fs.writeFileSync(path + "/eula.txt", "eula=true");
    fs.writeFileSync(
      path + "/start.bat",
      `cd "./data/servers/${serverNum}"\njava -Xmx1024M -Xms1024M -jar server.jar nogui`
    );
    const url = `https://api.papermc.io/v2/projects/paper/versions/${data.version}/builds/${data.build}/downloads/paper-${data.version}-${data.build}.jar`;
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
