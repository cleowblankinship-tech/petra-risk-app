// ============================================================================
// COMPREHENSIVE PDF GENERATION FOR PETRA RISK ASSESSMENT
// ============================================================================

/**
 * Generate complete PDF with results and all Q&A
 * @param {Object} resultData - Complete result data including scores, answers, etc.
 * @param {string} clientName - Client's full name
 * @param {boolean} isCouple - Whether this is a couple assessment
 */
function generateCompletePDF(resultData, clientName, isCouple = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = margin;

    // Petra brand colors
    const petraGold = [154, 118, 17];
    const petraCharcoal = [37, 40, 42];
    const petraWarm = [107, 91, 79];
    const petraCreamy = [245, 241, 234];

    // Helper function to check for page break
    function checkPageBreak(neededSpace) {
        if (yPos + neededSpace > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
        }
        return false;
    }

    // Helper function for wrapped text
    function addWrappedText(text, x, y, maxWidth, lineHeight = 7) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * lineHeight;
    }

    // ========================================================================
    // COVER PAGE
    // ========================================================================

    // Logo placeholder (would use actual logo if embedded)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('PETRA', pageWidth / 2, 60, { align: 'center' });

    // Title
    yPos = 100;
    doc.setFontSize(24);
    doc.setTextColor(...petraCharcoal);
    doc.text('Risk Alignment Assessment', pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Results', pageWidth / 2, yPos, { align: 'center' });

    // Client info
    yPos += 40;
    doc.setFontSize(14);
    doc.text('Prepared for:', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, margin, yPos);

    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const assessmentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Assessment Date: ${assessmentDate}`, margin, yPos);

    // ========================================================================
    // SECTION A: RESULTS SUMMARY
    // ========================================================================

    doc.addPage();
    yPos = margin;

    // Section header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('Results Summary', margin, yPos);
    yPos += 15;

    // Draw separator line
    doc.setDrawColor(...petraGold);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Risk Band (large, prominent)
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const riskBandColor = getRiskBandColorRGB(resultData.finalScore);
    doc.setTextColor(...riskBandColor);
    doc.text(resultData.riskBand.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Risk Alignment Score
    doc.setFontSize(48);
    doc.setTextColor(...petraGold);
    doc.text(String(resultData.finalScore), pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(...petraWarm);
    doc.setFont('helvetica', 'normal');
    doc.text('RISK ALIGNMENT SCORE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Component scores in boxes
    const boxWidth = (contentWidth - 10) / 2;
    const boxHeight = 40;
    const boxY = yPos;

    // Behavioral box
    doc.setFillColor(...petraCreamy);
    doc.rect(margin, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(...petraWarm);
    doc.rect(margin, boxY, boxWidth, boxHeight);

    doc.setFontSize(28);
    doc.setTextColor(...petraGold);
    doc.setFont('helvetica', 'bold');
    doc.text(String(resultData.behavioralScore), margin + (boxWidth / 2), boxY + 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...petraCharcoal);
    doc.setFont('helvetica', 'bold');
    doc.text('BEHAVIORAL (0-60)', margin + (boxWidth / 2), boxY + 27, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('How you think and feel about risk', margin + (boxWidth / 2), boxY + 35, { align: 'center' });

    // Traditional box
    doc.setFillColor(...petraCreamy);
    doc.rect(margin + boxWidth + 10, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(...petraWarm);
    doc.rect(margin + boxWidth + 10, boxY, boxWidth, boxHeight);

    doc.setFontSize(28);
    doc.setTextColor(...petraGold);
    doc.setFont('helvetica', 'bold');
    doc.text(String(resultData.traditionalScore), margin + boxWidth + 10 + (boxWidth / 2), boxY + 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...petraCharcoal);
    doc.setFont('helvetica', 'bold');
    doc.text('TRADITIONAL (0-40)', margin + boxWidth + 10 + (boxWidth / 2), boxY + 27, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Time horizon and goals', margin + boxWidth + 10 + (boxWidth / 2), boxY + 35, { align: 'center' });

    yPos = boxY + boxHeight + 15;

    // Disclaimer box
    checkPageBreak(30);
    doc.setFillColor(254, 247, 232); // Light gold
    doc.setDrawColor(...petraGold);
    doc.setLineWidth(0.5);
    const disclaimerHeight = 25;
    doc.rect(margin, yPos, contentWidth, disclaimerHeight, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(...petraCharcoal);
    doc.setFont('helvetica', 'normal');
    const disclaimerText = 'This assessment helps organize our conversation, not define you. At Petra, we know risk tolerance is personal and shaped by more than any questionnaire can measure. Your responses give us a starting point—a way to frame the discussion and ask better questions—but the real understanding comes from talking.';
    yPos += 7;
    const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 10);
    doc.text(disclaimerLines, margin + 5, yPos);

    yPos += disclaimerHeight + 10;

    // ========================================================================
    // NARRATIVE SECTIONS (matching on-screen results)
    // ========================================================================

    doc.addPage();
    yPos = margin;

    // Section: What Your Score Reflects
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('What Your Score Reflects', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...petraCharcoal);
    const overallSummaryText = typeof generateOverallSummary === 'function'
        ? generateOverallSummary(resultData)
        : 'Overall summary not available.';
    const summaryLines = doc.splitTextToSize(overallSummaryText, contentWidth);
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * 5 + 15;

    checkPageBreak(30);

    // Section: Behavioral Tendencies and Investment Mindset
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('Behavioral Tendencies and Investment Mindset', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const mindsetText = typeof generateMindsetInsight === 'function'
        ? generateMindsetInsight(resultData)
        : 'Mindset insight not available.';
    const mindsetLines = doc.splitTextToSize(mindsetText, contentWidth);
    doc.text(mindsetLines, margin, yPos);
    yPos += mindsetLines.length * 5 + 15;

    checkPageBreak(30);

    // Section: Time Horizon and Risk Capacity
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('Time Horizon and Risk Capacity', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const traditionalText = typeof generateTraditionalInsight === 'function'
        ? generateTraditionalInsight(resultData)
        : 'Traditional insight not available.';
    const traditionalLines = doc.splitTextToSize(traditionalText, contentWidth);
    doc.text(traditionalLines, margin, yPos);
    yPos += traditionalLines.length * 5 + 15;

    checkPageBreak(30);

    // Section: How These Elements Work Together
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('How These Elements Work Together', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const alignmentText = typeof generateAlignmentCheck === 'function'
        ? generateAlignmentCheck(resultData)
        : 'Alignment information not available.';
    const alignmentLines = doc.splitTextToSize(alignmentText, contentWidth);
    doc.text(alignmentLines, margin, yPos);
    yPos += alignmentLines.length * 5 + 15;

    checkPageBreak(30);

    // Section: How Petra Uses This Information
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('How Petra Uses This Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const planningText = typeof generatePlanningRelevance === 'function'
        ? generatePlanningRelevance(resultData)
        : 'Planning information not available.';
    const planningLines = doc.splitTextToSize(planningText, contentWidth);
    doc.text(planningLines, margin, yPos);
    yPos += planningLines.length * 5 + 20;

    // ========================================================================
    // APPENDIX: YOUR RESPONSES
    // ========================================================================

    doc.addPage();
    yPos = margin;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...petraCharcoal);
    doc.text('Your Responses', margin, yPos);
    yPos += 10;

    doc.setDrawColor(...petraGold);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Organize questions by section
    const questionSections = [
        { title: 'Investment Mindset', questions: questions.behavioral },
        { title: 'Investment Knowledge', questions: questions.knowledge },
        { title: 'Traditional Risk Assessment', questions: questions.traditional }
    ];

    questionSections.forEach((section, sectionIndex) => {
        // Section header
        checkPageBreak(20);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...petraGold);
        doc.text(section.title, margin, yPos);
        yPos += 10;

        // Questions
        section.questions.forEach((q, qIndex) => {
            checkPageBreak(25);

            // Question number and text
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...petraCharcoal);
            const questionNumber = `Q${qIndex + 1}:`;
            doc.text(questionNumber, margin, yPos);

            doc.setFont('helvetica', 'normal');
            const questionLines = doc.splitTextToSize(q.question, contentWidth - 15);
            doc.text(questionLines, margin + 15, yPos);
            yPos += questionLines.length * 5 + 3;

            // Answer
            doc.setFontSize(10);
            doc.setTextColor(...petraWarm);
            doc.setFont('helvetica', 'italic');

            const answerValue = resultData.answers[q.name];
            let answerText = 'No answer provided';

            if (answerValue !== undefined && answerValue !== null) {
                if (q.type === 'multiselect' && Array.isArray(answerValue)) {
                    // Multi-select: show all selected options
                    answerText = answerValue.map(val => {
                        const option = q.options.find(opt => opt.value === val);
                        return option ? `• ${option.label}` : `• ${val}`;
                    }).join('\n');
                } else if (q.options) {
                    // Single select: find the option label
                    const option = q.options.find(opt => opt.value === answerValue);
                    answerText = option ? option.label : String(answerValue);
                } else {
                    answerText = String(answerValue);
                }
            }

            const answerLines = doc.splitTextToSize(`Answer: ${answerText}`, contentWidth - 10);
            doc.text(answerLines, margin + 5, yPos);
            yPos += answerLines.length * 5 + 8;
        });

        yPos += 5;
    });

    // ========================================================================
    // FOOTER ON EVERY PAGE
    // ========================================================================

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );

        // Disclosure on every page
        doc.setFontSize(7);
        doc.text(
            'This assessment is for educational purposes only and should not be considered investment advice.',
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
        );
    }

    // Save the PDF
    const fileName = `Petra_Risk_Assessment_${clientName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    return doc;
}

/**
 * Helper: Get RGB color for risk band
 */
function getRiskBandColorRGB(score) {
    if (score <= 24) return [139, 111, 92];  // Very Conservative
    if (score <= 44) return [107, 114, 128]; // Conservative
    if (score <= 59) return [126, 173, 173]; // Balanced
    if (score <= 74) return [147, 162, 188]; // Balanced Growth
    if (score <= 89) return [204, 160, 84];  // Growth
    return [154, 118, 17];                    // Aggressive Growth
}

/**
 * Generate PDF and prepare for email attachment
 * Returns base64 encoded PDF
 */
function generatePDFForEmail(resultData, clientName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Use same generation logic as above
    // ... (simplified for email attachment)

    return doc.output('datauristring');
}
