import osu from "node-os-utils";
import { emit } from "./listener.js";
import path from "path";
import fs from "fs";

const lastCpuUsage = new Array(3);
fillLastCpuUsage();

setInterval(async () => {
  emit("_usageUpdate", {
    cpuUsage: await getCpu(),
    memUsage: await getMemory(),
  });
}, 1000);

export async function getMemory() {
  const usage = await osu.mem.used();
  return usage;
}

export async function getCpu() {
  const usage = await osu.cpu.usage();
  lastCpuUsage.push(usage);
  lastCpuUsage.shift();
  return (
    lastCpuUsage.reduce((a, b) => a + b, 0) / lastCpuUsage.length
  ).toFixed(2);
}

const getAllFiles = function (dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
};

const convertBytes = function (bytes) {
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  if (bytes == 0) {
    return "0B";
  }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

  if (i == 0) {
    return bytes + sizes[i];
  }

  return (bytes / Math.pow(1024, i)).toFixed(1) + sizes[i];
};

function getTotalSize(directoryPath) {
  const arrayOfFiles = getAllFiles(directoryPath);

  let totalSize = 0;

  arrayOfFiles.forEach(function (filePath) {
    totalSize += fs.statSync(filePath).size;
  });

  return convertBytes(totalSize);
}

export async function getServerDirSize(id) {
  const serverDirSize = getTotalSize(
    path.join(process.cwd(), "data/servers/", id, "/server")
  );
  return serverDirSize;
}

async function fillLastCpuUsage() {
  const memUsage = await osu.cpu.usage();
  lastCpuUsage.fill(memUsage);
}
