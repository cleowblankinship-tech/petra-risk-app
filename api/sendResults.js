// api/sendResults.js
// Vercel Serverless Function for Risk Assessment Email Workflow

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Helper to generate a secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper to get Mountain Time timestamp
function getMountainTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Risk Band Colors (matching style.css and script.js - Single Source of Truth)
function getRiskBandColor(score) {
  if (score <= 24) return '#E8B84E';  // Very Conservative (warm gold)
  if (score <= 44) return '#8B9DC3';  // Conservative (cool blue-gray)
  if (score <= 59) return '#7EADAD';  // Balanced (teal/cyan)
  if (score <= 74) return '#6B8E7F';  // Balanced Growth (forest green)
  if (score <= 89) return '#976491';  // Growth (purple)
  return '#CD6969';  // Aggressive Growth (red)
}

// Risk Band Text Color (for readability on colored backgrounds)
function getRiskBandTextColor(score) {
  if (score <= 24) return '#40434E';  // Very Conservative: dark text on gold
  return '#FFFFFF';  // All others: white text
}

// ============================================================================
// NARRATIVE GENERATION FUNCTIONS (matching script.js exactly)
// ============================================================================

function generateOverallSummary(data) {
  const score = data.overall;
  const band = data.band;
  const behavioral = data.behavioral;
  const traditional = data.traditional;

  let summary = `Your overall score is ${score} out of 100, which places you in the "${band}" range. `;

  if (score <= 24) {
    summary += 'This suggests protecting what you have matters more to you than chasing growth. You value stability and predictability. You probably prefer strategies where the path is clear and the downside is limited. That doesn\'t mean you won\'t take any risk, just that when you do, you need it to feel justified and proportionate.';
  } else if (score <= 44) {
    summary += 'This suggests you\'re open to risk when the reasoning is clear, but you want to understand it first. You\'re not chasing the most aggressive returns, but you\'re also not avoiding all uncertainty. You probably value portfolios that balance growth with protection, and you appreciate explanations that help you see what you own and why.';
  } else if (score <= 59) {
    summary += 'This reflects a middle ground. You get that growth means accepting volatility, but you also want strategies that don\'t feel reckless. You probably make decisions based on evidence more than emotion, and you can handle market swings as long as they aren\'t extreme or dragged out.';
  } else if (score <= 74) {
    summary += 'This indicates you\'re comfortable with meaningful equity exposure and focused on long-term growth. You understand that building wealth means staying invested through cycles, and short-term volatility doesn\'t shake your confidence. You may still want some downside management, not because you panic, but because having a plan for bad markets makes it easier to stick with the good ones.';
  } else if (score <= 89) {
    summary += 'This reflects strong tolerance for volatility and a long-term view. You can likely stay invested through significant drawdowns. You see declines as part of the process, not a reason to bail out. You probably care more about where you end up than what happens in between.';
  } else {
    summary += 'This suggests very high tolerance for volatility and a drive to maximize long-term growth. You probably see market declines as opportunities, not threats. You\'re comfortable with strategies that take patience and conviction, and you don\'t need reassurance when things underperform for a while.';
  }

  summary += ` Your behavioral score (${behavioral} out of 60) and traditional score (${traditional} out of 40) combine to shape this overall picture.`;

  return summary;
}

function generateMindsetInsight(data) {
  const behavioral = data.behavioral;
  const normalized = behavioral / 60;

  let insight = `This score (${behavioral} out of 60) reflects how you tend to think and feel about investment decisions: your natural reactions to gains, losses, and uncertainty. `;

  if (normalized >= 0.75) {
    insight += 'Your responses suggest you stay calm during market turbulence. If the market dropped 20% over a few months, you\'d probably see it as part of the process, not a reason to change course. You likely don\'t obsess over your portfolio, and when you do check and see red numbers, they don\'t create an urgent need to act. You might even view weak periods as a chance to buy more of what you already believe in. This mindset works well with equity-heavy portfolios, where the path to long-term growth always includes short-term pain.';
  } else if (normalized >= 0.55) {
    insight += 'Your responses point to a thoughtful, measured approach. You don\'t panic when markets fall, but you don\'t shrug it off either. If your portfolio dropped 15% during a rough quarter, you\'d want to know why and whether anything fundamental changed. You might feel uneasy, but you probably wouldn\'t act on it, especially if your advisor confirmed the decline was normal market behavior. You want strategies that balance growth with some downside awareness, and you appreciate communication that keeps you steady when things get uncertain.';
  } else if (normalized >= 0.35) {
    insight += 'Your responses show a more cautious relationship with risk. You feel losses more sharply than gains, and market declines can rattle you even when you know they\'re temporary. If your portfolio fell 10% over a few weeks, you\'d want reassurance that the plan still holds. You might not sell right away, but you\'d think hard about it. That doesn\'t mean you can\'t invest successfully, it just means your portfolio shouldn\'t test your limits too often. Lower volatility strategies, clear downside rules, or more conservative positioning might fit you better.';
  } else {
    insight += 'Your responses suggest market volatility feels stressful, and protecting what you have outweighs chasing growth. If your investments dropped just 5-8%, you\'d probably feel anxious and consider moving to cash or something safer. That\'s not a flaw. It\'s honest. The goal isn\'t to change how you feel, it\'s to build a strategy that respects it. That could mean conservative positioning, more frequent check-ins during down markets, or portfolios built for stability even if it costs some long-term return.';
  }

  return insight;
}

function generateTraditionalInsight(data, scores) {
  const traditional = data.traditional;
  const normalized = traditional / 40;

  let insight = `This score (${traditional} out of 40) reflects your time horizon, your comfort with specific market scenarios, and your goals. `;

  const timeHorizon = scores.timeHorizon || 0.5;
  const drawdown = scores.drawdownDiscipline || 0.5;

  if (timeHorizon >= 0.75 && drawdown >= 0.75) {
    insight += 'You have a long time horizon and say you can stay invested through major declines. That\'s a powerful combination. It means you can ride out the bad stretches without being forced to sell at the wrong time. You probably don\'t need your portfolio to work every quarter or even every year. You\'re thinking in decades, not months, and that gives you room to pursue strategies that might look awful short-term but make sense long-term. This kind of mindset supports equity-heavy portfolios, concentrated positions, or approaches that need patience to pay off.';
  } else if (timeHorizon >= 0.75 && drawdown < 0.75) {
    insight += 'You have a long time horizon, which gives you flexibility on paper, but your responses suggest you aren\'t totally comfortable with severe drawdowns. That\'s worth noting. Just because you don\'t need the money for 20 years doesn\'t mean you\'ll sleep well if your portfolio drops 30%. Your advisor can help find a middle path: enough risk to meet your goals without making you miserable during the down cycles.';
  } else if (timeHorizon < 0.5 && drawdown >= 0.75) {
    insight += 'Your time horizon is shorter, but you say you can handle declines. That\'s an interesting mix. You may have near-term needs, but you also don\'t panic when markets drop. Your advisor will probably build your portfolio with both realities in mind: keeping enough stable for what\'s coming while still letting you participate in growth where it fits.';
  } else if (timeHorizon < 0.5) {
    insight += 'Your time horizon is relatively short, which naturally leans toward more conservative positioning. You probably need part of your portfolio to be stable and available, and you may not have the luxury of waiting through long recoveries if the market tanks. That doesn\'t mean zero risk, but it does mean your strategy should reflect that you might need this money sooner, not later.';
  } else {
    insight += 'You have a moderate time horizon and a measured take on market stress. You\'re not super aggressive, but you\'re also not avoiding all volatility. You probably want growth without recklessness, and you value portfolios that balance upside with some downside protection. Your advisor will help dial in that balance based on what you\'re actually trying to do.';
  }

  return insight;
}

function generateAlignmentCheck(data) {
  const behavioral = data.behavioral;
  const traditional = data.traditional;
  const behavioralNorm = behavioral / 60;
  const traditionalNorm = traditional / 40;

  const diff = Math.abs(behavioralNorm - traditionalNorm);

  let alignment = '';

  if (diff < 0.15) {
    alignment = `Your emotional approach to risk and your practical circumstances line up well. Your behavioral score (${behavioral}) and traditional score (${traditional}) tell a consistent story. That makes it easier to build a portfolio that feels right both intellectually and emotionally. You\'re not fighting yourself. Your instincts about what you can handle match your goals and timeline. That consistency is valuable, it means your advisor can focus on execution instead of reconciling mixed signals.`;
  } else if (diff < 0.30) {
    alignment = `There\'s some gap between your emotional comfort with risk (behavioral: ${behavioral}) and your practical capacity for it (traditional: ${traditional}). That\'s common, and not a problem, just something to talk through. You might have the time and goals to support more risk than feels comfortable, or you might feel braver than your situation allows. Your advisor will help close that gap. The goal isn\'t to force you into something that feels wrong, it\'s to find an approach that works on both levels.`;
  } else {
    alignment = `Your behavioral score (${behavioral}) and traditional score (${traditional}) show some real divergence. Maybe you have a long timeline but hate losing money, or maybe you\'re emotionally fine with volatility but need cash soon. These mismatches aren\'t failures, they\'re just realities to work with. The portfolio that comes out of this won\'t be a simple plug-and-play from your score. It\'ll be a thoughtful blend of what you need, what you can handle, and what actually makes sense for your life.`;
  }

  return alignment;
}

function generatePlanningRelevance() {
  return 'We don\'t build portfolios by plugging your score into a formula. This assessment gives us insight into how you think, what matters to you, and where friction might show up between your goals and your comfort level. Your advisor will use these results to frame conversations about portfolio structure: not just what you should own, but why, and how it works in different market conditions. It also helps calibrate communication. Some clients want detailed explanations when markets drop. Others prefer to trust the plan and not hear much. Some need reassurance during volatility. Others want to talk about opportunities. Knowing your tendencies helps us support you the right way at the right time. This also shapes practical calls: how much cash to keep accessible, when to rebalance, how to set up accounts for tax efficiency, and when to revisit your strategy as life shifts. But none of this is automatic. Your advisor will talk through these decisions with you, not for you.';
}

// Generate advisor PDF (text-based, internal use)
function generateAdvisorPDFContent(payload) {
  const { client, scores, flags, answers, meta } = payload;

  let interpretationText = '';
  const score = scores.overall;

  if (score <= 24) {
    interpretationText = 'This profile reflects high loss aversion and strong stability preference, favoring capital preservation and reliability over growth.';
  } else if (score <= 44) {
    interpretationText = 'Moderate loss sensitivity with a measured approach to uncertainty. Comfortable with calculated risk when there is clear rationale.';
  } else if (score <= 59) {
    interpretationText = 'Risk-aware without being risk-averse. Accepts market fluctuation as part of progress and makes decisions based on information rather than emotion.';
  } else if (score <= 74) {
    interpretationText = 'Growth-oriented with adaptive emotional control. Displays confidence under uncertainty and interprets volatility as data rather than danger.';
  } else if (score <= 89) {
    interpretationText = 'Low loss aversion with high return motivation. Demonstrates resilience during drawdowns and comfortable with conviction-based positions.';
  } else {
    interpretationText = 'High risk tolerance with analytical independence. Thrives in complex, uncertain environments where decisions depend on conviction and long-range perspective.';
  }

  let content = `
═══════════════════════════════════════════════════════════════════
   PETRA FINANCIAL ADVISORS — RISK ASSESSMENT REPORT
   Internal Advisor Document
═══════════════════════════════════════════════════════════════════

CLIENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:           ${client.firstName} ${client.lastName}
Email:          ${client.email}
Submitted:      ${meta.timestamp}
Session ID:     ${meta.sessionId || 'N/A'}


RISK ALIGNMENT SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score:  ${scores.overall}/100
Risk Band:      ${scores.band}

Component Breakdown:
  • Behavioral Component:  ${scores.behavioral}/60
  • Traditional Component: ${scores.traditional}/40

${payload.couple ? `
COUPLE COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Delta:      ${scores.deltas.overall} points
Behavioral Delta:   ${scores.deltas.behavioral} points
Traditional Delta:  ${scores.deltas.traditional} points

` : ''}

RISK PROFILE INTERPRETATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${interpretationText}


BEHAVIORAL FLAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${flags && flags.length > 0 ? flags.map(f => `  • ${f}`).join('\n') : '  None identified'}


═══════════════════════════════════════════════════════════════════
   COMPLETE QUESTION & ANSWER SUMMARY
═══════════════════════════════════════════════════════════════════

${answers && answers.length > 0 ? answers.map((a, i) => `
${i + 1}. ${a.section ? `[${a.section}] ` : ''}${a.text}

   Response: ${a.selectedOption}
   ${a.numericValue !== undefined ? `Value: ${a.numericValue}` : ''}

`).join('─────────────────────────────────────────────────────────────────\n') : 'No detailed responses recorded'}

═══════════════════════════════════════════════════════════════════

CONFIDENTIAL — Internal Advisor Document
This assessment contains complete client responses and behavioral analysis.
For advisor use only. Not for client distribution.

© ${new Date().getFullYear()} Petra Financial Advisors
1880 Office Club Pointe, Suite 128
Colorado Springs, CO 80920
www.petrafinancial.com

═══════════════════════════════════════════════════════════════════
`;

  return content;
}

// Main handler
module.exports = async (req, res) => {
  console.log('[sendResults] Function called');
  console.log('[sendResults] Method:', req.method);

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[sendResults] Processing request...');
    const payload = req.body;
    console.log('[sendResults] Client:', payload.client?.firstName, payload.client?.lastName);
    console.log('[sendResults] Score:', payload.scores?.overall);

    // Validate required fields
    if (!payload.client || !payload.client.firstName || !payload.client.lastName ||
        !payload.client.email) {
      return res.status(400).json({ error: 'Missing required client information' });
    }

    if (!payload.scores || !payload.scores.overall) {
      return res.status(400).json({ error: 'Missing score data' });
    }

    // Generate secure token
    const token = generateToken();

    // Get risk band color for styling
    const riskBandColor = getRiskBandColor(payload.scores.overall);

    // Generate all narrative sections for email inclusion
    console.log('[sendResults] Generating narrative sections...');
    const overallSummary = generateOverallSummary(payload.scores);
    const mindsetInsight = generateMindsetInsight(payload.scores);
    const traditionalScores = payload.traditionalScores || {};
    const traditionalInsight = generateTraditionalInsight(payload.scores, traditionalScores);
    const alignmentCheck = generateAlignmentCheck(payload.scores);
    const planningRelevance = generatePlanningRelevance();

    console.log('[sendResults] Generating advisor PDF (text)...');
    const advisorPDF = generateAdvisorPDFContent(payload);

    // ========================================
    // CLIENT EMAIL
    // ========================================

    // Support both BASE_URL and SITE_URL environment variables
    const baseURL = process.env.BASE_URL || process.env.SITE_URL || 'https://petra-risk-app.vercel.app';
    console.log('[sendResults] Base URL for assets:', baseURL);

    // Use PNG logo for better email compatibility
    const logoURL = `${baseURL}/assets/petra-email-logo.png`;
    console.log('[sendResults] Logo URL for email:', logoURL);

    const clientHTMLBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Alignment Assessment Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Crimson Pro', Georgia, serif; background-color: #F5F1EA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EA;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
                    <!-- Logo Header -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 32px 40px;">
                            <img src="${logoURL}" alt="Petra Financial Advisors" width="200" height="auto" style="max-width: 200px; width: 200px; height: auto; display: block; margin: 0 auto;" />
                            <!--[if !mso]><!-->
                            <div style="mso-hide: all; display: none; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 32px; font-weight: 700; color: #9A7611; letter-spacing: 2px; text-align: center; margin-top: 20px;">PETRA FINANCIAL ADVISORS</div>
                            <!--<![endif]-->
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <h1 style="margin: 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 28px; font-weight: 700; color: #25282A; text-align: center;">Thank You, ${payload.client.firstName}</h1>
                        </td>
                    </tr>

                    <!-- Main Message -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #25282A; text-align: center;">We've received your Risk Alignment Assessment and your advisor will be in touch to discuss your results.</p>
                        </td>
                    </tr>

                    <!-- Results Summary Card -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EA; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 32px 24px;">
                                        <h2 style="margin: 0 0 24px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #25282A; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Your Results Summary</h2>

                                        <!-- Risk Band -->
                                        <div align="center" style="margin-bottom: 24px;">
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding: 14px 32px; background-color: ${riskBandColor}; color: #FFFFFF; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 50px; text-align: center;">
                                                        ${payload.scores.band}
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>

                                        <!-- Score -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 8px;">
                                                    <div style="font-size: 56px; font-weight: 700; color: #9A7611; line-height: 1; font-family: 'Brandon Grotesque', Arial, sans-serif;">${payload.scores.overall}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-bottom: 24px;">
                                                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B5B4F; font-weight: 700; font-family: 'Brandon Grotesque', Arial, sans-serif;">Risk Alignment Score</div>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Component Scores -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td width="50%" style="padding-right: 8px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px;">
                                                        <tr>
                                                            <td style="padding: 20px; text-align: center;">
                                                                <div style="font-size: 36px; font-weight: 700; color: #9A7611; margin-bottom: 8px; font-family: 'Brandon Grotesque', Arial, sans-serif;">${payload.scores.behavioral}</div>
                                                                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #25282A; margin-bottom: 8px; font-family: 'Brandon Grotesque', Arial, sans-serif;">Behavioral (0-60)</div>
                                                                <div style="font-size: 13px; line-height: 1.4; color: #6B5B4F;">How you think and feel about risk</div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td width="50%" style="padding-left: 8px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px;">
                                                        <tr>
                                                            <td style="padding: 20px; text-align: center;">
                                                                <div style="font-size: 36px; font-weight: 700; color: #9A7611; margin-bottom: 8px; font-family: 'Brandon Grotesque', Arial, sans-serif;">${payload.scores.traditional}</div>
                                                                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #25282A; margin-bottom: 8px; font-family: 'Brandon Grotesque', Arial, sans-serif;">Traditional (0-40)</div>
                                                                <div style="font-size: 13px; line-height: 1.4; color: #6B5B4F;">Time horizon and goals</div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- How to Read These Results -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A; font-style: italic; text-align: center;">This assessment helps organize our conversation, not define you. Your responses give us a starting point to frame the discussion and ask better questions. Your advisor will use these results to guide your work together, and your investment strategy will be built around who you are, not a score.</p>
                        </td>
                    </tr>

                    <!-- Understanding the Scale -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #25282A;">Understanding the Scale</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">Scores closer to 0 typically reflect a preference for stability and capital preservation, where protecting what you have matters more than maximizing growth. Scores closer to 100 tend to indicate comfort with significant market volatility and a focus on long-term wealth accumulation, even when that means accepting substantial short-term fluctuations. Neither approach is better or worse. They represent different priorities, timeframes, and emotional relationships with uncertainty.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Risk Scale Visualization -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h4 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #25282A; text-align: center;">Risk Profile Scale</h4>

                                        <!-- Risk scale segments in table format -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                            <tr>
                                                <!-- Very Conservative -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall <= 24 ? '#E8B84E' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall <= 24 ? '#9A7611' : '#E5DFD2'}; border-right: none;">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall <= 24 ? '#40434E' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Very Conservative</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall <= 24 ? '#40434E' : '#6B5B4F'};">0-24</div>
                                                </td>
                                                <!-- Conservative -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall >= 25 && payload.scores.overall <= 44 ? '#8B9DC3' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall >= 25 && payload.scores.overall <= 44 ? '#9A7611' : '#E5DFD2'}; border-right: none;">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall >= 25 && payload.scores.overall <= 44 ? '#FFFFFF' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Conservative</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall >= 25 && payload.scores.overall <= 44 ? '#FFFFFF' : '#6B5B4F'};">25-44</div>
                                                </td>
                                                <!-- Balanced -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall >= 45 && payload.scores.overall <= 59 ? '#7EADAD' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall >= 45 && payload.scores.overall <= 59 ? '#9A7611' : '#E5DFD2'}; border-right: none;">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall >= 45 && payload.scores.overall <= 59 ? '#FFFFFF' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Balanced</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall >= 45 && payload.scores.overall <= 59 ? '#FFFFFF' : '#6B5B4F'};">45-59</div>
                                                </td>
                                                <!-- Balanced Growth -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall >= 60 && payload.scores.overall <= 74 ? '#6B8E7F' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall >= 60 && payload.scores.overall <= 74 ? '#9A7611' : '#E5DFD2'}; border-right: none;">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall >= 60 && payload.scores.overall <= 74 ? '#FFFFFF' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Balanced Growth</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall >= 60 && payload.scores.overall <= 74 ? '#FFFFFF' : '#6B5B4F'};">60-74</div>
                                                </td>
                                                <!-- Growth -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall >= 75 && payload.scores.overall <= 89 ? '#976491' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall >= 75 && payload.scores.overall <= 89 ? '#9A7611' : '#E5DFD2'}; border-right: none;">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall >= 75 && payload.scores.overall <= 89 ? '#FFFFFF' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Growth</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall >= 75 && payload.scores.overall <= 89 ? '#FFFFFF' : '#6B5B4F'};">75-89</div>
                                                </td>
                                                <!-- Aggressive Growth -->
                                                <td width="16.66%" style="background-color: ${payload.scores.overall >= 90 ? '#CD6969' : '#F5F1EA'}; padding: 12px 8px; text-align: center; border: 2px solid ${payload.scores.overall >= 90 ? '#9A7611' : '#E5DFD2'};">
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 10px; font-weight: 700; color: ${payload.scores.overall >= 90 ? '#FFFFFF' : '#6B5B4F'}; text-transform: uppercase; margin-bottom: 4px;">Aggressive Growth</div>
                                                    <div style="font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 11px; color: ${payload.scores.overall >= 90 ? '#FFFFFF' : '#6B5B4F'};">90-100</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Overall Summary Section -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EA; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #9A7611; text-transform: uppercase; letter-spacing: 0.05em;">What Your Score Means</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">${overallSummary}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Mindset Insight Section -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #9A7611; text-transform: uppercase; letter-spacing: 0.05em;">Your Behavioral Profile</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">${mindsetInsight}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Traditional Insight Section -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EA; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #9A7611; text-transform: uppercase; letter-spacing: 0.05em;">Time Horizon & Goals</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">${traditionalInsight}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Alignment Check Section -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #9A7611; text-transform: uppercase; letter-spacing: 0.05em;">Alignment Check</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">${alignmentCheck}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Planning Relevance Section -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1EA; border-radius: 8px; border: 1px solid #E5DFD2;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'Brandon Grotesque', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #9A7611; text-transform: uppercase; letter-spacing: 0.05em;">How We'll Use This</h3>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #25282A;">${planningRelevance}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px; border-top: 1px solid #E5DFD2;">
                            <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.7; color: #25282A;">
                                Thank you,<br>
                                <strong>The Petra Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F5F1EA; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #6B5B4F; text-align: center;">
                                This assessment is for educational purposes only and should not be considered investment advice.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const clientTextBody = `
═══════════════════════════════════════════════════════════
THANK YOU
We've received your assessment
═══════════════════════════════════════════════════════════

Hi ${payload.client.firstName},

Thank you for completing the Petra Risk Alignment Assessment.
Your responses have been received and one of our advisors will
review them shortly.

───────────────────────────────────────────────────────────

YOUR RISK ALIGNMENT SCORE

Overall Score:  ${payload.scores.overall}/100
Risk Band:      ${payload.scores.band}

Component Breakdown:
  • Behavioral:  ${payload.scores.behavioral}/60
  • Traditional: ${payload.scores.traditional}/40

───────────────────────────────────────────────────────────

WHAT YOUR SCORE MEANS

${overallSummary}

───────────────────────────────────────────────────────────

YOUR BEHAVIORAL PROFILE

${mindsetInsight}

───────────────────────────────────────────────────────────

TIME HORIZON & GOALS

${traditionalInsight}

───────────────────────────────────────────────────────────

ALIGNMENT CHECK

${alignmentCheck}

───────────────────────────────────────────────────────────

HOW WE'LL USE THIS

${planningRelevance}

───────────────────────────────────────────────────────────

We'll be in touch soon to discuss your results and next steps.

Best regards,
The Petra Team

───────────────────────────────────────────────────────────

Petra Financial Advisors
1880 Office Club Pointe, Suite 128
Colorado Springs, CO 80920
www.petrafinancial.com

═══════════════════════════════════════════════════════════
`;

    // ========================================
    // ADVISOR EMAIL (keep existing)
    // ========================================

    const advisorHTMLBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Risk Assessment Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Crimson Pro', Georgia, serif; background-color: #f8f7f6; -webkit-font-smoothing: antialiased;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; max-width: 600px; box-shadow: 0 4px 6px rgba(37, 40, 42, 0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color: #25282A; padding: 32px 40px; text-align: center; border-bottom: 3px solid #9A7611;">
              <h1 style="margin: 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">RISK ASSESSMENT RECEIVED</h1>
              <p style="margin: 8px 0 0 0; color: #F5F4F1; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; font-weight: 400;">Petra Financial Advisors</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">

              <!-- Client Information -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EFE0; border-left: 3px solid #9A7611; margin-bottom: 32px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.6;">
                      <strong style="font-weight: 600;">Client:</strong> ${payload.client.firstName} ${payload.client.lastName}
                    </p>
                    <p style="margin: 0 0 8px 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.6;">
                      <strong style="font-weight: 600;">Email:</strong> ${payload.client.email}
                    </p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.6;">
                      <strong style="font-weight: 600;">Submitted:</strong> ${payload.meta.timestamp}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Score Section -->
              <div style="text-align: center; margin-bottom: 40px;">
                <p style="margin: 0 0 16px 0; color: #6B6862; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Risk Alignment Score</p>
                <p style="margin: 0 0 12px 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 72px; font-weight: 700; line-height: 1; text-transform: uppercase; letter-spacing: -0.02em;">${payload.scores.overall}</p>
                <span style="display: inline-block; background-color: ${riskBandColor}; color: #FFFFFF; padding: 10px 24px; border-radius: 9999px; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px;">${payload.scores.band}</span>

                <!-- Progress Bar -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                  <tr>
                    <td style="padding: 0;">
                      <div style="width: 100%; max-width: 600px; height: 6px; background: #E8E6E1; border-radius: 3px; overflow: hidden; margin: 0 auto;">
                        <div style="width: ${payload.scores.overall}%; height: 100%; background: linear-gradient(90deg, #9A7611 0%, #B8904A 50%, #93A2BC 100%); border-radius: 3px;"></div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Component Scores -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <!-- Behavioral Component -->
                  <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E8E6E1; padding: 24px; border-radius: 16px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 36px; font-weight: 700; line-height: 1; text-transform: uppercase;">${payload.scores.behavioral}</p>
                    <p style="margin: 0 0 8px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Behavioral (0-60)</p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 13px; line-height: 1.5;">How you tend to think and feel about risk</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Traditional Component -->
                  <td width="48%" style="vertical-align: top; background-color: #FFFFFF; border: 1px solid #E8E6E1; padding: 24px; border-radius: 16px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 36px; font-weight: 700; line-height: 1; text-transform: uppercase;">${payload.scores.traditional}</p>
                    <p style="margin: 0 0 8px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Traditional (0-40)</p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 13px; line-height: 1.5;">Time horizon, experience, and goals</p>
                  </td>
                </tr>
              </table>

              ${payload.couple ? `
              <!-- Couple Comparison -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border-left: 3px solid #9A7611; margin-bottom: 32px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Couple Comparison</p>
                    <p style="margin: 0 0 6px 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.6;">
                      <strong>Overall Delta:</strong> ${payload.scores.deltas.overall} points
                    </p>
                    <p style="margin: 0 0 6px 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.6;">
                      <strong>Behavioral Delta:</strong> ${payload.scores.deltas.behavioral} points
                    </p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.6;">
                      <strong>Traditional Delta:</strong> ${payload.scores.deltas.traditional} points
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${payload.flags && payload.flags.length > 0 ? `
              <!-- Behavioral Flags -->
              <div style="margin-bottom: 32px;">
                <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Behavioral Flags</p>
                <div>
                  ${payload.flags.map(flag => `
                    <span style="display: inline-block; background-color: #F5EFE0; border: 1px solid #9A7611; color: #25282A; padding: 6px 14px; border-radius: 9999px; font-family: 'Crimson Pro', Georgia, serif; font-size: 13px; margin: 0 8px 8px 0;">${flag}</span>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              <!-- Overall Summary Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EFE0; border-left: 3px solid #9A7611; margin-bottom: 24px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">What This Score Means</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7;">${overallSummary}</p>
                  </td>
                </tr>
              </table>

              <!-- Mindset Insight Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E8E6E1; margin-bottom: 24px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Behavioral Profile</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7;">${mindsetInsight}</p>
                  </td>
                </tr>
              </table>

              <!-- Traditional Insight Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EFE0; border-left: 3px solid #9A7611; margin-bottom: 24px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Time Horizon & Goals</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7;">${traditionalInsight}</p>
                  </td>
                </tr>
              </table>

              <!-- Alignment Check Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E8E6E1; margin-bottom: 24px; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Alignment Check</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7;">${alignmentCheck}</p>
                  </td>
                </tr>
              </table>

              <!-- Attachment Notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; border-radius: 10px; margin-bottom: 24px; border: 1px solid #E8E6E1;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; font-weight: 600;">📎 Complete Q&A Attached</p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.6;">The attached document contains all client responses and detailed scoring breakdown.</p>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7; text-align: center;">
                This assessment is for internal use only. Follow up with the client to discuss their results and investment strategy alignment.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #25282A; padding: 32px 40px; text-align: center; border-top: 3px solid #9A7611;">
              <p style="margin: 0 0 4px 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">PETRA FINANCIAL ADVISORS</p>
              <p style="margin: 0; color: #F5F4F1; font-family: 'Crimson Pro', Georgia, serif; font-size: 13px; line-height: 1.7;">
                1880 Office Club Pointe, Suite 128<br>
                Colorado Springs, CO 80920<br>
                <a href="http://www.petrafinancial.com" style="color: #9A7611; text-decoration: none;">www.petrafinancial.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

    const advisorTextBody = `
═══════════════════════════════════════════════════════════
RISK ASSESSMENT RECEIVED
Petra Financial Advisors
═══════════════════════════════════════════════════════════

NEW CLIENT ASSESSMENT

Client: ${payload.client.firstName} ${payload.client.lastName}
Email: ${payload.client.email}
Submitted: ${payload.meta.timestamp}

───────────────────────────────────────────────────────────

RISK ALIGNMENT SCORE

Overall Score:  ${payload.scores.overall}/100
Risk Band:      ${payload.scores.band}

Component Breakdown:
  • Behavioral:  ${payload.scores.behavioral}/60
  • Traditional: ${payload.scores.traditional}/40

${payload.couple ? `
COUPLE COMPARISON
  • Overall Delta:     ${payload.scores.deltas.overall} points
  • Behavioral Delta:  ${payload.scores.deltas.behavioral} points
  • Traditional Delta: ${payload.scores.deltas.traditional} points
` : ''}

${payload.flags && payload.flags.length > 0 ? `
BEHAVIORAL FLAGS
${payload.flags.map(f => `  • ${f}`).join('\n')}
` : ''}

───────────────────────────────────────────────────────────

WHAT THIS SCORE MEANS

${overallSummary}

───────────────────────────────────────────────────────────

BEHAVIORAL PROFILE

${mindsetInsight}

───────────────────────────────────────────────────────────

TIME HORIZON & GOALS

${traditionalInsight}

───────────────────────────────────────────────────────────

ALIGNMENT CHECK

${alignmentCheck}

───────────────────────────────────────────────────────────

ATTACHMENT
The attached document contains all client responses and
detailed scoring breakdown.

This assessment is for internal use only. Follow up with
the client to discuss their results and investment strategy
alignment.

───────────────────────────────────────────────────────────

Petra Financial Advisors
1880 Office Club Pointe, Suite 128
Colorado Springs, CO 80920
www.petrafinancial.com

═══════════════════════════════════════════════════════════
`;

    // ========================================
    // SEND EMAILS VIA POSTMARK
    // ========================================

    console.log('[sendResults] Checking Postmark configuration...');
    console.log('[sendResults] POSTMARK_SERVER_TOKEN exists:', !!process.env.POSTMARK_SERVER_TOKEN);
    console.log('[sendResults] POSTMARK_FROM:', process.env.POSTMARK_FROM || 'risk@petrafinancial.com');

    if (process.env.POSTMARK_SERVER_TOKEN) {
      console.log('[sendResults] Initializing Postmark client...');
      const postmark = require('postmark');
      const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

      // Send advisor email
      console.log('[sendResults] Sending advisor email...');
      try {
        const advisorMessage = await client.sendEmail({
          From: process.env.POSTMARK_FROM || 'risk@petrafinancial.com',
          To: 'risk@petrafinancial.com',
          Subject: `Risk Assessment – ${payload.client.firstName} ${payload.client.lastName} – ${payload.scores.overall} – ${payload.scores.band}`,
          HtmlBody: advisorHTMLBody,
          TextBody: advisorTextBody,
          Attachments: [{
            Name: `petra-risk-assessment-${payload.client.lastName.toLowerCase()}-${Date.now()}.txt`,
            Content: Buffer.from(advisorPDF).toString('base64'),
            ContentType: 'text/plain'
          }]
        });
        console.log('[sendResults] ✓ Advisor email sent successfully:', advisorMessage.MessageID);
      } catch (emailError) {
        console.error('[sendResults] ✗ Error sending advisor email:', emailError.message);
        console.error('[sendResults] Full error:', emailError);
      }

      // Send client email (if requested)
      console.log('[sendResults] Client wants copy:', payload.client.wantsCopy);
      if (payload.client.wantsCopy) {
        console.log('[sendResults] Sending client email to:', payload.client.email);
        try {
          const clientMessage = await client.sendEmail({
            From: process.env.POSTMARK_FROM || 'risk@petrafinancial.com',
            To: payload.client.email,
            Subject: 'Thank you — Your Petra risk assessment is complete',
            HtmlBody: clientHTMLBody,
            TextBody: clientTextBody
          });
          console.log('[sendResults] ✓ Client email sent successfully:', clientMessage.MessageID);
        } catch (emailError) {
          console.error('[sendResults] ✗ Error sending client email:', emailError.message);
          console.error('[sendResults] Full error:', emailError);
        }
      } else {
        console.log('[sendResults] Skipping client email (wantsCopy = false)');
      }
    } else {
      console.log('[sendResults] ⚠ Postmark not configured - emails would be sent here');
      console.log('[sendResults] Set POSTMARK_SERVER_TOKEN environment variable to enable emails');
    }

    // Return success (always, even if email fails - results page should show)
    return res.status(200).json({
      success: true,
      token: token,
      message: 'Assessment submitted successfully'
    });

  } catch (error) {
    console.error('Error in sendResults:', error);
    // Don't block the client - return success anyway
    return res.status(200).json({
      success: true,
      message: 'Assessment submitted (with processing error)',
      error: error.message
    });
  }
};
