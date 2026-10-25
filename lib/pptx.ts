type SlideVisitor = { name: string; notes: string };

// Slide 16:9 em polegadas.
const W = 13.333, H = 7.5, MARGIN = 0.45;
const BG = "06223F", ACCENT = "55B9ED", SOFT = "D1E7F5";

// Largura aproximada de cada caractere em Arial Bold, em "em".
function charWidth(c: string) {
  if (c === " ") return 0.28;
  if ("iljtfrI.,;:'!|".includes(c)) return 0.33;
  if ("MW".includes(c)) return 0.86;
  if ("mw".includes(c)) return 0.84;
  if (c >= "A" && c <= "Z") return 0.73;
  return 0.58;
}
const textWidth = (s: string) => [...s].reduce((sum, c) => sum + charWidth(c), 0);

// Divide as palavras em `n` linhas minimizando a linha mais larga.
function splitLines(words: string[], n: number): string[] {
  if (n <= 1 || words.length <= 1) return [words.join(" ")];
  let best: string[] = [words.join(" ")], bestWidth = Infinity;
  for (let i = 1; i <= words.length - n + 1; i++) {
    const rest = splitLines(words.slice(i), n - 1);
    const lines = [words.slice(0, i).join(" "), ...rest];
    const width = Math.max(...lines.map(textWidth));
    if (width < bestWidth) { bestWidth = width; best = lines; }
  }
  return best;
}

// Escolhe o maior tamanho de fonte (pt) que cabe na caixa, testando 1 a 3 linhas.
function fitText(text: string, boxW: number, boxH: number, maxPt: number, lineHeight = 1.12) {
  const words = text.trim().split(/\s+/);
  let best = { lines: [text], size: 0 };
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    const lines = splitLines(words, n);
    const widest = Math.max(...lines.map(textWidth)) * 1.06;
    const size = Math.floor(Math.min((boxW * 72) / widest, (boxH * 72) / (n * lineHeight), maxPt));
    if (size > best.size) best = { lines, size };
  }
  return best;
}

export async function downloadVisitorsPptx(visitors: SlideVisitor[], dateLabel: string, fileDate: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Visitantes — ${dateLabel}`;
  pptx.company = "ADMSBC";

  const base = (slide: ReturnType<typeof pptx.addSlide>) => {
    slide.background = { color: BG };
    slide.addShape("rect", { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: ACCENT }, line: { color: ACCENT } });
  };

  const welcome = pptx.addSlide();
  base(welcome);
  welcome.addImage({ path: "/logo-admsbc.png", x: W / 2 - 1.1, y: 0.45, w: 2.2, h: 1.5, sizing: { type: "contain", w: 2.2, h: 1.5 } });
  const title = fitText("Sejam bem-vindos!", W - MARGIN * 2, 3.4, 180);
  welcome.addText(title.lines.join("\n"), { x: MARGIN, y: 2.05, w: W - MARGIN * 2, h: 3.4, fontFace: "Arial", bold: true, color: "FFFFFF", fontSize: title.size, align: "center", valign: "middle", margin: 0, fit: "none", lineSpacingMultiple: 0.95 });
  welcome.addText(dateLabel, { x: MARGIN, y: 5.6, w: W - MARGIN * 2, h: 1.2, fontFace: "Arial", bold: true, color: SOFT, fontSize: 60, align: "center", valign: "middle", margin: 0 });

  for (const v of visitors) {
    const slide = pptx.addSlide();
    base(slide);
    const notes = v.notes.trim();
    const nameH = notes ? H - MARGIN * 2 - 1.6 : H - MARGIN * 2 - 0.12;
    const name = fitText(v.name, W - MARGIN * 2, nameH, 260);
    slide.addText(name.lines.join("\n"), { x: MARGIN, y: MARGIN, w: W - MARGIN * 2, h: nameH, fontFace: "Arial", bold: true, color: "FFFFFF", fontSize: name.size, align: "center", valign: "middle", margin: 0, fit: "none", lineSpacingMultiple: 0.95 });
    if (notes) {
      const note = fitText(notes, W - MARGIN * 2, 1.4, 66, 1.15);
      slide.addText(note.lines.join("\n"), { x: MARGIN, y: H - MARGIN - 1.5, w: W - MARGIN * 2, h: 1.4, fontFace: "Arial", color: SOFT, fontSize: note.size, align: "center", valign: "middle", margin: 0, fit: "none" });
    }
  }

  // Tela final: todos os nomes em grade, com a mesma fonte, no maior tamanho que cabe.
  if (visitors.length) {
    const slide = pptx.addSlide();
    base(slide);
    const logoW = 1.75, logoH = 1.2, top = MARGIN + logoH + 0.15;
    slide.addImage({ path: "/logo-admsbc.png", x: W - MARGIN - logoW, y: MARGIN - 0.1, w: logoW, h: logoH, sizing: { type: "contain", w: logoW, h: logoH } });
    slide.addText("Sejam bem-vindos!", { x: MARGIN, y: MARGIN - 0.1, w: W - MARGIN * 2 - logoW - 0.3, h: logoH, fontFace: "Arial", bold: true, color: ACCENT, fontSize: 54, valign: "middle", margin: 0, fit: "none" });
    const areaW = W - MARGIN * 2, areaH = H - top - MARGIN, gap = 0.3;
    const widest = Math.max(...visitors.map(v => textWidth(v.name.trim()))) * 1.06;
    let grid = { cols: 1, rows: visitors.length, size: 0 };
    for (let cols = 1; cols <= Math.min(4, visitors.length); cols++) {
      const rows = Math.ceil(visitors.length / cols);
      const cellW = (areaW - gap * (cols - 1)) / cols, cellH = areaH / rows;
      const size = Math.floor(Math.min((cellW * 72) / widest, (cellH * 72) / 1.2, 120));
      if (size > grid.size) grid = { cols, rows, size };
    }
    const cellW = (areaW - gap * (grid.cols - 1)) / grid.cols, cellH = areaH / grid.rows;
    visitors.forEach((v, i) => {
      const col = Math.floor(i / grid.rows), row = i % grid.rows;
      slide.addText(v.name.trim(), { x: MARGIN + col * (cellW + gap), y: top + row * cellH, w: cellW, h: cellH, fontFace: "Arial", bold: true, color: "FFFFFF", fontSize: grid.size, align: grid.cols === 1 ? "center" : "left", valign: "middle", margin: 0, fit: "none" });
    });
  }

  await pptx.writeFile({ fileName: `visitantes-${fileDate}.pptx` });
}
