"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentRecord, extractDocument } from "../lib/extract/pipeline";

type Result = Awaited<ReturnType<typeof extractDocument>>;
type Tab = "Text" | "JSON" | "Technical" | "PDF";

function HighlightedJson({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const tokens = json.split(/("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);
  return <pre className="overflow-auto text-sm">{tokens.map((token, index) => {
    const color = token.startsWith('"') ? (tokens[index + 1]?.trimStart().startsWith(":") ? "text-violet-700" : "text-teal-800")
      : /^(?:-?\d|true$|false$|null$)/.test(token) ? "text-amber-700" : "text-slate-700";
    return <span className={color} key={index}>{token}</span>;
  })}</pre>;
}

export default function Page() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [type, setType] = useState("");
  const [tab, setTab] = useState<Tab>("Text");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/documents");
    if (!response.ok) throw new Error("Could not load documents.");
    setDocuments(await response.json());
  }, []);
  useEffect(() => { refresh().catch((error: Error) => setMessage(error.message)); }, [refresh]);

  async function upload(file?: File) {
    if (!file || loading) return;
    setMessage("");
    if (file.size > 10 * 1024 * 1024) { setMessage("PDF must be at most 10 MB."); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { setMessage("Please select a PDF file."); return; }
    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
      setSelected(data);
      setResult(null);
      setMessage(data.duplicate ? "This PDF already exists; selected the existing document." : "PDF uploaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setLoading(false); }
  }
  async function extract() {
    if (!selected) return;
    setLoading(true); setMessage(""); setResult(null);
    try {
      const response = await fetch(`/api/documents/${selected.id}/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type ? { docType: type } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Extraction failed."); }
    finally { setLoading(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMessage("Copied to clipboard."); }
    catch { setMessage("Could not copy to clipboard."); }
  }
  function download() {
    if (!result || !selected) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.extraction.fields, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = selected.filename.replace(/\.pdf$/i, "") + ".json";
    link.click(); URL.revokeObjectURL(url);
  }
  const button = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";
  return <div className="min-h-screen md:flex">
    <aside className="w-full border-r border-slate-200 bg-white p-6 md:min-h-screen md:w-80 md:shrink-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Koperasi · Trial</p>
      <h1 className="mt-2 text-2xl font-semibold">Documents</h1>
      <label className="mt-6 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-5 text-center text-sm hover:border-teal-600"
        onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}>
        <span className="block font-semibold">Drop a PDF here</span><span className="block text-slate-500">or choose a file · max 10 MB</span>
        <input className="mt-3 block w-full text-xs" type="file" accept=".pdf,application/pdf" disabled={loading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      <div className="mt-6 space-y-2" aria-label="Document list">
        {documents.length === 0 && <p className="text-sm text-slate-500">No documents available.</p>}
        {documents.map((doc) => <button key={doc.id} disabled={loading} onClick={() => { setSelected(doc); setResult(null); setType(""); setMessage(""); }}
          className={`block w-full rounded-lg border p-3 text-left text-sm ${selected?.id === doc.id ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
          <span className="block break-all font-medium">{doc.filename}</span>
          <span className="mt-2 block text-xs text-slate-500">{doc.source}{doc.lastStatus ? ` · ${doc.lastStatus}` : ""}</span>
        </button>)}
      </div>
    </aside>
    <main className="min-w-0 flex-1 p-6 md:p-10">
      {message && <p role="status" className="mb-4 rounded border border-slate-300 bg-white p-3 text-sm">{message}</p>}
      {!selected ? <div className="mt-24 text-center"><h2 className="text-xl font-semibold">Select a document</h2><p className="mt-2 text-slate-500">Choose a sample or upload a PDF to inspect its contents.</p></div> : <>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Document inspection</p>
        <h2 className="mt-2 break-all text-2xl font-semibold">{selected.filename}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>SHA-256: <code>{selected.sha256.slice(0, 16)}…</code></span>
          <button className="underline" onClick={() => void copy(selected.sha256)}>Copy hash</button>
          <span>· {result ? `${result.document.pages} pages` : "Page count available after extraction"}</span>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Document type<select className="mt-1 block rounded border border-slate-300 bg-white p-2" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Auto-detect</option><option value="bukti_setoran">Bukti setoran</option><option value="rekap_mutasi">Rekap mutasi</option><option value="slip_potongan">Slip potongan</option>
          </select></label>
          <button className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50" onClick={() => void extract()} disabled={loading}>{loading ? "Working…" : "Extract"}</button>
        </div>
        {!result ? <p className="mt-10 rounded-lg border border-slate-200 bg-white p-6 text-slate-500">Run extraction to inspect the text, JSON, and validation results.</p> : <>
          <div className={`mt-8 rounded-lg border p-4 ${result.status === "AUTO_VALID" ? "border-green-300 bg-green-50" : result.status === "NEED_REVIEW" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50"}`}>
            <strong>{result.status}</strong><p className="mt-1 text-sm">{result.status === "AUTO_VALID" ? "Schema and business rules passed." : result.status === "NEEDS_OCR" ? "No text could be recognized from this scan." : result.status === "UNKNOWN_TYPE" ? "The document type could not be determined." : result.status === "FAILED" ? "The PDF could not be processed. It may be invalid, encrypted, or OCR resources may be unavailable." : "Review the validation errors and warnings before using these values."}</p>
            {result.extraction.method === "ocr" && <p className="mt-1 text-sm font-semibold">OCR was used. Review every value against the original PDF.</p>}
            {result.validation.business.filter((rule) => !rule.ok).map((rule) => <p className="text-sm" key={rule.rule}>Failed: {rule.rule}</p>)}
          </div>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap border-b border-slate-200" role="tablist" aria-label="Extraction result">
              {(["Text", "JSON", "Technical", "PDF"] as Tab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={`px-5 py-3 text-sm ${tab === item ? "border-b-2 border-teal-700 font-semibold text-teal-700" : "text-slate-500"}`} onClick={() => setTab(item)}>{item}</button>)}
            </div>
            <div className="overflow-auto p-5" role="tabpanel">
              {tab === "Text" && <><div className="mb-3 flex justify-between gap-4 text-sm"><span>{result.detection.textChars} text-layer chars · {result.rawText.split("\n").filter((line) => !line.startsWith("--- page") && line.length > 0).length} lines</span><button className={button} onClick={() => void copy(result.rawText)}>Copy text</button></div><pre className="whitespace-pre-wrap break-words font-mono text-sm">{result.rawText}</pre></>}
              {tab === "JSON" && <><div className="mb-3 flex gap-2"><button className={button} onClick={() => void copy(JSON.stringify(result.extraction.fields, null, 2))}>Copy JSON</button><button className={button} onClick={download}>Download JSON</button></div><HighlightedJson value={result.extraction.fields} /></>}
              {tab === "Technical" && <div className="space-y-5 text-sm">
                <section><h3 className="font-semibold">Detection</h3><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(result.detection, null, 2)}</pre></section>
                <section><h3 className="font-semibold">Field trace</h3><div className="overflow-auto"><table className="mt-2 w-full text-left"><thead><tr>{["Field", "Raw match", "Page", "Line", "Parsed", "OK"].map((head) => <th className="border-b p-2" key={head}>{head}</th>)}</tr></thead><tbody>{result.extraction.fieldTrace.map((trace, index) => <tr key={index} className="border-b"><td className="p-2">{trace.field}</td><td className="p-2">{trace.rawMatch}</td><td className="p-2">{trace.page}</td><td className="p-2">{trace.lineIndex}</td><td className="p-2">{JSON.stringify(trace.parsedValue)}</td><td className="p-2">{trace.ok ? "✓" : "✗"}</td></tr>)}</tbody></table></div></section>
                <section><h3 className="font-semibold">Schema: {result.validation.schema.ok ? "PASS" : "not passed"}</h3>{result.validation.schema.errors.map((error) => <p key={error} className="text-red-700">{error}</p>)}</section>
                <section><h3 className="font-semibold">Business rules</h3>{result.validation.business.map((rule) => <p key={rule.rule} className={rule.ok ? "text-green-700" : "text-red-700"}>{rule.ok ? "✓" : "✗"} {rule.rule} — expected {JSON.stringify(rule.expected)}, actual {JSON.stringify(rule.actual)} {rule.message}</p>)}</section>
                <section><h3 className="font-semibold">Warnings</h3>{result.warnings.length ? result.warnings.map((warning) => <p key={warning}>{warning}</p>) : <p>None</p>}</section>
                <p>Duration: {result.extraction.durationMs} ms</p><details><summary>Full envelope</summary><pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre></details>
              </div>}
              {tab === "PDF" && <iframe title={`PDF preview: ${selected.filename}`} src={`/api/documents/${selected.id}/file`} className="h-[70vh] w-full border-0" />}
            </div>
          </div>
        </>}
      </>}
    </main>
  </div>;
}
