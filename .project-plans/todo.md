# OpenCode Config — Outstanding Work

> Convention: append-only. Don't edit past entries; mark done with ✅ and date.
> Add new items at the bottom of the relevant priority section.

## Active Items

### vision-tool: Tighten input validation for unknown/malformed base64

**Context:** Council review (2026-05-20) identified that the vision-tool plugin defaults unknown base64 input to `image/png` rather than rejecting it. This means:
- Raw garbage strings like `"!!!invalid!!!"` are accepted, inferred as PNG, and forwarded to Gemini
- Malformed data URLs (e.g. `data:;base64,`) fail the strip regex, get inferred as PNG, then get re-wrapped as corrupt nested data URLs like `data:image/png;base64,data:;base64,`
- RFC 2397 data URLs with parameters (`data:image/jpeg;charset=utf-8;base64,...`) fail current regexes

**Scope:**
1. Add validation in `inferMimeTypeFromBase64()` — if no magic-byte prefix matches and input isn't a valid data URL, return `null` or a sentinel instead of defaulting to PNG
2. Update `execute()` to reject when MIME inference returns null/unknown (return an error string to the caller)
3. Harden `extractBase64Data()` regex to handle RFC 2397 parameters (`;charset=...` before `;base64,`)
4. Harden `parseMimeFromDataUrl()` similarly
5. Update existing tests that assert the current default-to-PNG behavior to assert rejection instead
6. Add tests for: empty payload data URLs, data URLs with extra parameters, non-base64 garbage strings

**Risk:** Low — this only affects the `image_data` path. File-path validation is already strict. Gemini would likely reject garbage anyway, so this is defense-in-depth.

**Also noted:** `Object.freeze(new Set(...))` doesn't fully prevent runtime mutation of `SUPPORTED_MIME_TYPES` (freeze only prevents property addition, not `.add()`/`.delete()`). Consider replacing with a plain frozen array + `.includes()` check, or accept the TypeScript-level `ReadonlySet` guard as sufficient.

## Completed

- Archived completed todo snapshot: `archive/2026-05-20_todo-domain-bias-complete.md`
- Closeout note: `archive/2026-05-20_skill-domain-bias-cleanup.md`
