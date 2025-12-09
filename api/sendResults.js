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

// Helper to generate advisor PDF content
function generateAdvisorPDFContent(payload) {
  const { client, scores, flags, answers, meta } = payload;
  
  let content = `PETRA FINANCIAL ADVISORS - RISK ASSESSMENT (ADVISOR VIEW)
============================================================

CLIENT INFORMATION
Name: ${client.firstName} ${client.lastName}
Email: ${client.email}
Submitted: ${meta.timestamp}
Version: ${meta.version || '1.0'}
${meta.householdId ? `Household ID: ${meta.householdId}` : ''}

RISK SCORES
===========
Overall Score: ${scores.overall}/100
Risk Band: ${scores.band}

Component Breakdown:
- Behavioral: ${scores.behavioral}/60
- Traditional: ${scores.traditional}/40

${payload.couple ? `
COUPLE DELTAS
=============
Overall Δ: ${scores.deltas.overall}
Behavioral Δ: ${scores.deltas.behavioral}
Traditional Δ: ${scores.deltas.traditional}
` : ''}

BEHAVIORAL FLAGS
================
${flags.join(', ') || 'None'}

FULL Q&A
========
${answers.map((a, i) => `
${i + 1}. ${a.section ? `[${a.section}] ` : ''}${a.text}
   Answer: ${a.selectedOption}
   Value: ${a.numericValue !== undefined ? a.numericValue : 'N/A'}
`).join('\n')}

---
This is an internal advisor document. Contains full client responses and analysis.
© ${new Date().getFullYear()} Petra Financial Advisors
`;

  return content;
}

function generateClientPDFContent(payload) {
  const { client, scores, meta } = payload;
  
  let content = `PETRA FINANCIAL ADVISORS - RISK ALIGNMENT ASSESSMENT
====================================================

${client.firstName} ${client.lastName}
Assessment Date: ${meta.timestamp}

YOUR RISK PROFILE
=================
Risk Alignment Score: ${scores.overall}/100
Risk Band: ${scores.band}

Component Scores:
- Behavioral Component: ${scores.behavioral}/60
  How you tend to think and feel about risk
  
- Traditional Component: ${scores.traditional}/40
  Time horizon, experience, and practical considerations

WHAT THIS MEANS
===============
${getInterpretationText(scores.overall)}

---
This assessment is for educational purposes only and should not be considered investment advice.

© ${new Date().getFullYear()} Petra Financial Advisors
`;

  return content;
}

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
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Store in KV (if available)
    // In production, you'd use: await kv.set(token, payload, { ex: 30 * 24 * 60 * 60 });
    
    // For development: Just log the token
    console.log('Generated token:', token);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Generate PDF content
    const advisorPDF = generateAdvisorPDFContent(payload);
    const clientPDF = generateClientPDFContent(payload);

    // Prepare email data
    const BASE_URL = process.env.BASE_URL || 'https://risk.petrafinancial.com';
    const reviewLink = `${BASE_URL}/review/${token}`;

    // ========================================
    // ADVISOR EMAIL TEMPLATE
    // ========================================
    
    const advisorHTMLBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background-color: #f5f5f5; }
    .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; }
    .header { background-color: #3A3A3A; padding: 30px 40px; text-align: center; }
    .header h1 { color: #B4975A; font-family: Georgia, serif; font-size: 24px; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
    .header p { color: #ffffff; font-size: 14px; margin: 8px 0 0 0; }
    .content { padding: 40px; color: #3A3A3A; line-height: 1.6; }
    .content h2 { color: #B4975A; font-size: 18px; margin: 0 0 16px 0; font-weight: 600; }
    .client-info { background: #f9f9f9; border-left: 4px solid #B4975A; padding: 16px 20px; margin: 20px 0; }
    .client-info p { margin: 4px 0; font-size: 14px; }
    .score-grid { display: table; width: 100%; margin: 20px 0; }
    .score-item { display: table-cell; text-align: center; padding: 20px 10px; border-right: 1px solid #e5e5e5; }
    .score-item:last-child { border-right: none; }
    .score-number { font-size: 32px; font-weight: 700; color: #B4975A; margin: 0; }
    .score-label { font-size: 12px; color: #666; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .score-band { display: inline-block; background: #B4975A; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin: 12px 0; }
    .flags { background: #fff9e6; border-left: 4px solid #B4975A; padding: 16px 20px; margin: 20px 0; }
    .flags p { margin: 0; font-size: 14px; color: #666; }
    .attachment-note { background: #f0f0f0; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #666; }
    .footer { background: #3A3A3A; color: #ffffff; padding: 30px 40px; text-align: center; font-size: 13px; line-height: 1.8; }
    .footer strong { color: #B4975A; }
    @media only screen and (max-width: 600px) {
      .content { padding: 20px !important; }
      .score-item { display: block; border-right: none; border-bottom: 1px solid #e5e5e5; }
      .score-item:last-child { border-bottom: none; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Risk Assessment Received</h1>
      <p>Petra Financial Advisors</p>
    </div>
    
    <div class="content">
      <h2>New Client Assessment</h2>
      
      <div class="client-info">
        <p><strong>Client:</strong> ${payload.client.firstName} ${payload.client.lastName}</p>
        <p><strong>Email:</strong> ${payload.client.email}</p>
        <p><strong>Submitted:</strong> ${payload.meta.timestamp}</p>
      </div>
      
      <h2>Risk Alignment Score</h2>
      
      <div class="score-grid">
        <div class="score-item">
          <p class="score-number">${payload.scores.overall}</p>
          <p class="score-label">Overall Score</p>
        </div>
        <div class="score-item">
          <p class="score-number">${payload.scores.behavioral}</p>
          <p class="score-label">Behavioral (0-60)</p>
        </div>
        <div class="score-item">
          <p class="score-number">${payload.scores.traditional}</p>
          <p class="score-label">Traditional (0-40)</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <span class="score-band">${payload.scores.band}</span>
      </div>
      
      ${payload.couple ? `
      <h2>Couple Comparison</h2>
      <div class="client-info">
        <p><strong>Overall Delta:</strong> ${payload.scores.deltas.overall} points</p>
        <p><strong>Behavioral Delta:</strong> ${payload.scores.deltas.behavioral} points</p>
        <p><strong>Traditional Delta:</strong> ${payload.scores.deltas.traditional} points</p>
      </div>
      ` : ''}
      
      ${payload.flags && payload.flags.length > 0 ? `
      <div class="flags">
        <p><strong>Behavioral Flags:</strong> ${payload.flags.join(', ')}</p>
      </div>
      ` : ''}
      
      <div class="attachment-note">
        📎 <strong>Complete Q&A attached</strong> — The attached document contains all client responses and detailed scoring breakdown.
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        This assessment is for internal use only. Follow up with the client to discuss their results and investment strategy alignment.
      </p>
    </div>
    
    <div class="footer">
      <strong>Petra Financial Advisors</strong><br>
      1880 Office Club Pointe, Suite 128<br>
      Colorado Springs, CO 80920<br>
      <a href="http://www.petrafinancial.com" style="color: #B4975A; text-decoration: none;">www.petrafinancial.com</a>
    </div>
  </div>
</body>
</html>
`;

    const advisorTextBody = `RISK ASSESSMENT RECEIVED
Petra Financial Advisors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW CLIENT ASSESSMENT

Client: ${payload.client.firstName} ${payload.client.lastName}
Email: ${payload.client.email}
Submitted: ${payload.meta.timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK ALIGNMENT SCORE

Overall Score: ${payload.scores.overall}/100
Risk Band: ${payload.scores.band}

Component Breakdown:
- Behavioral: ${payload.scores.behavioral}/60
- Traditional: ${payload.scores.traditional}/40

${payload.couple ? `
COUPLE COMPARISON
- Overall Delta: ${payload.scores.deltas.overall} points
- Behavioral Delta: ${payload.scores.deltas.behavioral} points  
- Traditional Delta: ${payload.scores.deltas.traditional} points
` : ''}

${payload.flags && payload.flags.length > 0 ? `
BEHAVIORAL FLAGS
${payload.flags.join(', ')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ATTACHMENT
The attached document contains all client responses and detailed scoring breakdown.

This assessment is for internal use only. Follow up with the client to discuss their results and investment strategy alignment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Petra Financial Advisors
1880 Office Club Pointe, Suite 128
Colorado Springs, CO 80920
www.petrafinancial.com
`;

    // ========================================
    // CLIENT EMAIL TEMPLATE
    // ========================================
    
    const clientHTMLBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background-color: #f5f5f5; }
    .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; }
    .header { background-color: #3A3A3A; padding: 30px 40px; text-align: center; }
    .header h1 { color: #B4975A; font-family: Georgia, serif; font-size: 24px; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
    .header p { color: #ffffff; font-size: 14px; margin: 8px 0 0 0; }
    .content { padding: 40px; color: #3A3A3A; line-height: 1.7; }
    .content p { margin: 0 0 16px 0; font-size: 15px; }
    .score-highlight { background: #f9f9f9; border-left: 4px solid #B4975A; padding: 24px; margin: 24px 0; text-align: center; }
    .score-number { font-size: 48px; font-weight: 700; color: #B4975A; margin: 0 0 8px 0; }
    .score-band { font-size: 18px; color: #3A3A3A; font-weight: 600; margin: 0; }
    .score-breakdown { margin: 20px 0; font-size: 14px; color: #666; text-align: center; }
    .attachment-note { background: #fff9e6; border-radius: 4px; padding: 20px; margin: 24px 0; font-size: 14px; }
    .footer { background: #3A3A3A; color: #ffffff; padding: 30px 40px; text-align: center; font-size: 13px; line-height: 1.8; }
    .footer strong { color: #B4975A; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Thank You</h1>
      <p>We've received your assessment</p>
    </div>
    
    <div class="content">
      <p>Hi ${payload.client.firstName},</p>
      
      <p>Thank you for completing the Petra Risk Alignment Assessment. Your responses have been received and one of our advisors will review them shortly.</p>
      
      <div class="score-highlight">
        <p class="score-number">${payload.scores.overall}</p>
        <p class="score-band">${payload.scores.band}</p>
        <div class="score-breakdown">
          Behavioral: ${payload.scores.behavioral}/60 &nbsp;|&nbsp; Traditional: ${payload.scores.traditional}/40
        </div>
      </div>
      
      <p><strong>What happens next?</strong></p>
      
      <p>Your advisor will use these results to better understand your relationship with investment risk and market volatility. This helps us align your portfolio strategy with both your emotional comfort and practical circumstances.</p>
      
      <div class="attachment-note">
        📎 Your complete results summary is attached to this email for your records.
      </div>
      
      <p>We'll be in touch soon to discuss your results and next steps.</p>
      
      <p style="margin-top: 30px;">Best regards,<br>
      <strong style="color: #B4975A;">The Petra Team</strong></p>
    </div>
    
    <div class="footer">
      <strong>Petra Financial Advisors</strong><br>
      1880 Office Club Pointe, Suite 128<br>
      Colorado Springs, CO 80920<br>
      <a href="http://www.petrafinancial.com" style="color: #B4975A; text-decoration: none;">www.petrafinancial.com</a>
    </div>
  </div>
</body>
</html>
`;

    const clientTextBody = `THANK YOU
We've received your assessment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${payload.client.firstName},

Thank you for completing the Petra Risk Alignment Assessment. Your responses have been received and one of our advisors will review them shortly.

YOUR RESULTS

Risk Alignment Score: ${payload.scores.overall}/100
Risk Band: ${payload.scores.band}

Component Breakdown:
- Behavioral: ${payload.scores.behavioral}/60
- Traditional: ${payload.scores.traditional}/40

WHAT HAPPENS NEXT?

Your advisor will use these results to better understand your relationship with investment risk and market volatility. This helps us align your portfolio strategy with both your emotional comfort and practical circumstances.

Your complete results summary is attached to this email for your records.

We'll be in touch soon to discuss your results and next steps.

Best regards,
The Petra Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Petra Financial Advisors
1880 Office Club Pointe, Suite 128
Colorado Springs, CO 80920
www.petrafinancial.com
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
      reviewLink: reviewLink,
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