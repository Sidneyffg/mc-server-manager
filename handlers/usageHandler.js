import osu from "node-os-utils";

export default class UsageHandler {
  constructor() {
    this.#fillLastCpuUsage();
  }
  async getMemory() {
    const usage = await osu.mem.used();
    return usage;
  }

  #lastCpuUsage = new Array(3);
  async getCpu() {
    const usage = await osu.cpu.usage();
    this.#lastCpuUsage.push(usage);
    this.#lastCpuUsage.shift();
    return (
      this.#lastCpuUsage.reduce((a, b) => a + b, 0) / this.#lastCpuUsage.length
    ).toFixed(2);
  }

  async #fillLastCpuUsage() {
    const memUsage = await osu.cpu.usage();
    this.#lastCpuUsage.fill(memUsage);
  }
}
