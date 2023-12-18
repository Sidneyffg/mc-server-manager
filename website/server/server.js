const main = {
  start() {
    utils.stopMenu.init();
    this.serverConsole.init();
    this.usage.init();
    this.serverStoppingInCountdown.init();
    this.serverPowerBtns.init();

    // need to add player list to utils
    utils.server.on("onlinePlayersUpdate", (onlinePlayers) => {
      const playersDiv = document.getElementById("players-div");
      let playersHtml = "";
      onlinePlayers.forEach((player) => {
        playersHtml += `
        <div>
        <img
          src="https://mc-heads.net/avatar/${player}/40"
        />
        <div>
          <p>USERNAME</p>
          <p>${player}</p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          viewBox="0 -960 960 960"
          width="24"
        >
          <path
            fill="white"
            d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"
          />
        </svg>
      </div>`;
      });
      playersDiv.innerHTML = playersHtml;
    });
  },
  serverConsole: {
    init() {
      this.elemParent.scrollTop = this.elemParent.scrollHeight;
      utils.server.on("consoleUpdate", (message) => {
        this.newMessage(message);
      });
      utils.server.on("statusUpdate", (status) => {
        if (status !== "starting") return;
        this._clear();
      });
    },
    _clear() {
      this.elem.innerHTML = "";
    },
    newMessage(message) {
      let isScrolledDown =
        this.elemParent.scrollTop + this.elemParent.clientHeight ==
        this.elemParent.scrollHeight;

      this._handleMessageType(message);

      message = message
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

      const data = `<span class="span-color-${this.currentType}">${message}</span>`;
      this._appendData(data);

      if (isScrolledDown) this._scrollDown();
    },
    _messageTypeRegex: /\[[0-9]{2}\:[0-9]{2}\:[0-9]{2} ([A-Z]{4,5})|\]:/m,
    _handleMessageType(message) {
      const splitMessage = this._messageTypeRegex.exec(message);
      if (!splitMessage) return;
      const type = splitMessage[1];
      this.currentType = type;
    },
    _appendData(data) {
      this.elem.innerHTML += data;
    },
    _scrollDown() {
      this.elemParent.scrollTop = this.elemParent.scrollHeight;
    },
    elem: document.getElementById("server-console"),
    elemParent: document.getElementById("overview-console"),
    currentType: "INFO",
  },
  usage: {
    init() {
      socket.on("usageUpdate", (usage) => {
        const cpu = usage.cpuUsage + "%";
        const mem = Math.round(usage.memUsage.usedMemMb / 10) / 100 + "GB";
        this.updateUsage({ cpu, mem });
      });
      utils.server.on("serverDirSizeUpdate", (dirSize) => {
        this.updateUsage({ storage: dirSize });
      });
    },
    updateUsage(newUsage) {
      if (newUsage.cpu) this.usageCpu.innerHTML = newUsage.cpu;
      if (newUsage.mem) this.usageMem.innerHTML = newUsage.mem;
      if (newUsage.storage) this.usageStorage.innerHTML = newUsage.storage;
    },
    usageCpu: document.getElementById("usage-cpu"),
    usageMem: document.getElementById("usage-mem"),
    usageStorage: document.getElementById("usage-storage"),
  },
  serverStoppingInCountdown: {
    init() {
      utils.server.on("serverStoppingInUpdate", (sec) => {
        if (sec == -1) {
          this.stop();
          return;
        }
        this.start(sec);
      });

      const value = parseInt(this.elemText.innerHTML);
      if (isNaN(value) || value <= 0) return;

      this.start(value);
    },
    elem: document.getElementById("stopping-in-info"),
    elemText: document.getElementById("stopping-in-info-p"),
    intervalId: null,
    start(sec) {
      this.stop();
      this.intervalId = setInterval(() => this.decrease(), 1000);
      this.elemText.innerHTML = sec;
      this.elem.style.display = "block";
    },
    stop() {
      this.elem.style.display = "none";
      if (this.intervalId) clearInterval(this.intervalId);
      this.intervalId = null;
    },
    decrease() {
      const value = parseInt(this.elemText.innerHTML) - 1;
      if (value == 0) {
        this.stop();
        return;
      }
      this.elemText.innerHTML = value;
    },
  },
  serverPowerBtns: {
    init() {
      this._handleStatusUpdate(utils.server.status);
      utils.server.on("statusUpdate", (status) =>
        this._handleStatusUpdate(status)
      );
    },
    _handleStatusUpdate() {
      const status = utils.server.status;
      switch (status) {
        case "starting":
          this._editBtns(false, true);
          break;
        case "online":
          this._editBtns(true, false);
          break;
        case "stopping":
          this._editBtns(true, true);
          break;
        case "offline":
          this._editBtns(false, false);
          break;
        case "downloading":
          this._editBtns(false, true);
          break;
      }
    },
    _editBtns(showActive, setDisabled) {
      this._activeBtns.style.display = showActive ? "flex" : "none";
      this._inActiveBtns.style.display = showActive ? "none" : "flex";

      Array.from(
        (showActive ? this._activeBtns : this._inActiveBtns).children
      ).forEach((e) => {
        e.disabled = setDisabled;
      });
    },
    _activeBtns: document.getElementById("active-server-btns"),
    _inActiveBtns: document.getElementById("inactive-server-btns"),
  },
};
