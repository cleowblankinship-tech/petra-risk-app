// api/pdfHealth.js
// Diagnostic endpoint: verifies that headless Chromium can render the results
// PDF in this deployment environment. Uses dummy data only (no client info).
// Open /api/pdfHealth in a browser; it returns JSON with either { ok: true }
// and the rendered byte size, or { ok: false } with the error and stack so a
// runtime Chromium failure can be diagnosed without server log access.
//
// Safe to delete once PDF generation is confirmed working in production.

const { generateResultsPDF } = require('./generatePDF');

module.exports = async (req, res) => {
  const started = Date.now();
  const info = {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  };

  // Report how the Chromium executable path resolves (a common failure point).
  try {
    const chromium = require('@sparticuz/chromium');
    info.chromiumExecutablePath = await chromium.executablePath();
  } catch (e) {
    info.chromiumResolveError = e.message;
  }

  try {
    const buf = await generateResultsPDF({
      scores: { overall: 50, band: 'Balanced', behavioral: 30, traditional: 20 },
      riskBandColor: '#7EADAD',
      riskBandTextColor: '#FFFFFF',
      narratives: {
        overallSummary: 'Health check summary.',
        mindsetInsight: 'Health check mindset.',
        traditionalInsight: 'Health check traditional.',
        alignmentCheck: 'Health check alignment.',
        planningRelevance: 'Health check planning.'
      },
      answers: [{ section: 'Behavioral', text: 'Health check question?', selectedOption: 'Health check answer' }]
    });

    return res.status(200).json({
      ok: true,
      pdfBytes: buf.length,
      ms: Date.now() - started,
      ...info
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message,
      name: err && err.name,
      stack: (err && err.stack ? err.stack : '').split('\n').slice(0, 15),
      ms: Date.now() - started,
      ...info
    });
  }
};
