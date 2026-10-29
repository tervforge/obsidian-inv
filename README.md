# Invoklet Markdown 0.4.0

Version 0.4.0 registers `.inv` files for Invoklet 0.10.1 and later. Rename existing `.rpad`
scripts to `.inv`; their Markdown/YAML contents do not change. This release uses the plugin ID
`invoklet-markdown`: disable the old RunPad Markdown plugin before installing the new folder.

View your [Invoklet](https://github.com/tervforge/invoklet) scripts in Obsidian. The plugin opens
`.inv` files in Obsidian's own Markdown editor: the notes read as a normal note, the code shows
as a C# or Visual Basic block, and the parts Invoklet needs — the YAML header and the run block's
fences — are protected from accidental edits.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png">
  <img alt="A Invoklet script open in Obsidian: a collapsed Properties section, the title and notes as Markdown, and the C# code block" src="docs/screenshot-light.png">
</picture>

The user guide has a page about it:
[View your scripts in Obsidian](https://tervforge.github.io/invoklet-docs/obsidian/).

## Installation / update

1. Download [**invoklet-markdown.zip**](https://github.com/tervforge/obsidian-rpad/releases/latest/download/invoklet-markdown.zip)
   from the [latest release](https://github.com/tervforge/obsidian-rpad/releases/latest).
2. Unpack it into `<vault>/.obsidian/plugins/`, so that you get
   `<vault>/.obsidian/plugins/invoklet-markdown/` with `main.js`, `manifest.json` and
   `styles.css` inside; replace an older copy when updating. (Each release also has the three
   files separately.) To browse your Invoklet scripts, open the **Invoklet Queries** folder in
   your Documents folder as the vault.
3. Restart Obsidian, or disable and re-enable Invoklet Markdown in
   Settings → Community plugins (turn off Restricted mode first if it is on).
4. If needed, enable Files and links → Detect all file extensions.

Requires Obsidian 1.8.7+. No build step or dependency installation is needed.

## What is editable

- The document title and plain Markdown before/after the code.
- The contents of the single `csharp run` or `vb run` block.
- Plain Markdown in the documentation; new code blocks are not allowed.

The backtick lines with `csharp run` / `vb run` are hidden in the editor,
but they remain in the source file and are protected from changes. The code inside the block is editable.
Hiding is done by making the delimiter text transparent, not by removing lines. Obsidian's
native code block lines, background, font and padding are preserved. The delimiter lines may
leave some space above/below the block; this is intentional and keeps the standard layout. When copying the whole
document, the delimiter lines stay in the copied source. If the structure is broken,
the delimiters are not hidden, so the problem stays visible.

## What is protected

- The YAML front matter, including the `---` lines.
- The opening line of the executable block, its language and `run`.
- The closing line of the executable block.
- Adding a second run block or closing the first one early.

Obsidian's built-in editable Properties form is replaced with a "name — value" table
under a **Properties** heading, shown in the app language (see [Interface language](#interface-language)). The table is read-only; values can be selected
and copied. The section is collapsed by default and expands on click or via the keyboard.
Its state is kept while editing the current tab; when another file is opened,
the section is collapsed again. Pop-up notices about forbidden edits have been removed:
such an edit is simply not applied. The document title is preserved.
Editing code/documentation remains regular Obsidian Markdown editing.

A file with missing/unclosed delimiters or several run blocks opens
read-only: the plugin does not try to repair the structure automatically. The structure is checked,
not full YAML schema / C# validity; no compilation or execution is added.

This protects against accidental edits in the plugin's editor; it is not file access control:
other plugins, commands writing directly through the Vault API, and external programs can
modify the file. Remote sync changes are not rolled back. Regular `.md` files are not affected.

## Interface language

The interface follows Obsidian → Settings → General → Language. The plugin reads it with
the public `getLanguage()` API and looks up its own translation in `src/locales/`:
the exact code first (`pt-BR`, `zh-TW`), then the base language (`en-GB` → `en`),
then English. No Obsidian internals are used.

Included: English, Русский, Українська, Deutsch, Français, Español, Italiano,
Português, Português (Brasil), Polski, Türkçe, Nederlands, 日本語, 한국어,
简体中文, 繁體中文. The word for "Properties" in each file is the one Obsidian itself uses
for its Properties block (from
[obsidian-translations](https://github.com/obsidianmd/obsidian-translations)), so the
heading matches the native UI. Other strings were translated for this plugin; corrections
from native speakers are welcome.

To add a language:

1. Copy `src/locales/en.json` to `src/locales/<code>.json`, using the code Obsidian uses
   (see [existing languages](https://github.com/obsidianmd/obsidian-translations#existing-languages)).
2. Translate the values; keep the keys and `{{placeholders}}` unchanged.
3. Run `npm run build && npm test`. `i18n.test.cjs` fails if a key is missing, extra
   or empty, or a placeholder differs from `en.json`.

In code, use `t("placeholder.title")` or `t("properties.aria-label", { heading, readOnly })`
from `src/i18n.js`; every key used in `src/plugin.js` must exist in `en.json`.

## Checks

20 automated policy tests: title/documentation/code, properties/delimiters,
deletion across delimiters, inserting a second/premature block, CRLF and VB,
broken structure and batched changes; plus bundle tests that load the built
`dist/main.js` standalone, unpack and compare the release archive, check the interface language selection and that `manifest.json`
and `versions.json` agree.
The updated version has not yet been tested in a live Obsidian: Source/Live
Preview, Properties display, pasting, undo/redo and saving need to be checked. Version 0.1.0 was
previously tested by the user.

See [Development](#development) for building and testing.
API: https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
CodeMirror filter: https://codemirror.net/docs/ref/#state.EditorState.changeFilter

## Persistent sections (0.3.0)

The editor provides a title, a description before the run block and additional
documentation after it. Their contents can be cleared; the heading marker and the description's
separator line are protected. Empty sections show a placeholder (see 0.3.5).
Placeholders are not saved to the file. If an older file has no title/description slot,
an empty-section button appears: clicking it creates plain Markdown, with no new format tags.
Empty editor placeholders are not shown in Reading view.

## Compact text blocks (0.3.1)

The minimum height applies only to empty sections. Filled descriptions grow
with their content, without forced 64 px gaps. The title and the properties section have
reduced spacing. In the editor, the description/documentation are styled with a soft background and border
as solid blocks, but inside they keep Markdown rather than monospaced plain text.
Blank lines that already exist in the file are not removed automatically.

## Calm document view (0.3.2)

The duplicate inline file name has been removed (the tab and path remain). The editable
title from the Markdown is shown. The description and additional documentation no longer have permanent borders:
a soft background appears on hover / on the active line in Obsidian versions that support :has.
Sections are separated by spacing; the styling of the executable code is not overridden.
These are visual changes and need to be checked in a live Obsidian. Text protection is unchanged.

## No additional code blocks (0.3.3)

New fenced blocks (backticks and tildes) and indented code blocks are blocked in the description
and documentation, including inside blockquotes/lists. Inline code in single
backticks, lists, links and the rest of Markdown are allowed. The main run block
remains editable. The check uses the CommonMark parser commonmark 0.31.2,
bundled into main.js: no dependencies need to be installed and no network requests are made.
Existing additional blocks are not removed automatically: the rest of the document can
be edited, and an existing additional block can be deleted but not created/modified.
A forbidden paste rejects the whole operation without pop-up messages.
Parser licenses: commonmark-LICENSE.txt (a copy is also in src/vendor).

## Transparent blocks (0.3.4)

The description and documentation stay transparent while typing. The active text section
gets dashed borders at the top and bottom, without a side border. Padding inside the section
is 10 px at the top/bottom. Space for the lines is reserved, so focus does not change the height.
The background/highlighting of the executable code is not affected. Live visual testing has not been done.

## Localization and placeholders (0.3.5)

Interface strings are no longer hardcoded in Russian: the plugin follows the Obsidian
language and ships 16 translations. Because it relies on the public `getLanguage()`
API, the minimum Obsidian version is now 1.8.7.

Placeholders now behave like HTML input placeholders: the hint is shown inline exactly
where the text will appear (after `# ` for the title), the caret stays before it, it adds
no height, and it disappears with the first typed character without moving the rest of
the document. The old minimum height of empty sections is gone. A missing section is
offered as a button with the same height as the line that clicking it creates; a missing
title is now created as a single `# ` line, without an extra blank line.

## Release archive (0.3.6)

Each release now includes `invoklet-markdown.zip` for manual installation: unpack it into
`<vault>/.obsidian/plugins/`. The plugin itself is unchanged from 0.3.5.

## Development

Requires Node.js 18+. There are no npm dependencies; `package.json` only holds scripts.

| Command | What it does |
| --- | --- |
| `npm run build` (`node build.cjs`) | Writes the plugin to `dist/`: `main.js` (bundles `src/plugin.js`, `src/policy.cjs`, `src/i18n.js` with `src/locales/*.json` and `src/vendor/commonmark.js`), `manifest.json` and `styles.css` (from `src/styles.css`). Adds the current version to `versions.json`. Fails loudly if an expected placeholder is missing from the sources. |
| `npm run package` | Build, then pack `dist/invoklet-markdown.zip` with a `invoklet-markdown/` folder inside, ready to unpack into `<vault>/.obsidian/plugins/`. The archive is reproducible: the same sources give the same bytes. |
| `npm test` | Build, then run `policy.test.cjs`, `bundle.test.cjs` and `i18n.test.cjs`. |
| `npm run check` | Build, package and test, then fail if `versions.json` is not committed up to date. This is what CI runs. |

`dist/` is not committed. To try a change in a vault, run `npm run build` and copy or symlink
`dist/` as `<vault>/.obsidian/plugins/invoklet-markdown`. `manifest.json` stays in the repository
root because Obsidian's plugin directory reads the latest version from there.

### Releasing a new version

1. Change `version` (and `minAppVersion`, if needed) in `manifest.json`. It is the single source
   of truth; `build.cjs` no longer overwrites it.
2. Run `npm test` and commit `manifest.json` and `versions.json`.
3. Push a tag equal to the version, without a `v` prefix (Obsidian requires this):
   `git tag 0.4.0 && git push origin main 0.4.0`.
   The **Release** workflow checks that the tag matches `manifest.json` and `versions.json`,
   builds, packages and tests, and publishes a GitHub release with `invoklet-markdown.zip`
   and, separately, `main.js`, `manifest.json` and `styles.css` (the files Obsidian's plugin
   directory and tools like BRAT download).

### Continuous integration

`.github/workflows/ci.yml` runs `npm run check` on every push to `main` and on pull requests
and keeps the built `invoklet-markdown.zip` as a downloadable artifact of the run.
`.github/workflows/release.yml` runs on version tags, as described above.

### Licenses

Invoklet Markdown is released under the [MIT License](LICENSE).

The CommonMark parser (commonmark 0.31.2) is vendored in `src/vendor/` with its license.
`commonmark-LICENSE.txt` in the repository root is a deliberate copy, because the parser
ships inside `main.js` and its license notices (BSD-2-Clause for commonmark.js, MIT for the bundled
entity and mdurl code) have to travel with it.
