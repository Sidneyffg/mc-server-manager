const socket = io();
const utils = {
  init() {
    this.server.init();
    if (this.hasWebsiteLoaded()) this.initWhenSiteLoaded();
    else window.addEventListener("load", () => this.initWhenSiteLoaded());
  },
  initWhenSiteLoaded() {
    this.server.status = document.body.dataset.serverstatus;
    if (typeof main.start == "function") main.start();
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
    init() {
      this.num = window.location.pathname.split("/")[2];
      this.on("statusUpdate", (newStatus) => {
        this.status = newStatus;
      });
    },
    stop() {
      if (this.status != "online") return;

      socket.emit("stopServer", this.num);
    },
    stopIn(ms) {
      if (this.status != "online") return;

      socket.emit("stopServerIn", utils.server.num, ms);
    },
    start() {
      if (this.status != "offline") return;

      socket.emit("startServer", this.num);
    },
    restart() {
      if (this.status != "online") return;

      socket.emit("restartServer", this.num);
    },
    delete() {
      if (this.status != "offline") return;

      socket.emit("deleteServer", this.num);
    },
    emit(event, ...data) {
      socket.emit(event, this.num, ...data);
    },
    on(event, callback) {
      this._listener.add(event, callback);
    },

    _listener: {
      add(event, callback) {
        let callbackItem = this.findCallbackItem(event);
        if (!callbackItem) callbackItem = this.new(event);
        callbackItem.callbacks.push(callback);
      },
      new(event) {
        socket.on(event + utils.server.num, (...args) => {
          this.findCallbackItem(event).callbacks.forEach((e) => e(...args));
        });
        this.callbacks.push({ event, callbacks: [] });
        return this.findCallbackItem(event);
      },
      findCallbackItem(event) {
        return this.callbacks.find((e) => e.event == event);
      },
      callbacks: [],
    },
  },
  stopMenu: {
    init() {
      this._createPopup();
      this.background = utils.getChildInElem(this.popup, [0]);
      this.reasonText = utils.getChildInElem(this.popup, [1, 1]);
      this.stopNowInp = utils.getChildInElem(this.popup, [1, 2, 1, 0]);
      this.timeInp = utils.getChildInElem(this.popup, [1, 3, 0]);

      this.background.addEventListener("click", () => this.close());
      utils.getChildInElem(this.popup, [1, 4]).addEventListener("click", () => {
        if (this._stop()) {
          this._callCallback(true);
          this.close();
        }
      });
    },
    _createPopup() {
      const popup = utils.createElem(
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
      document.body.appendChild(popup);
      this.popup = popup;
    },

    open(reason = null, callback = null, ignoreStop = false) {
      this.callback = callback;
      this.ignoreStop = ignoreStop;
      this.reasonText.innerHTML = reason ? "For " + reason : "";
      this.stopNowInp.checked = true;
      this.timeInp.value = "";
      this.popup.style.display = "block";
    },

    close() {
      this.popup.style.display = "none";
      this._callCallback({ shouldStop: false });
    },

    _callCallback(data) {
      if (!this.callback) return;
      this.callback(data);
      this.callback = null;
    },

    _stop() {
      const stopNow = this.stopNowInp.checked;

      if (stopNow) {
        this._callCallback({ shouldStop: true, time: 0 });
        if (!this.ignoreStop) utils.server.stop();
        return true;
      }

      const min = this.timeInp.value;
      if (parseFloat(min).toString() != min || min <= 0) return false;
      const time = Math.round(min * 6e4);

      this._callCallback({ shouldStop: true, time });
      if (!this.ignoreStop) utils.server.stopIn(Math.round(min * 6e4));
      return true;
    },
  },
  shallowEqual(e, t) {
    let l = Object.keys(e),
      n = Object.keys(t);
    if (l.length !== n.length) return !1;
    for (let r of l) if (e[r] !== t[r]) return !1;
    return !0;
  },
};
utils.init();
