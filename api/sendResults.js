// api/sendResults.js
// Vercel Serverless Function for Risk Assessment Email + PDF Workflow

const crypto = require('crypto');

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

// Risk Band Colors (matching style.css)
function getRiskBandColor(score) {
  if (score <= 24) return '#8B6F5C';
  if (score <= 44) return '#6B7280';
  if (score <= 59) return '#7EADAD';
  if (score <= 74) return '#93A2BC';
  if (score <= 89) return '#CCA054';
  return '#9A7611';
}

// Interpretation Text (matching script.js)
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

// Generate Enhanced Advisor PDF Content (matching your CSS and including full Q&A)
function generateAdvisorPDFContent(payload) {
  const { client, scores, flags, answers, meta } = payload;
  
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

${getInterpretationText(scores.overall)}


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

// Generate Client PDF Content
function generateClientPDFContent(payload) {
  const { client, scores, meta } = payload;
  
  let content = `
═══════════════════════════════════════════════════════════════════
   PETRA FINANCIAL ADVISORS
   Risk Alignment Assessment — Personal Results
═══════════════════════════════════════════════════════════════════

${client.firstName} ${client.lastName}
Assessment Date: ${meta.timestamp}


YOUR RISK ALIGNMENT SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score:  ${scores.overall}/100
Risk Band:      ${scores.band}


COMPONENT SCORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Behavioral Component: ${scores.behavioral}/60
  How you tend to think and feel about risk — your natural reactions
  to gains, losses, and uncertainty.

Traditional Component: ${scores.traditional}/40
  The practical side — time horizon, experience, and goal priorities.


WHAT YOUR SCORE MEANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getInterpretationText(scores.overall)}


NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your advisor will review these results and schedule a follow-up
discussion to align your investment strategy with your risk profile.


═══════════════════════════════════════════════════════════════════

IMPORTANT DISCLOSURE
This assessment is for educational purposes only and should not be
considered investment advice. Your complete portfolio strategy should
be developed in consultation with your financial advisor.

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
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    
    // Validate required fields
    if (!payload.client || !payload.client.firstName || !payload.client.lastName || 
        !payload.client.email || !payload.client.consent) {
      return res.status(400).json({ error: 'Missing required client information' });
    }

    if (!payload.scores || !payload.scores.overall) {
      return res.status(400).json({ error: 'Missing score data' });
    }

    // Generate secure token
    const token = generateToken();

    // Generate PDF content
    const advisorPDF = generateAdvisorPDFContent(payload);
    const clientPDF = generateClientPDFContent(payload);

    // Get risk band color for styling
    const riskBandColor = getRiskBandColor(payload.scores.overall);

    // ========================================
    // ADVISOR EMAIL TEMPLATE (Petra-Branded)
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
              
              <!-- Interpretation -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EFE0; border-left: 3px solid #9A7611; margin-bottom: 32px; border-radius: 10px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Profile Summary</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.7;">${getInterpretationText(payload.scores.overall)}</p>
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

PROFILE SUMMARY
${getInterpretationText(payload.scores.overall)}

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
    // CLIENT EMAIL TEMPLATE (Petra-Branded)
    // ========================================
    
    const clientHTMLBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Risk Assessment Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Crimson Pro', Georgia, serif; background-color: #f8f7f6; -webkit-font-smoothing: antialiased;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; max-width: 600px; box-shadow: 0 4px 6px rgba(37, 40, 42, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #25282A; padding: 32px 40px; text-align: center; border-bottom: 3px solid #9A7611;">
              <h1 style="margin: 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">THANK YOU</h1>
              <p style="margin: 8px 0 0 0; color: #F5F4F1; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; font-weight: 400;">We've received your assessment</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              
              <p style="margin: 0 0 20px 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 16px; line-height: 1.7;">Hi ${payload.client.firstName},</p>
              
              <p style="margin: 0 0 32px 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.7;">Thank you for completing the Petra Risk Alignment Assessment. Your responses have been received and one of our advisors will review them shortly.</p>
              
              <!-- Score Section -->
              <div style="text-align: center; margin-bottom: 40px;">
                <p style="margin: 0 0 16px 0; color: #6B6862; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Your Risk Alignment Score</p>
                <p style="margin: 0 0 12px 0; color: #9A7611; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 72px; font-weight: 700; line-height: 1; text-transform: uppercase; letter-spacing: -0.02em;">${payload.scores.overall}</p>
                <span style="display: inline-block; background-color: ${riskBandColor}; color: #FFFFFF; padding: 10px 24px; border-radius: 9999px; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px;">${payload.scores.band}</span>
                
                <!-- Component Breakdown -->
                <p style="margin: 20px 0 0 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px;">
                  Behavioral: <strong>${payload.scores.behavioral}/60</strong> &nbsp;|&nbsp; Traditional: <strong>${payload.scores.traditional}/40</strong>
                </p>
                
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
              
              <!-- Interpretation -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5EFE0; border-left: 3px solid #9A7611; margin-bottom: 32px; border-radius: 10px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Your Profile Summary</p>
                    <p style="margin: 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.7;">${getInterpretationText(payload.scores.overall)}</p>
                  </td>
                </tr>
              </table>
              
              <!-- What Happens Next -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; border-left: 3px solid #9A7611; margin-bottom: 32px; border-radius: 10px; border-top: 1px solid #E8E6E1; border-right: 1px solid #E8E6E1; border-bottom: 1px solid #E8E6E1;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; color: #25282A; font-family: 'brandon-grotesque', Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">What Happens Next?</p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px; line-height: 1.7;">Your advisor will use these results to better understand your relationship with investment risk and market volatility. This helps us align your portfolio strategy with both your emotional comfort and practical circumstances.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Attachment Notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border-radius: 10px; margin-bottom: 32px; border: 1px solid #E8E6E1;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 4px 0; color: #25282A; font-family: 'Crimson Pro', Georgia, serif; font-size: 14px;">📎 <strong>Your complete results summary is attached</strong></p>
                    <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 13px;">Save this for your records</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 32px 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.7; text-align: center;">We'll be in touch soon to discuss your results and next steps.</p>
              
              <p style="margin: 0; color: #6B6862; font-family: 'Crimson Pro', Georgia, serif; font-size: 15px; line-height: 1.7;">
                Best regards,<br>
                <strong style="color: #9A7611;">The Petra Team</strong>
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

YOUR PROFILE SUMMARY

${getInterpretationText(payload.scores.overall)}

───────────────────────────────────────────────────────────

WHAT HAPPENS NEXT?

Your advisor will use these results to better understand your
relationship with investment risk and market volatility. This
helps us align your portfolio strategy with both your emotional
comfort and practical circumstances.

Your complete results summary is attached to this email for
your records.

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
    // SEND EMAILS VIA POSTMARK
    // ========================================

    if (process.env.POSTMARK_SERVER_TOKEN) {
      const postmark = require('postmark');
      const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

      // Send advisor email
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
        console.log('Advisor email sent:', advisorMessage.MessageID);
      } catch (emailError) {
        console.error('Error sending advisor email:', emailError);
      }

      // Send client email (if requested)
      if (payload.client.wantsCopy) {
        try {
          const clientMessage = await client.sendEmail({
            From: process.env.POSTMARK_FROM || 'risk@petrafinancial.com',
            To: payload.client.email,
            Subject: 'Thank you — Your Petra risk assessment is complete',
            HtmlBody: clientHTMLBody,
            TextBody: clientTextBody,
            Attachments: [{
              Name: 'petra-risk-assessment-results.txt',
              Content: Buffer.from(clientPDF).toString('base64'),
              ContentType: 'text/plain'
            }]
          });
          console.log('Client email sent:', clientMessage.MessageID);
        } catch (emailError) {
          console.error('Error sending client email:', emailError);
        }
      }
    } else {
      console.log('Postmark not configured - emails would be sent here');
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