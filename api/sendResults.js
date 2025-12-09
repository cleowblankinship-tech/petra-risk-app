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

// Helper to generate simple text-based "PDF" content (for now)
// In production, you'd use a proper PDF library like pdf-lib
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

    // Store in KV (if available) or return token for now
    // In production, you'd use: await kv.set(token, payload, { ex: 30 * 24 * 60 * 60 });
    
    // For development: Just log the token
    console.log('Generated token:', token);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Generate PDF content (simplified for now)
    const advisorPDF = generateAdvisorPDFContent(payload);
    const clientPDF = generateClientPDFContent(payload);

    // Prepare email data
    const BASE_URL = process.env.BASE_URL || 'https://risk.petrafinancial.com';
    const reviewLink = `${BASE_URL}/review/${token}`;

    // Format score display for email %% CB took out this OG code to add a claude patch 12/9
    //const scoreDisplay = `${scores.overall} — ${scores.band}`;
    //const componentDisplay = `Behavioral: ${scores.behavioral}/60 | Traditional: ${scores.traditional}/40`;

    const scoreDisplay = `${payload.scores.overall} — ${payload.scores.band}`;
    const componentDisplay = `Behavioral: ${payload.scores.behavioral}/60 | Traditional: ${payload.scores.traditional}/40`;
    
    // Build advisor email
    const advisorSubject = `Risk Assessment – ${payload.client.firstName} ${payload.client.lastName} – ${scoreDisplay}`;
    
    const advisorBody = `Client: ${payload.client.firstName} ${payload.client.lastName} | ${payload.client.email}
Submitted (MT): ${payload.meta.timestamp}

Overall: ${scoreDisplay}
${componentDisplay}
${payload.couple ? `Couple delta: Overall Δ ${payload.scores.deltas.overall} | Behavioral Δ ${payload.scores.deltas.behavioral} | Traditional Δ ${payload.scores.deltas.traditional}` : ''}

Flags: ${payload.flags.join(', ') || 'None'}

Secure review link (Petra only):
${reviewLink}

A PDF with full responses is attached.
`;

    // Send emails via Postmark (if configured)
    if (process.env.POSTMARK_SERVER_TOKEN) {
      const postmark = require('postmark');
      const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

      // Send advisor email
      try {
        const advisorMessage = await client.sendEmail({
          From: process.env.POSTMARK_FROM || 'risk@petrafinancial.com',
          To: 'risk@petrafinancial.com',
          Subject: advisorSubject,
          TextBody: advisorBody,
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
            Subject: 'Thanks! We received your risk assessment',
            TextBody: `Hi ${payload.client.firstName},

Thanks for completing the Petra Risk Alignment Assessment. Your advisor will review your responses and follow up soon.

You can view your results here:
${reviewLink}

— Petra Financial Advisors`,
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
      console.log('Advisor email:', advisorSubject);
      console.log('Review link:', reviewLink);
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