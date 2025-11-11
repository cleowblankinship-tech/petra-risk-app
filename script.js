var ADVISOR_PASSCODE = 'petra';
var isAdvisorView = false;

// Results Display
function displayResults(finalScore, behavioralScore, traditionalScore, riskBand, rbClass) {
    document.getElementById('results').style.display = 'block';
    document.getElementById('mainScore').textContent = finalScore;
    document.getElementById('behavioralScore').textContent = behavioralScore;
    document.getElementById('traditionalScore').textContent = traditionalScore;
    document.getElementById('riskBand').textContent = riskBand;
    document.getElementById('riskBand').className = 'risk-band ' + rbClass;
    document.getElementById('progressFill').style.width = finalScore + '%';
    
    displayScoreInterpretation(finalScore);
    displayRiskScale(finalScore);
    
    // Show PDF button for solo mode, hide for couple mode until both complete
    if (!isCoupleMode) {
        document.getElementById('downloadPdfBtn').style.display = 'block';
    }
    
    // Show advisor sections if in advisor view
    if (isAdvisorView) {
        displayKnowledgeOverlay();
        generateAdvisorContent();
    }
    
    setTimeout(function() {
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function displayRiskScale(score) {
    document.getElementById('riskScale').style.display = 'block';
    
    // Determine which segment to highlight
    var segments = document.querySelectorAll('.risk-scale-segment');
    segments.forEach(function(seg) {
        seg.classList.remove('active');
    });
    
    var activeSegment;
    if (score <= 24) activeSegment = 0;
    else if (score <= 44) activeSegment = 1;
    else if (score <= 59) activeSegment = 2;
    else if (score <= 74) activeSegment = 3;
    else if (score <= 89) activeSegment = 4;
    else activeSegment = 5;
    
    segments[activeSegment].classList.add('active');
}

function displayScoreInterpretation(score) {
    var interpretationText = '';
    
    if (score <= 24) {
        interpretationText = 'This profile reflects high loss aversion and strong stability preference. You tend to evaluate decisions through the lens of capital preservation and reliability. Market volatility feels like a signal to protect rather than participate, and you often favor tangible or guaranteed outcomes over abstract future growth.';
    } else if (score <= 44) {
        interpretationText = 'You show moderate loss sensitivity with a measured approach to uncertainty. You\'re comfortable taking calculated risk when there\'s a clear rationale, but emotional comfort remains central. Stability and visibility into results matter, and you likely prefer frameworks that reduce surprises or large short-term swings.';
    } else if (score <= 59) {
        interpretationText = 'You exhibit risk-awareness without risk-aversion. You accept market fluctuation as part of progress and tend to make decisions based on information rather than emotion. Your behavior reflects a stable midpoint between caution and conviction — rational, consistent, and generally disciplined under moderate volatility.';
    } else if (score <= 74) {
        interpretationText = 'Your profile suggests growth orientation with adaptive emotional control. You display confidence under uncertainty, interpreting volatility as data rather than danger. While you remain conscious of potential loss, your decisions are guided more by long-term opportunity than short-term protection.';
    } else if (score <= 89) {
        interpretationText = 'You have low loss aversion and high return motivation, often focusing on outcomes rather than interim noise. You demonstrate resilience during drawdowns and are comfortable taking positions that require conviction. You likely engage actively with investment narratives and respond well to evidence-based framing.';
    } else {
        interpretationText = 'This profile reflects high risk tolerance and analytical independence. You thrive in environments with complexity and uncertainty, where decision-making depends on conviction and long-range perspective. Volatility is not discouraging — it\'s often seen as a strategic opportunity. Your loss aversion is minimal, and your confidence level is typically high, sometimes warranting calibration to avoid overconfidence bias.';
    }
    
    document.getElementById('scoreInterpretation').style.display = 'block';
    document.getElementById('interpretationTitle').textContent = isAdvisorView ? "Client's Risk Profile" : 'Your Risk Profile';
    document.getElementById('interpretationText').textContent = interpretationText;
}

function displayKnowledgeOverlay() {
    // For couple mode, show combined knowledge overlay
    if (isCoupleMode && person1Data && person2Data) {
        var k1 = person1Data.knowledge;
        var k2 = person2Data.knowledge;
        
        document.getElementById('knowledgeIndex').textContent = person1Name + ': ' + k1.index + '/100 | ' + person2Name + ': ' + k2.index + '/100';
        
        var calibrationText = person1Name + ': ' + (k1.flag || 'aligned') + ' | ' + person2Name + ': ' + (k2.flag || 'aligned');
        document.getElementById('knowledgeCalibration').textContent = calibrationText;
        document.getElementById('knowledgeCalibration').style.fontSize = '1rem';
        
        // Display flags for both
        var flagsHTML = generateKnowledgeFlags(person1Name, person1Data);
        flagsHTML += '<div style="margin: 15px 0; border-top: 1px solid #e0e7ff; padding-top: 15px;"></div>';
        flagsHTML += generateKnowledgeFlags(person2Name, person2Data);
        
        document.getElementById('knowledgeFlags').innerHTML = flagsHTML;
    } else {
        // Solo mode or single person
        var k = lastComputed.knowledge;
        document.getElementById('knowledgeIndex').textContent = k.index + '/100';
        
        var calibrationText = 'Aligned';
        var calibrationClass = '';
        if (k.flag === 'overconfidence') {
            calibrationText = 'Overconfident';
            calibrationClass = 'flag-overconfident';
        } else if (k.flag === 'underconfidence') {
            calibrationText = 'Underconfident';
            calibrationClass = 'flag-underconfident';
        }
        
        var calibEl = document.getElementById('knowledgeCalibration');
        calibEl.textContent = calibrationText;
        calibEl.className = 'knowledge-item-value ' + calibrationClass;
        
        document.getElementById('knowledgeFlags').innerHTML = generateKnowledgeFlags(null, lastComputed);
    }
}

function generateKnowledgeFlags(personName, data) {
    var k = data.knowledge;
    var flagsHTML = '';
    
    if (personName) {
        flagsHTML += '<h4 style="color: #4f46e5; margin: 10px 0; font-size: 1rem;">' + personName + '</h4>';
    }
    
    if (k.flag === 'overconfidence') {
        flagsHTML += '<div style="margin-bottom: 10px; color: #991b1b; font-size: 0.9rem;"><strong>Overconfident:</strong> Client\'s self-assessment of their financial knowledge exceeds their objective performance. This suggests they may be more certain in investment decisions than their knowledge level warrants. Recommend confirming understanding before introducing complex strategies.</div>';
    } else if (k.flag === 'underconfidence') {
        flagsHTML += '<div style="margin-bottom: 10px; color: #92400e; font-size: 0.9rem;"><strong>Underconfident:</strong> Client\'s objective knowledge exceeds their self-assessment. They may hesitate or second-guess decisions despite having adequate understanding. Recommend building confidence through education and reinforcement.</div>';
    } else {
        flagsHTML += '<div style="margin-bottom: 10px; color: #059669; font-size: 0.9rem;"><strong>Aligned:</strong> Client\'s self-assessment matches their objective knowledge level. They have realistic awareness of their capabilities and limitations in financial decision-making.</div>';
    }
    
    if (data.flags.longevity) {
        flagsHTML += '<span class="flag-indicator flag-longevity">Longevity Planning</span> <span style="color: #1e40af; font-size: 0.85rem;">(Family history indicates longer time horizon considerations)</span><br>';
    }
    if (data.flags.caregiving) {
        flagsHTML += '<span class="flag-indicator flag-caregiving">Caregiving Consideration</span> <span style="color: #92400e; font-size: 0.85rem;">(Expected financial or caregiving support for loved ones)</span><br>';
    }
    if (k.flag === 'overconfidence') {
        flagsHTML += '<span class="flag-indicator flag-overconfident">Confirm understanding before complex strategies</span> <span style="color: #991b1b; font-size: 0.85rem;">(Self-assessment exceeds objective knowledge)</span>';
    } else if (k.flag === 'underconfidence') {
        flagsHTML += '<span class="flag-indicator flag-underconfident">May benefit from additional education</span> <span style="color: #92400e; font-size: 0.85rem;">(Objective knowledge exceeds self-assessment)</span>';
    }
    
    return flagsHTML;
}

// Advisor Content Generation
function generateAdvisorContent() {
    if (!lastComputed && !(person1Data && person2Data)) return;
    
    var advisorHTML = '<div class="advisor-view-header">ADVISOR VIEW</div>';
    
    // If couple mode and both completed, show comparison first
    if (isCoupleMode && person1Data && person2Data) {
        // Couple comparison is already visible in main results, so show dual column IPS
        advisorHTML += '<div class="couple-results-dual">';
        advisorHTML += '<div class="person-result-column person-1">';
        advisorHTML += '<h3>' + person1Name + '</h3>';
        advisorHTML += generateEnhancedAdvisorView(person1Data);
        advisorHTML += '</div>';
        advisorHTML += '<div class="person-result-column person-2">';
        advisorHTML += '<h3>' + person2Name + '</h3>';
        advisorHTML += generateEnhancedAdvisorView(person2Data);
        advisorHTML += '</div>';
        advisorHTML += '</div>';
    } else if (lastComputed) {
        // Solo mode or first person - show single view
        advisorHTML += generateEnhancedAdvisorView(lastComputed);
    }
    
    var fullHTML = '<div class="knowledge-overlay">';
    fullHTML += '<h3>Financial Knowledge (Diagnostic Overlay)</h3>';
    fullHTML += '<p class="knowledge-description">This section does not affect the Risk Alignment Score. It helps tailor communication and planning recommendations.</p>';
    fullHTML += '<div class="knowledge-grid">';
    fullHTML += '<div class="knowledge-item"><div class="knowledge-item-label">Knowledge Index</div><div class="knowledge-item-value" id="knowledgeIndex">--</div></div>';
    fullHTML += '<div class="knowledge-item"><div class="knowledge-item-label">Calibration</div><div class="knowledge-item-value" id="knowledgeCalibration">--</div></div>';
    fullHTML += '</div>';
    fullHTML += '<div id="knowledgeFlags"></div>';
    fullHTML += '</div>';
    fullHTML += advisorHTML;
    fullHTML += '<div style="text-align:center;margin:20px 0;">';
    fullHTML += '<button class="print-btn" onclick="copyJSON()" style="background:#059669;">Copy JSON</button>';
    fullHTML += '</div>';
    
    document.getElementById('advisorSections').innerHTML = fullHTML;
    displayKnowledgeOverlay();
}

function generateEnhancedAdvisorView(data) {
    var k = data.knowledge;
    var score = data.finalScore;
    
    var riskExplanation = getRiskExplanation(score);
    
    var html = '<div class="advisor-details">';
    html += '<h4 style="color: var(--petra-gold); margin-top: 0;">IPS Summary</h4>';
    html += '<p><strong>Risk Alignment Score:</strong> ' + data.finalScore + ' (' + data.riskBand + ')</p>';
    html += '<p><strong>Components:</strong> Behavioral ' + data.behavioralScore + '/60 + Traditional ' + data.traditionalScore + '/40</p>';
    html += '<div style="background: #fef3c7; border-left: 4px solid var(--petra-gold); padding: 12px; margin: 15px 0; border-radius: 4px;">';
    html += '<strong style="color: var(--petra-charcoal);">Score Interpretation:</strong>';
    html += '<p style="margin: 8px 0 0 0; color: #78350f; font-size: 0.9rem;">' + riskExplanation + '</p>';
    html += '</div>';
    
    html += '<h4 style="color: var(--petra-gold); margin-top: 20px; font-size: 1rem;">Behavioral Component Detail</h4>';
    html += generateBehavioralExplanation(data);
    
    html += '<h4 style="color: var(--petra-gold); margin-top: 20px; font-size: 1rem;">Traditional Risk Detail</h4>';
    html += generateTraditionalExplanation(data);
    
    html += '<h4 style="color: var(--petra-gold); margin-top: 20px; font-size: 1rem;">Knowledge Assessment</h4>';
    html += generateKnowledgeExplanation(data);
    
    html += '<h4 style="color: var(--petra-gold); margin-top: 20px; font-size: 1rem;">Planning Flags</h4>';
    html += '<p style="font-size: 0.9rem;"><strong>Longevity:</strong> ' + (data.flags.longevity ? 'TRUE - Consider longer time horizon and sequence-of-returns risk' : 'FALSE') + '</p>';
    html += '<p style="font-size: 0.9rem;"><strong>Caregiving:</strong> ' + (data.flags.caregiving ? 'TRUE - Build liquidity sleeve and cash-flow flexibility' : 'FALSE') + '</p>';
    
    html += '</div>';
    
    return html;
}

function generateBehavioralExplanation(data) {
    var html = '<div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.9rem;">';
    
    var lossAv = data.behavioralScores.lossAversion;
    html += '<p><strong>Loss Aversion (' + (lossAv * 100).toFixed(0) + '/100):</strong> ';
   if (lossAv > 0.7) {
    html += 'Low loss aversion. Client views losses as opportunities and is comfortable with market drawdowns.';
   } else if (lossAv > 0.4) {
    html += 'Moderate loss aversion. Client is conscious of losses but can tolerate some volatility with proper framing.';
   } else {
    html += 'High loss aversion. Client strongly reacts to losses and may sell during downturns. Consider emphasizing portfolio construction that minimizes volatility perception.';
   }
    html += '</p>';
    
    var overconf = data.behavioralScores.overconfidence;
    html += '<p><strong>Overconfidence (' + (overconf * 100).toFixed(0) + '/100):</strong> ';
    if (overconf > 0.7) {
        html += 'High confidence in investment selection ability. May benefit from systematic, rules-based approach to prevent overtrading or concentration risk.';
    } else if (overconf > 0.4) {
        html += 'Moderate confidence. Balanced self-assessment of investment abilities.';
    } else {
        html += 'Low confidence. May be hesitant in decision-making. Building conviction through education is recommended.';
    }
    html += '</p>';
    
    var recency = data.behavioralScores.recency;
    html += '<p><strong>Recency Bias (' + (recency * 100).toFixed(0) + '/100):</strong> ';
    if (recency > 0.7) {
        html += 'Strong recency bias resistance. Focuses on long-term fundamentals over recent performance.';
    } else if (recency > 0.4) {
        html += 'Moderate recency influence. Recent performance has some impact on decisions.';
    } else {
        html += 'High recency bias. Strongly influenced by recent market performance. May chase performance or panic sell.';
    }
    html += '</p>';
    
    var herd = data.behavioralScores.herdBehavior;
    html += '<p><strong>Herd Behavior (' + (herd * 100).toFixed(0) + '/100):</strong> ';
    if (herd > 0.7) {
        html += 'Independent thinker. Makes decisions based on own analysis rather than following crowds.';
    } else if (herd > 0.4) {
        html += 'Moderate independence. Considers market sentiment but maintains some independent judgment.';
    } else {
        html += 'Strong herd tendency. Finds comfort in consensus decisions. May be susceptible to market bubbles or panics.';
    }
    html += '</p>';
    
    html += '</div>';
    return html;
}

function generateTraditionalExplanation(data) {
    var html = '<div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.9rem;">';
    
    var volReact = data.traditionalScores.volatilityReaction;
    html += '<p><strong>Volatility Reaction (' + (volReact * 100).toFixed(0) + '/100):</strong> ';
    if (volReact > 0.75) {
        html += 'Would buy more during 20% decline. Strong conviction and long-term orientation.';
    } else if (volReact > 0.5) {
        html += 'Would hold steady during 20% decline. Disciplined approach to market volatility.';
    } else if (volReact > 0.25) {
        html += 'Would consider selling some during 20% decline. Moderate discomfort with volatility.';
    } else {
        html += 'Would sell during 20% decline. High sensitivity to portfolio losses. Conservative positioning recommended.';
    }
    html += '</p>';
    
    var timeHor = data.traditionalScores.timeHorizon;
    html += '<p><strong>Time Horizon (' + (timeHor * 100).toFixed(0) + '/100):</strong> ';
    if (timeHor >= 0.75) {
        html += 'More than 15 years. Long time horizon supports aggressive growth allocation.';
    } else if (timeHor >= 0.5) {
        html += '8-15 years. Sufficient time for growth-oriented strategies with moderate risk.';
    } else if (timeHor >= 0.25) {
        html += '4-7 years. Intermediate time frame. Balanced approach appropriate.';
    } else {
        html += '1-3 years or less. Short time horizon requires conservative positioning and capital preservation focus.';
    }
    html += '</p>';
    
    var discipline = data.traditionalScores.disciplineConfidence;
    html += '<p><strong>Discipline Confidence (' + (discipline * 100).toFixed(0) + '/100):</strong> ';
    if (discipline > 0.75) {
        html += 'Strong commitment to long-term plan. Unlikely to deviate during market stress.';
    } else if (discipline > 0.5) {
        html += 'Moderate discipline. May need reinforcement during extreme market conditions.';
    } else {
        html += 'Low discipline confidence. Requires frequent communication and behavioral coaching during volatility.';
    }
    html += '</p>';
    
    html += '</div>';
    return html;
}

function generateKnowledgeExplanation(data) {
    var k = data.knowledge;
    var html = '<div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 0.9rem;">';
    
    html += '<p><strong>Knowledge Index:</strong> ' + k.index + '/100 (Correct: ' + k.correctCount + '/' + k.totalObjective + ')</p>';
    html += '<p><strong>Calibration:</strong> ' + (k.flag || 'Aligned') + '</p>';
    
    if (k.flag === 'overconfidence') {
        html += '<p style="color: #991b1b;"><strong>Overconfident:</strong> Self-assessment exceeds objective knowledge. Confirm understanding before presenting complex strategies. May benefit from educational approach that builds actual knowledge before expanding into sophisticated investments.</p>';
    } else if (k.flag === 'underconfidence') {
        html += '<p style="color: #92400e;"><strong>Underconfident:</strong> Objective knowledge exceeds self-assessment. Client may hesitate despite having adequate understanding. Reinforce their competence and provide evidence-based confidence building.</p>';
    } else {
        html += '<p style="color: #059669;"><strong>Well Calibrated:</strong> Realistic self-assessment. Client has good awareness of their knowledge level.</p>';
    }
    
    html += '</div>';
    return html;
}

function getRiskExplanation(score) {
    if (score <= 24) {
        return 'This score indicates a preference for capital preservation and stability. Client is best suited for conservative strategies with minimal volatility and emphasis on income generation.';
    } else if (score <= 44) {
        return 'This score suggests moderate risk aversion with preference for income and stability over growth. Client may accept limited equity exposure within a predominantly fixed-income framework.';
    } else if (score <= 59) {
        return 'This score reflects a balanced approach between growth and preservation, comfortable with moderate market fluctuations. Client can sustain a diversified portfolio with meaningful equity allocation.';
    } else if (score <= 74) {
        return 'This score indicates growth orientation with tolerance for volatility. Client is suitable for equity-focused portfolios with tactical fixed-income positions for stability.';
    } else if (score <= 89) {
        return 'This score suggests strong comfort with market volatility and long-term growth focus. Client can sustain aggressive equity exposure with minimal fixed-income allocation.';
    } else {
        return 'This score reflects high risk tolerance and growth maximization objectives. Client is suited for concentrated equity positions, alternatives, and strategies with significant short-term volatility.';
    }
}

// Advisor Mode Functions
function showPasscodeModal() {
    document.getElementById('advisorAccess').setAttribute('open', '');
    document.getElementById('passcodeInput').focus();
}

function hidePasscodeModal() {
    document.getElementById('advisorAccess').removeAttribute('open');
    document.getElementById('passcodeInput').value = '';
}

function checkPasscode() {
    var passcode = document.getElementById('passcodeInput').value;
    if (passcode === ADVISOR_PASSCODE) {
        enableAdvisorView();
        hidePasscodeModal();
    } else {
        alert('Incorrect passcode');
        document.getElementById('passcodeInput').value = '';
    }
}

function enableAdvisorView() {
    isAdvisorView = true;
    document.querySelectorAll('.advisor-only').forEach(function(el) {
        el.style.display = 'block';
    });
    
    var fabButton = document.querySelector('.advisor-fab .fab-button');
    if (fabButton) {
        fabButton.textContent = 'Client View';
        fabButton.onclick = function(e) {
            e.preventDefault();
            disableAdvisorView();
        };
    }
    
    var titleEl = document.getElementById('interpretationTitle');
    if (titleEl) {
        titleEl.textContent = "Client's Risk Profile";
    }
    
    if (lastComputed || (person1Data && person2Data)) {
        generateAdvisorContent();
    }
}

function disableAdvisorView() {
    isAdvisorView = false;
    document.querySelectorAll('.advisor-only').forEach(function(el) {
        el.style.display = 'none';
    });
    
    var fabButton = document.querySelector('.advisor-fab .fab-button');
    if (fabButton) {
        fabButton.textContent = 'Advisor';
        fabButton.onclick = null;
    }
    
    var titleEl = document.getElementById('interpretationTitle');
    if (titleEl) {
        titleEl.textContent = "Your Risk Profile";
    }
}

// Export Functions
function copyJSON() {
    if (!lastComputed) {
        alert('Please calculate the score first.');
        return;
    }
    
    var data = {
        sessionId: lastComputed.sessionId,
        timestamp: lastComputed.timestamp,
        finalScore: lastComputed.finalScore,
        riskBand: lastComputed.riskBand,
        components: {
            behavioral: lastComputed.behavioralScore,
            traditional: lastComputed.traditionalScore
        },
        behavioralScores: lastComputed.behavioralScores,
        traditionalScores: lastComputed.traditionalScores,
        knowledge: {
            index: lastComputed.knowledge.index,
            delta: lastComputed.knowledge.delta,
            flag: lastComputed.knowledge.flag || 'aligned',
            correctAnswers: lastComputed.knowledge.correctCount,
            totalQuestions: lastComputed.knowledge.totalObjective
        },
        flags: lastComputed.flags
    };
    
    var jsonString = JSON.stringify(data, null, 2);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(jsonString)
            .then(function() {
                alert('JSON data copied to clipboard!');
            })
            .catch(function() {
                prompt('Copy this JSON data:', jsonString);
            });
    } else {
        prompt('Copy this JSON data:', jsonString);
    }
}

// PDF Generation Functions
function downloadPDF() {
    if (!lastComputed && !(person1Data && person2Data)) {
        alert('Please complete the assessment first.');
        return;
    }
    
    var pdfWindow = window.open('', '_blank', 'width=900,height=700');
    if (!pdfWindow) {
        alert('Please allow pop-ups to download the PDF.');
        return;
    }
    
    var htmlContent = '<!DOCTYPE html><html><head><title>Risk Assessment Summary</title><style>';
    htmlContent += 'body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto;font-size:11px}';
    htmlContent += '.header{text-align:center;margin-bottom:25px;border-bottom:3px solid #9A7611;padding-bottom:12px}';
    htmlContent += '.header h1{color:#40434E;margin:0 0 5px;font-size:22px}';
    htmlContent += '.header h2{color:#9A7611;margin:0;font-size:12px;text-transform:uppercase;letter-spacing:2px}';
    htmlContent += '.date{text-align:right;color:#666;font-size:10px;margin-bottom:15px}';
    
    if (isAdvisorView) {
        // ADVISOR PDF - Full detailed report
        htmlContent += '.person-section{margin-bottom:25px;padding:18px;border:2px solid #93A2BC;border-radius:8px;page-break-inside:avoid}';
        htmlContent += '.person-section h3{color:#40434E;margin-top:0;font-size:16px;border-bottom:2px solid #9A7611;padding-bottom:8px}';
        htmlContent += '.score-row{display:flex;justify-content:space-between;align-items:center;margin:12px 0}';
        htmlContent += '.score-main{font-size:36px;font-weight:bold;color:#9A7611}';
        htmlContent += '.score-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px}';
        htmlContent += '.risk-band-badge{display:inline-block;padding:4px 12px;border-radius:12px;color:white;font-weight:bold;font-size:10px}';
        htmlContent += '.components{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}';
        htmlContent += '.component-box{background:#f8f8f8;padding:12px;border-radius:5px;text-align:center}';
        htmlContent += '.component-value{font-size:24px;font-weight:bold;color:#9A7611}';
        htmlContent += '.component-label{font-size:9px;color:#666;margin-top:4px;text-transform:uppercase}';
        htmlContent += '.interpretation{background:#fef3c7;padding:12px;border-left:3px solid #9A7611;margin:12px 0;font-size:10px;line-height:1.5}';
        htmlContent += '.detail-section{margin:15px 0;padding:12px;background:#f8fafc;border-radius:6px}';
        htmlContent += '.detail-section h4{color:#9A7611;margin:0 0 10px;font-size:12px;text-transform:uppercase}';
        htmlContent += '.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:10px}';
        htmlContent += '.detail-item{padding:6px;background:white;border-radius:4px}';
        htmlContent += '.detail-label{color:#64748b;font-weight:600}';
        htmlContent += '.detail-value{color:#40434E;font-weight:700}';
        htmlContent += '.flags-section{margin:12px 0;padding:10px;background:#e0f2fe;border-left:3px solid #0284c7;border-radius:4px}';
        htmlContent += '.flag-badge{display:inline-block;padding:3px 10px;margin:3px;border-radius:10px;font-size:9px;font-weight:600}';
        htmlContent += '.flag-lon{background:#dbeafe;color:#1e40af}';
        htmlContent += '.flag-care{background:#fef3c7;color:#92400e}';
        htmlContent += '.flag-over{background:#fee2e2;color:#991b1b}';
        htmlContent += '.flag-under{background:#fef3c7;color:#92400e}';
        htmlContent += '.answers-section{margin:15px 0;padding:12px;background:#f1f5f9;border-radius:6px;page-break-inside:avoid}';
        htmlContent += '.answers-section h4{color:#40434E;margin:0 0 10px;font-size:11px}';
        htmlContent += '.answer-item{margin:8px 0;padding:8px;background:white;border-left:3px solid #93A2BC;border-radius:3px;font-size:9px}';
        htmlContent += '.answer-q{font-weight:600;color:#40434E;margin-bottom:4px}';
        htmlContent += '.answer-a{color:#64748b}';
    } else {
        // CLIENT PDF - Clean summary
        htmlContent += '.person-section{margin-bottom:25px;padding:18px;border:2px solid #93A2BC;border-radius:8px}';
        htmlContent += '.person-section h3{color:#40434E;margin-top:0;font-size:16px}';
        htmlContent += '.score-row{display:flex;justify-content:space-between;align-items:center;margin:12px 0}';
        htmlContent += '.score-main{font-size:40px;font-weight:bold;color:#9A7611}';
        htmlContent += '.score-label{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px}';
        htmlContent += '.risk-band-badge{display:inline-block;padding:4px 14px;border-radius:14px;color:white;font-weight:bold;font-size:11px}';
        htmlContent += '.components{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}';
        htmlContent += '.component-box{background:#f8f8f8;padding:14px;border-radius:5px;text-align:center}';
        htmlContent += '.component-value{font-size:26px;font-weight:bold;color:#9A7611}';
        htmlContent += '.component-label{font-size:10px;color:#666;margin-top:5px}';
        htmlContent += '.interpretation{background:#fef3c7;padding:14px;border-left:4px solid #9A7611;margin:14px 0;font-size:11px;line-height:1.6}';
    }
    
    htmlContent += '.comparison-section{margin-top:25px;padding-top:18px;border-top:2px solid #93A2BC;page-break-inside:avoid}';
    htmlContent += '.comparison-section h3{color:#40434E;text-align:center;margin-bottom:18px;font-size:16px}';
    htmlContent += '.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}';
    htmlContent += '.comparison-box{background:#f8fafc;padding:14px;border-radius:8px;border:2px solid #9A7611;text-align:center}';
    htmlContent += '.comparison-narrative{background:#e0f2fe;padding:14px;border-left:4px solid #0284c7;font-size:10px;line-height:1.6}';
    htmlContent += '.footer{margin-top:25px;padding-top:12px;border-top:1px solid #ccc;text-align:center;font-size:9px;color:#666}';
    htmlContent += '@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}';
    htmlContent += '</style></head><body>';
    htmlContent += '<div class="header"><h1>Risk Alignment Assessment</h1><h2>Petra Financial Advisors</h2></div>';
    htmlContent += '<div class="date">Assessment Date: ' + new Date().toLocaleDateString() + '</div>';
    
    if (isCoupleMode && person1Data && person2Data) {
        if (isAdvisorView) {
            htmlContent += generateAdvisorPersonPDF(person1Name, person1Data);
            htmlContent += generateAdvisorPersonPDF(person2Name, person2Data);
        } else {
            htmlContent += generateClientPersonPDF(person1Name, person1Data);
            htmlContent += generateClientPersonPDF(person2Name, person2Data);
        }
        
        var scoreDiff = Math.abs(person1Data.finalScore - person2Data.finalScore);
        var behavioralDiff = Math.abs(person1Data.behavioralScore - person2Data.behavioralScore);
        var traditionalDiff = Math.abs(person1Data.traditionalScore - person2Data.traditionalScore);
        
        htmlContent += '<div class="comparison-section">';
        htmlContent += '<h3>Couple Comparison</h3>';
        htmlContent += '<div class="comparison-grid">';
        htmlContent += '<div class="comparison-box">';
        htmlContent += '<div style="font-size:13px;font-weight:bold;margin-bottom:8px">' + person1Name + '</div>';
        htmlContent += '<div style="font-size:30px;font-weight:bold;color:#9A7611">' + person1Data.finalScore + '</div>';
        htmlContent += '<div style="font-size:11px;margin:5px 0">' + person1Data.riskBand + '</div>';
        htmlContent += '<div style="font-size:10px;margin-top:8px;color:#64748b">Behavioral: ' + person1Data.behavioralScore + ' | Traditional: ' + person1Data.traditionalScore + '</div>';
        htmlContent += '</div>';
        htmlContent += '<div class="comparison-box">';
        htmlContent += '<div style="font-size:13px;font-weight:bold;margin-bottom:8px">' + person2Name + '</div>';
        htmlContent += '<div style="font-size:30px;font-weight:bold;color:#93A2BC">' + person2Data.finalScore + '</div>';
        htmlContent += '<div style="font-size:11px;margin:5px 0">' + person2Data.riskBand + '</div>';
        htmlContent += '<div style="font-size:10px;margin-top:8px;color:#64748b">Behavioral: ' + person2Data.behavioralScore + ' | Traditional: ' + person2Data.traditionalScore + '</div>';
        htmlContent += '</div>';
        htmlContent += '</div>';
        htmlContent += '<div class="comparison-narrative"><strong>Analysis:</strong> ';
        htmlContent += 'Overall difference: ' + scoreDiff + ' points. ';
        htmlContent += 'Behavioral variance: ' + behavioralDiff + ' points. Traditional variance: ' + traditionalDiff + ' points.';
        htmlContent += '</div></div>';
    } else {
        var dataToUse = lastComputed || person1Data || person2Data;
        var nameToUse = dataToUse ? (dataToUse.personName || 'Client') : 'Client';
        
        if (isAdvisorView) {
            htmlContent += generateAdvisorPersonPDF(nameToUse, dataToUse);
        } else {
            htmlContent += generateClientPersonPDF(nameToUse, dataToUse);
        }
    }
    
    htmlContent += '<div class="footer">';
    htmlContent += '<p><strong>Disclosure:</strong> This assessment is for educational purposes only and should not be considered investment advice.</p>';
    htmlContent += '<p>&copy; ' + new Date().getFullYear() + ' Petra Financial Advisors</p>';
    htmlContent += '</div></body></html>';
    
    pdfWindow.document.write(htmlContent);
    pdfWindow.document.close();
    
   setTimeout(function() {
       pdfWindow.print();
    }, 500);
}

function generateClientPersonPDF(name, data) {
    var interpretationText = getInterpretationText(data.finalScore);
    var riskBandColor = getRiskBandColor(data.finalScore);
    
    var html = '<div class="person-section">';
    html += '<h3>' + name + '</h3>';
    html += '<div class="score-row">';
    html += '<div><div class="score-main">' + data.finalScore + '</div>';
    html += '<div class="score-label">Risk Alignment Score</div></div>';
    html += '<div><span class="risk-band-badge" style="background:' + riskBandColor + '">' + data.riskBand + '</span></div>';
    html += '</div>';
    html += '<div class="components">';
    html += '<div class="component-box"><div class="component-value">' + data.behavioralScore + '</div>';
    html += '<div class="component-label">BEHAVIORAL (0-60)</div></div>';
    html += '<div class="component-box"><div class="component-value">' + data.traditionalScore + '</div>';
    html += '<div class="component-label">TRADITIONAL (0-40)</div></div>';
    html += '</div>';
    html += '<div class="interpretation"><strong>Profile Summary:</strong><br>' + interpretationText + '</div>';
    html += '</div>';
    
    return html;
}

function generateAdvisorPersonPDF(name, data) {
    var interpretationText = getInterpretationText(data.finalScore);
    var riskBandColor = getRiskBandColor(data.finalScore);
    var k = data.knowledge;
    
    var html = '<div class="person-section">';
    html += '<h3>' + name + '</h3>';
    html += '<div class="score-row">';
    html += '<div><div class="score-main">' + data.finalScore + '</div>';
    html += '<div class="score-label">Risk Alignment Score</div></div>';
    html += '<div><span class="risk-band-badge" style="background:' + riskBandColor + '">' + data.riskBand + '</span></div>';
    html += '</div>';
    html += '<div class="components">';
    html += '<div class="component-box"><div class="component-value">' + data.behavioralScore + '</div>';
    html += '<div class="component-label">BEHAVIORAL (0-60)</div></div>';
    html += '<div class="component-box"><div class="component-value">' + data.traditionalScore + '</div>';
    html += '<div class="component-label">TRADITIONAL (0-40)</div></div>';
    html += '</div>';
    html += '<div class="interpretation"><strong>Profile Summary:</strong><br>' + interpretationText + '</div>';
    
    // Behavioral Scores Detail
    html += '<div class="detail-section">';
    html += '<h4>Behavioral Component Breakdown</h4>';
    html += '<div class="detail-grid">';
    html += '<div class="detail-item"><span class="detail-label">Loss Aversion:</span> <span class="detail-value">' + (data.behavioralScores.lossAversion * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Overconfidence:</span> <span class="detail-value">' + (data.behavioralScores.overconfidence * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Recency Bias:</span> <span class="detail-value">' + (data.behavioralScores.recency * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Herd Behavior:</span> <span class="detail-value">' + (data.behavioralScores.herdBehavior * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Confirmation Bias:</span> <span class="detail-value">' + (data.behavioralScores.confirmationBias * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Mental Accounting:</span> <span class="detail-value">' + (data.behavioralScores.mentalAccounting * 100).toFixed(0) + '/100</span></div>';
    html += '</div></div>';
    
    // Traditional Scores Detail
    html += '<div class="detail-section">';
    html += '<h4>Traditional Risk Component Breakdown</h4>';
    html += '<div class="detail-grid">';
    html += '<div class="detail-item"><span class="detail-label">Volatility Reaction:</span> <span class="detail-value">' + (data.traditionalScores.volatilityReaction * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Reward/Stability:</span> <span class="detail-value">' + (data.traditionalScores.rewardStability * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Emotional Comfort:</span> <span class="detail-value">' + (data.traditionalScores.emotionalComfort * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Discipline:</span> <span class="detail-value">' + (data.traditionalScores.disciplineConfidence * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Time Horizon:</span> <span class="detail-value">' + (data.traditionalScores.timeHorizon * 100).toFixed(0) + '/100</span></div>';
    html += '<div class="detail-item"><span class="detail-label">Knowledge Index:</span> <span class="detail-value">' + k.index + '/100</span></div>';
    html += '</div></div>';
    
    // Flags
    if (data.flags.longevity || data.flags.caregiving || k.flag) {
        html += '<div class="flags-section">';
        html += '<strong style="font-size:11px">Planning Considerations:</strong><br>';
        if (data.flags.longevity) {
            html += '<span class="flag-badge flag-lon">Longevity Planning</span>';
        }
        if (data.flags.caregiving) {
            html += '<span class="flag-badge flag-care">Caregiving</span>';
        }
        if (k.flag === 'overconfidence') {
            html += '<span class="flag-badge flag-over">Overconfident</span>';
        } else if (k.flag === 'underconfidence') {
            html += '<span class="flag-badge flag-under">Underconfident</span>';
        }
        html += '</div>';
    }
    
    // Question Answers
    html += '<div class="answers-section">';
    html += '<h4>Key Response Summary</h4>';
    html += generateAnswersSummary(data);
    html += '</div>';
    
    html += '</div>';
    
    return html;
}

function generateAnswersSummary(data) {
    var html = '';
    
    // Get selected answers for key questions
    var keyQuestions = [
        {name: 'lossAversion', label: 'Response to losses'},
        {name: 'volatilityReaction', label: 'Portfolio decline reaction'},
        {name: 'timeHorizon', label: 'Time horizon'},
        {name: 'emotionalComfort', label: 'Market volatility comfort'},
        {name: 'overconfidence', label: 'Investment confidence'},
        {name: 'disciplineConfidence', label: 'Long-term discipline'}
    ];
    
    keyQuestions.forEach(function(item) {
        var selected = document.querySelector('input[name="' + item.name + '"]:checked');
        if (!selected) {
            selected = document.querySelector('.likert-option.selected[data-name="' + item.name + '"]');
        }
        
        if (selected) {
            var answerText = '';
            if (selected.classList && selected.classList.contains('likert-option')) {
                var scaleNum = selected.textContent;
                var questionObj = findQuestionByName(item.name);
                if (questionObj && questionObj.labels) {
                    var labelIndex = parseInt(scaleNum) - 1;
                    answerText = questionObj.labels[labelIndex];
                }
            } else {
                var optionText = selected.closest('.option');
                if (optionText) {
                    var textEl = optionText.querySelector('.option-text');
                    if (textEl) {
                        answerText = textEl.textContent;
                    }
                }
            }
            
            if (answerText) {
                html += '<div class="answer-item">';
                html += '<div class="answer-q">' + item.label + '</div>';
                html += '<div class="answer-a">' + answerText + '</div>';
                html += '</div>';
            }
        }
    });
    
    return html;
}

function findQuestionByName(name) {
    var allQuestions = questions.behavioral.concat(questions.traditional).concat(questions.knowledge);
    for (var i = 0; i < allQuestions.length; i++) {
        if (allQuestions[i].name === name) {
            return allQuestions[i];
        }
    }
    return null;
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

function getRiskBandColor(score) {
    if (score <= 24) return '#502D1E';
    if (score <= 44) return '#40434E';
    if (score <= 59) return '#93A2BC';
    if (score <= 74) return '#7EADAD';
    if (score <= 89) return '#CCA054';
    return '#9A7611';
}// Configuration and Constants
const CORRECT_ANSWERS = {
    kn_q1: 'B',
    kn_q2: 'B',
    kn_q3: 'C',
    kn_q4: 'B',
    kn_q5: 'C'
};

const CORRECT_LABELS = {
    kn_q1: 'Diversified portfolio of stocks',
    kn_q2: 'Spreads risk across investments',
    kn_q3: 'Higher risk',
    kn_q4: 'Large short-term swings are normal long term',
    kn_q5: 'They fall'
};

const EXPERIENCE_MAP = { 'A': 0, 'B': 0.33, 'C': 0.67, 'D': 1.0 };

// Questions Data
const questions = {
    behavioral: [
          {
            q: "If you try a new restaurant and it's disappointing, how likely are you to try another new place next time?",
            type: "radio",
            name: "lossAversion2",
            opts: [
                "Very unlikely - I'll stick to places I know",
                "Somewhat hesitant but might try again",
                "Still willing to explore new places"
            ],
            vals: [1, 0.5, 0]
        },
         {
            q: "When a favorite restaurant changes its menu, how do you react?",
            type: "radio",
            name: "statusQuo",
            opts: [
                "Excited to try new options",
                "Mixed feelings - some curiosity, some disappointment",
                "Disappointed - I liked the old menu"
            ],
            vals: [1, 0.5, 0],
            weight: 0.10
        },
            {
            q: "When assembling furniture or a home project, how often do you read the instructions first?",
            type: "radio",
            name: "overconfidence2",
            opts: [
                "Always read instructions thoroughly first",
                "Skim instructions or refer to them as needed",
                "Rarely read instructions - figure it out as I go"
            ],
            vals: [1, 0.5, 0]
        },
           {
            q: "When choosing a new show or book, how much does popularity influence you?",
            type: "radio",
            name: "herdBehavior2",
            opts: [
                "I prefer to discover things on my own",
                "Popularity is one factor among many",
                "I often choose what's popular or trending"
            ],
            vals: [0, 0.5, 1]
        },
          {
            q: "When traveling, which best describes you?",
            type: "radio",
            name: "familiarity",
            opts: [
                "I love exploring new places and experiences",
                "I mix familiar comforts with some new experiences",
                "I prefer familiar places and routines"
            ],
            vals: [1, 0.5, 0],
            weight: 0.08
        },
            {
            q: "If you're running late, how likely are you to assume you'll still make it?",
            type: "radio",
            name: "optimism",
            opts: [
                "Very likely - I usually think I can make it",
                "Sometimes optimistic, sometimes realistic",
                "Usually realistic about being late"
            ],
            vals: [1, 0.5, 0],
            weight: 0.05
        },
         {
            q: "With a gift card, do you buy something you need, something fun, or often forget it?",
            type: "radio",
            name: "mentalAccounting2",
            opts: [
                "Use it for something practical I need",
                "Buy something fun or special",
                "Often forget about it or let it expire"
            ],
            vals: [1, 0.5, 0]
        },
           {
            q: "When information contradicts my view, I...",
            type: "radio",
            name: "confirmationBias",
            opts: [
                "Tend to dismiss it or look for information that supports my view",
                "Feel uncomfortable but don't always change my mind",
                "Consider it carefully and sometimes adjust my view",
                "Actively seek out and carefully consider opposing viewpoints"
            ],
            vals: [1, 0.67, 0.33, 0],
            weight: 0.07
        },
           {
            q: "I feel more confident in decisions when many others are doing the same.",
            type: "likert",
            name: "herdBehavior",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            weight: 0.10
        },
           {
            q: "If you've had two rainy weekends in a row, how much would you agree with planning an outdoor event this weekend?",
            type: "likert",
            name: "recency2",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
        },
           {
            q: "When reviewing market updates or investment commentary, I notice that I am drawn to sources that confirm my current views.",
            type: "likert",
            name: "confirmationBias2",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
        },
           {
            q: "My family tends to live into their late 80s or 90s.",
            type: "likert",
            name: "longevityFlag",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            isFlag: true
        },
            {
            q: "I expect I may need to support loved ones financially or with caregiving.",
            type: "likert",
            name: "caregivingFlag",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            isFlag: true
        },
          {
            q: "If you receive a $5,000 tax refund, what are you most likely to do?",
            type: "radio",
            name: "mentalAccounting1",
            opts: [
                "Spend it quickly on something I want",
                "Use it for immediate needs or small purchases",
                "Split between spending and saving",
                "Save most of it for future goals",
                "Invest it or add to long-term savings"
            ],
            vals: [0, 0.25, 0.5, 0.75, 1],
            weight: 0.10
        },
        {
            q: "How confident are you in your ability to spot a 'good investment'?",
            type: "likert",
            name: "overconfidence",
            labels: ["Not at all confident", "Slightly confident", "Moderately confident", "Very confident", "Extremely confident"],
            weight: 0.10
        },
        {
            q: "When you experience investment losses, what do you typically do?",
            type: "radio",
            name: "lossAversion",
            opts: [
                "Sell immediately to prevent further losses",
                "Consider selling but often wait to see if it recovers",
                "Hold and reassess based on fundamentals",
                "View it as a buying opportunity if fundamentals are strong"
            ],
            vals: [1, 0.67, 0.33, 0],
            weight: 0.15
        },
           {
            q: "When making investment decisions, how much do you let recent performance sway you?",
            type: "radio",
            name: "recency",
            opts: [
                "I focus on long-term fundamentals, not recent performance",
                "Recent performance has some influence on my decisions",
                "Recent performance significantly influences my choices",
                "I primarily base decisions on what's performed well recently"
            ],
            vals: [0, 0.33, 0.67, 1],
            weight: 0.10
        },
                
    ],
    traditional: [
        {
            q: "If your portfolio fell 20% in a year, what would you most likely do?",
            type: "likert",
            name: "volatilityReaction",
            labels: ["Sell everything", "Sell some", "Hold steady", "Buy more", "Buy much more"],
            weight: 0.25
        },
        {
            q: "Choose between: A) 6% avg return with a 20% worst year; B) 9% avg return with a 35% worst year. How likely are you to choose B?",
            type: "likert",
            name: "rewardStability",
            labels: ["Definitely A", "Probably A", "Unsure", "Probably B", "Definitely B"],
            weight: 0.20
        },
        {
            q: "When markets swing sharply, I feel...",
            type: "likert",
            name: "emotionalComfort",
            labels: ["Very anxious", "Somewhat anxious", "Neutral", "Somewhat excited", "Very excited"],
            weight: 0.20
        },
        {
            q: "I would stick with my long-term plan during a significant decline.",
            type: "likert",
            name: "disciplineConfidence",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            weight: 0.15
        },
        {
            q: "When will you likely begin using a significant portion of this money?",
            type: "likert",
            name: "timeHorizon",
            labels: ["Within 1 year", "In 1-3 years", "In 4-7 years", "In 8-15 years", "More than 15 years"],
            weight: 0.20
        }
    ],
    knowledge: [
         {
            q: "How comfortable are you with financial terminology and concepts?",
            type: "likert",
            name: "knowledgeComfort",
            labels: ["Not comfortable", "Slightly", "Moderately", "Very", "Extremely"]
        },
        {
            q: "How confident are you evaluating a new investment for fit?",
            type: "likert",
            name: "decisionConfidence",
            labels: ["Not confident", "Slightly", "Moderately", "Confident", "Very confident"]
        },
        {
            q: "Over a 20-year period, which investment best protects purchasing power?",
            type: "radio",
            name: "kn_q1",
            opts: ["Savings account paying 2%", "Diversified portfolio of stocks", "Cash kept in a safe", "Certificate of Deposit (CD)"],
            vals: ["A", "B", "C", "D"],
            correct: "B"
        },
        {
            q: "Which best describes diversification?",
            type: "radio",
            name: "kn_q2",
            opts: ["Guarantees no loss", "Spreads risk across investments", "Higher return with no extra risk", "Mainly for short-term investors"],
            vals: ["A", "B", "C", "D"],
            correct: "B"
        },
        {
            q: "In general, higher potential return means:",
            type: "radio",
            name: "kn_q3",
            opts: ["Lower risk", "Same risk", "Higher risk", "No relationship"],
            vals: ["A", "B", "C", "D"],
            correct: "C"
        },
        {
            q: "If the stock market falls 15% in a month, which is most accurate?",
            type: "radio",
            name: "kn_q4",
            opts: [
                "Sell quickly before more losses",
                "Large short-term swings are normal long term",
                "Market won't recover",
                "Do what most investors are doing"
            ],
            vals: ["A", "B", "C", "D"],
            correct: "B"
        },
        {
            q: "If interest rates rise, what happens to existing bond prices?",
            type: "radio",
            name: "kn_q5",
            opts: ["They rise", "Stay the same", "They fall", "No impact"],
            vals: ["A", "B", "C", "D"],
            correct: "C"
        },
        {
            q: "Which best describes your investing experience?",
            type: "radio",
            name: "kn_exp",
            opts: [
                "Never beyond savings or CDs",
                "Mutual funds / ETFs",
                "Traded stocks or bonds",
                "Private markets / alternatives"
            ],
            vals: ["A", "B", "C", "D"]
        },
       
    ]
};

// State Management
// isAdvisorView already declared at top of file
let sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
let timestamp = new Date().toISOString();
let lastComputed = null;

// Couples mode variables
let isCoupleMode = false;
let person1Data = null;
let person2Data = null;
let currentPerson = 1;
let person1Name = '';
let person2Name = '';

// Behavioral Weights
const behavioralWeights = {
    lossAversion: 0.15,
    overconfidence: 0.10,
    recency: 0.10,
    herdBehavior: 0.10,
    confirmationBias: 0.07,
    mentalAccounting: 0.10,
    statusQuo: 0.10,
    familiarity: 0.08,
    optimism: 0.05,
    longevity: 0.05,
    caregiving: 0.10
};

// Traditional Weights
const traditionalWeights = {
    volatilityReaction: 0.25,
    rewardStability: 0.20,
    emotionalComfort: 0.20,
    disciplineConfidence: 0.15,
    timeHorizon: 0.20
};

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    renderQuestions();
    document.getElementById('calculateBtn').addEventListener('click', calculateScore);
    document.getElementById('passcodeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPasscode();
        }
    });
});

// Couples Mode Functions
function startSolo() {
    isCoupleMode = false;
    document.getElementById('couplesSetup').style.display = 'none';
    document.getElementById('questionnaire').style.display = 'block';
    document.getElementById('calculateBtn').style.display = 'block';
}

function startCouple() {
    document.getElementById('coupleNames').style.display = 'block';
}

function beginCoupleAssessment() {
    person1Name = document.getElementById('person1Name').value.trim();
    person2Name = document.getElementById('person2Name').value.trim();
    
    if (!person1Name || !person2Name) {
        alert('Please enter both names to continue.');
        return;
    }
    
    isCoupleMode = true;
    currentPerson = 1;
    document.getElementById('couplesSetup').style.display = 'none';
    document.getElementById('currentPerson').style.display = 'block';
    document.getElementById('currentPersonName').textContent = person1Name;
    document.getElementById('questionnaire').style.display = 'block';
    document.getElementById('calculateBtn').style.display = 'block';
}

function startPerson2() {
    currentPerson = 2;
    document.getElementById('partnerTransition').style.display = 'none';
    document.getElementById('currentPerson').style.display = 'block';
    document.getElementById('currentPersonName').textContent = person2Name;
    document.getElementById('results').style.display = 'none';
    document.getElementById('questionnaire').style.display = 'block';
    document.getElementById('calculateBtn').style.display = 'block';
    
    // Reset form
    document.querySelectorAll('.selected').forEach(function(el) {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
        radio.checked = false;
    });
    renderQuestions();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ADDED: Pure function to build couple summary metrics
function buildCoupleSummary(a, b) {
  const overallDelta = Math.abs(a.overall - b.overall);
  const behavioralDelta = Math.abs(a.behavioral - b.behavioral);
  const traditionalDelta = Math.abs(a.traditional - b.traditional);
  const alignment = overallDelta <= 10 ? 'Very Aligned' : overallDelta <= 25 ? 'Moderately Aligned' : 'Misaligned';
  return { overallDelta, behavioralDelta, traditionalDelta, alignment };
}

// ADDED: Get couple guidance text based on deltas and alignment
function getCoupleGuidance(summary) {
  let guidance = '';
  const { overallDelta } = summary;
  
  if (overallDelta <= 10) {
    guidance = 'Your scores are very closely aligned, which typically makes it easier to build a unified investment approach. You likely share similar reactions to market volatility and have compatible time horizons. This alignment allows for streamlined decision-making and reduces the need for extensive compromise in portfolio construction.';
  } else if (overallDelta <= 25) {
    guidance = 'Your scores show moderate alignment. While you share some common ground in your approach to risk, there are meaningful differences in how you each process uncertainty or prioritize goals. This is healthy and common—different perspectives can lead to more balanced household decisions when properly acknowledged and discussed.';
  } else {
    guidance = 'Your scores reflect distinct differences in risk tolerance and investment perspective. This is not inherently problematic, but it does require intentional communication and compromise. Consider using separate accounts for different goals, or building a blended strategy that respects both comfort zones rather than forcing one partner to accept the other\'s full risk profile.';
  }
  
  return guidance;
}

// ADDED: Generate action bullets based on alignment band
function getCoupleActionBullets(summary) {
  const { alignment } = summary;
  
  if (alignment === 'Very Aligned') {
    return [
      'Agree on drawdown "check-in" thresholds before funding accounts to maintain alignment during volatility.',
      'Use the more conservative partner\'s capacity when choosing policy allocation to ensure both remain comfortable.',
      'Automate contributions to reduce behavioral timing risk and maintain disciplined execution.'
    ];
  } else if (alignment === 'Moderately Aligned') {
    return [
      'Consider a "core-satellite" approach: shared conservative core, personalized satellite allocations.',
      'Establish clear communication protocols for market stress periods before they occur.',
      'Use the lower risk tolerance for joint accounts; higher tolerance for individual discretionary funds.'
    ];
  } else {
    return [
      'Build separate investment buckets tied to individual goals to honor each partner\'s comfort zone.',
      'Schedule regular review meetings (quarterly) to discuss portfolio performance and reconfirm shared objectives.',
      'Consider working with an advisor who can mediate different perspectives and translate them into actionable strategy.'
    ];
  }
}
function showCoupleComparison() {
    document.getElementById('coupleComparison').style.display = 'block';
    
    // Populate comparison cards
    document.getElementById('person1ComparisonNameTop').textContent = person1Name;
    document.getElementById('person1ComparisonScoreTop').textContent = person1Data.finalScore;
    document.getElementById('person1ComparisonBandTop').textContent = person1Data.riskBand;
    document.getElementById('person1ComparisonBehavioralTop').textContent = person1Data.behavioralScore;
    document.getElementById('person1ComparisonTraditionalTop').textContent = person1Data.traditionalScore;
    
    document.getElementById('person2ComparisonNameTop').textContent = person2Name;
    document.getElementById('person2ComparisonScoreTop').textContent = person2Data.finalScore;
    document.getElementById('person2ComparisonBandTop').textContent = person2Data.riskBand;
    document.getElementById('person2ComparisonBehavioralTop').textContent = person2Data.behavioralScore;
    document.getElementById('person2ComparisonTraditionalTop').textContent = person2Data.traditionalScore;
    
    // Generate simple narrative
    var scoreDiff = Math.abs(person1Data.finalScore - person2Data.finalScore);
    var behavioralDiff = Math.abs(person1Data.behavioralScore - person2Data.behavioralScore);
    var traditionalDiff = Math.abs(person1Data.traditionalScore - person2Data.traditionalScore);
    
    var narrative = '<strong>Behavioral Component (' + person1Data.behavioralScore + ' vs ' + person2Data.behavioralScore + '):</strong> ';
    narrative += 'This reflects how each of you naturally thinks and feels about risk—your instinctive reactions to market movements, losses, and uncertainty. ';
    
    if (behavioralDiff <= 10) {
        narrative += person1Name + ' and ' + person2Name + ' show similar emotional and cognitive patterns when it comes to investment decisions. ';
    } else if (behavioralDiff <= 20) {
        narrative += person1Name + ' and ' + person2Name + ' have moderately different behavioral tendencies, which means you may react differently to the same market events. ';
    } else {
        narrative += person1Name + ' and ' + person2Name + ' show notably different behavioral responses to risk and uncertainty. ';
    }
    
    narrative += '<br><br><strong>Traditional Component (' + person1Data.traditionalScore + ' vs ' + person2Data.traditionalScore + '):</strong> ';
    narrative += 'This captures the practical factors—your time horizon, past experiences, and comfort with volatility. ';
    
    if (traditionalDiff <= 8) {
        narrative += 'You share a very similar outlook on how long you can remain invested and how much short-term fluctuation feels comfortable. This common ground often makes it easier to make joint decisions with confidence when markets move. ';
    } else if (traditionalDiff <= 15) {
        narrative += 'You differ somewhat in how you think about investment timeframes or market ups and downs. One of you may prefer a steadier pace while the other is comfortable with more movement. These are manageable differences that mainly require aligning expectations before acting. ';
    } else {
        narrative += 'You hold distinctly different views about how long to stay invested or how much volatility feels acceptable. This can stem from different financial responsibilities, experience levels, or emotional reactions to risk. Recognizing these differences early helps you plan in a way that honors both comfort levels. ';
    }
    
    narrative += '<br><br><strong>What this means:</strong> ';
    if (scoreDiff <= 15) {
        narrative += 'Your overall risk perspectives align closely, which tends to make collaboration smoother. You are likely to interpret market events in similar ways, giving you a shared foundation for long-term decisions and reducing friction during periods of change. ';
    } else {
        narrative += 'Your results highlight healthy differences in how each of you perceives and manages risk. One partner may naturally focus on opportunity while the other values stability and reassurance. Together, these viewpoints can balance decision-making and encourage thoughtful discussions about how much risk feels right for both of you. ';
    }
    
    document.getElementById('coupleNarrativeText').innerHTML = narrative;
    
    // Show PDF download button
    document.getElementById('downloadPdfBtn').style.display = 'block';
    
    window.scrollTo({ top: document.getElementById('coupleComparison').offsetTop - 100, behavior: 'smooth' });
}
// Question Rendering
function renderQuestions() {
    var html = '';
    
    html += '<div class="section"><h2 class="section-title">Behavioral Profile</h2><p class="section-subtitle">This section looks at your natural decision tendencies and how they may affect your investment approach. (60% of total score)</p>';
    questions.behavioral.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    html += '<div class="section"><h2 class="section-title">Traditional Risk Tolerance</h2><p class="section-subtitle">This section evaluates your comfort with market volatility and investment risk. (40% of total score)</p>';
    questions.traditional.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    html += '<div class="section"><h2 class="section-title">Financial Alignment</h2><p class="section-subtitle">This section evaluates your current investment knowledge and confidence. Your answers will not change your Risk Alignment Score; they simply help your advisor communicate in your language and provide guidance that meets you where you are.</p>';
    questions.knowledge.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    document.getElementById('questionnaire').innerHTML = html;
    attachHandlers();
}

function renderQuestion(q) {
    var html = '<div class="question"><div class="question-text">' + q.q + '</div>';
    
    if (q.type === "radio") {
        html += '<div class="options">';
        q.opts.forEach(function(opt, i) {
            var val = q.vals ? q.vals[i] : i;
            var correctAttr = (q.correct && val === q.correct) ? 'data-correct="1"' : '';
            html += '<label class="option"><input type="radio" name="' + q.name + '" value="' + val + '" ' + correctAttr + '><span class="option-text">' + opt + '</span></label>';
        });
        html += '</div>';
    } else if (q.type === "likert") {
        html += '<div class="likert-labels">';
        q.labels.forEach(function(l) {
            html += '<div>' + l + '</div>';
        });
        html += '</div><div class="likert-scale">';
        for (var i = 0; i < 5; i++) {
            html += '<div class="likert-option" data-name="' + q.name + '" data-value="' + (i * 0.25) + '" tabindex="0">' + (i + 1) + '</div>';
        }
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

function attachHandlers() {
    document.addEventListener('click', handleLikertClick);
    
    document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
        radio.addEventListener('change', handleRadioChange);
    });
    
    document.querySelectorAll('.likert-option').forEach(function(opt) {
        opt.addEventListener('keydown', handleLikertKeydown);
    });
}

function handleLikertClick(e) {
    var tile = e.target.closest('.likert-option');
    if (!tile) return;
    var name = tile.dataset.name;
    if (!name) return;
    document.querySelectorAll('.likert-option[data-name="' + name + '"]').forEach(function(t) {
        t.classList.remove('selected');
    });
    tile.classList.add('selected');
}

function handleRadioChange(e) {
    var radio = e.target;
    document.querySelectorAll('input[name="' + radio.name + '"]').forEach(function(r) {
        r.closest('.option').classList.remove('selected');
    });
    radio.closest('.option').classList.add('selected');
}

function handleLikertKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.target.click();
    }
}

// Value Retrieval
function getRadioValue(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? (isNaN(el.value) ? el.value : parseFloat(el.value)) : null;
}

function getLikertValue(name) {
    var el = document.querySelector('.likert-option.selected[data-name="' + name + '"]');
    return el ? parseFloat(el.dataset.value) : null;
}

function getAllValues() {
    var values = {};
    var allQuestions = questions.behavioral.concat(questions.traditional).concat(questions.knowledge);
    allQuestions.forEach(function(q) {
        values[q.name] = q.type === "radio" ? getRadioValue(q.name) : getLikertValue(q.name);
    });
    return values;
}

// Score Calculation
function calculateScore() {
    var values = getAllValues();
    
    var allKeys = Object.keys(values);
    var required = allKeys.filter(function(k) {
        return k.indexOf('Flag') === -1;
    });
    var missing = required.filter(function(k) {
        return values[k] === null;
    });
    
    if (missing.length > 0) {
        alert('Please answer all questions before calculating.\nMissing: ' + missing.join(', '));
        return;
    }
    
    // Calculate Behavioral (60 points)
    var behavioralScores = calculateBehavioralScores(values);
    //var behavioralPoints = calculateWeightedScore(behavioralScores, behavioralWeights) * 60; this was the orginal weight for behavioral that yielded a max score of 91
    var behavioralPoints = calculateWeightedScore(behavioralScores, behavioralWeights) * (60 / 0.85);

    // Calculate Traditional (40 points)
    var traditionalScores = calculateTraditionalScores(values);
    var traditionalPoints = calculateWeightedScore(traditionalScores, traditionalWeights) * 40;
    
    // Calculate Knowledge (overlay only)
    var knowledgeData = computeKnowledge(values);
    
    // Final Score
    var finalScore = Math.round(behavioralPoints + traditionalPoints);
    var riskBandData = getRiskBand(finalScore);
    
    // Store results
    lastComputed = {
        sessionId: sessionId,
        timestamp: timestamp,
        finalScore: finalScore,
        behavioralScore: Math.round(behavioralPoints),
        traditionalScore: Math.round(traditionalPoints),
        riskBand: riskBandData.riskBand,
        behavioralScores: behavioralScores,
        traditionalScores: traditionalScores,
        knowledge: knowledgeData,
        flags: {
            longevity: values.longevityFlag >= 0.5,
            caregiving: values.caregivingFlag >= 0.5
        },
        personName: isCoupleMode ? (currentPerson === 1 ? person1Name : person2Name) : null
    };
    
    // Handle couple mode
    if (isCoupleMode) {
        if (currentPerson === 1) {
            person1Data = JSON.parse(JSON.stringify(lastComputed));
            showPartnerTransition();
        } else {
            person2Data = JSON.parse(JSON.stringify(lastComputed));
            showCoupleComparison();
        }
    }
    
    // Display results
    displayResults(finalScore, Math.round(behavioralPoints), Math.round(traditionalPoints), riskBandData.riskBand, riskBandData.rbClass);
}

function calculateBehavioralScores(values) {
    return {
        lossAversion: ((1 - values.lossAversion) + (1 - values.lossAversion2)) / 2,  // FIX #1: Invert both
        overconfidence: (values.overconfidence + (1 - values.overconfidence2)) / 2,
        recency: ((1 - values.recency) + values.recency2) / 2,
        herdBehavior: ((1 - values.herdBehavior) + (1 - values.herdBehavior2)) / 2,
        confirmationBias: ((1 - values.confirmationBias) + (1 - values.confirmationBias2)) / 2,  // FIX #2: Invert primary
        mentalAccounting: (values.mentalAccounting1 + (1 - values.mentalAccounting2)) / 2,  // FIX #3: Invert supplementary
        statusQuo: values.statusQuo,
        familiarity: values.familiarity,
        optimism: values.optimism  // FIX #4: Remove inversion
    };
}

function calculateTraditionalScores(values) {
    return {
        volatilityReaction: values.volatilityReaction,
        rewardStability: values.rewardStability,
        emotionalComfort: values.emotionalComfort,
        disciplineConfidence: values.disciplineConfidence,
        timeHorizon: values.timeHorizon
    };
}

function calculateWeightedScore(scores, weights) {
    var weightedSum = 0;
    for (var key in scores) {
        if (scores.hasOwnProperty(key) && weights.hasOwnProperty(key)) {
            weightedSum += scores[key] * weights[key];
        }
    }
    return weightedSum;
}

function getRiskBand(score) {
    if (score <= 24) return { riskBand: 'Very Conservative', rbClass: 'rb-very-cons' };
    if (score <= 44) return { riskBand: 'Conservative', rbClass: 'rb-cons' };
    if (score <= 59) return { riskBand: 'Balanced', rbClass: 'rb-balanced' };
    if (score <= 74) return { riskBand: 'Balanced Growth', rbClass: 'rb-balanced-growth' };
    if (score <= 89) return { riskBand: 'Growth', rbClass: 'rb-growth' };
    return { riskBand: 'Aggressive Growth', rbClass: 'rb-agg-growth' };
}

function showPartnerTransition() {
    document.getElementById('questionnaire').style.display = 'none';
    document.getElementById('calculateBtn').style.display = 'none';
    document.getElementById('currentPerson').style.display = 'none';
    document.getElementById('person1NameDisplay').textContent = person1Name;
    document.getElementById('person2NameDisplay').textContent = person2Name;
    document.getElementById('partnerTransition').style.display = 'block';
}

// Knowledge Calculation
function computeKnowledge(values) {
    var correctCount = 0;
    var answeredCount = 0;
    
    var knowledgeQuestions = ['kn_q1', 'kn_q2', 'kn_q3', 'kn_q4', 'kn_q5'];
    knowledgeQuestions.forEach(function(k) {
        if (values[k]) {
            answeredCount++;
            if (values[k] === CORRECT_ANSWERS[k]) correctCount++;
        }
    });
    
    var expScore = values.kn_exp ? EXPERIENCE_MAP[values.kn_exp] : 0;
    if (values.kn_exp) answeredCount++;
    
    var objectiveAvg = answeredCount > 0 ? ((correctCount / 5) * 0.833 + (expScore * 0.167)) : 0;
    
    var selfComfort = values.knowledgeComfort || 0;
    var selfConfidence = values.decisionConfidence || 0;
    var selfAvg = (selfComfort + selfConfidence) / 2;
    
    var knowledgeIndex = (objectiveAvg * 0.8) + (selfAvg * 0.2);
    var delta = selfAvg - objectiveAvg;
    
    var flag = null;
    if (delta >= 0.25) flag = 'overconfidence';
    else if (delta <= -0.25) flag = 'underconfidence';
    
    return {
        index: Math.round(knowledgeIndex * 100),
        delta: parseFloat(delta.toFixed(2)),
        flag: flag,
        objectiveAvg: objectiveAvg,
        selfAvg: selfAvg,
        correctCount: correctCount,
        totalObjective: 5
    };
}

// Initialize advisor passcode input - handle Enter key
document.addEventListener('DOMContentLoaded', function() {
    var passcodeInput = document.getElementById('passcodeInput');
    if (passcodeInput) {
        passcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkPasscode();
            }
        });
    }
});
