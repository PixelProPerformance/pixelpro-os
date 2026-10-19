# PixelPro OS — Railway application

This directory migrates the Sites edition to Node.js/Next.js on Railway. The original root prototype remains in Git history and outside the deployed `/os` root.

## Runtime
- Node 24, one Railway replica, persistent volume mounted at `/data`.
- SQLite WAL database and authenticated image files live on that volume. Do not scale to multiple replicas with independent volumes.
- Set `DATA_DIR=/data`, `NODE_ENV=production`, `APP_URL` to the HTTPS service origin.
- `MIGRATION_DATA` is an optional **private runtime secret** with the existing Sites table rows. Imported transactionally once and marked in `metadata`; never commit it.
- Initial admin requires a preexisting admin member and runtime `ADMIN_EMAIL` + random `SETUP_TOKEN`. Visit `/login#invite=<token>` to choose the password. Once activated, the bootstrap token cannot reactivate the account. Other users use expiring admin-issued links.
- `MIGRATION_TOKEN` temporarily enables authenticated reference uploads and template seeding. Clear it after migration.
- `OPENAI_API_KEY` is optional. Missing keys disable AI/transcription; social publishing still requires its own OAuth implementation.

## Production Pro
Client-scoped image library and brand kits; editable text, rectangles, rounded cards, ellipses, gradients, shadows, stacking, locking, hiding, drag/resize/rotate, crop controls, undo/redo, multiple slides and text distribution. Exports use the same Konva renderer at document resolution, with PNG per slide and ZIP per carousel. Models round-trip through validated PixelPro JSON. PNG/JPG/WEBP models are flattened backgrounds; there is no automatic reconstruction of the original source layers.

Saved designs linked to posts invalidate approval. Administrator owns reusable templates. Collaborators edit designs and upload images; clients are read-only in the studio. Authentication and tenant checks run on server endpoints.

## Development
`npm ci && npm run dev`
`npm run build && npm start`
`npm test`

Back up the `/data` volume (database and assets together) using Railway volume backups. Migration does not shut down the old Sites URL; make the Railway URL the team's working URL to avoid divergent edits.
