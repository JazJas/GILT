import * as util from "util";
import * as vscode from "vscode";
import * as JSON5 from "json5";

/**
 * Lightweight storage for event data prior to de-staging.
 *
 * This is a singleton.  Use getLogger() to get the instance.
 */
export class Logger {
  public static getLogger(extensionUri: vscode.Uri): Logger {
    if (Logger.theInstance === undefined) {
      Logger.theInstance = new Logger(extensionUri);
    }
    return Logger.theInstance;
  }
  private constructor(private extensionUri: vscode.Uri) {
    this.calcPersist();
  }
  private static theInstance?: Logger;
  private log: LoggerEntry[] = [];
  private interval = 30000; // 30 seconds
  private chunkPrefix = `LoggerChunk`;
  private lastPersist: Date = new Date();
  private nextPersist: Date = new Date(
    this.lastPersist.getTime() + this.interval
  );
  private calcPersist() {
    this.lastPersist = new Date();
    this.nextPersist = new Date(this.lastPersist.getTime() + this.interval);
  }
  private persistChunk() {
    const { workspaceFolders } = vscode.workspace;
    if (workspaceFolders === undefined) {
      console.debug(`No workspace folders, not persisting log chunk`);
      return;
    }
    if (workspaceFolders.length !== 1) {
      console.debug(
        `${workspaceFolders.length} workspace folders instead of 1, not persisting log chunk`
      );
      return;
    }

    const chunkName = `${this.chunkPrefix}-${this.lastPersist.toISOString()}`;
    const chunkUri = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      "telemetry",
      chunkName + ".json"
    );
    console.log(chunkUri);

    this.calcPersist(); // Reset the persistence stamps

    if (this.log.length) {
      const logCopy = this.log.map(entry => entry.toString());
      this.log = []; // Clear the persisted data
      vscode.workspace.fs.writeFile(
        chunkUri,
        Buffer.from(logCopy.join('\n'))
      )
    } else {
      console.debug("No log data to persist");
    }
  }
  public clear(): void {
    this.log = [];
    /*
    const keys: readonly string[] = this.memory.keys();
    for (const keyidx in keys) {
      const key: string = keys[keyidx];
      if (key.startsWith(this.chunkPrefix)) {
        this.memory.delete(key);
        console.debug(`Deleted chunk: ${key}`);
      }
    }
    */
    console.debug(`Cleared in-memory log data (any persisted chunks remain)`);
  }
  public flush(): void {
    this.persistChunk();
  }
  public push(logEntry: LoggerEntry): void {
    this.log.push(logEntry);

    if (new Date() > this.nextPersist) {
      this.persistChunk(); // Persist if needed
    }
  } 
}

/**
 * An entry in the log
 */
export class LoggerEntry {
  constructor(
    private src: string,
    private msg?: string,
    private prm?: string[]
  ) {
    this.time = new Date().toISOString();
  }
  private time: string;
  public toString(): string {
    const logStart = `${this.time}:${this.src}`;
    if (this.msg === undefined) {
      return logStart;
    } else if (this.prm === undefined) {
      return `${logStart}: ${this.msg}`;
    } else {
      return `${logStart}: ${util.format(this.msg, ...this.prm)}`;
    }
  }
}