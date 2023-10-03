import https from "https";

export default class VersionHandler {
  versions = {
    paper: [],
  };
  async getServerVersions() {
    const paperVersions = (
      await this.#getJsonFromLink("https://api.papermc.io/v2/projects/paper/")
    ).versions;
    await this.#getServerBuildsSync(paperVersions);
    console.log(
      this.versions.paper.sort(
        (a, b) =>
          parseFloat(b.version.slice(2)) - parseFloat(a.version.slice(2))
      )
    );
    //console.log(this.versions);
  }

  #getServerBuildsSync(versions) {
    let count = 0;
    return new Promise((resolve) => {
      versions.forEach(async (version) => {
        const latest_build = (
          await this.#getJsonFromLink(
            "https://api.papermc.io/v2/projects/paper/versions/" + version
          )
        ).builds.pop();
        if (version != "1.13-pre7") {
          this.versions.paper.push({
            version: version,
            latest_build: latest_build,
          });
        }
        count++;
        console.log({
          version: version,
          latest_build: latest_build,
        });

        if (count == versions.length) resolve();
      });
    });
  }

  async #getJsonFromLink(link) {
    return new Promise(async (resolve, reject) => {
      await https.get(link, (res) => {
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
}
