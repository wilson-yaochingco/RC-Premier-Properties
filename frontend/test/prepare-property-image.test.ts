import { afterEach, describe, expect, it, vi } from "vitest";
import { UPLOAD_REQUEST_TARGET_BYTES } from "@rc/shared";
import { preparePropertyImage } from "../src/features/admin/prepare-property-image";

afterEach(() => vi.unstubAllGlobals());

function browser(outputs: (Blob | null)[]) {
  const bitmap = { width: 5120, height: 3840, close: vi.fn() };
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toBlob: vi.fn((done: (blob: Blob | null) => void) => done(outputs.shift() ?? null)),
  };
  const decode = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decode);
  vi.stubGlobal("document", { createElement: () => canvas });
  return { bitmap, canvas, drawImage, decode };
}

const largeFile = () =>
  new File([new Uint8Array(UPLOAD_REQUEST_TARGET_BYTES + 1)], "home.jpg", {
    type: "image/jpeg",
  });

describe("property image preparation", () => {
  it("returns files at or below the target byte-for-byte without decoding", async () => {
    const { decode } = browser([]);
    for (const size of [10, UPLOAD_REQUEST_TARGET_BYTES]) {
      const file = new File([new Uint8Array(size)], "home.png", { type: "image/png" });
      expect(await preparePropertyImage(file)).toBe(file);
    }
    expect(decode).not.toHaveBeenCalled();
  });

  it("applies orientation, bounds dimensions and steps quality down to fit", async () => {
    const file = largeFile();
    const output = new Blob(["encoded-image"], { type: "image/webp" });
    const { bitmap, canvas, decode, drawImage } = browser([file, output]);
    const prepared = await preparePropertyImage(file);
    expect(decode).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2560, 1920);
    expect(canvas.toBlob.mock.calls.map((call) => call.slice(1))).toEqual([
      ["image/webp", 0.9],
      ["image/webp", 0.8],
    ]);
    expect(prepared.type).toBe("image/webp");
    expect(prepared.name).toBe("home.webp");
    expect(prepared.size).toBe(output.size);
    expect(prepared.lastModified).toBe(file.lastModified);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("rejects an impossible reduction and releases the bitmap", async () => {
    const file = largeFile();
    const { bitmap, canvas } = browser(Array(5).fill(file));
    await expect(preparePropertyImage(file)).rejects.toThrow(
      "could not be reduced below 4 MiB",
    );
    expect(canvas.toBlob).toHaveBeenCalledTimes(5);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("reports decode and encoding failures", async () => {
    const { decode, bitmap } = browser([null]);
    await expect(preparePropertyImage(largeFile())).rejects.toThrow(
      "nothing was uploaded",
    );
    expect(bitmap.close).toHaveBeenCalledOnce();
    decode.mockRejectedValueOnce(new Error("decode failed"));
    await expect(preparePropertyImage(largeFile())).rejects.toThrow(
      "Unable to prepare this photo",
    );
  });
});
