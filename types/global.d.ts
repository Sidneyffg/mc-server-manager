declare namespace javaHandler {
  type version = 11 | 16 | 17;
}

declare namespace serverHandler {
  interface data {
    name: string,
    type: string,
    version: string,
    port: number,
    settings?: {
      [x:string]:string
    }
  }

}