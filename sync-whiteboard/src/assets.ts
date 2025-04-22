import { mkdir, writeFile, readFile } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import type { IncomingMessage } from "http";

const ASSETS_DIR = "./assets";

// Ensure assets directory exists
mkdir(ASSETS_DIR, { recursive: true }).catch(console.error);

export async function storeAsset(
  id: string,
  fileStream: IncomingMessage
): Promise<string> {
  const filePath = join(ASSETS_DIR, id);
  await pipeline(fileStream, createWriteStream(filePath));
  return id;
}

export async function loadAsset(id: string) {
  const filePath = join(ASSETS_DIR, id);
  return createReadStream(filePath);
}
