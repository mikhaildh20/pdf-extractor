import { listDocuments, saveUpload } from "../../../lib/storage/store";

export const runtime = "nodejs";

export async function GET() {
  try { return Response.json(await listDocuments()); }
  catch { return Response.json({ error: "Could not list documents." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Select a PDF file." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "PDF must be at most 10 MB." }, { status: 400 });
    return Response.json(await saveUpload(file.name, new Uint8Array(await file.arrayBuffer())));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
