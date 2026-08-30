var fs = require("fs");
var content = fs.readFileSync("tests/integration/posts.test.ts", "utf8");
var before = "  if (tag) {
    filtered = filtered.filter((p) => p.tags.some((t) => t.slug === tag));
  }";
var after = before + "
  if (process.env.DEBUG_POSTS) console.error('[DBG]', JSON.stringify(options), 'storeLen=', postsStore.length, 'filtered=', filtered.length, 'ids=', postsStore.map(function(p){return p.id;}));";
var patched = content.replace(before, after);
fs.writeFileSync("tests/integration/posts.test.ts", patched);
console.log("done " + content.length + " -> " + patched.length);