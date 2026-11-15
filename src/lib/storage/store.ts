import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentRecord } from "../extract/pipeline";

const storage = path.join(process.cwd(), "storage");
const uploads = path.join(storage, "uploads");
const indexFile = path.join(storage, "index.json");

async function loadUploads(): Promise<DocumentRecord[]> {
  try {
    return JSON.parse(await readFile(indexFile, "utf8")) as DocumentRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const sampleDir = path.join(process.cwd(), "samples");
  const names = (await readdir(sampleDir)).filter((name) => name.toLowerCase().endsWith(".pdf")).sort();
  const samples = await Promise.all(names.map(async (filename) => {
    const data = await readFile(path.join(sampleDir, filename));
    return {
      id: `sample-${createHash("sha256").update(filename).digest("hex").slice(0, 24)}`,
      filename, source: "sample" as const, sizeBytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    };
  }));
  const index = await loadUploads();
  return [...samples.map((sample) => ({ ...sample, lastStatus: index.find((record) => record.id === sample.id)?.lastStatus })), ...index.filter((record) => record.source === "upload")];
}

export async function getDocument(id: string) {
  return (await listDocuments()).find((record) => record.id === id);
}

export async function readDocument(record: DocumentRecord) {
  return readFile(record.source === "sample" ? path.join(process.cwd(), "samples", record.filename) : path.join(uploads, `${record.id}.pdf`));
}

export async function saveUpload(filename: string, data: Uint8Array) {
  if (data.byteLength > 10 * 1024 * 1024) throw new Error("PDF must be at most 10 MB.");
  if (Buffer.from(data.slice(0, 5)).toString() !== "%PDF-") throw new Error("File is not a PDF.");
  const sha256 = createHash("sha256").update(data).digest("hex");
  const duplicate = (await listDocuments()).find((record) => record.sha256 === sha256);
  if (duplicate) return { ...duplicate, duplicate: true };
  const record: DocumentRecord = {
    id: randomUUID(), filename: filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(0, 180) || "upload.pdf",
    sizeBytes: data.byteLength, sha256, source: "upload",
  };
  await mkdir(uploads, { recursive: true });
  await writeFile(path.join(uploads, `${record.id}.pdf`), data, { flag: "wx" });
  const index = await loadUploads();
  await writeFile(indexFile, JSON.stringify([...index, record], null, 2));
  return record;
}

export async function saveStatus(record: DocumentRecord, lastStatus: string) {
  await mkdir(uploads, { recursive: true });
  const index = await loadUploads();
  const existing = index.findIndex((item) => item.id === record.id);
  if (existing < 0) index.push({ ...record, lastStatus });
  else index[existing] = { ...index[existing], lastStatus };
  await writeFile(indexFile, JSON.stringify(index, null, 2));
}
