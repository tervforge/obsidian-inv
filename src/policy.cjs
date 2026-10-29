"use strict";
const commonmark = require("./vendor/commonmark.js");
const markdownParser = new commonmark.Parser();
function inspect(text) {
    const lines = [];
    const re = /[^\n]*(?:\n|$)/g;
    let m;
    while ((m = re.exec(text)) && m[0]) {
        lines.push({ from: m.index, to: re.lastIndex, raw: m[0], value: m[0].replace(/\r?\n$/, "").trimEnd() });
    }
    if (lines[0]?.value !== "---") return null;
    const end = lines.findIndex((line, i) => i > 0 && line.value === "---");
    if (end < 0) return null;
    const yamlEnd = lines[end].to;
    const languageMatch = text.slice(lines[0].to, lines[end].from).match(/^language\s*:\s*(?:["']?)(csharp|vb)(?:["']?)[ \t]*(?:#.*)?$/im);
    const language = (languageMatch?.[1] || "csharp").toLowerCase();
    // Match Invoklet's line-based run fence rules, rather than interpreting arbitrary code blocks.
    const runs = lines.filter((line, i) => i > end && /^```(?:csharp|vb)\s+run$/i.test(line.value));
    if (runs.length !== 1 || !new RegExp("^```" + language + "\\s+run$", "i").test(runs[0].value)) return null;
    const open = runs[0];
    const close = lines.find(line => line.from >= open.to && /^`{3,}$/.test(line.value));
    if (!close) return null;
    return {
        locks: [{ from: 0, to: yamlEnd }, { from: open.from, to: open.to }, { from: close.from, to: close.to }],
        signature: [text.slice(0, yamlEnd), open.raw, close.raw],
        codeStart: open.to, codeEnd: close.from
    };
}
// Functions below accept an optional result of inspect(text) to avoid re-parsing
// the document several times per transaction.
function sections(text, parsed = inspect(text)) {
    if (!parsed) return null;
    const start = parsed.locks[0].to, end = parsed.locks[1].from;
    const match = /^# ([^\r\n]*)(\r?\n)/m.exec(text.slice(start, end));
    const title = match ? { from: start + match.index, to: start + match.index + match[0].length,
        contentFrom: start + match.index + 2, contentTo: start + match.index + 2 + match[1].length,
        empty: match[1].trim().length === 0 } : null;
    const introFrom = title ? title.to : start;
    return { title, intro: { from: introFrom, to: end, empty: !text.slice(introFrom, end).trim() },
        outro: { from: parsed.locks[2].to, to: text.length, empty: !text.slice(parsed.locks[2].to).trim() } };
}
function documentationCodeBlocks(text, parsed = inspect(text)) {
    if (!parsed) return [];
    const fragments = [text.slice(parsed.locks[0].to, parsed.locks[1].from), text.slice(parsed.locks[2].to)];
    const blocks = [];
    for (const markdown of fragments) {
        const walker = markdownParser.parse(markdown).walker();
        let event;
        while ((event = walker.next())) {
            if (event.entering && event.node.type === "code_block")
                blocks.push(JSON.stringify([event.node.info || "", event.node.literal]));
        }
    }
    return blocks;
}
function introducesCodeBlock(before, after, oldParsed = inspect(before), newParsed = inspect(after)) {
    const existing = new Map();
    for (const key of documentationCodeBlocks(before, oldParsed)) existing.set(key, (existing.get(key) || 0) + 1);
    for (const key of documentationCodeBlocks(after, newParsed)) {
        const count = existing.get(key) || 0;
        if (count === 0) return true;
        existing.set(key, count - 1);
    }
    return false;
}
function canChange(before, after, changes) {
    const old = inspect(before), next = inspect(after);
    if (!old || !next) return false;
    const shiftAt = position => changes.filter(c => c.to <= position)
        .reduce((sum, c) => sum + (c.insertLength || 0) - (c.to - c.from), 0);
    if (old.signature.some((s, i) => s !== next.signature[i]
        && !(i === 2 && !s.endsWith("\n") && next.signature[i].replace(/\r?\n$/, "") === s))) return false;
    // Match the original fences after positional mapping, not merely identical fence text.
    // Otherwise a newly pasted fence could terminate the code earlier while the old one survives.
    for (let i = 0; i < old.locks.length; i++) {
        if (next.locks[i].from !== old.locks[i].from + shiftAt(old.locks[i].from)) return false;
    }
    const outsideLocks = changes.every(({ from, to }) => old.locks.every(lock => {
        if (from !== to) return to <= lock.from || from >= lock.to;
        // Insertion at the end of a protected complete line is safe; start is not.
        return from <= lock.from && lock.from !== 0 || from >= lock.to;
    }));
    if (!outsideLocks) return false;
    // Fences are intact and every change lies inside the run block: the documentation is
    // byte-for-byte unchanged, so the title and code-block checks cannot fail. Skipping them
    // avoids two full CommonMark parses on every keystroke in the code.
    if (changes.every(({ from, to }) => from >= old.codeStart && to <= old.codeEnd)) return true;
    const oldSections = sections(before, old), newSections = sections(after, next);
    if (oldSections.title) {
        if (!newSections.title) return false;
        const title = oldSections.title;
        if (changes.some(({from,to}) => from < title.to && to > title.contentTo
            || from < title.contentFrom && to > title.from
            || from === to && from >= title.from && from < title.contentFrom)) return false;
        if (newSections.title.from !== title.from + shiftAt(title.from)) return false;
        // A reserved description line must not disappear into the code fence.
        if (oldSections.intro.to > oldSections.intro.from
            && newSections.intro.to <= newSections.intro.from) return false;
    }
    return !introducesCodeBlock(before, after, old, next);
}
function fenceTextRanges(text, parsed = inspect(text)) {
    if (!parsed) return [];
    return parsed.locks.slice(1).map(({ from, to }) => {
        while (to > from && (text[to - 1] === "\n" || text[to - 1] === "\r")) to--;
        return { from, to };
    });
}
module.exports = { inspect, canChange, fenceTextRanges, sections, documentationCodeBlocks };
