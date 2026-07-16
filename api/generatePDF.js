// api/generatePDF.js
// Renders the polished, client-ready results PDF from the HTML template
// (api/templates/results-pdf.html) using headless Chromium.
//
// Exported: generateResultsPDF(...) -> Promise<Buffer>
// The buffer is a real application/pdf document suitable for emailing to the
// advisor and/or the client. Callers are responsible for handling failures
// (see sendResults.js, which falls back to a text attachment if this throws).

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Template + asset loading (cached across warm invocations)
// ---------------------------------------------------------------------------

let TEMPLATE_CACHE = null;
let LOGO_DATA_URI_CACHE = null;

function loadTemplate() {
  if (TEMPLATE_CACHE === null) {
    TEMPLATE_CACHE = fs.readFileSync(
      path.join(__dirname, 'templates', 'results-pdf.html'),
      'utf-8'
    );
  }
  return TEMPLATE_CACHE;
}

function loadLogoDataUri() {
  if (LOGO_DATA_URI_CACHE === null) {
    try {
      const logoBuffer = fs.readFileSync(
        path.join(__dirname, '..', 'assets', 'petra-email-logo.png')
      );
      LOGO_DATA_URI_CACHE = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      LOGO_DATA_URI_CACHE = '';
    }
  }
  return LOGO_DATA_URI_CACHE;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Escape user/answer text so it can't break the HTML layout.
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Which risk-scale segment should be highlighted for a given score.
function activeSegmentClasses(score) {
  return {
    ACTIVE_0_24: score <= 24 ? 'active' : '',
    ACTIVE_25_44: score >= 25 && score <= 44 ? 'active' : '',
    ACTIVE_45_59: score >= 45 && score <= 59 ? 'active' : '',
    ACTIVE_60_74: score >= 60 && score <= 74 ? 'active' : '',
    ACTIVE_75_89: score >= 75 && score <= 89 ? 'active' : '',
    ACTIVE_90_100: score >= 90 ? 'active' : ''
  };
}

// Build the "Client Responses" section grouped by assessment area.
function buildQAItems(answers) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return `<p style="text-align:center;color:#6B6862;font-style:italic;">No detailed responses were recorded for this assessment.</p>`;
  }

  return answers
    .map((a) => {
      const section = a.section ? `<span class="qa-section-label">${escapeHtml(a.section)}</span>` : '';
      const question = escapeHtml(a.text || a.question || 'Question');
      const answer = escapeHtml(a.selectedOption != null ? a.selectedOption : 'No answer provided');
      return `
        <div class="qa-item">
            <div class="qa-question">${section}${question}</div>
            <div class="qa-answer">${answer}</div>
        </div>`;
    })
    .join('\n');
}

// A short, client-appropriate framing paragraph for the top of the document.
const DEFAULT_INTRO_TEXT =
  'This assessment is a starting point, not a verdict. It helps organize a ' +
  'conversation about your goals, your timeline, and how you experience risk, ' +
  'so Petra can ask better questions and tailor your plan to you. Your score ' +
  'reflects how you answered today. The real understanding comes from talking ' +
  'it through together.';

// Fill the HTML template with a single client's data.
function renderTemplateHtml({
  scores,
  riskBandColor,
  riskBandTextColor,
  narratives,
  answers,
  introText
}) {
  const template = loadTemplate();
  const logoDataUri = loadLogoDataUri();
  const active = activeSegmentClasses(scores.overall);

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Petra Financial Advisors" />`
    : `<div style="font-family:Arial,sans-serif;font-size:28px;font-weight:800;letter-spacing:0.15em;color:#25282A;">PETRA</div>`;

  const replacements = {
    LOGO: logoHtml,
    INTRO_TEXT: escapeHtml(introText || DEFAULT_INTRO_TEXT),
    RISK_BAND: escapeHtml(scores.band),
    RISK_BAND_COLOR: riskBandColor,
    RISK_BAND_TEXT_COLOR: riskBandTextColor,
    SCORE: escapeHtml(scores.overall),
    BEHAVIORAL_SCORE: escapeHtml(scores.behavioral),
    TRADITIONAL_SCORE: escapeHtml(scores.traditional),
    OVERALL_SUMMARY: escapeHtml(narratives.overallSummary),
    MINDSET_INSIGHT: escapeHtml(narratives.mindsetInsight),
    TRADITIONAL_INSIGHT: escapeHtml(narratives.traditionalInsight),
    ALIGNMENT_CHECK: escapeHtml(narratives.alignmentCheck),
    PLANNING_RELEVANCE: escapeHtml(narratives.planningRelevance),
    QA_ITEMS: buildQAItems(answers),
    YEAR: new Date().getFullYear(),
    ...active
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}

// ---------------------------------------------------------------------------
// Chromium launch (works on Vercel via @sparticuz/chromium, and locally if a
// full Chrome/Chromium is available via PUPPETEER_EXECUTABLE_PATH)
// ---------------------------------------------------------------------------

async function launchBrowser() {
  const puppeteer = require('puppeteer-core');
  const localExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (localExecutable) {
    // Local dev / self-hosted: drive a full Chrome/Chromium already installed
    // on the machine (no @sparticuz/chromium needed).
    return puppeteer.launch({
      executablePath: localExecutable,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }

  // Serverless (Vercel): use the bundled, size-optimized Chromium build.
  const chromium = require('@sparticuz/chromium');
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a polished, client-ready results PDF.
 *
 * @param {Object}  opts
 * @param {Object}  opts.scores            { overall, band, behavioral, traditional }
 * @param {string}  opts.riskBandColor     hex color for the risk-band badge
 * @param {string}  opts.riskBandTextColor hex text color for the badge
 * @param {Object}  opts.narratives        { overallSummary, mindsetInsight,
 *                                           traditionalInsight, alignmentCheck,
 *                                           planningRelevance }
 * @param {Array}   opts.answers           [{ section, text, selectedOption }]
 * @param {string} [opts.introText]        optional custom intro paragraph
 * @returns {Promise<Buffer>} the PDF file contents
 */
async function generateResultsPDF(opts) {
  const html = renderTemplateHtml(opts);

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });

    // Give web fonts a chance to settle so the PDF uses brand typography, but
    // never let a slow/unreachable font host stall us: cap the wait at 4s and
    // fall back to system fonts (Georgia/Arial) if they haven't loaded.
    await Promise.race([
      page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 4000))
    ]);

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0.5in', bottom: '0.7in', left: '0.35in', right: '0.35in' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%; font-family: Arial, sans-serif; font-size:8px; color:#9A9A9A; padding:0 0.5in;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Petra Financial Advisors &middot; Risk Alignment Assessment</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        </div>`
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        /* ignore close errors */
      }
    }
  }
}

module.exports = { generateResultsPDF, renderTemplateHtml };
