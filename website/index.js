const main = {
  start() {
    this.elems = document.getElementsByClassName("server-status-color");
    for (let i = 0; i < this.elems.length; i++) {
      socket.on("statusUpdate" + i, (status) => this.changeStatus(i, status));
    }
    socket.on("statusUpdate" + this.elems.length, () => location.reload());
  },
  darkener: document.getElementById("darkener"),
  newServerMenu: document.getElementById("std-menu"),
  newServerVersions: document.querySelectorAll(".serverVersion"),
  elems: null,
  closeNewServer() {
    this.darkener.style.display = "none";
    this.newServerMenu.style.display = "none";
  },
  openNewServer() {
    this.darkener.style.display = "block";
    this.newServerMenu.style.display = "block";
  },
  changeStatus(num, status) {
    this.elems[num].style.backgroundColor = this.statusToColor(status);
  },
  changeServerType(type) {
    for (const e of this.newServerVersions) {
      if(e.name == "version" + type) e.style.display = "block"
      else e.style.display = "none"
    }
  },
  statusToColor(s) {
    return [
      { s: "online", c: "lime" },
      { s: "offline", c: "grey" },
      { s: "starting", c: "cyan" },
      { s: "stopping", c: "cyan" },
      { s: "downloading", c: "yellow" },
    ].find((e) => e.s == s).c;
  },
};
