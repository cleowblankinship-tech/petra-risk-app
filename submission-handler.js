// submission-handler.js
// Add this to the end of script.js or include as separate file

// Show client info form before questionnaire (solo mode)
function startSolo() {
    isCoupleMode = false;
    document.getElementById('couplesSetup').style.display = 'none';
    document.getElementById('clientInfoSection').style.display = 'block';
    document.getElementById('questionnaire').style.display = 'block';
    document.getElementById('calculateBtn').style.display = 'block';
}

// Override the existing calculate function to include client info
const originalCalculateScore = calculateScore;

calculateScore = function () {
    // First validate client info fields
    const firstName = document.getElementById('clientFirstName')?.value.trim();
    const lastName  = document.getElementById('clientLastName')?.value.trim();
    const email     = document.getElementById('clientEmail')?.value.trim();
    const consent   = document.getElementById('consentCheckbox')?.checked;

    if (!firstName || !lastName || !email || !consent) {
        alert('Please complete your information at the top of the page (Name, Email, and Consent) before calculating your score.');
        document.getElementById('clientInfoSection')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Everything is good → continue with original scoring logic
    originalCalculateScore();
    
    // After results are displayed, send to backend
    setTimeout(() => {
        submitToBackend();
    }, 500);
};

// Function to build complete payload and submit
async function submitToBackend() {
    try {
        // Gather client info
        const clientInfo = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            consent: document.getElementById('consentCheck').checked,
            wantsCopy: document.getElementById('emailMeCheck')?.checked || false
        };
        
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
        
        // Add couple deltas if applicable
        if (isCoupleMode && person1Data && person2Data) {
            payload.couple = true;
            payload.scores.deltas = {
                overall: Math.abs(person1Data.finalScore - person2Data.finalScore),
                behavioral: Math.abs(person1Data.behavioralScore - person2Data.behavioralScore),
                traditional: Math.abs(person1Data.traditionalScore - person2Data.traditionalScore)
            };
        }
        
        // Add flags
        if (lastComputed.flags.longevity) payload.flags.push('Longevity Planning');
        if (lastComputed.flags.caregiving) payload.flags.push('Caregiving Consideration');
        if (lastComputed.knowledge.flag === 'overconfidence') payload.flags.push('Knowledge: Overconfident');
        if (lastComputed.knowledge.flag === 'underconfidence') payload.flags.push('Knowledge: Underconfident');
        
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
        
        // Send to API
        const response = await fetch('/api/sendResults', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        // Show confirmation bar
        showConfirmation(clientInfo.wantsCopy, clientInfo.email, result.success);
        
        // Show advisor followup message
        document.getElementById('advisorFollowup').style.display = 'block';
        
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
    
    if (!success) {
        confirmationBar.classList.add('error');
        confirmationMessage.textContent = "We couldn't email your copy, but you can download it here.";
    } else if (wantsEmail) {
        confirmationMessage.textContent = `Thanks—your responses are in. We'll email a copy to ${email}.`;
    } else {
        confirmationMessage.textContent = "Thanks—your responses are in.";
    }
    
    confirmationBar.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        confirmationBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Override couple mode start to show client info
const originalBeginCoupleAssessment = beginCoupleAssessment;

beginCoupleAssessment = function() {
    person1Name = document.getElementById('person1Name').value.trim();
    person2Name = document.getElementById('person2Name').value.trim();
    
    if (!person1Name || !person2Name) {
        alert('Please enter both names to continue.');
        return;
    }
    
    isCoupleMode = true;
    currentPerson = 1;
    document.getElementById('couplesSetup').style.display = 'none';
    document.getElementById('clientInfoSection').style.display = 'block';
    document.getElementById('currentPerson').style.display = 'block';
    document.getElementById('currentPersonName').textContent = person1Name;
    document.getElementById('questionnaire').style.display = 'block';
    document.getElementById('calculateBtn').style.display = 'block';
};