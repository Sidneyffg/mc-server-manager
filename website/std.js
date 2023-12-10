const socket = io();
std = {
  init() {
    this.server.num = window.location.pathname.split("/")[2];
    socket.on(`statusUpdate${this.server.num}`, (newStatus) => {
      this.server.status = newStatus;
      this.server.callbacks.forEach((callback) => callback());
    });
    if (this.hasWebsiteLoaded()) this.initWhenSiteLoaded();
    else window.addEventListener("load", () => this.initWhenSiteLoaded());
  },
  initWhenSiteLoaded() {
    this.server.status = document.body.dataset.serverstatus;
    if (typeof run == "function") run();
  },
  hasWebsiteLoaded() {
    return (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    );
  },
  createElem(child, innerHtml, data = null) {
    const elem = document.createElement(child);
    if (data) {
      if (data.id) elem.id = data.id;
      if (data.classList)
        elem.classList = (() => {
          const classListHtml = "";
          classList.forEach((e) => (classListHtml += e + " "));
          return classListHtml;
        })();
    }
    elem.innerHTML = innerHtml;
    return elem;
  },
  getChildInElem(elem, arr) {
    let child = elem;
    arr.forEach((e) => {
      child = child.children[e];
    });
    return child;
  },
  server: {
    status: null,
    num: null,
    stop() {
      if (this.status != "online") return;

      socket.emit("stopServer", this.num);
    },
    stopIn(ms) {
      if (this.status != "online") return;

      socket.emit("stopServerIn", std.server.num, ms);
    },
    start() {
      if (this.status != "offline") return;

      socket.emit("startServer", this.num);
    },
    restart() {
      if (this.status != "offline") return;

      socket.emit("restartServer", this.num);
    },
    onStatusUpdate(callback) {
      this.callbacks.push(callback);
    },
    callbacks: [],
  },
};
std.init();

class StopMenu {
  constructor() {
    this.#createMenu();
  }

  #createMenu() {
    const menu = std.createElem(
      "div",
      `
    <div class="background"></div>
    <div class="content">
      <h1>Stop server</h1>
      <p class="reason"></p>
      <div class="stop-switch">
        <p>Stop now</p>
        <label class="switch">
          <input type="checkbox" checked/>
          <span class="slider-round"></span>
        </label>
      </div>
      <p class="time-selector">Stop server in <input type="number" class="small-number-inp" id="stop-server-in-popup-inp"> minutes</p>
      <button>Stop</button>
    </div>
    `,
      { id: "stop-server-in-popup" }
    );
    this.popup = menu;
    this.background = std.getChildInElem(menu, [0]);
    this.reasonText = std.getChildInElem(menu, [1, 1]);
    this.stopNowInp = std.getChildInElem(menu, [1, 2, 1, 0]);
    this.timeInp = std.getChildInElem(menu, [1, 3, 0]);

    this.background.addEventListener("click", () => this.close());
    std.getChildInElem(menu, [1, 4]).addEventListener("click", () => {
      if (this.#stop()) {
        this.#callCallback(true);
        this.close();
      }
    });

    document.body.appendChild(menu);
  }

  open(reason = null, callback = null, ignoreStop = false) {
    this.callback = callback;
    this.ignoreStop = ignoreStop;
    this.reasonText.innerHTML = reason ? "For " + reason : "";
    this.stopNowInp.checked = true;
    this.timeInp.value = "";
    this.popup.style.display = "block";
  }

  close() {
    this.popup.style.display = "none";
    this.#callCallback({ shouldStop: false });
  }

  #callCallback(data) {
    if (!this.callback) return;
    this.callback(data);
    this.callback = null;
  }

  #stop() {
    console.log("#stop");
    const stopNow = this.stopNowInp.checked;

    if (stopNow) {
      this.#callCallback({ shouldStop: true, time: 0 });
      if (!this.ignoreStop) std.server.stop();
      return true;
    }

    const min = this.timeInp.value;
    if (parseFloat(min).toString() != min || min <= 0) return false;
    const time = Math.round(min * 6e4);

    this.#callCallback({ shouldStop: true, time });
    if (!this.ignoreStop) std.server.stopIn(Math.round(min * 6e4));
    return true;
  }
}
