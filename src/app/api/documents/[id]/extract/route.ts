import { z } from "zod";
import { extractDocument, failedExtraction } from "../../../../../lib/extract/pipeline";
import { getDocument, readDocument, saveStatus } from "../../../../../lib/storage/store";

export const runtime = "nodejs";
const requestSchema = z.object({ docType: z.enum(["bukti_setoran", "rekap_mutasi", "slip_potongan"]).optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const document = await getDocument((await context.params).id);
    if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
    const input = requestSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Invalid document type." }, { status: 400 });
    const started = performance.now();
    let result;
    try {
      result = await extractDocument(document, await readDocument(document), input.data.docType);
    } catch {
      result = failedExtraction(document, Math.round(performance.now() - started));
    }
    await saveStatus(document, result.status);
    return Response.json(result);
  } catch {
    return Response.json({ error: "Extraction failed; the PDF may be invalid or encrypted." }, { status: 500 });
  }
}
