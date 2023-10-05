import osu from "node-os-utils";
import { emit } from "./listener";

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

async function fillLastCpuUsage() {
  const memUsage = await osu.cpu.usage();
  lastCpuUsage.fill(memUsage);
}