import fs from "fs";
import https from "https";
import Logger from "./consoleHandler.js";
import Server from "./server.js";

const logger = new Logger(["serverHandler"]);
const servers = [];
export let serverData;
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
  };
}

export function getOnlinePlayers(serverNum) {
  return servers[serverNum].playerHandler.onlinePlayers;
}

export function newServer(data) {
  serverData.push({
    ...data,
    creationDate: Date.now(),
  });
  saveServerData();

  const serverNum = serverData.length - 1;
  servers.push(new Server(serverNum));

  return new Promise((resolve) => {
    const currentServer = servers[serverNum];
    currentServer.setServerStatus("downloading");

    const path = `${process.cwd()}/data/servers/${serverNum}`;
    fs.mkdirSync(path);

    let propertiesData = `motd=${data.name}\nquery.port=${data.port}\ndifficulty=${data.difficulty}\nserver-port=${data.port}`;
    if (data.seed != "") {
      propertiesData += "\nlevel-seed=" + data.seed;
    }
    if (data.gamemode == "hardcore") {
      propertiesData += "\ngamemode=survival\nhardcore=true";
    } else {
      propertiesData += "\ngamemode=" + data.gamemode;
    }
    //fs.writeFileSync(path + "/server.properties", propertiesData);
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
