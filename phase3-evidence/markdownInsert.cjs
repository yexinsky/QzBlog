var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  imageWrap: () => imageWrap,
  insertBlock: () => insertBlock,
  insertLinePrefix: () => insertLinePrefix,
  linkWrap: () => linkWrap,
  wrapSelection: () => wrapSelection
});
module.exports = __toCommonJS(stdin_exports);
function wrapSelection(snap, before, after, placeholder) {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const hasSelection = selected.length > 0;
  const inner = hasSelection ? selected : placeholder;
  const insert = before + inner + after;
  const cursor = from + before.length + inner.length;
  return {
    changes: [{ from, to, insert }],
    cursor
  };
}
function linkWrap(snap, placeholder, urlDefault) {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const text = selected || placeholder;
  const before = "[";
  const after = "](" + urlDefault + ")";
  const insert = before + text + after;
  const cursor = from + before.length + text.length + 2;
  return {
    changes: [{ from, to, insert }],
    cursor
  };
}
function imageWrap(snap, placeholder, urlDefault) {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const alt = selected || placeholder;
  const before = "![";
  const after = "](" + urlDefault + ")";
  const insert = before + alt + after;
  const cursor = from + before.length + alt.length + 2;
  return {
    changes: [{ from, to, insert }],
    cursor
  };
}
function insertLinePrefix(snap, prefix) {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const lineStart = lastIndexOf(snap.text, "\n", from - 1) + 1;
  const lineText = readLine(snap.text, lineStart);
  if (lineText.startsWith(prefix)) {
    return {
      changes: [
        { from: lineStart, to: lineStart + prefix.length, insert: "" }
      ],
      cursor: Math.max(from - prefix.length, lineStart)
    };
  }
  const cleaned = lineText.replace(/^([-*+] |\d+\. |\d+\) )/, "");
  const insert = prefix + cleaned;
  return {
    changes: [
      { from: lineStart, to: lineStart + lineText.length, insert }
    ],
    cursor: lineStart + insert.length
  };
}
function insertBlock(snap, before, after, placeholder) {
  const from = Math.min(snap.selectionFrom, snap.selectionTo);
  const to = Math.max(snap.selectionFrom, snap.selectionTo);
  const selected = snap.text.slice(from, to);
  const inner = selected.length > 0 ? selected : placeholder;
  const needsLead = from > 0 && snap.text[from - 1] !== "\n";
  const lead = needsLead ? "\n" : "";
  const trail = !after.endsWith("\n") ? "\n" : "";
  const insert = lead + before + inner + after + trail;
  return {
    changes: [{ from, to, insert }],
    cursor: from + lead.length + before.length + inner.length
  };
}
function lastIndexOf(text, needle, from) {
  if (from < 0)
    return -1;
  for (let i = Math.min(from, text.length - 1); i >= 0; i--) {
    if (text[i] === needle)
      return i;
  }
  return -1;
}
function readLine(text, lineStart) {
  let end = text.indexOf("\n", lineStart);
  if (end === -1)
    end = text.length;
  return text.slice(lineStart, end);
}
