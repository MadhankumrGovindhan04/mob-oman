import fs from 'node:fs';
import path from 'node:path';
import { artifactDirs } from '../config/env';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private readonly logFile: string;

  constructor(runId: string) {
    this.logFile = path.join(artifactDirs.logs, `${runId}.log`);
  }

  private write(level: LogLevel, message: string): void {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    process.stdout.write(line);
    fs.appendFileSync(this.logFile, line, 'utf8');
  }

  info(message: string): void {
    this.write('INFO', message);
  }

  warn(message: string): void {
    this.write('WARN', message);
  }

  error(message: string): void {
    this.write('ERROR', message);
  }

  debug(message: string): void {
    this.write('DEBUG', message);
  }
}

let logger: Logger | null = null;

export function initLogger(runId: string): Logger {
  logger = new Logger(runId);
  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    logger = new Logger('run');
  }
  return logger;
}
