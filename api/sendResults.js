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
    insight += 'Your responses point to a thoughtful, measured approach. You don\'t panic when markets fall, but you don\'t shrug it off either. If your portfolio dropped 15% during a rough quarter, you\'d want to know why and whether anything fundamental changed. You might feel uneasy, but you probably wouldn\'t act on it, especially if Petra confirmed the decline was normal market behavior. You want strategies that balance growth with some downside awareness, and you appreciate communication that keeps you steady when things get uncertain.';
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
    insight += 'You have a long time horizon, which gives you flexibility on paper, but your responses suggest you aren\'t totally comfortable with severe drawdowns. That\'s worth noting. Just because you don\'t need the money for 20 years doesn\'t mean you\'ll sleep well if your portfolio drops 30%. Petra can help find a middle path: enough risk to meet your goals without making you miserable during the down cycles.';
  } else if (timeHorizon < 0.5 && drawdown >= 0.75) {
    insight += 'Your time horizon is shorter, but you say you can handle declines. That\'s an interesting mix. You may have near-term needs, but you also don\'t panic when markets drop. Petra will probably build your portfolio with both realities in mind: keeping enough stable for what\'s coming while still letting you participate in growth where it fits.';
  } else if (timeHorizon < 0.5) {
    insight += 'Your time horizon is relatively short, which naturally leans toward more conservative positioning. You probably need part of your portfolio to be stable and available, and you may not have the luxury of waiting through long recoveries if the market tanks. That doesn\'t mean zero risk, but it does mean your strategy should reflect that you might need this money sooner, not later.';
  } else {
    insight += 'You have a moderate time horizon and a measured take on market stress. You\'re not super aggressive, but you\'re also not avoiding all volatility. You probably want growth without recklessness, and you value portfolios that balance upside with some downside protection. Petra will help dial in that balance based on what you\'re actually trying to do.';
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
    alignment = `Your emotional approach to risk and your practical circumstances line up well. Your behavioral score (${behavioral}) and traditional score (${traditional}) tell a consistent story. That makes it easier to build a portfolio that feels right both intellectually and emotionally. You\'re not fighting yourself. Your instincts about what you can handle match your goals and timeline. That consistency is valuable, it means Petra can focus on execution instead of reconciling mixed signals.`;
  } else if (diff < 0.30) {
    alignment = `There\'s some gap between your emotional comfort with risk (behavioral: ${behavioral}) and your practical capacity for it (traditional: ${traditional}). That\'s common, and not a problem, just something to talk through. You might have the time and goals to support more risk than feels comfortable, or you might feel braver than your situation allows. Petra will help close that gap. The goal isn\'t to force you into something that feels wrong, it\'s to find an approach that works on both levels.`;
  } else {
    alignment = `Your behavioral score (${behavioral}) and traditional score (${traditional}) show some real divergence. Maybe you have a long timeline but hate losing money, or maybe you\'re emotionally fine with volatility but need cash soon. These mismatches aren\'t failures, they\'re just realities to work with. The portfolio that comes out of this won\'t be a simple plug-and-play from your score. It\'ll be a thoughtful blend of what you need, what you can handle, and what actually makes sense for your life.`;
  }

  return alignment;
}

function generatePlanningRelevance() {
  return 'We don\'t build portfolios by plugging your score into a formula. This assessment gives us insight into how you think, what matters to you, and where friction might show up between your goals and your comfort level. Petra will use these results to frame conversations about portfolio structure: not just what you should own, but why, and how it works in different market conditions. It also helps calibrate communication. Some clients want detailed explanations when markets drop. Others prefer to trust the plan and not hear much. Some need reassurance during volatility. Others want to talk about opportunities. Knowing your tendencies helps us support you the right way at the right time. This also shapes practical calls: how much cash to keep accessible, when to rebalance, how to set up accounts for tax efficiency, and when to revisit your strategy as life shifts. But none of this is automatic. Petra will talk through these decisions with you, not for you.';
}

// ============================================================================
// UNIFIED EMAIL TEMPLATE SYSTEM
// ============================================================================

// Brand colors (single source of truth)
const EMAIL_COLORS = {
  gold: '#9A7611',
  darkText: '#25282A',
  bodyText: '#6B5B4F',
  lightBg: '#F5F1EA',
  white: '#FFFFFF',
  border: '#E5DFD2',
  footerBg: '#25282A',
  footerText: '#F5F4F1'
};

// Shared email layout wrapper - OUTLOOK COMPATIBLE
function renderEmailLayout({ title, subtitle, bodyHtml, logoURL, isAdvisor = false }) {
  const headerBg = isAdvisor ? EMAIL_COLORS.footerBg : EMAIL_COLORS.white;
  const headerTitleColor = isAdvisor ? EMAIL_COLORS.gold : EMAIL_COLORS.darkText;
  const headerBorderBottom = isAdvisor ? `border-bottom: 3px solid ${EMAIL_COLORS.gold};` : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style>
        table { border-collapse: collapse; }
        td { font-family: Arial, sans-serif; }
    </style>
    <![endif]-->
    <style type="text/css">
        body { margin: 0 !important; padding: 0 !important; }
        table { border-collapse: collapse !important; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: ${EMAIL_COLORS.lightBg}; font-family: Georgia, 'Times New Roman', Times, serif;">
    <!-- Full-width background wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg};">
        <tr>
            <td align="center" valign="top" style="padding: 40px 20px;">
                <!--[if mso]>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center">
                <tr>
                <td>
                <![endif]-->
                <!-- 600px centered container -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: ${EMAIL_COLORS.white};">

                    <!-- Header with Logo (client) or just subtitle (advisor) -->
                    <tr>
                        <td align="center" valign="top" style="padding: 32px 40px 24px 40px; background-color: ${headerBg}; ${headerBorderBottom}">
                            ${!isAdvisor ? `
                            <!-- Logo centered via table (client emails only) -->
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <img src="${logoURL}" alt="Petra Financial Advisors" width="180" border="0" style="display: block; width: 180px; height: auto;" />
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            <!-- Subtitle -->
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: ${isAdvisor ? EMAIL_COLORS.footerText : EMAIL_COLORS.bodyText}; text-transform: uppercase; letter-spacing: 2px;">
                                        Risk Alignment Assessment
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${!isAdvisor ? `
                    <!-- Divider line (for non-advisor) -->
                    <tr>
                        <td style="padding: 0 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-bottom: 1px solid ${EMAIL_COLORS.border}; font-size: 1px; line-height: 1px;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Title Section -->
                    <tr>
                        <td align="center" valign="top" style="padding: ${isAdvisor ? '32px' : '24px'} 40px 16px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: ${isAdvisor ? '22px' : '26px'}; font-weight: bold; color: ${headerTitleColor}; line-height: 1.3;">
                                        ${title}
                                    </td>
                                </tr>
                                ${subtitle ? `
                                <tr>
                                    <td align="center" style="padding-top: 12px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 16px; line-height: 1.6; color: ${EMAIL_COLORS.bodyText};">
                                        ${subtitle}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>

                    <!-- Main Body Content -->
                    <tr>
                        <td valign="top" style="padding: 0 40px 32px 40px;">
                            ${bodyHtml}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" valign="top" style="padding: 24px 40px; background-color: ${EMAIL_COLORS.footerBg};">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; color: ${EMAIL_COLORS.footerText};">
                                        Thank you,<br>
                                        <strong style="color: ${EMAIL_COLORS.gold};">The Petra Team</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: ${EMAIL_COLORS.footerText}; line-height: 1.5;">
                                        Petra Financial Advisors<br>
                                        2 N Nevada Ave, Suite 1300<br>
                                        Colorado Springs, CO 80903<br>
                                        <a href="https://www.petrafinancial.com" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">www.petrafinancial.com</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #888888; line-height: 1.5;">
                                        ${isAdvisor ? 'This assessment is for internal use only.' : 'This assessment is for educational purposes only and should not be considered investment advice.'}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// Render risk scale visualization - OUTLOOK COMPATIBLE
function renderRiskScale(score) {
  const bands = [
    { name: 'Very Conserv.', range: '0-24', min: 0, max: 24, color: '#E8B84E', textColor: '#40434E' },
    { name: 'Conservative', range: '25-44', min: 25, max: 44, color: '#8B9DC3', textColor: '#FFFFFF' },
    { name: 'Balanced', range: '45-59', min: 45, max: 59, color: '#7EADAD', textColor: '#FFFFFF' },
    { name: 'Bal. Growth', range: '60-74', min: 60, max: 74, color: '#6B8E7F', textColor: '#FFFFFF' },
    { name: 'Growth', range: '75-89', min: 75, max: 89, color: '#976491', textColor: '#FFFFFF' },
    { name: 'Aggr. Growth', range: '90-100', min: 90, max: 100, color: '#CD6969', textColor: '#FFFFFF' }
  ];

  const cells = bands.map((band, idx) => {
    const isActive = score >= band.min && score <= band.max;
    const bgColor = isActive ? band.color : EMAIL_COLORS.lightBg;
    const textColor = isActive ? band.textColor : EMAIL_COLORS.bodyText;
    const borderColor = isActive ? EMAIL_COLORS.gold : EMAIL_COLORS.border;
    const fontWeight = isActive ? 'bold' : 'normal';

    return `
      <td width="80" valign="top" align="center" style="background-color: ${bgColor}; padding: 12px 4px; border: 2px solid ${borderColor}; border-right: ${idx < bands.length - 1 ? 'none' : '2px solid ' + borderColor};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: ${fontWeight}; color: ${textColor}; text-transform: uppercase; line-height: 1.3; padding-bottom: 4px;">${band.name}</td>
              </tr>
              <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: ${fontWeight}; color: ${textColor};">${band.range}</td>
              </tr>
              ${isActive ? `
              <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: ${textColor}; padding-top: 6px;">&#9650;</td>
              </tr>
              ` : ''}
          </table>
      </td>
    `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; margin-bottom: 24px;">
        <tr>
            <td align="center" style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 1px;">
                Risk Profile Scale
            </td>
        </tr>
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>${cells}</tr>
                </table>
            </td>
        </tr>
    </table>
  `;
}

// Render a narrative section card - OUTLOOK COMPATIBLE
function renderNarrativeCard({ title, content, isHighlighted = false }) {
  const bgColor = isHighlighted ? EMAIL_COLORS.lightBg : EMAIL_COLORS.white;
  const borderLeft = isHighlighted ? `border-left: 3px solid ${EMAIL_COLORS.gold};` : '';
  const border = !isHighlighted ? `border: 1px solid ${EMAIL_COLORS.border};` : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
        <tr>
            <td style="background-color: ${bgColor}; ${borderLeft} ${border} padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: ${EMAIL_COLORS.gold}; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${title}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.7; color: ${EMAIL_COLORS.darkText};">
                            ${content}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;
}

// Render results summary card (scores display) - OUTLOOK COMPATIBLE
function renderResultsSummary({ overall, band, behavioral, traditional, riskBandColor }) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg}; border: 1px solid ${EMAIL_COLORS.border}; margin-bottom: 24px;">
        <tr>
            <td style="padding: 28px 24px;">
                <!-- Title -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 1px;">
                            Your Results Summary
                        </td>
                    </tr>
                </table>

                <!-- Risk Band Badge - table-based for Outlook -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 20px;">
                    <tr>
                        <td align="center" style="padding: 12px 28px; background-color: ${riskBandColor}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                            ${band}
                        </td>
                    </tr>
                </table>

                <!-- Overall Score -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 48px; font-weight: bold; color: ${EMAIL_COLORS.gold}; line-height: 1;">
                            ${overall}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${EMAIL_COLORS.bodyText};">
                            Risk Alignment Score
                        </td>
                    </tr>
                </table>

                <!-- Component Scores - two column table -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td width="48%" valign="top">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.white}; border: 1px solid ${EMAIL_COLORS.border};">
                                <tr>
                                    <td align="center" style="padding: 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${behavioral}</td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${EMAIL_COLORS.darkText};">Behavioral (0-60)</td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: ${EMAIL_COLORS.bodyText};">How you think and feel about risk</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" valign="top">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.white}; border: 1px solid ${EMAIL_COLORS.border};">
                                <tr>
                                    <td align="center" style="padding: 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${traditional}</td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: ${EMAIL_COLORS.darkText};">Traditional (0-40)</td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: ${EMAIL_COLORS.bodyText};">Time horizon and goals</td>
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
    </table>
  `;
}

// Render CTA button - OUTLOOK COMPATIBLE
function renderCTAButton(url, text) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top: 24px; margin-bottom: 24px;">
        <tr>
            <td align="center" style="background-color: ${EMAIL_COLORS.gold}; padding: 14px 32px;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="0%" strokecolor="${EMAIL_COLORS.gold}" fillcolor="${EMAIL_COLORS.gold}">
                <w:anchorlock/>
                <center style="color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${text}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${url}" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">${text}</a>
                <!--<![endif]-->
            </td>
        </tr>
    </table>
  `;
}

// CLIENT EMAIL BODY BUILDER
function renderClientBody({ scores, riskBandColor, overallSummary, mindsetInsight, traditionalInsight, alignmentCheck, planningRelevance, baseURL }) {
  let bodyHtml = '';

  // Intro message
  bodyHtml += `
    <p style="margin: 0 0 24px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.7; color: ${EMAIL_COLORS.darkText}; text-align: center; font-style: italic;">
        This assessment helps organize our conversation, not define you. Your responses give us a starting point to frame the discussion and ask better questions.
    </p>
  `;

  // Results Summary Card
  bodyHtml += renderResultsSummary({
    overall: scores.overall,
    band: scores.band,
    behavioral: scores.behavioral,
    traditional: scores.traditional,
    riskBandColor
  });

  // Understanding the Scale
  bodyHtml += renderNarrativeCard({
    title: 'Understanding the Scale',
    content: 'Scores closer to 0 typically reflect a preference for stability and capital preservation. Scores closer to 100 tend to indicate comfort with significant market volatility and a focus on long-term wealth accumulation. Neither approach is better or worse\u2014they represent different priorities, timeframes, and emotional relationships with uncertainty.',
    isHighlighted: false
  });

  // Risk Scale Visualization
  bodyHtml += renderRiskScale(scores.overall);

  // Narrative Sections
  bodyHtml += renderNarrativeCard({
    title: 'What Your Score Means',
    content: overallSummary,
    isHighlighted: true
  });

  bodyHtml += renderNarrativeCard({
    title: 'Your Behavioral Profile',
    content: mindsetInsight,
    isHighlighted: false
  });

  bodyHtml += renderNarrativeCard({
    title: 'Time Horizon & Goals',
    content: traditionalInsight,
    isHighlighted: true
  });

  bodyHtml += renderNarrativeCard({
    title: 'Alignment Check',
    content: alignmentCheck,
    isHighlighted: false
  });

  bodyHtml += renderNarrativeCard({
    title: 'How We\'ll Use This',
    content: planningRelevance,
    isHighlighted: true
  });

  // CTA Button
  bodyHtml += renderCTAButton('https://www.petrafinancial.com', 'Visit PetraFinancial.com');

  return bodyHtml;
}

// ADVISOR EMAIL BODY BUILDER - OUTLOOK COMPATIBLE
function renderAdvisorBody({ client, scores, flags, couple, meta, overallSummary, mindsetInsight, traditionalInsight, alignmentCheck, riskBandColor }) {
  let bodyHtml = '';

  // Client Information Card
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg}; border-left: 3px solid ${EMAIL_COLORS.gold}; margin-bottom: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.darkText};">
                            <strong>Client:</strong> ${client.firstName} ${client.lastName}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.darkText};">
                            <strong>Email:</strong> ${client.email}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                            <strong>Submitted:</strong> ${meta.timestamp}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Score Display
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: ${EMAIL_COLORS.bodyText}; text-transform: uppercase; letter-spacing: 1px;">
                            Risk Alignment Score
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 56px; font-weight: bold; color: ${EMAIL_COLORS.gold}; line-height: 1;">
                            ${scores.overall}
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" style="padding: 10px 24px; background-color: ${riskBandColor}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                        ${scores.band}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Component Scores
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
            <td width="48%" valign="top" align="center" style="background-color: ${EMAIL_COLORS.white}; border: 1px solid ${EMAIL_COLORS.border}; padding: 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: bold; color: ${EMAIL_COLORS.gold}; line-height: 1;">${scores.behavioral}</td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 0.5px;">Behavioral (0-60)</td>
                    </tr>
                    <tr>
                        <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: ${EMAIL_COLORS.bodyText};">How they think and feel about risk</td>
                    </tr>
                </table>
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" valign="top" align="center" style="background-color: ${EMAIL_COLORS.white}; border: 1px solid ${EMAIL_COLORS.border}; padding: 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: bold; color: ${EMAIL_COLORS.gold}; line-height: 1;">${scores.traditional}</td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 0.5px;">Traditional (0-40)</td>
                    </tr>
                    <tr>
                        <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: ${EMAIL_COLORS.bodyText};">Time horizon, experience, and goals</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Couple Comparison (if applicable)
  if (couple && scores.deltas) {
    bodyHtml += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border-left: 3px solid ${EMAIL_COLORS.gold}; margin-bottom: 24px;">
          <tr>
              <td style="padding: 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                          <td style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 0.5px;">Couple Comparison</td>
                      </tr>
                      <tr>
                          <td style="padding-bottom: 6px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                              <strong>Overall Delta:</strong> ${scores.deltas.overall} points
                          </td>
                      </tr>
                      <tr>
                          <td style="padding-bottom: 6px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                              <strong>Behavioral Delta:</strong> ${scores.deltas.behavioral} points
                          </td>
                      </tr>
                      <tr>
                          <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                              <strong>Traditional Delta:</strong> ${scores.deltas.traditional} points
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
    `;
  }

  // Behavioral Flags (if any) - OUTLOOK COMPATIBLE table-based layout with explanations
  if (flags && flags.length > 0) {
    // Flag explanations mapping
    const flagExplanations = {
      'Longevity Planning': 'Client indicated concerns about outliving their savings or has longevity factors that may require extended planning horizons.',
      'Caregiving Consideration': 'Client has or anticipates caregiving responsibilities that may impact their financial planning needs and risk capacity.',
      'Knowledge: Overconfident': 'Client self-rated their investment knowledge higher than their quiz performance suggests. May benefit from education before making complex decisions.',
      'Knowledge: Underconfident': 'Client self-rated their investment knowledge lower than their quiz performance indicates. May have more capability than they realize.'
    };

    const flagRows = flags.map(flag => {
      const explanation = flagExplanations[flag] || '';
      return `
      <tr>
          <td style="padding: 12px; background-color: ${EMAIL_COLORS.lightBg}; border: 1px solid ${EMAIL_COLORS.gold}; font-family: Georgia, 'Times New Roman', Times, serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                      <td style="font-size: 14px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; padding-bottom: 6px;">
                          ${flag}
                      </td>
                  </tr>
                  <tr>
                      <td style="font-size: 13px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                          ${explanation}
                      </td>
                  </tr>
              </table>
          </td>
      </tr>
      <tr><td style="height: 8px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
    `;
    }).join('');

    bodyHtml += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
              <td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                          <td style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 0.5px;">Behavioral Flags</td>
                      </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${flagRows}
                  </table>
              </td>
          </tr>
      </table>
    `;
  }

  // Risk Scale
  bodyHtml += renderRiskScale(scores.overall);

  // Narrative Sections
  bodyHtml += renderNarrativeCard({
    title: 'What This Score Means',
    content: overallSummary,
    isHighlighted: true
  });

  bodyHtml += renderNarrativeCard({
    title: 'Behavioral Profile',
    content: mindsetInsight,
    isHighlighted: false
  });

  bodyHtml += renderNarrativeCard({
    title: 'Time Horizon & Goals',
    content: traditionalInsight,
    isHighlighted: true
  });

  bodyHtml += renderNarrativeCard({
    title: 'Alignment Check',
    content: alignmentCheck,
    isHighlighted: false
  });

  // Next Steps Notice
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px;">
        <tr>
            <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.bodyText};">
                Follow up with the client to discuss their results and investment strategy alignment.
            </td>
        </tr>
    </table>
  `;

  return bodyHtml;
}

// COUPLE ADVISOR EMAIL BODY BUILDER - Shows both partners' results
function renderCoupleAdvisorBody({ client, person1Scores, person2Scores, person1Flags, person2Flags, meta }) {
  let bodyHtml = '';

  const p1Color = getRiskBandColor(person1Scores.overall);
  const p2Color = getRiskBandColor(person2Scores.overall);
  const scoreDelta = Math.abs(person1Scores.overall - person2Scores.overall);

  // Determine alignment interpretation
  let alignmentText = '';
  let alignmentColor = '';
  if (scoreDelta <= 10) {
    alignmentText = 'Well Aligned';
    alignmentColor = '#22c55e'; // green
  } else if (scoreDelta <= 25) {
    alignmentText = 'Moderately Aligned';
    alignmentColor = '#f59e0b'; // amber
  } else {
    alignmentText = 'Significantly Misaligned';
    alignmentColor = '#ef4444'; // red
  }

  // Client Information Card
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg}; border-left: 3px solid ${EMAIL_COLORS.gold}; margin-bottom: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.darkText};">
                            <strong>Couple Assessment</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.darkText};">
                            <strong>Partner 1:</strong> ${client.person1FullName || client.person1Name || 'Partner A'} (${client.partnerAEmail || client.email})
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.5; color: ${EMAIL_COLORS.darkText};">
                            <strong>Partner 2:</strong> ${client.person2FullName || client.person2Name || 'Partner B'} ${client.partnerBEmail ? `(${client.partnerBEmail})` : '(${client.partnerAEmail || client.email})'}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                            <strong>Submitted:</strong> ${meta.timestamp}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Partner 1 Results Card
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.white}; border: 2px solid ${p1Color}; margin-bottom: 16px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 1px;">
                            ${client.person1FullName || client.person1Name || 'Partner A'}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 8px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" style="padding: 8px 20px; background-color: ${p1Color}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                        ${person1Scores.band}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person1Scores.overall}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Overall</div>
                                    </td>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person1Scores.behavioral}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Behavioral</div>
                                    </td>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person1Scores.traditional}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Traditional</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Partner 1 Flags (if any)
  if (person1Flags && person1Flags.length > 0) {
    bodyHtml += renderFlagsSection(person1Flags, `${client.person1FullName || client.person1Name || 'Partner A'}'s Behavioral Flags`);
  }

  // Partner 2 Results Card
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.white}; border: 2px solid ${p2Color}; margin-bottom: 16px; margin-top: 24px;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 1px;">
                            ${client.person2FullName || client.person2Name || 'Partner B'}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 8px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" style="padding: 8px 20px; background-color: ${p2Color}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                        ${person2Scores.band}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person2Scores.overall}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Overall</div>
                                    </td>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person2Scores.behavioral}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Behavioral</div>
                                    </td>
                                    <td align="center" style="padding: 8px 16px;">
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: ${EMAIL_COLORS.gold};">${person2Scores.traditional}</div>
                                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Traditional</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Partner 2 Flags (if any)
  if (person2Flags && person2Flags.length > 0) {
    bodyHtml += renderFlagsSection(person2Flags, `${client.person2FullName || client.person2Name || 'Partner B'}'s Behavioral Flags`);
  }

  // Couple Comparison Section
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF9E6; border: 2px solid ${EMAIL_COLORS.gold}; margin-top: 24px; margin-bottom: 24px;">
        <tr>
            <td style="padding: 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 1px;">
                            Couple Comparison
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 12px;">
                            <span style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: ${alignmentColor};">${alignmentText}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                            <strong>Overall Score Delta:</strong> ${scoreDelta} points
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                            <strong>Behavioral Delta:</strong> ${Math.abs(person1Scores.behavioral - person2Scores.behavioral)} points
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 16px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: ${EMAIL_COLORS.bodyText};">
                            <strong>Traditional Delta:</strong> ${Math.abs(person1Scores.traditional - person2Scores.traditional)} points
                        </td>
                    </tr>
                    <tr>
                        <td style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.6; color: ${EMAIL_COLORS.bodyText}; font-style: italic;">
                            ${getAlignmentInterpretation(scoreDelta, person1Scores, person2Scores)}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
  `;

  // Next Steps Notice
  bodyHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px;">
        <tr>
            <td align="center" style="font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.6; color: ${EMAIL_COLORS.bodyText};">
                Review the attached Q&A document for complete responses from both partners. Follow up with the couple to discuss their individual profiles and how they can work together in financial planning.
            </td>
        </tr>
    </table>
  `;

  return bodyHtml;
}

// Helper to render flags section
function renderFlagsSection(flags, title) {
  const flagExplanations = {
    'Longevity Planning': 'Indicated concerns about outliving their savings or has longevity factors that may require extended planning horizons.',
    'Caregiving Consideration': 'Has or anticipates caregiving responsibilities that may impact financial planning needs and risk capacity.',
    'Knowledge: Overconfident': 'Self-rated investment knowledge higher than quiz performance suggests. May benefit from education before making complex decisions.',
    'Knowledge: Underconfident': 'Self-rated investment knowledge lower than quiz performance indicates. May have more capability than they realize.'
  };

  const flagRows = flags.map(flag => {
    const explanation = flagExplanations[flag] || '';
    return `
    <tr>
        <td style="padding: 10px; background-color: ${EMAIL_COLORS.lightBg}; border: 1px solid ${EMAIL_COLORS.gold}; font-family: Georgia, 'Times New Roman', Times, serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="font-size: 13px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; padding-bottom: 4px;">
                        ${flag}
                    </td>
                </tr>
                <tr>
                    <td style="font-size: 12px; line-height: 1.4; color: ${EMAIL_COLORS.bodyText};">
                        ${explanation}
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr><td style="height: 6px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
  `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
        <tr>
            <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding-bottom: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: ${EMAIL_COLORS.darkText}; text-transform: uppercase; letter-spacing: 0.5px;">${title}</td>
                    </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${flagRows}
                </table>
            </td>
        </tr>
    </table>
  `;
}

// Helper to get alignment interpretation text
function getAlignmentInterpretation(delta, p1Scores, p2Scores) {
  if (delta <= 10) {
    return 'Both partners show similar risk profiles. This alignment can simplify joint financial planning, as both are likely comfortable with similar investment strategies and risk levels.';
  } else if (delta <= 25) {
    return 'There is a moderate difference in risk tolerance between partners. This is common and manageable. Consider discussing how to structure accounts and strategies that accommodate both perspectives—perhaps with a blend of approaches or separate allocations that respect individual comfort levels.';
  } else {
    return 'The partners show significantly different approaches to risk. This divergence is worth addressing directly in planning conversations. Consider whether separate investment strategies might reduce household tension, or whether one partner\'s perspective should take priority based on specific goals or timelines.';
  }
}

// Plain-text email builder for client
function renderClientTextBody({ firstName, scores, overallSummary, mindsetInsight, traditionalInsight, alignmentCheck, planningRelevance }) {
  return `
═══════════════════════════════════════════════════════════
PETRA FINANCIAL ADVISORS
Risk Alignment Assessment
═══════════════════════════════════════════════════════════

Thank you, ${firstName}

We've received your Risk Alignment Assessment and Petra
will be in touch to discuss your results.

───────────────────────────────────────────────────────────

YOUR RESULTS SUMMARY

Risk Band:      ${scores.band}
Overall Score:  ${scores.overall}/100

Component Breakdown:
  • Behavioral:  ${scores.behavioral}/60
  • Traditional: ${scores.traditional}/40

───────────────────────────────────────────────────────────

UNDERSTANDING THE SCALE

Scores closer to 0 typically reflect a preference for stability
and capital preservation. Scores closer to 100 tend to indicate
comfort with significant market volatility and a focus on
long-term wealth accumulation. Neither approach is better or
worse—they represent different priorities, timeframes, and
emotional relationships with uncertainty.

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

Thank you,
The Petra Team

Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

This assessment is for educational purposes only and should
not be considered investment advice.

═══════════════════════════════════════════════════════════
`;
}

// Plain-text email builder for advisor
function renderAdvisorTextBody({ client, scores, flags, couple, meta, overallSummary, mindsetInsight, traditionalInsight, alignmentCheck, person1Scores, person2Scores, person1Flags, person2Flags }) {
  // For couple assessments with both partners' data, use the couple-specific format
  if (couple && person1Scores && person2Scores) {
    return renderCoupleAdvisorTextBody({ client, meta, person1Scores, person2Scores, person1Flags, person2Flags, scores });
  }

  // Solo assessment format
  let text = `
═══════════════════════════════════════════════════════════
RISK ASSESSMENT RECEIVED
Petra Financial Advisors
═══════════════════════════════════════════════════════════

NEW CLIENT ASSESSMENT

Client: ${client.firstName} ${client.lastName}
Email: ${client.email}
Submitted: ${meta.timestamp}

───────────────────────────────────────────────────────────

RISK ALIGNMENT SCORE

Overall Score:  ${scores.overall}/100
Risk Band:      ${scores.band}

Component Breakdown:
  • Behavioral:  ${scores.behavioral}/60
  • Traditional: ${scores.traditional}/40
`;

  if (flags && flags.length > 0) {
    const flagExplanations = {
      'Longevity Planning': 'Client indicated concerns about outliving their savings or has longevity factors that may require extended planning horizons.',
      'Caregiving Consideration': 'Client has or anticipates caregiving responsibilities that may impact their financial planning needs and risk capacity.',
      'Knowledge: Overconfident': 'Client self-rated their investment knowledge higher than their quiz performance suggests. May benefit from education before making complex decisions.',
      'Knowledge: Underconfident': 'Client self-rated their investment knowledge lower than their quiz performance indicates. May have more capability than they realize.'
    };
    text += `
───────────────────────────────────────────────────────────

BEHAVIORAL FLAGS

${flags.map(f => `  • ${f}\n    ${flagExplanations[f] || ''}`).join('\n\n')}
`;
  }

  text += `
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

Follow up with the client to discuss their results and
investment strategy alignment.

───────────────────────────────────────────────────────────

Thank you,
The Petra Team

Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

This assessment is for internal use only.

═══════════════════════════════════════════════════════════
`;

  return text;
}

// Couple-specific text body for advisor email
function renderCoupleAdvisorTextBody({ client, meta, person1Scores, person2Scores, person1Flags, person2Flags, scores }) {
  const person1FullName = client.person1FullName || client.person1Name || 'Partner A';
  const person2FullName = client.person2FullName || client.person2Name || 'Partner B';
  const person1Name = client.person1Name || 'Partner A';
  const person2Name = client.person2Name || 'Partner B';
  const scoreDelta = Math.abs(person1Scores.overall - person2Scores.overall);

  let alignmentText = '';
  if (scoreDelta <= 10) {
    alignmentText = 'WELL ALIGNED';
  } else if (scoreDelta <= 25) {
    alignmentText = 'MODERATELY ALIGNED';
  } else {
    alignmentText = 'SIGNIFICANTLY MISALIGNED';
  }

  let text = `
═══════════════════════════════════════════════════════════
COUPLE RISK ASSESSMENT RECEIVED
Petra Financial Advisors
═══════════════════════════════════════════════════════════

COUPLE ASSESSMENT

Partner 1: ${person1FullName} (${client.partnerAEmail || client.email})
Partner 2: ${person2FullName} ${client.partnerBEmail ? `(${client.partnerBEmail})` : `(${client.partnerAEmail || client.email})`}
Submitted: ${meta.timestamp}

───────────────────────────────────────────────────────────

${person1Name.toUpperCase()}'S RESULTS

Overall Score:  ${person1Scores.overall}/100
Risk Band:      ${person1Scores.band}
Behavioral:     ${person1Scores.behavioral}/60
Traditional:    ${person1Scores.traditional}/40
${person1Flags && person1Flags.length > 0 ? `Flags: ${person1Flags.join(', ')}` : ''}

───────────────────────────────────────────────────────────

${person2Name.toUpperCase()}'S RESULTS

Overall Score:  ${person2Scores.overall}/100
Risk Band:      ${person2Scores.band}
Behavioral:     ${person2Scores.behavioral}/60
Traditional:    ${person2Scores.traditional}/40
${person2Flags && person2Flags.length > 0 ? `Flags: ${person2Flags.join(', ')}` : ''}

───────────────────────────────────────────────────────────

COUPLE COMPARISON

Alignment Status: ${alignmentText}

Score Deltas:
  • Overall:     ${scoreDelta} points
  • Behavioral:  ${Math.abs(person1Scores.behavioral - person2Scores.behavioral)} points
  • Traditional: ${Math.abs(person1Scores.traditional - person2Scores.traditional)} points

───────────────────────────────────────────────────────────

See the attached document for complete Q&A responses from
both partners and detailed analysis.

Follow up with the couple to discuss their individual
profiles and how they can work together in financial
planning.

───────────────────────────────────────────────────────────

Thank you,
The Petra Team

Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

This assessment is for internal use only.

═══════════════════════════════════════════════════════════
`;

  return text;
}

// Generate advisor PDF (text-based, internal use)
function generateAdvisorPDFContent(payload) {
  const { client, scores, flags, answers, meta } = payload;

  // Check if this is a couple assessment
  if (payload.couple && payload.person1Scores && payload.person2Scores) {
    return generateCoupleAdvisorPDFContent(payload);
  }

  // Solo assessment
  let interpretationText = getInterpretationText(scores.overall);

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


RISK PROFILE INTERPRETATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${interpretationText}


BEHAVIORAL FLAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatFlagsForPDF(flags)}


═══════════════════════════════════════════════════════════════════
   COMPLETE QUESTION & ANSWER SUMMARY
═══════════════════════════════════════════════════════════════════

${formatAnswersForPDF(answers)}

═══════════════════════════════════════════════════════════════════

CONFIDENTIAL — Internal Advisor Document
This assessment contains complete client responses and behavioral analysis.
For advisor use only. Not for client distribution.

© ${new Date().getFullYear()} Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

═══════════════════════════════════════════════════════════════════
`;

  return content;
}

// Generate couple advisor PDF content
function generateCoupleAdvisorPDFContent(payload) {
  const { client, meta, person1Scores, person2Scores, person1Answers, person2Answers, person1Flags, person2Flags, scores } = payload;

  const person1FullName = client.person1FullName || client.person1Name || 'Partner A';
  const person2FullName = client.person2FullName || client.person2Name || 'Partner B';
  const person1Name = client.person1Name || 'Partner A';
  const person2Name = client.person2Name || 'Partner B';
  const scoreDelta = Math.abs(person1Scores.overall - person2Scores.overall);

  // Determine alignment
  let alignmentText = '';
  if (scoreDelta <= 10) {
    alignmentText = 'WELL ALIGNED - Both partners show similar risk profiles.';
  } else if (scoreDelta <= 25) {
    alignmentText = 'MODERATELY ALIGNED - There is a moderate difference in risk tolerance.';
  } else {
    alignmentText = 'SIGNIFICANTLY MISALIGNED - Partners show notably different risk approaches.';
  }

  let content = `
═══════════════════════════════════════════════════════════════════
   PETRA FINANCIAL ADVISORS — COUPLE RISK ASSESSMENT REPORT
   Internal Advisor Document
═══════════════════════════════════════════════════════════════════

COUPLE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Partner 1:          ${person1FullName} (${client.partnerAEmail || client.email})
Partner 2:          ${person2FullName} ${client.partnerBEmail ? `(${client.partnerBEmail})` : `(${client.partnerAEmail || client.email})`}
Submitted:          ${meta.timestamp}
Session ID:         ${meta.sessionId || 'N/A'}


═══════════════════════════════════════════════════════════════════
   ${person1FullName.toUpperCase()}'S ASSESSMENT
═══════════════════════════════════════════════════════════════════

RISK ALIGNMENT SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score:  ${person1Scores.overall}/100
Risk Band:      ${person1Scores.band}

Component Breakdown:
  • Behavioral Component:  ${person1Scores.behavioral}/60
  • Traditional Component: ${person1Scores.traditional}/40

RISK PROFILE INTERPRETATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getInterpretationText(person1Scores.overall)}

BEHAVIORAL FLAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatFlagsForPDF(person1Flags)}

COMPLETE QUESTION & ANSWER SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatAnswersForPDF(person1Answers)}


═══════════════════════════════════════════════════════════════════
   ${person2FullName.toUpperCase()}'S ASSESSMENT
═══════════════════════════════════════════════════════════════════

RISK ALIGNMENT SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score:  ${person2Scores.overall}/100
Risk Band:      ${person2Scores.band}

Component Breakdown:
  • Behavioral Component:  ${person2Scores.behavioral}/60
  • Traditional Component: ${person2Scores.traditional}/40

RISK PROFILE INTERPRETATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getInterpretationText(person2Scores.overall)}

BEHAVIORAL FLAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatFlagsForPDF(person2Flags)}

COMPLETE QUESTION & ANSWER SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatAnswersForPDF(person2Answers)}


═══════════════════════════════════════════════════════════════════
   COUPLE COMPARISON & ALIGNMENT
═══════════════════════════════════════════════════════════════════

SCORE COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        ${person1Name.padEnd(20)} ${person2Name.padEnd(20)} Delta
Overall Score:          ${String(person1Scores.overall).padEnd(20)} ${String(person2Scores.overall).padEnd(20)} ${scoreDelta} points
Risk Band:              ${person1Scores.band.padEnd(20)} ${person2Scores.band.padEnd(20)}
Behavioral:             ${String(person1Scores.behavioral).padEnd(20)} ${String(person2Scores.behavioral).padEnd(20)} ${Math.abs(person1Scores.behavioral - person2Scores.behavioral)} points
Traditional:            ${String(person1Scores.traditional).padEnd(20)} ${String(person2Scores.traditional).padEnd(20)} ${Math.abs(person1Scores.traditional - person2Scores.traditional)} points


ALIGNMENT ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alignmentText}

${getCoupleAlignmentNarrative(scoreDelta, person1Scores, person2Scores, person1Name, person2Name)}


═══════════════════════════════════════════════════════════════════

CONFIDENTIAL — Internal Advisor Document
This assessment contains complete client responses and behavioral analysis
for both partners. For advisor use only. Not for client distribution.

© ${new Date().getFullYear()} Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

═══════════════════════════════════════════════════════════════════
`;

  return content;
}

// Helper: Get interpretation text based on score
function getInterpretationText(score) {
  if (score <= 24) {
    return 'This profile reflects high loss aversion and strong stability preference, favoring capital preservation and reliability over growth.';
  } else if (score <= 44) {
    return 'Moderate loss sensitivity with a measured approach to uncertainty. Comfortable with calculated risk when there is clear rationale.';
  } else if (score <= 59) {
    return 'Risk-aware without being risk-averse. Accepts market fluctuation as part of progress and makes decisions based on information rather than emotion.';
  } else if (score <= 74) {
    return 'Growth-oriented with adaptive emotional control. Displays confidence under uncertainty and interprets volatility as data rather than danger.';
  } else if (score <= 89) {
    return 'Low loss aversion with high return motivation. Demonstrates resilience during drawdowns and comfortable with conviction-based positions.';
  } else {
    return 'High risk tolerance with analytical independence. Thrives in complex, uncertain environments where decisions depend on conviction and long-range perspective.';
  }
}

// Helper: Format flags for PDF
function formatFlagsForPDF(flags) {
  if (!flags || flags.length === 0) {
    return '  None identified';
  }

  const explanations = {
    'Longevity Planning': 'Indicated concerns about outliving their savings or has longevity factors that may require extended planning horizons.',
    'Caregiving Consideration': 'Has or anticipates caregiving responsibilities that may impact financial planning needs and risk capacity.',
    'Knowledge: Overconfident': 'Self-rated investment knowledge higher than quiz performance suggests. May benefit from education before making complex decisions.',
    'Knowledge: Underconfident': 'Self-rated investment knowledge lower than quiz performance indicates. May have more capability than they realize.'
  };

  return flags.map(f => `  • ${f}\n    ${explanations[f] || ''}`).join('\n\n');
}

// Helper: Format answers for PDF
function formatAnswersForPDF(answers) {
  if (!answers || answers.length === 0) {
    return 'No detailed responses recorded';
  }

  return answers.map((a, i) => `
${i + 1}. ${a.section ? `[${a.section}] ` : ''}${a.text}

   Response: ${a.selectedOption}
   ${a.numericValue !== undefined ? `Value: ${a.numericValue}` : ''}

`).join('─────────────────────────────────────────────────────────────────\n');
}

// Helper: Get couple alignment narrative
function getCoupleAlignmentNarrative(delta, p1Scores, p2Scores, p1Name, p2Name) {
  let narrative = '';

  if (delta <= 10) {
    narrative = `${p1Name} and ${p2Name} demonstrate very similar risk tolerance profiles. This alignment can simplify joint financial planning, as both partners are likely comfortable with similar investment strategies and risk levels. They may be able to share a unified investment approach without significant compromise.`;
  } else if (delta <= 25) {
    narrative = `There is a moderate difference in risk tolerance between ${p1Name} (${p1Scores.overall}) and ${p2Name} (${p2Scores.overall}). This is common and manageable in couples. Consider discussing how to structure accounts and strategies that accommodate both perspectives—perhaps with a blend of approaches or separate allocations that respect individual comfort levels.`;
  } else {
    const higherRisk = p1Scores.overall > p2Scores.overall ? p1Name : p2Name;
    const lowerRisk = p1Scores.overall > p2Scores.overall ? p2Name : p1Name;
    narrative = `${p1Name} and ${p2Name} show significantly different approaches to risk. ${higherRisk} has a notably higher risk tolerance, while ${lowerRisk} prefers a more conservative approach. This divergence is worth addressing directly in planning conversations. Consider whether separate investment strategies might reduce household tension, or whether one partner's perspective should take priority based on specific goals or timelines.`;
  }

  // Add behavioral comparison if there's significant difference
  const behavDelta = Math.abs(p1Scores.behavioral - p2Scores.behavioral);
  if (behavDelta > 15) {
    const behavHigher = p1Scores.behavioral > p2Scores.behavioral ? p1Name : p2Name;
    const behavLower = p1Scores.behavioral > p2Scores.behavioral ? p2Name : p1Name;
    narrative += `\n\nNotably, ${behavHigher} shows significantly higher behavioral risk tolerance than ${behavLower}. This means they may react quite differently to market volatility—${behavHigher} may want to stay the course or even increase positions during downturns, while ${behavLower} may feel anxious and want to reduce exposure.`;
  }

  return narrative;
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

    // Dynamic base URL resolution for domain-agnostic deployment
    // Priority: BASE_URL > SITE_URL > VERCEL_URL (production) > fallback
    const baseURL = process.env.BASE_URL
      || process.env.SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'https://petra-risk-app.vercel.app';
    console.log('[sendResults] Base URL for assets:', baseURL);

    // Use PNG logo for better email compatibility
    const logoURL = `${baseURL}/assets/petra-email-logo.png`;
    console.log('[sendResults] Logo URL for email:', logoURL);

    // ========================================
    // GENERATE EMAILS USING SHARED LAYOUT
    // ========================================

    // Client email using shared layout
    const clientBodyHtml = renderClientBody({
      scores: payload.scores,
      riskBandColor,
      overallSummary,
      mindsetInsight,
      traditionalInsight,
      alignmentCheck,
      planningRelevance,
      baseURL
    });

    const clientHTMLBody = renderEmailLayout({
      title: `Thank You, ${payload.client.firstName}`,
      subtitle: "We've received your Risk Alignment Assessment and Petra will be in touch soon to discuss your results.",
      bodyHtml: clientBodyHtml,
      logoURL,
      isAdvisor: false
    });

    const clientTextBody = renderClientTextBody({
      firstName: payload.client.firstName,
      scores: payload.scores,
      overallSummary,
      mindsetInsight,
      traditionalInsight,
      alignmentCheck,
      planningRelevance
    });

    // Advisor email using shared layout
    // Check if this is a couple assessment with both partners' data
    let advisorBodyHtml;
    let advisorSubtitle;

    if (payload.couple && payload.person1Scores && payload.person2Scores) {
      // Couple assessment: use the couple-specific advisor body
      advisorBodyHtml = renderCoupleAdvisorBody({
        client: payload.client,
        person1Scores: payload.person1Scores,
        person2Scores: payload.person2Scores,
        person1Flags: payload.person1Flags || [],
        person2Flags: payload.person2Flags || [],
        meta: payload.meta
      });
      advisorSubtitle = `${payload.client.person1FullName || payload.client.person1Name || 'Partner A'} & ${payload.client.person2FullName || payload.client.person2Name || 'Partner B'} have completed their couple assessment.`;
    } else {
      // Solo assessment: use the standard advisor body
      advisorBodyHtml = renderAdvisorBody({
        client: payload.client,
        scores: payload.scores,
        flags: payload.flags,
        couple: payload.couple,
        meta: payload.meta,
        overallSummary,
        mindsetInsight,
        traditionalInsight,
        alignmentCheck,
        riskBandColor
      });
      advisorSubtitle = `${payload.client.firstName} ${payload.client.lastName} has completed their assessment.`;
    }

    const advisorHTMLBody = renderEmailLayout({
      title: payload.couple ? 'New Couple Risk Assessment' : 'New Risk Assessment Received',
      subtitle: advisorSubtitle,
      bodyHtml: advisorBodyHtml,
      logoURL,
      isAdvisor: true
    });

    const advisorTextBody = renderAdvisorTextBody({
      client: payload.client,
      scores: payload.scores,
      flags: payload.flags,
      couple: payload.couple,
      meta: payload.meta,
      overallSummary,
      mindsetInsight,
      traditionalInsight,
      alignmentCheck,
      // Include couple-specific data for couple assessments
      person1Scores: payload.person1Scores,
      person2Scores: payload.person2Scores,
      person1Flags: payload.person1Flags,
      person2Flags: payload.person2Flags
    });


    // ========================================
    // SEND EMAILS VIA POSTMARK
    // ========================================

    console.log('[sendResults] Checking Postmark configuration...');
    console.log('[sendResults] POSTMARK_SERVER_TOKEN exists:', !!process.env.POSTMARK_SERVER_TOKEN);
    console.log('[sendResults] POSTMARK_FROM:', process.env.POSTMARK_FROM);
    console.log('[sendResults] ADVISOR_EMAIL:', process.env.ADVISOR_EMAIL);

    // Helper function to generate client email for a specific person (used in couple mode)
    function generateClientEmailForPerson(personName, personScores, baseURL, logoURL) {
      const personRiskBandColor = getRiskBandColor(personScores.overall);
      const personOverallSummary = generateOverallSummary(personScores);
      const personMindsetInsight = generateMindsetInsight(personScores);
      const personTraditionalInsight = generateTraditionalInsight(personScores, {});
      const personAlignmentCheck = generateAlignmentCheck(personScores);
      const personPlanningRelevance = generatePlanningRelevance();

      // Use shared layout for consistent branding
      const personBodyHtml = renderClientBody({
        scores: personScores,
        riskBandColor: personRiskBandColor,
        overallSummary: personOverallSummary,
        mindsetInsight: personMindsetInsight,
        traditionalInsight: personTraditionalInsight,
        alignmentCheck: personAlignmentCheck,
        planningRelevance: personPlanningRelevance,
        baseURL
      });

      const html = renderEmailLayout({
        title: `Thank You, ${personName}`,
        subtitle: "We've received your Risk Alignment Assessment and Petra will be in touch soon to discuss your results.",
        bodyHtml: personBodyHtml,
        logoURL,
        isAdvisor: false
      });

      const text = renderClientTextBody({
        firstName: personName,
        scores: personScores,
        overallSummary: personOverallSummary,
        mindsetInsight: personMindsetInsight,
        traditionalInsight: personTraditionalInsight,
        alignmentCheck: personAlignmentCheck,
        planningRelevance: personPlanningRelevance
      });

      return { html, text };
    }

    if (process.env.POSTMARK_SERVER_TOKEN) {
      console.log('[sendResults] Initializing Postmark client...');
      const postmark = require('postmark');
      const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

      // Validate required email configuration
      const fromEmail = process.env.POSTMARK_FROM;
      const advisorEmail = process.env.ADVISOR_EMAIL;

      if (!fromEmail || !advisorEmail) {
        console.error('[sendResults] ✗ Missing required email configuration:');
        if (!fromEmail) console.error('[sendResults]   - POSTMARK_FROM is not set');
        if (!advisorEmail) console.error('[sendResults]   - ADVISOR_EMAIL is not set');
        console.log('[sendResults] ⚠ Skipping email sending due to missing configuration');
      } else {
        // Send advisor email
        console.log('[sendResults] Sending advisor email...');
        try {
          const advisorSubject = payload.couple
            ? `Couple Risk Assessment – ${payload.client.person1FullName || payload.client.person1Name} & ${payload.client.person2FullName || payload.client.person2Name}`
            : `Risk Assessment – ${payload.client.firstName} ${payload.client.lastName} – ${payload.scores.overall} – ${payload.scores.band}`;

          // Generate the detailed Q&A attachment content
          const attachmentContent = generateAdvisorPDFContent(payload);
          const attachmentBase64 = Buffer.from(attachmentContent, 'utf-8').toString('base64');
          const clientNameSafe = `${payload.client.firstName}_${payload.client.lastName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          const attachmentFilename = `Risk_Assessment_${clientNameSafe}_${new Date().toISOString().split('T')[0]}.txt`;

          const advisorMessage = await client.sendEmail({
            From: fromEmail,
            To: advisorEmail,
            Subject: advisorSubject,
            HtmlBody: advisorHTMLBody,
            TextBody: advisorTextBody,
            Attachments: [{
              Name: attachmentFilename,
              Content: attachmentBase64,
              ContentType: 'text/plain'
            }]
          });
          console.log('[sendResults] ✓ Advisor email sent successfully:', advisorMessage.MessageID);
        } catch (emailError) {
          console.error('[sendResults] ✗ Error sending advisor email:', emailError.message);
          console.error('[sendResults] Full error:', emailError);
        }

        // Handle client emails
        console.log('[sendResults] Client wants copy:', payload.client.wantsCopy);
        console.log('[sendResults] Is couple mode:', !!payload.couple);

        if (payload.client.wantsCopy) {
          if (payload.couple && payload.person1Scores && payload.person2Scores) {
            // COUPLE MODE: Handle email routing based on whether one or two emails provided
            const partnerAEmail = payload.client.partnerAEmail;
            const partnerBEmail = payload.client.partnerBEmail;
            const person1Name = payload.client.person1Name || 'Partner A';
            const person2Name = payload.client.person2Name || 'Partner B';

            console.log('[sendResults] Couple mode - Partner A email:', partnerAEmail);
            console.log('[sendResults] Couple mode - Partner B email:', partnerBEmail || '(not provided)');

            // Generate individual emails for each partner
            const person1Email = generateClientEmailForPerson(person1Name, payload.person1Scores, baseURL, logoURL);
            const person2Email = generateClientEmailForPerson(person2Name, payload.person2Scores, baseURL, logoURL);

            if (partnerBEmail && partnerBEmail.trim()) {
              // TWO EMAILS PROVIDED: Send individual results to each partner
              console.log('[sendResults] Two emails provided - sending individual results to each partner');

              // Send Person 1 results to Partner A email
              try {
                const p1Message = await client.sendEmail({
                  From: fromEmail,
                  To: partnerAEmail,
                  Subject: `Thank you, ${person1Name} — Your Petra risk assessment is complete`,
                  HtmlBody: person1Email.html,
                  TextBody: person1Email.text
                });
                console.log('[sendResults] ✓ Partner A (Person 1) email sent to', partnerAEmail, ':', p1Message.MessageID);
              } catch (emailError) {
                console.error('[sendResults] ✗ Error sending Partner A email:', emailError.message);
              }

              // Send Person 2 results to Partner B email
              try {
                const p2Message = await client.sendEmail({
                  From: fromEmail,
                  To: partnerBEmail,
                  Subject: `Thank you, ${person2Name} — Your Petra risk assessment is complete`,
                  HtmlBody: person2Email.html,
                  TextBody: person2Email.text
                });
                console.log('[sendResults] ✓ Partner B (Person 2) email sent to', partnerBEmail, ':', p2Message.MessageID);
              } catch (emailError) {
                console.error('[sendResults] ✗ Error sending Partner B email:', emailError.message);
              }
            } else {
              // ONE EMAIL PROVIDED: Send both results to the single email
              console.log('[sendResults] One email provided - sending both results to:', partnerAEmail);

              // Create a combined email with both partners' results
              const combinedHtml = generateCombinedCoupleEmailHtml(person1Name, payload.person1Scores, person2Name, payload.person2Scores, baseURL, logoURL);
              const combinedText = generateCombinedCoupleEmailText(person1Name, payload.person1Scores, person2Name, payload.person2Scores);

              try {
                const combinedMessage = await client.sendEmail({
                  From: fromEmail,
                  To: partnerAEmail,
                  Subject: `Thank you — ${person1Name} & ${person2Name}'s Petra risk assessments are complete`,
                  HtmlBody: combinedHtml,
                  TextBody: combinedText
                });
                console.log('[sendResults] ✓ Combined couple email sent to', partnerAEmail, ':', combinedMessage.MessageID);
              } catch (emailError) {
                console.error('[sendResults] ✗ Error sending combined couple email:', emailError.message);
              }
            }
          } else {
            // SOLO MODE: Send single client email
            console.log('[sendResults] Solo mode - Sending client email to:', payload.client.email);
            try {
              const clientMessage = await client.sendEmail({
                From: fromEmail,
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
          }
        } else {
          console.log('[sendResults] Skipping client email (wantsCopy = false)');
        }
      }
    } else {
      console.log('[sendResults] ⚠ Postmark not configured - emails would be sent here');
      console.log('[sendResults] Set POSTMARK_SERVER_TOKEN environment variable to enable emails');
    }

    // Helper function to generate combined couple email HTML (when only one email provided)
    function generateCombinedCoupleEmailHtml(person1Name, person1Scores, person2Name, person2Scores, baseURL, logoURL) {
      const p1Color = getRiskBandColor(person1Scores.overall);
      const p2Color = getRiskBandColor(person2Scores.overall);

      // Build the couple body content
      const coupleBodyHtml = `
        <!-- Person 1 Results Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg}; border: 1px solid ${EMAIL_COLORS.border}; border-radius: 8px; margin-bottom: 20px;">
            <tr>
                <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; color: ${EMAIL_COLORS.darkText}; text-align: center;">${person1Name}'s Results</h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 16px;">
                        <tr>
                            <td style="padding: 10px 24px; background-color: ${p1Color}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 50px;">
                                ${person1Scores.band}
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person1Scores.overall}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Overall</div>
                            </td>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person1Scores.behavioral}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Behavioral</div>
                            </td>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person1Scores.traditional}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Traditional</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Person 2 Results Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_COLORS.lightBg}; border: 1px solid ${EMAIL_COLORS.border}; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; color: ${EMAIL_COLORS.darkText}; text-align: center;">${person2Name}'s Results</h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 16px;">
                        <tr>
                            <td style="padding: 10px 24px; background-color: ${p2Color}; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 50px;">
                                ${person2Scores.band}
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person2Scores.overall}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Overall</div>
                            </td>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person2Scores.behavioral}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Behavioral</div>
                            </td>
                            <td width="33%" style="text-align: center;">
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; color: ${EMAIL_COLORS.gold};">${person2Scores.traditional}</div>
                                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${EMAIL_COLORS.bodyText};">Traditional</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.7; color: ${EMAIL_COLORS.darkText}; font-style: italic; text-align: center;">
            Petra will review both assessments and discuss how your individual risk profiles can inform your shared financial planning.
        </p>

        ${renderCTAButton('https://www.petrafinancial.com', 'Visit PetraFinancial.com')}
      `;

      return renderEmailLayout({
        title: 'Your Couple Assessment Results',
        subtitle: `Both ${person1Name} and ${person2Name} have completed the Risk Alignment Assessment.`,
        bodyHtml: coupleBodyHtml,
        logoURL,
        isAdvisor: false
      });
    }

    function generateCombinedCoupleEmailText(person1Name, person1Scores, person2Name, person2Scores) {
      return `
═══════════════════════════════════════════════════════════
PETRA FINANCIAL ADVISORS
Risk Alignment Assessment
═══════════════════════════════════════════════════════════

Your Couple Assessment Results

Both ${person1Name} and ${person2Name} have completed the
Risk Alignment Assessment. Petra will be in touch to
discuss your results.

───────────────────────────────────────────────────────────

${person1Name.toUpperCase()}'S RESULTS

Overall Score:  ${person1Scores.overall}/100
Risk Band:      ${person1Scores.band}
Behavioral:     ${person1Scores.behavioral}/60
Traditional:    ${person1Scores.traditional}/40

───────────────────────────────────────────────────────────

${person2Name.toUpperCase()}'S RESULTS

Overall Score:  ${person2Scores.overall}/100
Risk Band:      ${person2Scores.band}
Behavioral:     ${person2Scores.behavioral}/60
Traditional:    ${person2Scores.traditional}/40

───────────────────────────────────────────────────────────

Petra will review both assessments and discuss how your
individual risk profiles can inform your shared financial planning.

───────────────────────────────────────────────────────────

Thank you,
The Petra Team

Petra Financial Advisors
2 N Nevada Ave, Suite 1300
Colorado Springs, CO 80903
www.petrafinancial.com

This assessment is for educational purposes only and should
not be considered investment advice.

═══════════════════════════════════════════════════════════
`;
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
