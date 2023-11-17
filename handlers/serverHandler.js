import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";

const logger = new Logger(["serverHandler"]);
const servers = [];
let serverData;
export let totalServers;
export let ip;
export async function init() {
  logger.info("Initializing...");
  try {
    serverData = JSON.parse(fs.readFileSync("./data/serverData.json"));
  } catch (err) {
    throw err;
  }

  ip = await getIp();
  logger.info("Server ip: " + ip);

  totalServers = serverData.length;
  for (let i = 0; i < serverData.length; i++)
    servers.push(new Server(i, serverData[i]));

  logger.info("Initialized successfully");
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
export async function stop(serverNum) {
  await servers[serverNum].stop();
  saveServerData();
}

export function getData(serverNum) {
  const s = servers[serverNum];
  return {
    status: s.status,
    consoleLog: s.consoleLog,
    playerHandler: {
      onlinePlayers: s.playerHandler.onlinePlayers,
      allPlayers: s.playerHandler.allPlayers,
      whitelistedPlayers: s.playerHandler.whitelistedPlayers,
      oppedPlayers: s.playerHandler.oppedPlayers,
    },
    settingsHandler: {
      settings: s.settingsHandler.settings,
      editableSettings: s.settingsHandler.editableSettings,
    },
    ...serverData[serverNum],
  };
}

export function newServer(data) {
  return new Promise((resolve) => {
    totalServers++;

    serverData.push({
      ...data,
      creationDate: Date.now(),
    });
    saveServerData();

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
        await currentServer.stop();
        resolve();
      });
    });
  });
}

export function stopAllServers(callback) {
  let count = 0;
  for (let i = 0; i < totalServers; i++) {
    if (getData(i).status == "online") {
      stop(i).then(() => {
        count++;
        if (count == totalServers) callback();
      });
    } else {
      count++;
    }
  }
  if (totalServers == count) callback();
}

export function addPlayerToWhitelist(serverNum, name) {
  return servers[serverNum].playerHandler.addPlayerToWhitelist(name);
}

export function makePlayerOperator(serverNum, name) {
  return servers[serverNum].playerHandler.makePlayerOperator(name);
}

export function addTodoItem(serverNum, data) {
  servers[serverNum].eventHandler.addTodoItem(data);
  saveServerData();
}

export function emitInServer(serverNum, event, data) {
  servers[serverNum].emit(event, data);
}

async function saveServerData() {
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
