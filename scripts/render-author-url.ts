const [url, outputPath = "apps/compat-runner/output/author-banner.png"] = process.argv.slice(2);

if (url === undefined) {
  console.error("Usage: bun run scripts/render-author-url.ts <url> [output-path]");
  process.exit(1);
}

const response = await fetch(url);
if (!response.ok) {
  console.error(`Request failed: ${String(response.status)} ${response.statusText}`);
  process.exit(1);
}

const bytes = await response.arrayBuffer();
await Bun.write(outputPath, bytes);
console.log(`Wrote ${String(bytes.byteLength)} bytes to ${outputPath}`);
