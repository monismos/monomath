# Authored Philosophy lessons

The Philosophy library starts empty so Airator can add their own lessons. The app saves authored lessons, drafts, and private reflections on the current device. Browser storage is not included in a Git push.

To share an authored lesson with everyone using the GitHub build, export its JSON from the Philosophy reader and add the lesson object to `sourceLessons` in `lessons.ts`. Keep the exported id, `createdAt`, and `updatedAt` values stable. The lesson type requires a title, author, body, question, tags, references, and timestamps. The validation tests enforce field limits and reject malformed lesson exports; the importer keeps only the public lesson fields. Private reflections are excluded from exports.

Bundled lessons appear when the local library first encounters their id. An existing local version takes precedence. A deletion is remembered locally so a bundled lesson does not reappear after reload. Importing JSON only replaces an existing id when the user selects replacement and the imported timestamp is newer.

Bodies support plain text, headings (`#`, `##`, `###`), numbered and bulleted lists, and block quotations. HTML and Markdown link syntax stay literal text. References turn into external links only for `http:` and `https:` URLs.
