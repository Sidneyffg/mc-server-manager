import https from "https";
import Logger from "./consoleHandler.js";
const logger = new Logger(["versionHandler"]);


export const allVersions = {
  paper: [],
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
