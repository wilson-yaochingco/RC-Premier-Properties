import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { RC_PREMIER_LISTINGS } from "../backend/src/scripts/rc-premier-listings.ts";
import {
  orderPropertyPhotos,
  propertyPhotoDeliveryUrl,
} from "../frontend/src/features/properties/property-photography.ts";

// Offline review/rebuild only. No database, upload provider, or credentials are used.
const args = process.argv.slice(2);
const outputArg = args.indexOf("--output");
assert(outputArg >= 0 && args[outputArg + 1], "Supply --output <review-directory>.");
const output = path.resolve(args[outputArg + 1]!);
const writeAssets = args.includes("--write-assets");
const reviewDirectory = "docs/development/property-photography";
const cache = "node_modules/.cache/photo-reassessment";
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

interface Decision {
  propertyId: string;
  token: string;
  slug: string;
  name: string;
  sourceUrl: string;
  sourceVersion: string;
  sourceSha256: string;
  width: number;
  height: number;
  decision: "retouch" | "crop" | "review" | "exclude";
  reason: string;
  crop?: { left: number; top: number; width: number; height: number };
  patch?: string;
  patchSha256?: string;
  retouchFile?: string;
  retouchSha256?: string;
  approval?: "owner-manual-visual";
  technicalWarning?: string;
  latestAttempt?: {
    file: string;
    trialSha256: string;
    outcome: "accepted" | "rejected";
    reason: string;
    prompt: string;
  };
}

const decisions: Decision[] = JSON.parse(
  await readFile(`${reviewDirectory}/decisions.json`, "utf8"),
);
assert.equal(decisions.length, 23);
assert.equal(new Set(decisions.map((item) => item.token)).size, 23);
const reassessedDecisions = decisions.filter((item) => item.sourceSha256);
assert.equal(reassessedDecisions.length, 22);
const heldTokens = new Set(
  decisions
    .filter((item) => item.decision === "review" || item.decision === "exclude")
    .map((item) => item.token),
);
const excludedCount = decisions.filter((item) => item.decision === "exclude").length;
const pendingCount = decisions.filter((item) => item.decision === "review").length;
const previewCount = 66 - heldTokens.size;
assert.equal(
  RC_PREMIER_LISTINGS.reduce((n, item) => n + item.photos.length, 0),
  66,
);
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
await mkdir(path.join(output, "originals"), { recursive: true });
await mkdir(path.join(output, "after"), { recursive: true });
await mkdir(path.join(output, "rejected-trials"), { recursive: true });

async function download(url: string) {
  const response = await fetch(url);
  assert.equal(response.status, 200, url);
  return Buffer.from(await response.arrayBuffer());
}

const rows: Array<Decision & { before: Buffer; after: Buffer; delivery: string }> = [];
for (const item of reassessedDecisions) {
  const listing = RC_PREMIER_LISTINGS.find(
    (listing) => listing.content?.propertyId === item.propertyId,
  );
  assert(listing && listing.content);
  assert.equal(listing.content.slug, item.slug);
  assert(
    listing.photos.some(
      (photo) => photo.token === item.token && photo.name === item.name,
    ),
  );
  const filename = `${item.slug}-${item.name}`;
  const sourceUrl = `https://res.cloudinary.com/dxevthllf/image/upload/rc-premier-properties/listings/${item.slug}/${filename}.jpg`;
  assert.equal(item.sourceUrl, sourceUrl);
  const cacheFile = `${cache}/${item.token}-${item.name}.jpg`;
  const before = await readFile(cacheFile).catch(() => download(sourceUrl));
  assert.equal(sha256(before), item.sourceSha256, `Changed source: ${item.token}`);
  await writeFile(cacheFile, before);
  const metadata = await sharp(before).metadata();
  assert.equal(metadata.width, item.width);
  assert.equal(metadata.height, item.height);
  const versionedUrl = sourceUrl.replace("upload/", `upload/${item.sourceVersion}/`);
  assert.equal(sha256(await download(versionedUrl)), item.sourceSha256);
  const delivery = propertyPhotoDeliveryUrl(versionedUrl);
  let after = before;
  if (item.decision === "retouch") {
    let patchPixels:
      { data: Buffer; info: { width: number; height: number } } | undefined;
    if (item.retouchFile) {
      assert(item.retouchSha256 && item.approval === "owner-manual-visual");
      after = await readFile(item.retouchFile);
      assert.equal(sha256(after), item.retouchSha256);
      assert.equal(
        delivery,
        `/${item.retouchFile.replaceAll("\\", "/").slice("frontend/public/".length)}`,
      );
      const dimensions = await sharp(after).metadata();
      assert.equal(dimensions.width, item.width);
      assert.equal(dimensions.height, item.height);
    } else {
      assert(item.patch && item.patchSha256);
      const patch = await readFile(path.join(reviewDirectory, item.patch));
      assert.equal(sha256(patch), item.patchSha256);
      patchPixels = await sharp(patch)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(patchPixels.info.width, 370);
      assert.equal(patchPixels.info.height, 196);
      after = await sharp(before)
        .composite([{ input: patch, left: 0, top: 0 }])
        .webp({ lossless: true })
        .toBuffer();
      assert.equal(
        delivery,
        `/media/properties/photography-v1/${item.slug}/${filename}.webp`,
      );
      if (writeAssets) {
        const destination = path.join("frontend/public", delivery);
        await mkdir(path.dirname(destination), { recursive: true });
        const existing = await readFile(destination).catch(() => undefined);
        if (existing)
          assert.equal(
            sha256(existing),
            sha256(after),
            "Refusing to overwrite a different derivative.",
          );
        else await writeFile(destination, after, { flag: "wx" });
      }
    }
    const sourcePixels = await sharp(before).removeAlpha().raw().toBuffer();
    const resultPixels = await sharp(after).removeAlpha().raw().toBuffer();
    assert.equal(sourcePixels.length, resultPixels.length);
    for (let y = 0; y < item.height; y++) {
      for (let x = 0; x < item.width; x++) {
        const alpha = patchPixels
          ? x < 370 && y < 196
            ? patchPixels.data[(y * 370 + x) * 4 + 3]
            : 0
          : (y < 152 && x >= 80 && x < 320) ||
              (y >= 136 && y < 196 && x >= 32 && x < 370)
            ? 255
            : 0;
        assert(
          alpha === 0 || alpha === 255,
          "Repair masks must have exact boundaries.",
        );
        if (alpha) continue;
        const i = (y * item.width + x) * 3;
        assert.equal(resultPixels[i], sourcePixels[i]);
        assert.equal(resultPixels[i + 1], sourcePixels[i + 1]);
        assert.equal(resultPixels[i + 2], sourcePixels[i + 2]);
      }
    }
  } else if (item.decision === "crop") {
    assert(item.crop);
    assert(delivery.includes("c_crop,w_1536,h_1488,x_0,y_200/"));
    after = await download(delivery);
    const dimensions = await sharp(after).metadata();
    assert.equal(dimensions.width, item.crop.width);
    assert.equal(dimensions.height, item.crop.height);
  } else {
    assert.equal(
      delivery,
      versionedUrl,
      "An unresolved image must not receive a trial edit.",
    );
    await copyFile(
      `${cache}/${item.token}-seamless-candidate.png`,
      path.join(output, "rejected-trials", `${item.token}.png`),
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  await writeFile(
    path.join(output, "originals", `${item.token}-${item.name}.jpg`),
    before,
  );
  await writeFile(
    path.join(
      output,
      "after",
      `${item.token}-${item.name}.${item.retouchFile ? "png" : item.decision === "retouch" ? "webp" : "jpg"}`,
    ),
    after,
  );
  rows.push({ ...item, before, after, delivery });
}

const pageHead = `<!doctype html><html lang="en"><meta charset="utf-8"><title>RC Premier photography review</title><style>body{font:16px system-ui;margin:32px;background:#f7f6f2;color:#252c36}h1,h2{font-weight:500}article{border-top:1px solid #bbb;padding:24px 0;break-inside:avoid}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1000px}figure{margin:0}img{width:100%;max-height:540px;object-fit:contain;background:#e8e7e3}code{overflow-wrap:anywhere}figcaption{padding:8px 0}p{max-width:1000px;line-height:1.5}@media(max-width:600px){body{margin:16px}.pair{grid-template-columns:1fr}}</style>`;
let html = `${pageHead}<h1>RC Premier — photography review</h1><p>${previewCount} watermark-free preview images; ${excludedCount} explicitly excluded; ${pendingCount} held for clean sources. All 66 originals remain retained. Rejected trials are never delivered by the website.</p><p><a href="attempts.html">Latest seven repair attempts — accepted and rejected comparisons</a></p>`;
const report = [];
for (const listing of RC_PREMIER_LISTINGS) {
  assert(listing.content);
  const id = listing.content.propertyId;
  const group = rows.filter((row) => row.propertyId === id);
  const allMedia = listing.photos
    .filter((photo) => !heldTokens.has(photo.token))
    .map((photo) => ({
      kind: "image" as const,
      url: `https://res.cloudinary.com/dxevthllf/image/upload/rc-premier-properties/listings/${listing.content!.slug}/${listing.content!.slug}-${photo.name}.jpg`,
      alt: photo.alt,
    }));
  const ordered = orderPropertyPhotos(allMedia);
  assert.equal(ordered.length, allMedia.length);
  assert.equal(new Set(ordered.map((media) => media.url)).size, allMedia.length);
  assert(
    ordered.every((media) =>
      media.url?.includes(`/listings/${listing.content!.slug}/`),
    ),
  );
  html += `<h2>${id}</h2>`;
  html += `<p>${allMedia.length} publishable preview images, from ${listing.photos.length} retained originals.</p>`;
  if (!group.length) {
    html +=
      "<p>All 17 originals are already clean and unchanged. No repair was necessary.</p>";
    continue;
  }
  const composite: OverlayOptions[] = [];
  for (const [index, row] of group.entries()) {
    const label =
      row.decision === "review" || row.decision === "exclude"
        ? `${row.decision === "exclude" ? "EXCLUDED" : "HELD FOR CLEAN SOURCE"} — not in preview`
        : `ACCEPTED ${row.decision.toUpperCase()}`;
    const title = `${id} / ${row.token} / ${row.slug}-${row.name}.jpg`;
    const beforeThumb = await sharp(row.before)
      .resize(540, 590, { fit: "contain", background: "#eeede9" })
      .png()
      .toBuffer();
    const afterThumb = await sharp(row.after)
      .resize(540, 590, { fit: "contain", background: "#eeede9" })
      .png()
      .toBuffer();
    const text = Buffer.from(
      `<svg width="1120" height="82"><rect width="1120" height="82" fill="white"/><g font-family="Arial,sans-serif" fill="#252c36"><text x="12" y="23" font-size="16">${escape(title)}</text><text x="12" y="60" font-size="18">BEFORE — original</text><text x="575" y="60" font-size="18">${escape(label)}</text></g></svg>`,
    );
    composite.push(
      { input: text, left: 0, top: index * 680 },
      { input: beforeThumb, left: 10, top: index * 680 + 82 },
      { input: afterThumb, left: 570, top: index * 680 + 82 },
    );
    const thumb = async (bytes: Buffer) =>
      (
        await sharp(bytes)
          .resize(600, 660, { fit: "inside" })
          .jpeg({ quality: 88 })
          .toBuffer()
      ).toString("base64");
    const beforePath = `originals/${row.token}-${row.name}.jpg`;
    const afterPath = `after/${row.token}-${row.name}.${row.retouchFile ? "png" : row.decision === "retouch" ? "webp" : "jpg"}`;
    html += `<article><h3>${row.token} · ${row.name}</h3><code>${row.slug}-${row.name}.jpg</code><p>${escape(row.reason)}</p><div class="pair"><figure><a href="${beforePath}"><img src="data:image/jpeg;base64,${await thumb(row.before)}" alt="Before ${row.name}"></a><figcaption>BEFORE — ${row.width} × ${row.height}</figcaption></figure><figure><a href="${afterPath}"><img src="data:image/jpeg;base64,${await thumb(row.after)}" alt="${escape(label)} ${row.name}"></a><figcaption>${escape(label)}</figcaption></figure></div></article>`;
    report.push({
      ...row,
      before: undefined,
      after: undefined,
      afterSha256: sha256(row.after),
      websiteOrder: heldTokens.has(row.token)
        ? null
        : ordered.findIndex((media) => media.url === row.sourceUrl) + 1,
    });
  }
  await sharp({
    create: {
      width: 1120,
      height: group.length * 680,
      channels: 3,
      background: "white",
    },
  })
    .composite(composite)
    .png()
    .toFile(path.join(output, `${id}-before-after.png`));
}
await writeFile(path.join(output, "index.html"), html + "</html>");
let attemptsHtml = `${pageHead}<h1>Seven controlled repair attempts</h1><p>Each right-hand image is the actual latest trial, including rejected results. Only accepted repairs enter the preview. Click a photograph for its original resolution.</p>`;
await mkdir(path.join(output, "attempts"), { recursive: true });
for (const listing of RC_PREMIER_LISTINGS) {
  const group = rows.filter(
    (row) => row.propertyId === listing.content?.propertyId && row.latestAttempt,
  );
  if (!group.length) continue;
  attemptsHtml += `<h2>${listing.content!.propertyId}</h2>`;
  const composite: OverlayOptions[] = [];
  for (const [index, row] of group.entries()) {
    const attempt = row.latestAttempt!;
    const trial = await readFile(path.join(cache, attempt.file));
    assert.equal(sha256(trial), attempt.trialSha256);
    const status =
      attempt.outcome === "accepted"
        ? "ACCEPTED — in preview"
        : "REJECTED — not in preview";
    const filename = `attempts/${row.token}-trial-v2.png`;
    await writeFile(path.join(output, filename), trial);
    const zoom = await sharp({
      create: { width: 1552, height: 552, channels: 3, background: "white" },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="1552" height="40"><text x="8" y="28" font-family="Arial" font-size="19">${row.propertyId} / ${row.token} ${row.name} — BEFORE / ${escape(status)}</text></svg>`,
          ),
          left: 0,
          top: 0,
        },
        {
          input: await sharp(row.before)
            .extract({ left: 0, top: 0, width: 768, height: 512 })
            .png()
            .toBuffer(),
          left: 0,
          top: 40,
        },
        {
          input: await sharp(trial)
            .extract({ left: 0, top: 0, width: 768, height: 512 })
            .png()
            .toBuffer(),
          left: 784,
          top: 40,
        },
      ])
      .png()
      .toBuffer();
    const zoomFile = `attempts/${row.token}-detail-comparison.png`;
    await writeFile(path.join(output, zoomFile), zoom);
    const title = `${row.propertyId} / ${row.token} / ${row.slug}-${row.name}.jpg`;
    composite.push(
      {
        input: Buffer.from(
          `<svg width="1120" height="82"><g font-family="Arial" fill="#252c36"><text x="12" y="23" font-size="16">${escape(title)}</text><text x="12" y="60" font-size="18">BEFORE</text><text x="575" y="60" font-size="18">${escape(status)}</text></g></svg>`,
        ),
        left: 0,
        top: index * 680,
      },
      {
        input: await sharp(row.before)
          .resize(540, 590, { fit: "contain", background: "#eeede9" })
          .png()
          .toBuffer(),
        left: 10,
        top: index * 680 + 82,
      },
      {
        input: await sharp(trial)
          .resize(540, 590, { fit: "contain", background: "#eeede9" })
          .png()
          .toBuffer(),
        left: 570,
        top: index * 680 + 82,
      },
    );
    attemptsHtml += `<article><h3>${row.token} · ${row.name}: ${status}</h3><code>${row.slug}-${row.name}.jpg</code><p>${escape(attempt.reason)}</p><div class="pair"><figure><a href="originals/${row.token}-${row.name}.jpg"><img src="originals/${row.token}-${row.name}.jpg" alt="Before ${row.name}"></a><figcaption>BEFORE — original retained</figcaption></figure><figure><a href="${filename}"><img src="${filename}" alt="${escape(status)} ${row.name}"></a><figcaption>${status}</figcaption></figure></div><a href="${zoomFile}">Source-resolution detail comparison</a><img src="${zoomFile}" alt="Watermark-region comparison for ${row.token}"></article>`;
  }
  await sharp({
    create: {
      width: 1120,
      height: group.length * 680,
      channels: 3,
      background: "white",
    },
  })
    .composite(composite)
    .png()
    .toFile(path.join(output, `${listing.content!.propertyId}-latest-attempts.png`));
}
await writeFile(path.join(output, "attempts.html"), attemptsHtml + "</html>");
await writeFile(
  path.join(output, "decisions-and-verification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Verified 66 retained source mappings, ${previewCount} publishable preview images, ${excludedCount} exclusions and ${pendingCount} held originals. Lossless outside-mask checks passed. Review: ${path.join(output, "index.html")}`,
);
