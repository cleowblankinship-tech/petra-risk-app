// api/generatePDF.js
// Renders the polished, client-ready results PDF using jsPDF (pure JavaScript,
// no headless browser / native binaries). This runs reliably on any serverless
// runtime, including Vercel Hobby, with no cold-start binary download.
//
// Exported: generateResultsPDF(opts) -> Buffer  (a real application/pdf)
// Signature is intentionally identical to the previous implementation so
// callers (sendResults.js) need no changes.

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

// ---------------------------------------------------------------------------
// Brand palette (RGB)
// ---------------------------------------------------------------------------
const COLOR = {
  gold: [154, 118, 17],       // #9A7611
  charcoal: [37, 40, 42],     // #25282A
  body: [90, 84, 76],         // warm body text
  muted: [122, 116, 108],     // lighter captions
  cream: [245, 241, 234],     // #F5F1EA
  border: [223, 219, 210],    // hairline borders
  introBg: [254, 247, 232],   // #FEF7E8
  white: [255, 255, 255]
};

// Risk-scale segment colors (match the on-screen results + email)
const SCALE = [
  { name: 'Very\nConservative', range: '0-24', min: 0, max: 24, fill: [232, 184, 78], active: [212, 167, 66], text: [64, 67, 78] },
  { name: 'Conservative', range: '25-44', min: 25, max: 44, fill: [139, 157, 195], active: [107, 125, 163], text: [255, 255, 255] },
  { name: 'Balanced', range: '45-59', min: 45, max: 59, fill: [126, 173, 173], active: [94, 141, 141], text: [255, 255, 255] },
  { name: 'Balanced\nGrowth', range: '60-74', min: 60, max: 74, fill: [107, 142, 127], active: [75, 110, 95], text: [255, 255, 255] },
  { name: 'Growth', range: '75-89', min: 75, max: 89, fill: [151, 100, 145], active: [119, 68, 113], text: [255, 255, 255] },
  { name: 'Aggressive\nGrowth', range: '90-100', min: 90, max: 100, fill: [205, 105, 105], active: [173, 73, 73], text: [255, 255, 255] }
];

const DEFAULT_INTRO_TEXT =
  'This assessment is a starting point, not a verdict. It helps organize a ' +
  'conversation about your goals, your timeline, and how you experience risk, ' +
  'so Petra can ask better questions and tailor your plan to you. Your score ' +
  'reflects how you answered today. The real understanding comes from talking ' +
  'it through together.';

// ---------------------------------------------------------------------------
// Logo (cached)
// ---------------------------------------------------------------------------
let LOGO_CACHE = null; // { dataUri, w, h } or false
function loadLogo() {
  if (LOGO_CACHE === null) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', 'petra-logo-wordmark.png'));
      LOGO_CACHE = {
        dataUri: `data:image/png;base64,${buf.toString('base64')}`,
        w: buf.readUInt32BE(16),
        h: buf.readUInt32BE(20)
      };
    } catch (e) {
      LOGO_CACHE = false;
    }
  }
  return LOGO_CACHE;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : COLOR.charcoal;
}

// Blend an RGB color toward white by t (0..1) — used to dim inactive segments.
function mixWhite(c, t) {
  return [
    Math.round(c[0] + (255 - c[0]) * t),
    Math.round(c[1] + (255 - c[1]) * t),
    Math.round(c[2] + (255 - c[2]) * t)
  ];
}

// Friendly display names for assessment sections.
const SECTION_LABELS = {
  behavioral: 'Investment Mindset',
  traditional: 'Traditional Risk Assessment',
  knowledge: 'Investment Knowledge'
};
function sectionLabel(section) {
  const key = String(section || '').toLowerCase();
  return SECTION_LABELS[key] || section;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function generateResultsPDF(opts) {
  const {
    scores,
    riskBandColor,
    riskBandTextColor,
    narratives = {},
    answers = [],
    introText,
    includeAnswers = true
  } = opts;

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const PW = doc.internal.pageSize.getWidth();   // 612
  const PH = doc.internal.pageSize.getHeight();   // 792
  const M = { left: 50, right: 50, top: 48, bottom: 58 };
  const CW = PW - M.left - M.right;
  const CX = PW / 2;
  let y = M.top;

  const bandRgb = hexToRgb(riskBandColor);
  const bandTextRgb = hexToRgb(riskBandTextColor);

  // -- low-level helpers ----------------------------------------------------
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);

  function ensureSpace(h) {
    if (y + h > PH - M.bottom) {
      doc.addPage();
      y = M.top;
      return true;
    }
    return false;
  }

  // Draw wrapped text starting at (x, y with baseline 'top'), advancing y.
  // Handles mid-paragraph page breaks. Returns nothing; mutates y.
  function paragraph(text, {
    font = 'times', style = 'normal', size = 10.5, color = COLOR.body,
    x = M.left, width = CW, align = 'left', lineGap = 1.42, gapAfter = 0
  } = {}) {
    doc.setFont(font, style);
    doc.setFontSize(size);
    setText(color);
    const lh = size * lineGap;
    const lines = doc.splitTextToSize(String(text == null ? '' : text), width);
    for (const line of lines) {
      ensureSpace(lh);
      const tx = align === 'center' ? x + width / 2 : x;
      doc.text(line, tx, y, { baseline: 'top', align });
      y += lh;
    }
    y += gapAfter;
  }

  // Horizontally center letter-spaced text at cx. jsPDF's align:'center' does
  // not account for setCharSpace, so spaced caps drift right; compute the true
  // spaced width and place with a left origin instead. Caller sets font/color.
  function centeredText(text, cx, yTop, charSpace = 0, baseline = 'top') {
    const base = doc.getTextWidth(text);
    const total = base + Math.max(0, text.length - 1) * charSpace;
    if (charSpace) doc.setCharSpace(charSpace);
    doc.text(text, cx - total / 2, yTop, { baseline });
    if (charSpace) doc.setCharSpace(0);
  }

  // Uppercase, letter-spaced label (Helvetica). Advances y.
  function label(text, { size = 8, color = COLOR.muted, align = 'left', x = M.left, width = CW, charSpace = 1.2, gapAfter = 0 } = {}) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    setText(color);
    ensureSpace(size * 1.3);
    const up = String(text).toUpperCase();
    if (align === 'center') {
      centeredText(up, x + width / 2, y, charSpace);
    } else {
      doc.setCharSpace(charSpace);
      doc.text(up, x, y, { baseline: 'top' });
      doc.setCharSpace(0);
    }
    y += size * 1.3 + gapAfter;
  }

  // Section heading (Helvetica bold) with a short gold rule beneath it.
  function heading(text) {
    ensureSpace(46);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(COLOR.charcoal);
    doc.text(text, M.left, y, { baseline: 'top' });
    y += 20;
    setDraw(COLOR.gold);
    doc.setLineWidth(1.5);
    doc.line(M.left, y, M.left + 34, y);
    y += 12;
  }

  // -- header ---------------------------------------------------------------
  const logo = loadLogo();
  if (logo) {
    const lw = 162;
    const lh = (logo.h / logo.w) * lw;
    try {
      doc.addImage(logo.dataUri, 'PNG', CX - lw / 2, y, lw, lh);
      y += lh + 10;
    } catch (e) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(26); setText(COLOR.charcoal);
      doc.text('PETRA', CX, y, { baseline: 'top', align: 'center' });
      y += 34;
    }
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); setText(COLOR.charcoal);
    doc.text('PETRA', CX, y, { baseline: 'top', align: 'center' });
    y += 34;
  }
  label('Risk Alignment Assessment', { align: 'center', color: COLOR.gold, charSpace: 2.5, size: 9, gapAfter: 12 });

  // divider
  setDraw(COLOR.border);
  doc.setLineWidth(0.75);
  doc.line(M.left, y, PW - M.right, y);
  y += 18;

  // -- intro box ------------------------------------------------------------
  {
    const pad = 16;
    const introLines = (() => {
      doc.setFont('times', 'normal'); doc.setFontSize(10.5);
      return doc.splitTextToSize(introText || DEFAULT_INTRO_TEXT, CW - pad * 2);
    })();
    const boxH = pad + 14 + 6 + introLines.length * (10.5 * 1.42) + pad;
    ensureSpace(boxH);
    setFill(COLOR.introBg); setDraw(COLOR.gold); doc.setLineWidth(1);
    doc.roundedRect(M.left, y, CW, boxH, 6, 6, 'FD');
    const innerY = y + pad;
    let saveY = y;
    y = innerY;
    label('How to Read These Results', { color: COLOR.gold, size: 9, charSpace: 1, x: M.left + pad, width: CW - pad * 2, gapAfter: 6 });
    paragraph(introText || DEFAULT_INTRO_TEXT, { color: COLOR.charcoal, x: M.left + pad, width: CW - pad * 2 });
    y = saveY + boxH + 20;
  }

  // -- score card -----------------------------------------------------------
  {
    // band badge (centered pill)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    const bandText = String(scores.band).toUpperCase();
    const bandCS = 1;
    const bandTextW = doc.getTextWidth(bandText) + Math.max(0, bandText.length - 1) * bandCS;
    const bw = bandTextW + 44;
    const bh = 30;
    ensureSpace(bh + 78);
    setFill(bandRgb);
    doc.roundedRect(CX - bw / 2, y, bw, bh, 15, 15, 'F');
    setText(bandTextRgb);
    centeredText(bandText, CX, y + bh / 2, bandCS, 'middle');
    y += bh + 16;

    // big score
    doc.setFont('helvetica', 'bold'); doc.setFontSize(46); setText(COLOR.gold);
    doc.text(String(scores.overall), CX, y, { baseline: 'top', align: 'center' });
    y += 50;
    label('Risk Alignment Score', { align: 'center', color: COLOR.muted, size: 8.5, charSpace: 1.5, gapAfter: 14 });
  }

  // -- component score boxes ------------------------------------------------
  {
    const gap = 16;
    const bw = (CW - gap) / 2;
    const bh = 92;
    ensureSpace(bh + 10);
    const boxes = [
      { v: scores.behavioral, l: 'Behavioral Component (0-60)', d: 'How you tend to think and feel about risk: your reactions to gains, losses, and uncertainty.' },
      { v: scores.traditional, l: 'Traditional Component (0-40)', d: 'The practical side: your time horizon, experience, and the goals you are prioritizing.' }
    ];
    boxes.forEach((b, i) => {
      const bx = M.left + i * (bw + gap);
      setDraw(COLOR.border); setFill(COLOR.white); doc.setLineWidth(0.75);
      doc.roundedRect(bx, y, bw, bh, 6, 6, 'FD');
      let iy = y + 16;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(26); setText(COLOR.gold);
      doc.text(String(b.v), bx + bw / 2, iy, { baseline: 'top', align: 'center' });
      iy += 32;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setText(COLOR.charcoal);
      centeredText(b.l.toUpperCase(), bx + bw / 2, iy, 0.5);
      iy += 13;
      doc.setFont('times', 'normal'); doc.setFontSize(8.5); setText(COLOR.muted);
      const dl = doc.splitTextToSize(b.d, bw - 24);
      dl.forEach((line) => { doc.text(line, bx + bw / 2, iy, { baseline: 'top', align: 'center' }); iy += 8.5 * 1.3; });
    });
    y += bh + 16;
  }

  // -- understanding the scale ---------------------------------------------
  heading('Understanding the Scale');
  paragraph(
    'Scores closer to 0 typically reflect a preference for stability and capital preservation, ' +
    'where protecting what you have matters more than maximizing growth. Scores closer to 100 tend ' +
    'to indicate comfort with significant market volatility and a focus on long-term wealth ' +
    'accumulation, even when that means accepting substantial short-term fluctuations. Neither ' +
    'approach is better or worse. They represent different priorities, timeframes, and emotional ' +
    'relationships with uncertainty.',
    { gapAfter: 12 }
  );

  // -- risk profile scale ---------------------------------------------------
  {
    const gap = 5;
    const segW = (CW - gap * 5) / 6;
    const segH = 52;
    // Keep the label and the colored bar together on the same page.
    ensureSpace(9 * 1.3 + 10 + segH + 8);
    label('Risk Profile Scale', { align: 'center', color: COLOR.charcoal, size: 9, charSpace: 1.5, gapAfter: 10 });
    SCALE.forEach((seg, i) => {
      const isActive = scores.overall >= seg.min && scores.overall <= seg.max;
      const sx = M.left + i * (segW + gap);
      if (isActive) {
        setFill(seg.fill);
        setDraw(COLOR.gold);
        doc.setLineWidth(2);
        doc.roundedRect(sx, y, segW, segH, 4, 4, 'FD');
      } else {
        const dim = mixWhite(seg.fill, 0.62);
        setFill(dim);
        setDraw(dim);
        doc.setLineWidth(0.5);
        doc.roundedRect(sx, y, segW, segH, 4, 4, 'F');
      }
      // labels
      const nameColor = isActive ? seg.text : COLOR.muted;
      setText(nameColor);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3);
      const nameLines = seg.name.split('\n');
      let ny = y + 9;
      nameLines.forEach((nl) => { doc.text(nl, sx + segW / 2, ny, { baseline: 'top', align: 'center' }); ny += 8; });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.3);
      doc.text(seg.range, sx + segW / 2, y + segH - 12, { baseline: 'top', align: 'center' });
    });
    y += segH + 22;
  }

  // -- narrative sections ---------------------------------------------------
  const sections = [
    ['What Your Score Reflects', narratives.overallSummary],
    ['Behavioral Tendencies and Investment Mindset', narratives.mindsetInsight],
    ['Time Horizon and Risk Capacity', narratives.traditionalInsight],
    ['How These Elements Work Together', narratives.alignmentCheck],
    ['How Petra Uses This Information', narratives.planningRelevance]
  ];
  sections.forEach(([title, body]) => {
    if (!body) return;
    heading(title);
    paragraph(body, { gapAfter: 14 });
  });

  // -- Q&A appendix (advisor copy only) ------------------------------------
  if (includeAnswers && Array.isArray(answers) && answers.length > 0) {
    doc.addPage();
    y = M.top;
    label('Assessment Detail', { align: 'center', color: COLOR.gold, size: 9, charSpace: 2.5, gapAfter: 6 });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); setText(COLOR.charcoal);
    doc.text('Client Responses', CX, y, { baseline: 'top', align: 'center' });
    y += 26;
    setDraw(COLOR.border); doc.setLineWidth(0.75);
    doc.line(M.left, y, PW - M.right, y);
    y += 18;

    // Draws a section group header (once when the section changes).
    function sectionGroupHeader(section) {
      ensureSpace(32);
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); setText(COLOR.gold);
      doc.setCharSpace(0.8);
      doc.text(sectionLabel(section).toUpperCase(), M.left, y, { baseline: 'top' });
      doc.setCharSpace(0);
      y += 15;
      setDraw(COLOR.gold); doc.setLineWidth(1);
      doc.line(M.left, y, PW - M.right, y);
      y += 12;
    }

    let currentSection = null;
    answers.forEach((a, idx) => {
      const section = a.section ? String(a.section) : '';
      const qText = `${idx + 1}. ${a.text || a.question || 'Question'}`;
      const ansText = a.selectedOption != null ? String(a.selectedOption) : 'No answer provided';

      if (section && section !== currentSection) {
        currentSection = section;
        sectionGroupHeader(section);
      }

      // measure question + answer for a clean page break
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      const qLines = doc.splitTextToSize(qText, CW);
      doc.setFont('times', 'normal'); doc.setFontSize(9.5);
      const aLines = doc.splitTextToSize(ansText, CW - 14);
      const blockH = qLines.length * (9.5 * 1.32) + 4 + aLines.length * (9.5 * 1.4) + 12;
      ensureSpace(blockH);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setText(COLOR.charcoal);
      qLines.forEach((line) => { doc.text(line, M.left, y, { baseline: 'top' }); y += 9.5 * 1.32; });
      y += 4;
      // answer with gold left rule
      const aStartY = y;
      doc.setFont('times', 'normal'); doc.setFontSize(9.5); setText(COLOR.body);
      aLines.forEach((line) => { doc.text(line, M.left + 14, y, { baseline: 'top' }); y += 9.5 * 1.4; });
      setDraw(COLOR.gold); doc.setLineWidth(2);
      doc.line(M.left, aStartY + 1, M.left, y - 9.5 * 0.4);
      y += 12;
    });
  }

  // -- footer on every page -------------------------------------------------
  const pages = doc.getNumberOfPages();
  const year = new Date().getFullYear();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setDraw(COLOR.border); doc.setLineWidth(0.5);
    doc.line(M.left, PH - M.bottom + 12, PW - M.right, PH - M.bottom + 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setText(COLOR.muted);
    doc.text(
      'This assessment is for educational purposes only and should not be considered investment advice.',
      CX, PH - M.bottom + 22, { align: 'center', baseline: 'top' }
    );
    doc.setFontSize(6.5);
    doc.text(
      `© ${year} Petra Financial Advisors  ·  2 N Nevada Ave, Suite 1300, Colorado Springs, CO 80903  ·  www.petrafinancial.com`,
      CX, PH - M.bottom + 32, { align: 'center', baseline: 'top' }
    );
    doc.text(`Page ${i} of ${pages}`, PW - M.right, PH - M.bottom + 22, { align: 'right', baseline: 'top' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { generateResultsPDF };
