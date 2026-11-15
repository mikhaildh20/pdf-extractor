# Koperasi PDF extraction trial

Run locally with Node.js and npm:

```sh
npm install
npm run dev
```

Open http://localhost:3000. Run `npm test`, `npm run verify`, `npm run lint`, and `npm run build` to check the trial.

## Assumptions

- Documents follow the supplied digital PDF templates. A scan is any PDF with fewer than 30 extracted characters; Phase 1 does not run OCR.
- Rupiah must be an unambiguous nonnegative whole amount with valid Indonesian thousands grouping; a decimal component is accepted only when it is zero. No rounding is performed.
- Document type ties and no keyword matches are unknown. A manual type override does not bypass scan detection.
- Line indexes are zero-based and page numbers are one-based. Mutation balances are required for automatic validation even though the output schema permits them to be absent.
- Missing or invalid required values prevent automatic validation. Expected fixture metadata is excluded from comparisons; the scan fixture's fields are intentionally not compared because OCR is unavailable.

## Limitations

This is a local single-user trial, not production software. Layouts and table rows outside the supplied templates can be missed; always inspect the source, traces, and validation results. A short text layer is not proof that a document is an image scan, and an image mixed with a text layer may contain unread data. Type detection uses keyword matching, not template authentication. No OCR or LLM calls are made.

Storage is local and unencrypted. The JSON index is not transactional and concurrent uploads or extractions can overwrite updates. Uploads are not authenticated or virus-scanned. Do not expose this app publicly or use it with sensitive real data without appropriate access controls, secure storage, transactional persistence, and a security review.

Before financial use, validate against a representative document corpus, add independent reconciliation and human review, harden PDF parsing and upload limits, audit dependencies, and test concurrent and malformed inputs. No extraction result authorizes a transaction.
