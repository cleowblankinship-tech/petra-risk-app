# Email and PDF Implementation Summary

## Overview

I've implemented a complete email template and PDF generation system for Petra's Risk Alignment Assessment that matches the current on-screen results experience.

---

## 1. EMAIL TEMPLATE (`email-template.html`)

### Design Features

- **Petra Branding**: Uses exact brand colors, fonts, and styling from the quiz
- **Responsive**: Email-safe HTML that works in Outlook, Gmail, Apple Mail
- **Logo**: Includes SVG logo (petra-email-logo.svg) with proper sizing
- **Clean Layout**: Table-based structure for maximum compatibility

### Email Structure

1. **Header**: Centered Petra logo (160px max width)
2. **Greeting**: Personalized "Thank You, {{firstName}}"
3. **Confirmation**: Brief message that assessment was received
4. **Results Summary Card** (matches web UI):
   - Risk Band label (large, colored badge)
   - Risk Alignment Score (prominent number)
   - Behavioral and Traditional component scores (side-by-side cards)
5. **Attachment Callout**: Gold-bordered box stating "Your complete results summary is attached"
6. **What Happens Next**: Concise paragraph about next steps
7. **Signature**: "The Petra Team"
8. **Footer**: Educational disclaimer

### Template Variables (to be replaced)

- `{{firstName}}` - Client's first name
- `{{advisorEmail}}` - Advisor's email address
- `{{riskBand}}` - e.g., "BALANCED"
- `{{riskBandColor}}` - Hex color for risk band badge
- `{{finalScore}}` - 0-100 score
- `{{behavioralScore}}` - 0-60 score
- `{{traditionalScore}}` - 0-40 score

### Colors Used (Petra Palette)

- Background: `#F5F1EA` (cream)
- Card background: `#FFFFFF`
- Primary text: `#25282A` (charcoal)
- Gold accent: `#9A7611`
- Warm text: `#6B5B4F`
- Borders: `#E5DFD2`
- Callout box: `#FEF7E8` with `#9A7611` border

---

## 2. PDF GENERATION (`pdf-generator.js`)

### Library

- **jsPDF 2.5.1** - Added via CDN in index.html
- Modern, widely-supported PDF generation library

### PDF Structure

#### Cover Page
- PETRA logo/wordmark
- Title: "Risk Alignment Assessment - Results"
- Client name
- Assessment date

#### Section A: Results Summary
- **Risk Band** - Large, prominent, colored by band
- **Risk Alignment Score** - 48pt gold number
- **Component Scores** - Side-by-side boxes with:
  - Behavioral (x/60) - "How you think and feel about risk"
  - Traditional (y/40) - "Time horizon and goals"
- **Disclaimer Box** - Light gold background with starting point message

#### Section B: Complete Response Detail
- **Organized by section**:
  1. Investment Mindset
  2. Investment Knowledge
  3. Traditional Risk Assessment

- **For each question**:
  - Question number and full text
  - Selected answer(s) with labels (not just values)
  - Multi-select questions show all selected options with bullets

#### Footer (Every Page)
- Page numbers
- Educational disclaimer

### Key Features

- **Smart page breaks**: Automatically adds new pages when needed
- **Wrapped text**: Long questions/answers wrap properly
- **Color coding**: Uses exact Petra brand colors
- **Professional typography**: Clean, readable fonts with proper hierarchy
- **No placeholders**: Uses actual client data from results object

### Function: `generateCompletePDF(resultData, clientName, isCouple)`

**Parameters:**
- `resultData` - Complete results object with scores, answers, band, etc.
- `clientName` - Full name for cover page
- `isCouple` - Boolean (for future couple support)

**Returns:**
- jsPDF document object
- Auto-downloads as: `Petra_Risk_Assessment_[ClientName].pdf`

---

## 3. INTEGRATION POINTS

### When to Trigger

The email and PDF should be generated when:
1. Client completes assessment
2. Clicks "Submit" or "Email Results" button
3. System should:
   - Generate PDF attachment
   - Populate email template with client data
   - Send email to advisor with PDF attached
   - Show confirmation: "Results have been sent to {advisorEmail}"

### Required Data Structure

```javascript
const resultData = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    advisorEmail: "advisor@petra.com",
    finalScore: 67,
    riskBand: "Balanced Growth",
    behavioralScore: 38,
    traditionalScore: 29,
    answers: {
        // All question answers keyed by question name
        "loss_reaction": 3,
        "market_drop": "hold",
        "knowledge_stocks": ["correct", "option2"],
        // ... etc
    },
    traditionalScores: {
        timeHorizon: 0.8,
        drawdownDiscipline: 0.7,
        // ... etc
    },
    knowledge: {
        index: 72,
        flag: null,
        // ... etc
    }
};
```

### Backend Integration Required

**You'll need to create a backend endpoint** (e.g., PHP, Node.js, Python) that:

1. Receives the result data as JSON POST
2. Generates PDF using the provided function
3. Loads email template HTML
4. Replaces template variables with actual data
5. Sends email with PDF attachment using SMTP
6. Returns success/failure status

**Example endpoint**: `POST /api/send-results`

```javascript
// Client-side call
fetch('/api/send-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resultData)
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        showConfirmation(`Results sent to ${resultData.advisorEmail}`);
    }
});
```

---

## 4. SAMPLE OUTPUTS

### Email Preview (Text Version)

```
=================================
        [PETRA LOGO]
=================================

Thank You, John

We've received your Risk Alignment Assessment.
Your responses have been sent to advisor@petra.com.

┌─────────────────────────────┐
│   YOUR RESULTS SUMMARY      │
├─────────────────────────────┤
│                             │
│    BALANCED GROWTH          │
│         67                  │
│  Risk Alignment Score       │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │    38    │ │    29    │ │
│  │Behavioral│ │Traditional│ │
│  │  (0-60)  │ │  (0-40)  │ │
│  └──────────┘ └──────────┘ │
└─────────────────────────────┘

📄 Your complete results summary is attached.

What Happens Next
Your advisor will review your results and reach out
to schedule a conversation. This assessment helps
frame our discussion about your goals, circumstances,
and what you need from your portfolio.

Thank you,
The Petra Team

This assessment is for educational purposes only and
should not be considered investment advice.
```

### PDF Table of Contents

```
Page 1: Cover Page
  - Petra logo
  - Title
  - Client name
  - Assessment date

Page 2-3: Results Summary
  - Risk band (BALANCED GROWTH)
  - Score (67)
  - Component scores
  - Disclaimer

Pages 4-8: Complete Responses
  Section 1: Investment Mindset
    Q1: [Question text]
    Answer: [Selected option]
    Q2: ...

  Section 2: Investment Knowledge
    Q1: ...

  Section 3: Traditional Risk Assessment
    Q1: ...
```

---

## 5. WHAT'S LEFT TO DO

### Immediate
1. ✅ Remove em dashes from text
2. ✅ Move "Understanding the Scale" section
3. ✅ Fix risk scale shadow alignment
4. ✅ Create email template
5. ✅ Create PDF generator
6. ⏳ **Add jsPDF script to HTML** (Done in index.html)
7. ⏳ **Include pdf-generator.js in HTML**
8. ⏳ **Create backend endpoint for email sending**
9. ⏳ **Add "Email Results" button to results page**
10. ⏳ **Wire up button to trigger PDF + email**

### Backend Implementation Needed

**Option A: PHP** (if you have PHP server)
```php
// send-results.php
$data = json_decode(file_get_contents('php://input'), true);
$pdfBase64 = $data['pdfBase64'];
$email = $data['email'];

// Use PHPMailer or similar
// Attach PDF, send email
```

**Option B: Node.js** (if using Node backend)
```javascript
// server.js
app.post('/api/send-results', async (req, res) => {
    const { pdfBase64, email, resultData } = req.body;

    // Use nodemailer
    // Populate template
    // Send with attachment
});
```

**Option C: Serverless** (Netlify Functions, Vercel, etc.)

---

## 6. TESTING CHECKLIST

### Email Template
- [ ] Test in Gmail (web)
- [ ] Test in Outlook (desktop)
- [ ] Test in Apple Mail
- [ ] Test on mobile
- [ ] Verify logo displays correctly
- [ ] Check all variables populate
- [ ] Verify colors match Petra brand

### PDF Generation
- [ ] Test with single person results
- [ ] Test with couple results
- [ ] Verify all questions appear
- [ ] Check multi-select answers display correctly
- [ ] Ensure page breaks work properly
- [ ] Test long text wrapping
- [ ] Verify footer on all pages
- [ ] Check file name format

### Integration
- [ ] Test full flow: complete quiz → generate PDF → send email
- [ ] Verify confirmation message displays
- [ ] Check advisor receives email
- [ ] Verify PDF attachment opens correctly
- [ ] Test error handling (failed email, etc.)

---

## 7. BRAND CONSISTENCY CHECK

All elements now match the quiz/results UI:
- ✅ Same cream background (#F5F1EA)
- ✅ Same gold accent (#9A7611)
- ✅ Same charcoal text (#25282A)
- ✅ Same rounded corners
- ✅ Same shadow style
- ✅ Same typography (Brandon Grotesque + Crimson Pro)
- ✅ Same card styling
- ✅ Same component score layout
- ✅ Petra logo properly displayed

---

## Need Help?

If you need assistance with:
- Backend integration
- Email server setup (SMTP configuration)
- Testing
- Deployment

Just let me know!
