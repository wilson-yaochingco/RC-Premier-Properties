"""Composite authorized edit candidates into bounded review trials; never publish them."""

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--inputs", type=Path, required=True)
parser.add_argument("--sources", type=Path, required=True)
parser.add_argument("--mask", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
decisions = json.loads(Path("docs/development/property-photography/decisions.json").read_text())
by_token = {item["token"]: item for item in decisions}
stencil = cv2.imread(str(args.mask), cv2.IMREAD_GRAYSCALE)
assert stencil is not None and stencil.shape == (220, 400)
assert np.isin(stencil, [0, 255]).all()
assert np.count_nonzero(stencil) < 80000, "Repair stencil is unexpectedly broad."
results = []

for candidate in json.loads(args.inputs.read_text()):
    assert candidate["status"] == "fulfilled", candidate
    candidate = candidate["value"]
    item = by_token[candidate["token"]]
    source_file = args.sources / f"{item['token']}-{item['name']}.jpg"
    source_bytes = source_file.read_bytes()
    assert hashlib.sha256(source_bytes).hexdigest() == item["sourceSha256"]
    original = cv2.imdecode(np.frombuffer(source_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert original.shape == (item["height"], item["width"], 3)
    generated = cv2.imread(candidate["path"])
    assert generated is not None
    assert abs(generated.shape[1] / generated.shape[0] - 1.5) < 0.01
    generated = cv2.resize(generated, (768, 512), interpolation=cv2.INTER_AREA)

    # Padding permits removal where the logo touches the top edge, without retaining its ink.
    destination = cv2.copyMakeBorder(original, 64, 0, 0, 0, cv2.BORDER_REPLICATE)
    destination[:64, :768] = generated[0:1]
    source = destination.copy()
    source[64:576, :768] = generated
    mask = np.zeros(destination.shape[:2], np.uint8)
    mask[64:284, :400] = stencil
    mask[:64, :400] = stencil[0:1]
    mask[0] = 0
    visible_mask = mask[64:] > 0  # OpenCV mutates the mask passed into seamlessClone.
    x, y, width, height = cv2.boundingRect(mask)
    repaired = cv2.seamlessClone(
        source, destination, mask, (x + width // 2, y + height // 2), cv2.NORMAL_CLONE
    )[64:]
    repaired[~visible_mask] = original[~visible_mask]
    assert np.array_equal(repaired[~visible_mask], original[~visible_mask])
    output_file = args.output / f"{item['token']}-trial-v2.png"
    assert cv2.imwrite(str(output_file), repaired)
    panel = np.full((552, 1552, 3), 255, np.uint8)
    panel[40:, :768] = original[:512, :768]
    panel[40:, 784:] = repaired[:512, :768]
    title = f"{item['propertyId']} / {item['token']} {item['name']} | BEFORE / UNREVIEWED TRIAL"
    cv2.putText(panel, title, (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (35, 40, 45), 1)
    assert cv2.imwrite(str(args.output / f"{item['token']}-comparison-v2.png"), panel)
    results.append({
        **candidate,
        "propertyId": item["propertyId"],
        "sourceSha256": item["sourceSha256"],
        "maskSha256": hashlib.sha256(args.mask.read_bytes()).hexdigest(),
        "trialSha256": hashlib.sha256(output_file.read_bytes()).hexdigest(),
        "changedPixels": int(np.count_nonzero(visible_mask)),
        "outsideMaskUnchanged": True,
    })

(args.output / "trial-provenance.json").write_text(json.dumps(results, indent=2) + "\n")
print(f"{len(results)} bounded trials prepared. Visual review is still required; none were published.")
