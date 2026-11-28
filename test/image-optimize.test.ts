import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { optimizeImage } from "../src/lib/image.ts";

// optimizeImage talks to FileReader, Image and the canvas, none of which
// exist in Node, so this file stands in fakes for them. The fakes behave the
// way a browser does: the reader and the image answer on a later tick, after
// the handlers have been attached, and each failure can be switched on
// one at a time.
let imageWidth = 1600;
let imageHeight = 900;
let imageShouldError = false;
let readerShouldError = false;
let contextShouldBeNull = false;
let blobShouldBeNull = false;
let drawImageShouldThrow = false;

const imageError = new Error("the image would not load");
const readerError = new Error("the file could not be read");
const drawImageError = new Error("drawImage blew up");
const fakeBlob = new Blob(["fake jpeg"], { type: "image/jpeg" });

const readCalls: File[] = [];
const createElementCalls: string[] = [];
const drawImageCalls: unknown[][] = [];
const toBlobCalls: { type: string; quality: number }[] = [];
const imageInstances: FakeImage[] = [];
let canvasWidth = 0;
let canvasHeight = 0;

const fakeCtx = {
  drawImage(...args: unknown[]) {
    drawImageCalls.push(args);
    if (drawImageShouldThrow) {
      throw drawImageError;
    }
  },
};

class FakeCanvas {
  width = 0;
  height = 0;
  getContext(_type: string) {
    return contextShouldBeNull ? null : fakeCtx;
  }
  toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
    toBlobCalls.push({ type, quality });
    callback(blobShouldBeNull ? null : fakeBlob);
  }
}

const fakeCanvas = new FakeCanvas();

class FakeFileReader {
  onload: ((event: { target: { result: string | null } }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  readAsDataURL(file: File) {
    readCalls.push(file);
    queueMicrotask(() => {
      if (readerShouldError) {
        this.onerror?.(readerError);
      } else {
        this.onload?.({ target: { result: "data:image/png;base64,AAAA" } });
      }
    });
  }
}

class FakeImage {
  width = imageWidth;
  height = imageHeight;
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  constructor() {
    imageInstances.push(this);
  }
  set src(_value: string) {
    // A real image loads after the current code finishes, once the handlers
    // are attached, so answer on a later tick too.
    queueMicrotask(() => {
      if (imageShouldError) {
        this.onerror?.(imageError);
      } else {
        this.onload?.();
      }
    });
  }
}

const globals = globalThis as unknown as Record<string, unknown>;
globals.FileReader = FakeFileReader;
globals.Image = FakeImage;
globals.document = {
  createElement(tag: string) {
    createElementCalls.push(tag);
    return fakeCanvas;
  },
};

function resetFakes() {
  imageWidth = 1600;
  imageHeight = 900;
  imageShouldError = false;
  readerShouldError = false;
  contextShouldBeNull = false;
  blobShouldBeNull = false;
  drawImageShouldThrow = false;
  readCalls.length = 0;
  createElementCalls.length = 0;
  drawImageCalls.length = 0;
  toBlobCalls.length = 0;
  imageInstances.length = 0;
  canvasWidth = 0;
  canvasHeight = 0;
  fakeCanvas.width = 0;
  fakeCanvas.height = 0;
}

// The fake canvas is one shared object, so watch what optimizeImage does to
// it through a getter instead of reading it after the fact.
Object.defineProperty(fakeCanvas, "width", {
  get: () => canvasWidth,
  set: (value: number) => {
    canvasWidth = value;
  },
  configurable: true,
});
Object.defineProperty(fakeCanvas, "height", {
  get: () => canvasHeight,
  set: (value: number) => {
    canvasHeight = value;
  },
  configurable: true,
});

beforeEach(resetFakes);

function photo() {
  return new File(["not a real photo"], "photo.png", { type: "image/png" });
}

test("a wide photo comes back resized, drawn and compressed as a jpeg", async () => {
  const file = photo();
  const result = await optimizeImage(file);

  assert.equal(result, fakeBlob);
  assert.deepEqual(readCalls, [file]);
  assert.deepEqual(createElementCalls, ["canvas"]);
  assert.equal(canvasWidth, 800);
  assert.equal(canvasHeight, 450);
  assert.equal(drawImageCalls.length, 1);
  assert.equal(imageInstances.length, 1);
  assert.equal(drawImageCalls[0][0], imageInstances[0]);
  assert.deepEqual(drawImageCalls[0].slice(1), [0, 0, 800, 450]);
  assert.deepEqual(toBlobCalls, [{ type: "image/jpeg", quality: 0.8 }]);
});

// The drawImage call gets the fake image itself, so the happy path above
// checks it against the instance the code created.

test("a tall photo with custom limits and quality uses those instead", async () => {
  imageWidth = 600;
  imageHeight = 1200;
  await optimizeImage(photo(), 400, 400, 0.5);

  assert.equal(canvasWidth, 200);
  assert.equal(canvasHeight, 400);
  assert.deepEqual(drawImageCalls[0].slice(1), [0, 0, 200, 400]);
  assert.deepEqual(toBlobCalls, [{ type: "image/jpeg", quality: 0.5 }]);
});

test("a photo that already fits keeps its own size", async () => {
  imageWidth = 400;
  imageHeight = 300;
  await optimizeImage(photo());

  assert.equal(canvasWidth, 400);
  assert.equal(canvasHeight, 300);
  assert.deepEqual(drawImageCalls[0].slice(1), [0, 0, 400, 300]);
});

test("a file that cannot be read rejects instead of hanging", async () => {
  readerShouldError = true;
  await assert.rejects(optimizeImage(photo()), (err: unknown) => err === readerError);
});

test("an image that cannot load rejects instead of hanging", async () => {
  imageShouldError = true;
  await assert.rejects(optimizeImage(photo()), (err: unknown) => err === imageError);
});

test("no canvas context rejects with a plain message", async () => {
  contextShouldBeNull = true;
  await assert.rejects(optimizeImage(photo()), (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.equal(err.message, "Failed to get canvas context");
    return true;
  });
});

test("toBlob giving back nothing rejects with a plain message", async () => {
  blobShouldBeNull = true;
  await assert.rejects(optimizeImage(photo()), (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.equal(err.message, "Canvas to Blob conversion failed");
    return true;
  });
});

test("a drawImage failure rejects with that failure", async () => {
  drawImageShouldThrow = true;
  await assert.rejects(optimizeImage(photo()), (err: unknown) => err === drawImageError);
});
