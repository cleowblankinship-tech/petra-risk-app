// submission-handler.js
// Handles client info collection and backend submission

// NOTE: startSolo and beginCoupleAssessment are now defined in script.js with proper logic
// The old override code has been removed to avoid conflicts

// Override calculateScore to add validation and submission
const originalCalculateScore = calculateScore;
calculateScore = function() {
    // First validate client info fields
    const firstName = document.getElementById('clientFirstName')?.value.trim();
    const lastName  = document.getElementById('clientLastName')?.value.trim();
    const email     = document.getElementById('clientEmail')?.value.trim();

    if (!firstName || !lastName || !email) {
        alert('Please complete your information at the top of the page (Name and Email) before calculating your score.');
        document.getElementById('clientInfoSection')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Call the original scoring logic
    originalCalculateScore.call(this);

    // Only submit to backend when results are actually displayed
    // In couple mode, don't submit for person 1 - wait until person 2 completes
    setTimeout(() => {
        // Skip backend submission if we're in couple mode and this is person 1
        if (isCoupleMode && currentPerson === 1) {
            console.log('[submission-handler] Skipping backend submission for person 1 in couple mode');
            return;
        }

        submitToBackend();
    }, 1000);
};

// Function to build complete payload and submit
async function submitToBackend() {
    try {
        // Make sure lastComputed exists
        if (!lastComputed) {
            console.error('No score data available to submit');
            return;
        }

        // Gather client info
        const clientInfo = {
            firstName: document.getElementById('clientFirstName').value.trim(),
            lastName: document.getElementById('clientLastName').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            wantsCopy: document.getElementById('wantsCopyCheckbox')?.checked || false
        };

        // In couple mode, add partner-specific email info
        if (isCoupleMode) {
            clientInfo.partnerAEmail = partnerAEmail || '';
            clientInfo.partnerBEmail = partnerBEmail || '';
            clientInfo.person1Name = person1Name || '';
            clientInfo.person2Name = person2Name || '';
            // Always send emails in couple mode (we collected them for this purpose)
            clientInfo.wantsCopy = true;
        }
        
        // Prepare payload
        const payload = {
            client: clientInfo,
            meta: {
                timestamp: new Date().toLocaleString('en-US', {
                    timeZone: 'America/Denver',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                version: '1.0',
                sessionId: sessionId || 'unknown',
                householdId: isCoupleMode ? sessionId : null
            },
            scores: {
                overall: lastComputed.finalScore,
                band: lastComputed.riskBand,
                behavioral: lastComputed.behavioralScore,
                traditional: lastComputed.traditionalScore
            },
            flags: [],
            answers: []
        };
        
        // Add couple data if applicable
        if (isCoupleMode && person1Data && person2Data) {
            payload.couple = true;
            payload.scores.deltas = {
                overall: Math.abs(person1Data.finalScore - person2Data.finalScore),
                behavioral: Math.abs(person1Data.behavioralScore - person2Data.behavioralScore),
                traditional: Math.abs(person1Data.traditionalScore - person2Data.traditionalScore)
            };
            // Include individual partner scores for separate email routing
            payload.person1Scores = {
                overall: person1Data.finalScore,
                band: person1Data.riskBand,
                behavioral: person1Data.behavioralScore,
                traditional: person1Data.traditionalScore
            };
            payload.person2Scores = {
                overall: person2Data.finalScore,
                band: person2Data.riskBand,
                behavioral: person2Data.behavioralScore,
                traditional: person2Data.traditionalScore
            };
        }
        
        // Add flags
        if (lastComputed.flags && lastComputed.flags.longevity) {
            payload.flags.push('Longevity Planning');
        }
        if (lastComputed.flags && lastComputed.flags.caregiving) {
            payload.flags.push('Caregiving Consideration');
        }
        if (lastComputed.knowledge && lastComputed.knowledge.flag === 'overconfidence') {
            payload.flags.push('Knowledge: Overconfident');
        }
        if (lastComputed.knowledge && lastComputed.knowledge.flag === 'underconfidence') {
            payload.flags.push('Knowledge: Underconfident');
        }
        
        // Gather all answers
        const allQuestions = questions.behavioral.concat(questions.traditional).concat(questions.knowledge);
        allQuestions.forEach(q => {
            const value = q.type === "radio" ? getRadioValue(q.name) : getLikertValue(q.name);
            if (value !== null) {
                const answer = {
                    id: q.name,
                    section: q.section || (questions.behavioral.includes(q) ? 'Behavioral' : 
                             questions.traditional.includes(q) ? 'Traditional' : 'Knowledge'),
                    text: q.q,
                    selectedOption: formatAnswerText(q, value),
                    numericValue: value
                };
                payload.answers.push(answer);
            }
        });
        
        console.log('Submitting payload:', payload);
        
        // Send to API
        const response = await fetch('/api/sendResults', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('API response:', result);
        
        // Show confirmation bar
        showConfirmation(clientInfo.wantsCopy, clientInfo.email, result.success);
        
        // Show advisor followup message
        const advisorFollowup = document.getElementById('advisorFollowup');
        if (advisorFollowup) {
            advisorFollowup.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error submitting to backend:', error);
        // Show error but don't block the results
        showConfirmation(false, '', false);
    }
}

// Helper to format answer text for display
function formatAnswerText(question, value) {
    if (question.type === 'radio') {
        const index = question.vals.indexOf(value);
        return question.opts[index] || value;
    } else if (question.type === 'likert') {
        const scaleIndex = Math.round(value * 4); // Convert 0-1 to 0-4
        return question.labels[scaleIndex] || value.toString();
    }
    return value.toString();
}

// Show confirmation message
function showConfirmation(wantsEmail, email, success) {
    const confirmationBar = document.getElementById('confirmationBar');
    const confirmationMessage = document.getElementById('confirmationMessage');

    if (!confirmationBar || !confirmationMessage) {
        console.error('Confirmation elements not found');
        return;
    }

    if (!success) {
        confirmationBar.classList.add('error');
        confirmationMessage.textContent = "We couldn't email your copy, but your results are displayed below.";
    } else if (isCoupleMode) {
        // Couple mode: explain where results were sent
        if (partnerBEmail && partnerBEmail.trim()) {
            // Both emails provided - individual results sent to each
            confirmationMessage.textContent = `Results have been sent: ${person1Name}'s to ${partnerAEmail}, ${person2Name}'s to ${partnerBEmail}.`;
        } else {
            // Single email - both results sent to Partner A
            confirmationMessage.textContent = `Both partners' results have been sent to ${partnerAEmail}.`;
        }
    } else if (wantsEmail) {
        confirmationMessage.textContent = `Your results have been sent to ${email}.`;
    } else {
        confirmationMessage.textContent = "Your results have been submitted and are displayed below.";
    }

    confirmationBar.style.display = 'block';

    // Scroll to confirmation
    setTimeout(() => {
        confirmationBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}