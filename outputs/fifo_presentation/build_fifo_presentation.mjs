import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;

const root = path.resolve("../..");
const outDir = path.resolve("outputs");
const scratchDir = path.resolve("scratch");
const previewDir = path.join(scratchDir, "preview");
const inspectPath = path.join(scratchDir, "inspect.ndjson");
const pptxPath = path.join(outDir, "TIET_Assertion_Based_FIFO_Verification_Presentation.pptx");

const C = {
  bg: "#F7F9FC",
  paper: "#FFFFFF",
  ink: "#142033",
  muted: "#5C6675",
  line: "#D9E1EC",
  red: "#B5122B",
  redDark: "#7B0D1E",
  teal: "#08756F",
  tealSoft: "#DDF4EF",
  amber: "#D97706",
  amberSoft: "#FFF1D6",
  blue: "#2563EB",
  blueSoft: "#E7F0FF",
  green: "#12805C",
  greenSoft: "#E3F7EC",
  darkPanel: "#162033",
  codeBg: "#101828",
};

const FONT = {
  title: "Poppins",
  body: "Lato",
  mono: "Aptos Mono",
};

const inspectRecords = [];

function img(...parts) {
  return path.join(root, ...parts);
}

function media(name) {
  return path.join(scratchDir, "docx_media", name);
}

async function readImageBlob(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function line(fill = C.line, width = 1) {
  return { style: "solid", fill, width };
}

function noLine() {
  return { style: "solid", fill: "#00000000", width: 0 };
}

function addShape(slide, geometry, x, y, w, h, fill = C.paper, outline = C.line, outlineWidth = 1) {
  return slide.shapes.add({
    geometry,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: outlineWidth ? line(outline, outlineWidth) : noLine(),
  });
}

function styleText(shape, {
  size = 24,
  color = C.ink,
  bold = false,
  face = FONT.body,
  align = "left",
  valign = "top",
  inset = 0,
  autoFit = undefined,
} = {}) {
  shape.text.fontSize = size;
  shape.text.color = color;
  shape.text.bold = bold;
  shape.text.typeface = face;
  shape.text.alignment = align;
  shape.text.verticalAlignment = valign;
  shape.text.insets = typeof inset === "number"
    ? { left: inset, right: inset, top: inset, bottom: inset }
    : inset;
  if (autoFit) {
    shape.text.autoFit = autoFit;
  }
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const box = addShape(slide, "rect", x, y, w, h, "#00000000", "#00000000", 0);
  box.text = text;
  styleText(box, opts);
  inspectRecords.push({ kind: "textbox", text, bbox: [x, y, w, h] });
  return box;
}

function addTitle(slide, title, subtitle = "") {
  addShape(slide, "rect", 0, 0, W, 62, C.paper, "#00000000", 0);
  addShape(slide, "rect", 0, 61, W, 2, C.red, "#00000000", 0);
  addText(slide, title, 52, 18, 940, 34, {
    size: 25,
    bold: true,
    face: FONT.title,
    color: C.ink,
    valign: "middle",
  });
  if (subtitle) {
    addText(slide, subtitle, 925, 19, 300, 30, {
      size: 13,
      color: C.muted,
      align: "right",
      valign: "middle",
    });
  }
}

function addFooter(slide, n) {
  addText(slide, "Assertion-Based Verification of Synchronous FIFO", 52, 684, 600, 20, {
    size: 12,
    color: C.muted,
  });
  addText(slide, String(n).padStart(2, "0"), 1168, 678, 58, 30, {
    size: 16,
    bold: true,
    color: C.red,
    align: "right",
  });
}

function addChip(slide, text, x, y, w, fill = C.tealSoft, color = C.teal) {
  const chip = addShape(slide, "roundRect", x, y, w, 31, fill, "#00000000", 0);
  chip.text = text;
  styleText(chip, { size: 13, bold: true, color, align: "center", valign: "middle", inset: 4 });
  return chip;
}

function addCard(slide, title, body, x, y, w, h, accent = C.teal, fill = C.paper) {
  addShape(slide, "roundRect", x, y, w, h, fill, C.line, 1.1);
  addShape(slide, "rect", x, y, 6, h, accent, "#00000000", 0);
  addText(slide, title, x + 24, y + 20, w - 44, 28, {
    size: 19,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  addText(slide, body, x + 24, y + 60, w - 44, h - 76, {
    size: 16,
    color: C.muted,
    autoFit: "shrinkText",
  });
}

function addCode(slide, code, x, y, w, h, title = "") {
  addShape(slide, "roundRect", x, y, w, h, C.codeBg, "#00000000", 0);
  if (title) {
    addText(slide, title, x + 18, y + 12, w - 36, 18, {
      size: 12,
      bold: true,
      color: "#91D5C9",
      face: FONT.body,
    });
  }
  addText(slide, code, x + 18, y + (title ? 36 : 18), w - 36, h - (title ? 48 : 30), {
    size: 15,
    color: "#F8FAFC",
    face: FONT.mono,
    autoFit: "shrinkText",
  });
}

async function addImage(slide, filePath, x, y, w, h, opts = {}) {
  const image = slide.images.add({
    blob: await readImageBlob(filePath),
    fit: opts.fit || "contain",
    alt: opts.alt || path.basename(filePath),
  });
  image.position = { left: x, top: y, width: w, height: h };
  inspectRecords.push({ kind: "image", path: filePath, bbox: [x, y, w, h] });
  return image;
}

async function addScreenshotPanel(slide, label, filePath, x, y, w, h, accent = C.teal) {
  addShape(slide, "roundRect", x, y, w, h, C.paper, C.line, 1.1);
  addShape(slide, "rect", x, y, w, 34, "#EEF2F7", "#00000000", 0);
  addShape(slide, "rect", x, y + 33, w, 2, accent, "#00000000", 0);
  addText(slide, label, x + 14, y + 7, w - 28, 20, {
    size: 13,
    bold: true,
    color: C.ink,
    valign: "middle",
    autoFit: "shrinkText",
  });
  await addImage(slide, filePath, x + 10, y + 44, w - 20, h - 54, { fit: "contain", alt: label });
}

function arrow(slide, x, y, w, h, color = C.teal) {
  addShape(slide, "rightArrow", x, y, w, h, color, "#00000000", 0);
}

function bulletBlock(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function setBackground(slide) {
  slide.background.fill = C.bg;
}

function addMiniMetric(slide, number, label, x, y, w, color = C.teal) {
  addShape(slide, "roundRect", x, y, w, 88, C.paper, C.line, 1.1);
  addText(slide, number, x + 16, y + 13, w - 32, 30, {
    size: 25,
    bold: true,
    face: FONT.title,
    color,
    align: "center",
  });
  addText(slide, label, x + 16, y + 50, w - 32, 24, {
    size: 13,
    color: C.muted,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slide1(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addShape(slide, "rect", 0, 0, W, H, "#F9FAFB", "#00000000", 0);
  addShape(slide, "rect", 0, 0, 380, H, C.red, "#00000000", 0);
  addShape(slide, "rect", 380, 0, 6, H, C.redDark, "#00000000", 0);
  await addImage(slide, media("image1.jpeg"), 72, 70, 232, 132, { fit: "contain", alt: "TIET logo" });
  addText(slide, "Design Project (PVL292)", 72, 232, 248, 26, {
    size: 17,
    bold: true,
    color: "#FFFFFF",
    align: "center",
  });
  addText(slide, "M.Tech VLSI Design", 72, 264, 248, 24, {
    size: 15,
    color: "#FEE2E2",
    align: "center",
  });
  addText(slide, "ASSERTION-BASED VERIFICATION OF\nSYNCHRONOUS FIFO USING\nSYSTEMVERILOG", 445, 104, 735, 178, {
    size: 34,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addShape(slide, "rect", 448, 301, 156, 4, C.red, "#00000000", 0);
  addText(slide, "Submitted by", 448, 346, 210, 22, { size: 14, color: C.muted, bold: true });
  addText(slide, "Kapil Tripathi\n6025620017", 448, 374, 310, 64, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  addText(slide, "Under supervision of", 818, 346, 270, 22, { size: 14, color: C.muted, bold: true });
  addText(slide, "Dr. Arnab Pattanayak\nDr. Lalit Kumar Baghel", 818, 374, 370, 64, {
    size: 20,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  addText(slide, "Electronics and Communication Engineering Department\nThapar Institute of Engineering & Technology, Patiala\nMay 2026", 448, 552, 740, 72, {
    size: 18,
    color: C.muted,
  });
  addChip(slide, "SystemVerilog + SVA + Scoreboard + Fault Injection", 448, 486, 468, C.tealSoft, C.teal);
}

async function slide2(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Presentation Roadmap", "Project flow");
  addFooter(slide, 2);
  const steps = [
    ["1", "Problem and objective", "Why FIFO control must be verified before reuse."],
    ["2", "DUT architecture", "Synchronous FIFO with separate RAM and controller."],
    ["3", "SV environment", "Generator, driver, monitor, scoreboard, and interface."],
    ["4", "SVA plan", "Assertions bound to internal FIFO control signals."],
    ["5", "Fault results", "Five injected issues with waveform/log evidence."],
    ["6", "Conclusion", "Findings, limitations, and UVM migration path."],
  ];
  const startX = 62;
  const y = 184;
  const w = 180;
  const gap = 20;
  steps.forEach(([num, title, body], i) => {
    const x = startX + i * (w + gap);
    addShape(slide, "ellipse", x + 61, y - 70, 58, 58, i % 2 ? C.blue : C.teal, "#00000000", 0);
    addText(slide, num, x + 61, y - 61, 58, 38, {
      size: 24,
      bold: true,
      color: "#FFFFFF",
      align: "center",
      valign: "middle",
    });
    if (i < steps.length - 1) {
      addShape(slide, "rect", x + 122, y - 43, gap + 56, 4, C.line, "#00000000", 0);
    }
    addCard(slide, title, body, x, y, w, 220, i % 2 ? C.blue : C.teal);
  });
  addText(slide, "The deck follows the same logic as the report, but keeps each result focused on what failed, which checker caught it, and what the waveform proves.", 122, 472, 1030, 54, {
    size: 21,
    color: C.ink,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slide3(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Why FIFO Verification Matters", "Motivation");
  addFooter(slide, 3);
  addText(slide, "A FIFO is simple in concept but sensitive at its boundaries: reset, empty, full, read/write overlap, and pointer wrap.", 72, 96, 800, 56, {
    size: 25,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addCard(slide, "Data ordering", "Oldest accepted write must be the first valid read. A pointer bug can silently repeat or skip stored data.", 72, 190, 320, 164, C.teal);
  addCard(slide, "Flow control", "full and empty are not cosmetic flags. They directly block writes and reads to prevent overflow and underflow.", 72, 378, 320, 164, C.amber);
  addCard(slide, "Reset safety", "The FIFO must start from a known empty state so later traffic is not contaminated by stale count or pointer values.", 430, 378, 320, 164, C.red);
  addCard(slide, "Debug observability", "Assertions expose internal control mistakes immediately, while the scoreboard checks visible data behavior.", 786, 378, 320, 164, C.blue);
  const qx = 492;
  const qy = 174;
  addShape(slide, "roundRect", qx, qy, 640, 150, C.paper, C.line, 1.1);
  addText(slide, "Producer", qx + 36, qy + 56, 130, 30, { size: 20, bold: true, align: "center", valign: "middle" });
  arrow(slide, qx + 176, qy + 58, 86, 26, C.teal);
  addShape(slide, "roundRect", qx + 284, qy + 35, 112, 80, C.tealSoft, C.teal, 1.2);
  addText(slide, "FIFO\nqueue", qx + 300, qy + 51, 80, 50, { size: 18, bold: true, color: C.teal, align: "center", valign: "middle" });
  arrow(slide, qx + 418, qy + 58, 86, 26, C.teal);
  addText(slide, "Consumer", qx + 514, qy + 56, 120, 30, { size: 20, bold: true, align: "center", valign: "middle" });
}

async function slide4(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Why SystemVerilog Over Verilog", "Language choice");
  addFooter(slide, 4);
  addText(slide, "SystemVerilog keeps Verilog-style RTL, but adds verification features that are directly useful for this FIFO project.", 70, 92, 1020, 42, {
    size: 23,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  addShape(slide, "roundRect", 70, 160, 520, 382, C.paper, C.line, 1.2);
  addShape(slide, "roundRect", 690, 160, 520, 382, C.paper, C.line, 1.2);
  addText(slide, "Verilog HDL", 100, 190, 250, 30, { size: 24, bold: true, face: FONT.title, color: C.red });
  addText(slide, bulletBlock([
    "Strong fit for synthesizable RTL modeling",
    "Modules, nets, registers, always blocks",
    "Basic procedural testbenches are possible",
    "Limited language support for reusable verification",
    "Assertions, classes, coverage, and constrained random are not the core Verilog model",
  ]), 100, 244, 430, 214, { size: 18, color: C.ink, autoFit: "shrinkText" });
  addText(slide, "SystemVerilog", 720, 190, 300, 30, { size: 24, bold: true, face: FONT.title, color: C.teal });
  addText(slide, bulletBlock([
    "Unified design, specification, and verification language",
    "Assertions for protocol and temporal properties",
    "Classes, mailboxes, and virtual interfaces for testbench reuse",
    "Constrained random stimulus and functional coverage support",
    "Natural foundation for later UVM migration",
  ]), 720, 244, 430, 214, { size: 18, color: C.ink, autoFit: "shrinkText" });
  addShape(slide, "rightArrow", 603, 306, 74, 44, C.amber, "#00000000", 0);
  addText(slide, "IEEE 1800-2023 describes SystemVerilog support for RTL/gate modeling and testbenches using coverage, assertions, object-oriented programming, and constrained random verification.", 120, 580, 1040, 44, {
    size: 16,
    color: C.muted,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slideOopBasics(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "OOP Concepts in SystemVerilog", "Basic definitions");
  addFooter(slide, 5);
  addText(slide, "SystemVerilog supports object-oriented testbench coding. The idea is to model verification activity as reusable objects instead of only toggling raw signals.", 70, 92, 1040, 48, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  const concepts = [
    ["Class", "Blueprint that groups data and tasks/functions.", "class transaction; ... endclass", C.teal],
    ["Object", "Runtime instance created from a class.", "transaction tr = new();", C.blue],
    ["Encapsulation", "Keep related fields and behavior in one unit.", "transaction stores wr_en, rd_en, data, flags", C.green],
    ["Abstraction", "Use a simple method call while hiding internal steps.", "env.run(); driver.run();", C.amber],
    ["Inheritance", "Create a child class from a parent class.", "class child extends parent;", C.red],
    ["Polymorphism", "Base handle can call child-specific behavior.", "virtual function / task", C.blue],
  ];
  concepts.forEach(([name, meaning, sv, color], i) => {
    const x = 70 + (i % 3) * 390;
    const y = 174 + Math.floor(i / 3) * 178;
    addShape(slide, "roundRect", x, y, 338, 132, C.paper, C.line, 1.1);
    addShape(slide, "rect", x, y, 6, 132, color, "#00000000", 0);
    addText(slide, name, x + 22, y + 18, 142, 26, {
      size: 21,
      bold: true,
      face: FONT.title,
      color,
      valign: "middle",
    });
    addText(slide, meaning, x + 22, y + 52, 292, 36, {
      size: 15,
      color: C.ink,
      autoFit: "shrinkText",
    });
    addText(slide, sv, x + 22, y + 94, 292, 22, {
      size: 12,
      color: C.muted,
      face: FONT.mono,
      autoFit: "shrinkText",
    });
  });
  addText(slide, "For this project, the most visible OOP features are classes, objects, encapsulation, abstraction, mailboxes, randomization, and virtual interfaces.", 114, 568, 1030, 42, {
    size: 18,
    bold: true,
    color: C.ink,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slideOopProject(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "How OOP Appears in This Testbench", "Project mapping");
  addFooter(slide, 6);
  addText(slide, "Your SystemVerilog testbench uses objects to represent FIFO operations and verification components.", 70, 92, 1040, 36, {
    size: 23,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  const y = 174;
  const blocks = [
    ["transaction", "Object for one FIFO operation\nrand oper, rand wr_data\nconstraints control stimulus", C.teal],
    ["generator", "Creates transaction objects\nrandomizes them\nsends using mailbox", C.blue],
    ["driver", "Gets transaction from mailbox\ncalls write() or read()\ndrives virtual fifo_if", C.amber],
    ["monitor", "Samples DUT interface\ncreates observed transaction\nsends to scoreboard", C.green],
    ["scoreboard", "Stores expected queue\ncompares rd_data\ncounts mismatches", C.red],
  ];
  blocks.forEach(([title, body, color], i) => {
    const x = 58 + i * 242;
    addShape(slide, "roundRect", x, y, 200, 132, C.paper, color, 1.2);
    addText(slide, title, x + 16, y + 17, 168, 24, {
      size: 17,
      bold: true,
      face: FONT.title,
      color,
      align: "center",
    });
    addText(slide, body, x + 16, y + 52, 168, 62, {
      size: 13,
      color: C.ink,
      align: "center",
      valign: "middle",
      autoFit: "shrinkText",
    });
    if (i < blocks.length - 1) arrow(slide, x + 205, y + 53, 32, 20, C.muted);
  });
  addShape(slide, "roundRect", 80, 374, 520, 158, C.paper, C.line, 1.1);
  addText(slide, "environment class", 110, 394, 210, 24, {
    size: 21,
    bold: true,
    face: FONT.title,
    color: C.teal,
  });
  addText(slide, "Creates and connects the component objects:\ngen = new(gdmbx);\ndrv = new(gdmbx);\nmon = new(msmbx);\nsco = new(msmbx);", 110, 430, 430, 80, {
    size: 16,
    face: FONT.mono,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addShape(slide, "roundRect", 670, 374, 520, 158, C.paper, C.line, 1.1);
  addText(slide, "Benefit to testing", 700, 394, 210, 24, {
    size: 21,
    bold: true,
    face: FONT.title,
    color: C.red,
  });
  addText(slide, bulletBlock([
    "Cleaner separation of stimulus, driving, monitoring, and checking",
    "Randomized transactions create many read/write cases",
    "Mailboxes decouple components and make data flow clear",
    "Same structure can be migrated naturally toward UVM",
  ]), 700, 430, 430, 80, {
    size: 16,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addText(slide, "Short viva line: SystemVerilog OOP turns the testbench into reusable verification components instead of a single block of procedural signal toggling.", 116, 582, 1030, 36, {
    size: 18,
    bold: true,
    color: C.ink,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slide5(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Synchronous FIFO Basics", "DUT behavior");
  addFooter(slide, 7);
  const y = 180;
  addText(slide, "First-in first-out rule", 70, 98, 400, 30, {
    size: 23,
    bold: true,
    face: FONT.title,
  });
  addText(slide, "The FIFO accepts writes into the tail and reads from the head. Status flags are generated from occupancy count.", 70, 132, 800, 32, {
    size: 18,
    color: C.muted,
  });
  addShape(slide, "roundRect", 90, y, 260, 138, C.paper, C.teal, 1.5);
  addText(slide, "Write side", 122, y + 34, 196, 28, { size: 22, bold: true, align: "center", valign: "middle" });
  addText(slide, "wr_en\nwr_data\nwr_ptr advances", 124, y + 70, 192, 54, { size: 16, color: C.muted, align: "center", valign: "middle" });
  arrow(slide, 372, y + 56, 98, 28, C.teal);
  addShape(slide, "roundRect", 494, y - 20, 292, 178, C.tealSoft, C.teal, 1.6);
  addText(slide, "FIFO storage", 530, y + 18, 220, 30, { size: 22, bold: true, color: C.teal, align: "center" });
  addText(slide, "oldest data at front\nfifo_count tracks occupancy\nfull / empty from count", 532, y + 62, 220, 74, { size: 16, color: C.ink, align: "center", valign: "middle" });
  arrow(slide, 812, y + 56, 98, 28, C.teal);
  addShape(slide, "roundRect", 930, y, 260, 138, C.paper, C.teal, 1.5);
  addText(slide, "Read side", 962, y + 34, 196, 28, { size: 22, bold: true, align: "center", valign: "middle" });
  addText(slide, "rd_en\nrd_data\nrd_ptr advances", 964, y + 70, 192, 54, { size: 16, color: C.muted, align: "center", valign: "middle" });
  addCode(slide, "do_write = wr_en && !full;\ndo_read  = rd_en && !empty;\nfull     = (fifo_count == DEPTH);\nempty    = (fifo_count == 0);", 178, 442, 402, 130, "Key control equations");
  addCard(slide, "Project parameters", "DW = 8 data bits\nAW = 4 address bits\nDEPTH = 2^AW = 16 entries\nfifo_count range = 0..16", 658, 430, 390, 150, C.blue, C.paper);
}

async function slide6(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Design Under Test Architecture", "sync_fifo_ram + sync_ram");
  addFooter(slide, 8);
  addText(slide, "The verified DUT separates control from storage: sync_fifo_ram manages pointers/count/flags, while sync_ram stores data.", 70, 92, 1050, 44, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  const y = 190;
  addShape(slide, "roundRect", 65, y, 200, 120, C.paper, C.line, 1.2);
  addText(slide, "Inputs", 96, y + 20, 138, 26, { size: 21, bold: true, align: "center" });
  addText(slide, "clk, rst\nwr_en, rd_en\nwr_data", 98, y + 54, 134, 50, { size: 15, color: C.muted, align: "center" });
  arrow(slide, 286, y + 47, 78, 26, C.teal);
  addShape(slide, "roundRect", 385, y - 22, 280, 164, C.tealSoft, C.teal, 1.6);
  addText(slide, "FIFO controller", 420, y + 8, 210, 28, { size: 21, bold: true, color: C.teal, align: "center" });
  addText(slide, "wr_ptr, rd_ptr\nfifo_count\ndo_write, do_read\nfull, empty", 422, y + 48, 206, 84, { size: 16, color: C.ink, align: "center" });
  arrow(slide, 686, y + 47, 78, 26, C.teal);
  addShape(slide, "roundRect", 785, y - 22, 280, 164, C.paper, C.line, 1.2);
  addText(slide, "Synchronous RAM", 820, y + 10, 210, 28, { size: 21, bold: true, align: "center" });
  addText(slide, "waddr, raddr\ndin, dout\nwrite enable", 828, y + 54, 194, 58, { size: 16, color: C.muted, align: "center" });
  arrow(slide, 1084, y + 47, 68, 26, C.teal);
  addShape(slide, "roundRect", 1165, y, 70, 120, C.paper, C.line, 1.2);
  addText(slide, "Outputs\n\nrd_data\nfull\nempty", 1170, y + 14, 60, 90, { size: 13, bold: true, align: "center", autoFit: "shrinkText" });
  addShape(slide, "roundRect", 350, 444, 370, 92, C.paper, C.red, 1.3);
  addText(slide, "Bound SVA checker", 380, 462, 310, 24, { size: 20, bold: true, color: C.red, align: "center" });
  addText(slide, "observes internal pointers, count, and accepted operations", 378, 493, 314, 26, { size: 15, color: C.muted, align: "center", autoFit: "shrinkText" });
  addShape(slide, "rect", 522, 332, 3, 94, C.red, "#00000000", 0);
  addShape(slide, "roundRect", 778, 444, 370, 92, C.paper, C.blue, 1.3);
  addText(slide, "Scoreboard model", 808, 462, 310, 24, { size: 20, bold: true, color: C.blue, align: "center" });
  addText(slide, "keeps expected FIFO order using a queue", 808, 493, 310, 26, { size: 15, color: C.muted, align: "center" });
  addShape(slide, "rect", 925, 332, 3, 94, C.blue, "#00000000", 0);
}

async function slide7(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "SystemVerilog Verification Environment", "Class-based testbench");
  addFooter(slide, 9);
  addText(slide, "The environment separates stimulus generation, bus driving, monitoring, and result checking. This makes each failure easier to localize.", 70, 92, 1050, 46, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  const y = 190;
  const blocks = [
    ["Generator", "random\ntransaction", C.teal],
    ["Driver", "drives\nfifo_if", C.teal],
    ["Interface", "clk/rst\nsignals", C.blue],
    ["DUT", "sync_fifo_ram", C.blue],
    ["SVA", "bind checker", C.red],
  ];
  blocks.forEach(([title, body, color], i) => {
    const x = 72 + i * 222;
    addShape(slide, "roundRect", x, y, 174, 96, C.paper, color, 1.4);
    addText(slide, title, x + 16, y + 20, 142, 24, { size: 18, bold: true, color, align: "center" });
    addText(slide, body, x + 16, y + 50, 142, 36, { size: 15, color: C.muted, align: "center", valign: "middle" });
    if (i < blocks.length - 1) arrow(slide, x + 180, y + 34, 42, 22, color);
  });
  addShape(slide, "roundRect", 315, 435, 210, 96, C.paper, C.amber, 1.4);
  addText(slide, "Monitor", 345, 457, 150, 24, { size: 18, bold: true, color: C.amber, align: "center" });
  addText(slide, "samples bus", 345, 490, 150, 24, { size: 15, color: C.muted, align: "center" });
  addShape(slide, "roundRect", 800, 435, 230, 96, C.paper, C.green, 1.4);
  addText(slide, "Scoreboard", 835, 457, 160, 24, { size: 18, bold: true, color: C.green, align: "center" });
  addText(slide, "compares expected\nvs actual data", 835, 486, 160, 36, { size: 15, color: C.muted, align: "center" });
  addShape(slide, "rect", 603, 287, 3, 90, C.amber, "#00000000", 0);
  addShape(slide, "rightArrow", 605, 361, 28, 34, C.amber, "#00000000", 0);
  arrow(slide, 548, 468, 228, 24, C.green);
  addCard(slide, "SystemVerilog features used", "class-based transaction, randomized generator, mailbox communication, virtual interface, bind-based assertions", 70, 570, 1080, 58, C.teal, C.paper);
}

async function slide8(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Assertion-Based Verification Plan", "SVA checker");
  addFooter(slide, 10);
  addText(slide, "Assertions observe internal controller state and state exactly what must be true after each accepted operation.", 70, 92, 1000, 42, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  const rows = [
    ["RST_STATE", "After reset: empty high, full low, pointers zero, count zero", C.red],
    ["FULL_FLAG / EMPTY_FLAG", "Flags must match fifo_count == DEPTH and fifo_count == 0", C.teal],
    ["COUNT_RANGE", "fifo_count must stay within 0..DEPTH", C.amber],
    ["WRITE_ONLY", "write pointer increments, read pointer stable, count increments", C.blue],
    ["READ_ONLY", "read pointer increments, write pointer stable, count decrements", C.blue],
    ["READ_WRITE", "both pointers move while count remains stable", C.green],
    ["READ_EMPTY / WRITE_FULL", "invalid requests must be blocked at boundaries", C.red],
  ];
  rows.forEach(([name, desc, color], i) => {
    const y = 160 + i * 54;
    addShape(slide, "roundRect", 82, y, 240, 38, "#FFFFFF", color, 1.2);
    addText(slide, name, 96, y + 8, 212, 20, { size: 14, bold: true, color, align: "center", valign: "middle" });
    addText(slide, desc, 350, y + 7, 720, 24, { size: 17, color: C.ink, valign: "middle", autoFit: "shrinkText" });
  });
  addCode(slide, "READ_ONLY:\n  (!do_write && do_read) |=>\n    wr_ptr == $past(wr_ptr) &&\n    rd_ptr == $past(rd_ptr) + 1'b1 &&\n    fifo_count == $past(fifo_count) - 1'b1;", 760, 515, 410, 120, "Example property intent");
}

async function slide9(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Fault Injection Methodology", "Negative testing");
  addFooter(slide, 11);
  addText(slide, "Five faulty RTL copies were tested one at a time. The clean testbench and assertion module stayed unchanged.", 70, 92, 1010, 42, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  const flow = [
    ["1", "Start clean", "Run clean design and confirm zero errors"],
    ["2", "Insert one fault", "Copy one buggy design into EDA Playground design.sv"],
    ["3", "Run simulation", "Keep testbench.sv and assert_fifo_ram.sv fixed"],
    ["4", "Capture evidence", "Save transcript failures and EPWave waveform"],
  ];
  flow.forEach(([num, title, body], i) => {
    const x = 78 + i * 292;
    addShape(slide, "ellipse", x + 6, 184, 44, 44, i === 1 ? C.red : C.teal, "#00000000", 0);
    addText(slide, num, x + 6, 190, 44, 30, { size: 20, bold: true, color: "#FFFFFF", align: "center", valign: "middle" });
    addCard(slide, title, body, x, 244, 230, 122, i === 1 ? C.red : C.teal);
    if (i < flow.length - 1) arrow(slide, x + 238, 289, 50, 22, C.muted);
  });
  const issues = [
    ["Issue 1", "Reset count not cleared"],
    ["Issue 2", "Read accepted while empty"],
    ["Issue 3", "Full flag asserted too early"],
    ["Issue 4", "Empty flag asserted one count early"],
    ["Issue 5", "Read pointer does not advance"],
  ];
  issues.forEach(([name, desc], i) => {
    const x = 92 + (i % 3) * 360;
    const y = 448 + Math.floor(i / 3) * 72;
    addShape(slide, "roundRect", x, y, 300, 48, i === 4 ? C.amberSoft : C.paper, i === 4 ? C.amber : C.line, 1.1);
    addText(slide, name, x + 14, y + 13, 72, 20, { size: 13, bold: true, color: i === 4 ? C.amber : C.red, valign: "middle" });
    addText(slide, desc, x + 92, y + 13, 184, 20, { size: 13, color: C.ink, valign: "middle", autoFit: "shrinkText" });
  });
}

async function slide10(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Baseline Expected Behaviour", "Clean RTL");
  addFooter(slide, 12);
  addText(slide, "Before negative testing, the clean FIFO must satisfy normal state transitions and boundary blocking rules.", 70, 92, 1000, 42, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
  });
  addMiniMetric(slide, "0", "expected scoreboard errors for clean run", 96, 160, 260, C.green);
  addMiniMetric(slide, "16", "FIFO depth when AW = 4", 390, 160, 230, C.blue);
  addMiniMetric(slide, "5", "intentional faulty RTL versions", 654, 160, 250, C.red);
  addMiniMetric(slide, "SVA", "structural/protocol checks", 938, 160, 230, C.teal);
  const checks = [
    ["Reset", "wr_ptr = 0, rd_ptr = 0, fifo_count = 0, empty = 1"],
    ["Write-only", "wr_ptr increments and fifo_count increases"],
    ["Read-only", "rd_ptr increments and fifo_count decreases"],
    ["Simultaneous read/write", "both pointers move and fifo_count stays stable"],
    ["Boundary rules", "read blocked when empty; write blocked when full"],
  ];
  checks.forEach(([name, desc], i) => {
    const y = 315 + i * 50;
    addShape(slide, "roundRect", 118, y, 240, 36, C.paper, C.teal, 1.1);
    addText(slide, name, 142, y + 8, 190, 20, { size: 15, bold: true, color: C.teal, align: "center", valign: "middle" });
    addText(slide, desc, 390, y + 7, 720, 22, { size: 17, color: C.ink, valign: "middle", autoFit: "shrinkText" });
  });
  addCode(slide, "Correct RTL target:\nrd_ptr <= rd_ptr + 1'b1;\n\nIssue 5 bug changes this to:\nrd_ptr <= rd_ptr;", 746, 492, 350, 104, "Pointer update example");
}

async function slide11(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Fault Results: Issues 1 and 2", "Reset and underflow protection");
  addFooter(slide, 13);
  addShape(slide, "roundRect", 64, 92, 548, 124, C.paper, C.line, 1.1);
  addShape(slide, "rect", 64, 92, 6, 124, C.red, "#00000000", 0);
  addText(slide, "Issue 1: reset count not cleared", 88, 112, 224, 26, { size: 18, bold: true, face: FONT.title, color: C.ink });
  addText(slide, "Caught by: RST_STATE\nEffect: empty flag wrong after reset", 88, 150, 178, 42, { size: 13, color: C.muted, autoFit: "shrinkText" });
  addCode(slide, "Bug:     fifo_count <= 1;\nCorrect: fifo_count <= 0;", 290, 120, 300, 66);
  addShape(slide, "roundRect", 668, 92, 548, 124, C.paper, C.line, 1.1);
  addShape(slide, "rect", 668, 92, 6, 124, C.amber, "#00000000", 0);
  addText(slide, "Issue 2: read while empty", 692, 112, 224, 26, { size: 18, bold: true, face: FONT.title, color: C.ink });
  addText(slide, "Caught by: READ_EMPTY\nEffect: counter underflow / invalid data", 692, 150, 178, 42, { size: 13, color: C.muted, autoFit: "shrinkText" });
  addCode(slide, "Bug:     assign do_read = rd_en;\nCorrect: assign do_read = rd_en && !empty;", 894, 120, 300, 66);
  await addScreenshotPanel(slide, "Issue 1 waveform: fifo_count starts at 1 during reset", img("images", "issue1", "Screenshot 2026-05-04 125730.png"), 64, 240, 548, 168, C.red);
  await addScreenshotPanel(slide, "Issue 1 log: reset assertion failures", img("images", "issue1", "Screenshot 2026-05-04 130009.png"), 64, 430, 548, 210, C.red);
  await addScreenshotPanel(slide, "Issue 2 waveform: do_read accepted while empty", img("images", "issue2", "Screenshot 2026-05-04 130622.png"), 668, 240, 548, 168, C.amber);
  await addScreenshotPanel(slide, "Issue 2 log: READ_EMPTY, unknown data, count range", img("images", "issue2", "Screenshot 2026-05-04 130312.png"), 668, 430, 548, 210, C.amber);
}

async function slide12(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Fault Result: Issue 3", "Full flag asserted too early");
  addFooter(slide, 14);
  addCode(slide, "Bug:\nassign full = (fifo_count == 1);\n\nCorrect:\nassign full = (fifo_count == DEPTH);", 74, 96, 338, 132, "Bug inserted");
  addCard(slide, "Observed failure", "At fifo_count = 1, the DUT reports full even though 15 locations remain available.", 74, 256, 338, 110, C.amber);
  addCard(slide, "Checker response", "FULL_FLAG assertion compares the flag against fifo_count == DEPTH and fails repeatedly.", 74, 392, 338, 110, C.teal);
  await addScreenshotPanel(slide, "Waveform: full asserted when fifo_count is one", img("images", "issue3", "Screenshot 2026-05-04 131017.png"), 460, 100, 736, 236, C.red);
  await addScreenshotPanel(slide, "Simulation log: repeated FULL_FLAG assertion failures", img("images", "issue3", "Screenshot 2026-05-04 130851.png"), 460, 364, 736, 244, C.red);
  addText(slide, "Interpretation: this bug does not necessarily corrupt data immediately, but it destroys usable FIFO capacity and blocks valid writes too early.", 462, 623, 730, 36, {
    size: 16,
    color: C.muted,
    autoFit: "shrinkText",
  });
}

async function slide13(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Fault Result: Issue 4", "Empty flag asserted one count early");
  addFooter(slide, 15);
  addCode(slide, "Bug:\nassign empty = (fifo_count == 1);\n\nCorrect:\nassign empty = (fifo_count == 0);", 74, 96, 338, 132, "Bug inserted");
  addCard(slide, "Observed failure", "The DUT reports empty while one valid FIFO entry still remains.", 74, 256, 338, 110, C.amber);
  addCard(slide, "Checker response", "EMPTY_FLAG assertion fails because empty no longer represents the true count-zero condition.", 74, 392, 338, 110, C.teal);
  await addScreenshotPanel(slide, "Waveform: empty high while fifo_count equals one", img("images", "issue4", "Screenshot 2026-05-04 131259.png"), 460, 100, 736, 236, C.red);
  await addScreenshotPanel(slide, "Simulation log: EMPTY_FLAG assertion failures", img("images", "issue4", "Screenshot 2026-05-04 131207.png"), 460, 364, 736, 244, C.red);
  addText(slide, "Interpretation: status flag correctness is part of functional correctness because empty directly controls whether reads are accepted.", 462, 623, 730, 36, {
    size: 16,
    color: C.muted,
    autoFit: "shrinkText",
  });
}

async function slide14(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Fault Result: Issue 5", "Read pointer does not advance");
  addFooter(slide, 16);
  addCard(slide, "Real affected RTL file", "rtl/sync_fifo_ram.sv\nThe selected write-side code is correct; the fault is in the read pointer update.", 68, 96, 356, 110, C.blue);
  addCode(slide, "Bug:\nif (do_read) begin\n  rd_ptr <= rd_ptr;\nend\n\nCorrect:\nrd_ptr <= rd_ptr + 1'b1;", 68, 238, 356, 156, "Issue 5 code focus");
  addCard(slide, "Effect", "Valid reads are accepted and fifo_count changes, but rd_ptr remains fixed. The FIFO repeatedly reads the same RAM address.", 68, 422, 356, 120, C.red);
  await addScreenshotPanel(slide, "Waveform: rd_ptr remains fixed while reads occur", img("images", "issue5", "Screenshot 2026-05-04 131456.png"), 470, 96, 744, 250, C.red);
  await addScreenshotPanel(slide, "Simulation log: READ_ONLY assertion and data mismatch", img("images", "issue5", "Screenshot 2026-05-04 131432.png"), 470, 376, 744, 228, C.red);
  addText(slide, "Assertion localizes the internal pointer failure; scoreboard confirms the visible FIFO-order failure.", 472, 622, 740, 32, {
    size: 17,
    bold: true,
    color: C.ink,
    align: "center",
  });
}

async function slide15(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Comparative Result Summary", "Assertions + scoreboard");
  addFooter(slide, 17);
  const x = 56;
  const y = 120;
  const widths = [120, 360, 260, 260, 180];
  const headers = ["Issue", "Fault injected", "Primary assertion", "Scoreboard effect", "Conclusion"];
  const rows = [
    ["1", "fifo_count not cleared on reset", "RST_STATE", "Queue/data mismatch later", "reset state bug"],
    ["2", "do_read ignores empty", "READ_EMPTY, COUNT_RANGE", "Data mismatch after underflow", "boundary bug"],
    ["3", "full high at count 1", "FULL_FLAG", "False full messages", "capacity loss"],
    ["4", "empty high at count 1", "EMPTY_FLAG", "False empty messages", "valid reads blocked"],
    ["5", "rd_ptr stuck during reads", "READ_ONLY", "Expected order breaks", "pointer/data bug"],
  ];
  let currentX = x;
  headers.forEach((h, i) => {
    addShape(slide, "rect", currentX, y, widths[i], 44, C.darkPanel, C.paper, 0.5);
    addText(slide, h, currentX + 8, y + 10, widths[i] - 16, 22, {
      size: 14,
      bold: true,
      color: "#FFFFFF",
      align: "center",
      valign: "middle",
      autoFit: "shrinkText",
    });
    currentX += widths[i];
  });
  rows.forEach((row, r) => {
    let cx = x;
    const ry = y + 44 + r * 70;
    row.forEach((value, c) => {
      const fill = r % 2 ? "#F1F5F9" : C.paper;
      addShape(slide, "rect", cx, ry, widths[c], 70, fill, C.line, 0.8);
      addText(slide, value, cx + 10, ry + 11, widths[c] - 20, 46, {
        size: c === 0 ? 22 : 14,
        bold: c === 0 || c === 2,
        color: c === 0 ? C.red : C.ink,
        align: c === 0 ? "center" : "left",
        valign: "middle",
        autoFit: "shrinkText",
      });
      cx += widths[c];
    });
  });
  addText(slide, "Pattern: assertions catch control/protocol violations at the exact clocked condition; the scoreboard catches externally visible data-order consequences.", 98, 594, 1070, 40, {
    size: 18,
    bold: true,
    color: C.ink,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function slide16(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Key Findings and Contribution", "What the project demonstrates");
  addFooter(slide, 18);
  addText(slide, "The project demonstrates that assertion-based verification improves observability beyond transaction-level checking alone.", 70, 92, 1050, 44, {
    size: 22,
    bold: true,
    face: FONT.title,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addCard(slide, "1. Assertions localize failures", "Internal signals such as wr_ptr, rd_ptr, fifo_count, do_write, and do_read are checked at the clock where the rule is violated.", 78, 176, 344, 180, C.red);
  addCard(slide, "2. Scoreboard validates behavior", "The queue-based reference model confirms whether the output data still follows FIFO order after control faults.", 468, 176, 344, 180, C.teal);
  addCard(slide, "3. Waveforms explain timing", "EPWave evidence connects assertion timestamps to signal transitions, making root cause analysis clear.", 858, 176, 344, 180, C.blue);
  addShape(slide, "roundRect", 126, 432, 1030, 130, C.paper, C.line, 1.1);
  addText(slide, "Main contribution", 160, 454, 240, 28, { size: 22, bold: true, face: FONT.title, color: C.red });
  addText(slide, "A parameterized synchronous FIFO was verified with a SystemVerilog class-based environment, bound SVA checker, scoreboard, and five intentional negative tests. The result is a reusable verification base that can be extended toward UVM.", 160, 492, 920, 46, {
    size: 19,
    color: C.ink,
    autoFit: "shrinkText",
  });
}

async function slide17(presentation) {
  const slide = presentation.slides.add();
  setBackground(slide);
  addTitle(slide, "Conclusion, Future Work, and References", "Close");
  addFooter(slide, 19);
  addCard(slide, "Conclusion", "The clean FIFO behavior was established first. Each injected RTL fault produced assertion or scoreboard failures, proving that the environment can detect reset, boundary, flag, pointer, and data-order bugs.", 70, 100, 540, 172, C.teal);
  addCard(slide, "Future improvements", "Migrate to UVM agents and sequences.\nAdd functional coverage bins for full/empty transitions.\nAdd constrained random regression tests.\nAdd coverage-driven closure and CI simulation scripts.", 670, 100, 540, 172, C.blue);
  addShape(slide, "roundRect", 70, 320, 1140, 276, C.paper, C.line, 1.1);
  addText(slide, "References", 100, 344, 220, 28, { size: 23, bold: true, face: FONT.title, color: C.red });
  addText(slide, [
    "1. IEEE SA, IEEE 1800-2023: SystemVerilog - Unified Hardware Design, Specification, and Verification Language.",
    "2. Accellera, Universal Verification Methodology community and standards pages.",
    "3. Local project report: TIET_Assertion_Based_FIFO_Verification_Report.docx.",
    "4. Project source files: rtl/sync_fifo_ram.sv, rtl/sync_ram.sv, tb/assert_fifo_ram.sv, tb/*.svh.",
    "5. Simulation evidence: EPWave and transcript screenshots from images/issue1 through images/issue5.",
  ].join("\n"), 100, 392, 1000, 114, {
    size: 17,
    color: C.ink,
    autoFit: "shrinkText",
  });
  addText(slide, "Final message: SVA gives precise internal failure localization; the scoreboard proves whether the design still obeys FIFO data ordering.", 100, 536, 1000, 34, {
    size: 19,
    bold: true,
    color: C.teal,
    align: "center",
    autoFit: "shrinkText",
  });
}

async function saveBlobToFile(blob, filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function createDeck() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const builders = [
    slide1, slide2, slide3, slide4, slideOopBasics, slideOopProject, slide5, slide6, slide7, slide8, slide9,
    slide10, slide11, slide12, slide13, slide14, slide15, slide16, slide17,
  ];
  for (const build of builders) {
    await build(presentation);
  }
  return presentation;
}

async function exportDeck(presentation) {
  for (let i = 0; i < presentation.slides.items.length; i += 1) {
    const slide = presentation.slides.items[i];
    const preview = await presentation.export({ slide, format: "png", scale: 1 });
    await saveBlobToFile(preview, path.join(previewDir, `slide-${String(i + 1).padStart(2, "0")}.png`));
  }
  const pptxBlob = await PresentationFile.exportPptx(presentation);
  await pptxBlob.save(pptxPath);
  await fs.writeFile(inspectPath, inspectRecords.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return pptxPath;
}

const presentation = await createDeck();
const output = await exportDeck(presentation);
console.log(output);
process.exit(0);
