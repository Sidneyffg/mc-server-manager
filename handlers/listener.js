const listeners = [];
const pipers = [];

export function on(event, callback) {
  listeners.push({ event, callback });
}

export function emit(event, data, serverNum) {
  listeners.forEach((e) => {
    if (e.event == event.replace()) {
      e.callback(data, serverNum);
    }
  });
  pipers.forEach((e) => {
    if (event.startsWith(e.prefix))
      e.socket?.emit(event.replace(e.prefix, ""), data);
  });
}

export function pipe(socket, prefix = "") {
  pipers.push({
    socket,
    prefix,
  });
}
