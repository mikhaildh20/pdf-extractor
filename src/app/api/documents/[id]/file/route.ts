import { getDocument, readDocument } from "../../../../../lib/storage/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const document = await getDocument((await context.params).id);
    if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
    return new Response(new Uint8Array(await readDocument(document)), { headers: { "Content-Type": "application/pdf", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "Could not read document." }, { status: 500 });
  }
}
