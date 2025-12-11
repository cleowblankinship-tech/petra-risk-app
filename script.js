// ============================================================================
// CONFIGURATION AND GLOBAL STATE
// ============================================================================

var ADVISOR_PASSCODE = 'petra';
var isAdvisorView = false;
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

// Answer storage
let answers = {};

// Section navigation state
let currentSectionIndex = 0;
const totalSections = 3;

// ============================================================================
// SPLASH SCREEN AND PROGRESS BAR FUNCTIONS
// ============================================================================

/**
 * Show splash screen for 6 seconds over the results
 */
function showSplashThenDisplayResults() {
  const splash = document.getElementById('petra-splash');
  if (splash) {
    splash.classList.remove('hidden');
  }

  // After 6 seconds, hide splash (revealing results underneath)
  setTimeout(() => {
    if (splash) {
      splash.classList.add('hidden');
    }
  }, 6000);
}

/**
 * Update progress bar based on answered questions
 */
function updateProgressBar() {
  const progressContainer = document.getElementById('progressBarContainer');
  const progressFill = document.getElementById('progressBarFill');
  const progressPercent = document.getElementById('progressPercent');
  
  if (!progressContainer || !progressFill || !progressPercent) return;
  
  // Count total questions and answered questions
  const allQuestions = document.querySelectorAll('.question');
  const totalQuestions = allQuestions.length;
  
  let answeredCount = 0;
  
  // Count radio button answers
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
    radioGroups[radio.name] = true;
  });
  answeredCount += Object.keys(radioGroups).length;
  
  // Count likert answers
  const likertAnswers = document.querySelectorAll('.likert-option.selected');
  const likertGroups = {};
  likertAnswers.forEach(opt => {
    const name = opt.dataset.name;
    if (name) likertGroups[name] = true;
  });
  answeredCount += Object.keys(likertGroups).length;
  
/**
 * Initialize section navigation
 */
function initializeSectionNavigation() {
  // Show section progress bar
  document.getElementById('sectionProgressBar').style.display = 'block';
  
  // Show navigation buttons
  document.getElementById('sectionNavigation').style.display = 'flex';
  
  // Show first section
  currentSectionIndex = 0;
  showSection(0);
  updateSectionProgress();
  
  // Attach button handlers
  document.getElementById('nextBtn').addEventListener('click', handleNextSection);
  document.getElementById('backBtn').addEventListener('click', handleBackSection);
}

/**
 * Show a specific section by index
 */
function showSection(index) {
  const sections = document.querySelectorAll('.question-section');
  
  // Hide all sections
  sections.forEach((section, i) => {
    if (i === index) {
      section.classList.add('active');
      section.classList.remove('exiting');
    } else {
      section.classList.remove('active');
    }
  });
  
  // Update button visibility
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const calculateBtn = document.getElementById('calculateBtn');
  const navContainer = document.getElementById('sectionNavigation');
  
  // Show/hide back button
  backBtn.style.display = index > 0 ? 'inline-flex' : 'none';
  
  // Show/hide next vs calculate button
  if (index < totalSections - 1) {
    nextBtn.style.display = 'inline-flex';
    calculateBtn.style.display = 'none';
    navContainer.style.display = 'flex';
  } else {
    nextBtn.style.display = 'none';
    calculateBtn.style.display = 'block';
    navContainer.style.display = 'flex';
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Handle next section button click
 */
function handleNextSection() {
  // Validate current section is complete
  if (!isSectionComplete(currentSectionIndex)) {
    alert('Please answer all questions in this section before continuing.');
    return;
  }
  
  // Animate out current section
  const sections = document.querySelectorAll('.question-section');
  sections[currentSectionIndex].classList.add('exiting');
  
  setTimeout(() => {
    currentSectionIndex++;
    showSection(currentSectionIndex);
    updateSectionProgress();
  }, 300);
}

/**
 * Handle back section button click
 */
function handleBackSection() {
  if (currentSectionIndex > 0) {
    const sections = document.querySelectorAll('.question-section');
    sections[currentSectionIndex].classList.add('exiting');
    
    setTimeout(() => {
      currentSectionIndex--;
      showSection(currentSectionIndex);
      updateSectionProgress();
    }, 300);
  }
}

/**
 * Check if current section is complete
 */
function isSectionComplete(sectionIndex) {
  const sections = document.querySelectorAll('.question-section');
  const currentSection = sections[sectionIndex];
  
  // Count required questions in this section
  const questionBlocks = currentSection.querySelectorAll('.question-block');
  let answeredCount = 0;
  
  questionBlocks.forEach(block => {
    // Check if question has an answer
    const radioInputs = block.querySelectorAll('input[type="radio"]');
    const likertOptions = block.querySelectorAll('.likert-option');
    
    if (radioInputs.length > 0) {
      // Radio question
      const checked = block.querySelector('input[type="radio"]:checked');
      if (checked) answeredCount++;
    } else if (likertOptions.length > 0) {
      // Likert question
      const selected = block.querySelector('.likert-option.selected');
      if (selected) answeredCount++;
    }
  });
  
  return answeredCount === questionBlocks.length;
}

/**
 * Update section progress bar
 */
function updateSectionProgress() {
  const segments = document.querySelectorAll('.section-progress-segment');
  
  segments.forEach((segment, index) => {
    const fill = segment.querySelector('.section-progress-fill');
    
    if (index < currentSectionIndex) {
      // Completed section
      segment.classList.add('completed');
      segment.classList.remove('active');
    } else if (index === currentSectionIndex) {
      // Current section
      segment.classList.add('active');
      segment.classList.remove('completed');
    } else {
      // Future section
      segment.classList.remove('active', 'completed');
    }
  });
}

  // Calculate percentage
  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  
  // Update UI
  progressFill.style.width = percent + '%';
  progressPercent.textContent = percent;
}

// ============================================================================
// CORRECT ANSWERS AND MAPPINGS
// ============================================================================

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

// ============================================================================
// BEHAVIORAL AND TRADITIONAL WEIGHTS
// ============================================================================

const behavioralWeights = {
    lossAversion: 0.15,
    overconfidence: 0.10,
    recency: 0.10,
    herdBehavior: 0.10,
    confirmationBias: 0.07,
    mentalAccounting: 0.10,
    statusQuo: 0.10,
    familiarity: 0.08,
    optimism: 0.05
};

const traditionalWeights = {
    volatilityReaction: 0.25,
    rewardStability: 0.20,
    emotionalComfort: 0.20,
    disciplineConfidence: 0.15,
    timeHorizon: 0.20
};

// ============================================================================
// QUESTIONS DATA
// ============================================================================

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
        }
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
        }
    ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    renderQuestions();
    document.getElementById('calculateBtn').addEventListener('click', calculateScore);
    document.getElementById('passcodeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPasscode();
        }
    });
});
/**
 * Start questionnaire after client info is collected
 */
function startQuestionnaire() {
    // Hide client info
    document.getElementById('clientInfoSection').style.display = 'none';
    
    // Show questionnaire container
    document.getElementById('questionnaire').style.display = 'block';
    
    // Initialize section navigation
    initializeSectionNavigation();
    
    // Show and initialize progress bar
    document.getElementById('progressBarContainer').style.display = 'block';
    updateProgressBar();
    
    // Show current person banner if couples mode
    if (isCoupleMode) {
        document.getElementById('currentPerson').style.display = 'block';
        document.getElementById('currentPersonName').textContent = 
            currentPerson === 1 ? person1Name : person2Name;
    }
}
// Example: Add onclick to "Begin Assessment" button in solo mode
function startSolo() {
    isCoupleMode = false;
    document.getElementById('couplesSetup').style.display = 'none';
    document.getElementById('clientInfoSection').style.display = 'block';
    
    // Add continue button handler (you may need to add this button to clientInfoSection)
    const continueBtn = document.getElementById('continueToQuestions'); // Add this button in HTML
    if (continueBtn) {
        continueBtn.onclick = function() {
            // Validate client info
            const firstName = document.getElementById('clientFirstName').value.trim();
            const lastName = document.getElementById('clientLastName').value.trim();
            const email = document.getElementById('clientEmail').value.trim();
            const consent = document.getElementById('consentCheckbox').checked;
            
            if (!firstName || !lastName || !email || !consent) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Start questionnaire
            startQuestionnaire();
        };
    }
}
// ============================================================================
// COUPLES MODE FUNCTIONS
// ============================================================================

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
    document.getElementById('clientInfoSection').style.display = 'block';
    
    // Add continue button handler
    const continueBtn = document.getElementById('continueToQuestions');
    if (continueBtn) {
        continueBtn.onclick = function() {
            // Validate client info
            const firstName = document.getElementById('clientFirstName').value.trim();
            const lastName = document.getElementById('clientLastName').value.trim();
            const email = document.getElementById('clientEmail').value.trim();
            const consent = document.getElementById('consentCheckbox').checked;
            
            if (!firstName || !lastName || !email || !consent) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Start questionnaire
            startQuestionnaire();
        };
    }
}
function startPerson2() {
    currentPerson = 2;
    document.getElementById('partnerTransition').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    
    // Reset to beginning
    currentSectionIndex = 0;
    
    // Clear all answers
    document.querySelectorAll('.selected').forEach(function(el) {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
        radio.checked = false;
    });
    
    // Restart questionnaire
    startQuestionnaire();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPartnerTransition() {
    document.getElementById('questionnaire').style.display = 'none';
    document.getElementById('calculateBtn').style.display = 'none';
    document.getElementById('currentPerson').style.display = 'none';
    document.getElementById('progressBarContainer').style.display = 'none';
    document.getElementById('person1NameDisplay').textContent = person1Name;
    document.getElementById('person2NameDisplay').textContent = person2Name;
    document.getElementById('partnerTransition').style.display = 'block';
}

// ============================================================================
// QUESTION RENDERING WITH SECTION WRAPPERS
// ============================================================================

function renderQuestions() {
    var html = '';
    
    // SECTION 1: Behavioral Profile
    html += '<div class="question-section">';
    html += '  <div class="section-header">';
    html += '    <h2>Behavioral Profile</h2>';
    html += '    <p>This section looks at your natural decision tendencies and how they may affect your investment approach.</p>';
    html += '  </div>';
    questions.behavioral.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    // SECTION 2: Traditional Risk Assessment
    html += '<div class="question-section">';
    html += '  <div class="section-header">';
    html += '    <h2>Traditional Risk Assessment</h2>';
    html += '    <p>The practical side — how long you plan to invest, what you have experienced before and what goals you are prioritizing. </p>'
    html += '  </div>';
    questions.traditional.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    // SECTION 3: Investment Knowledge
    html += '<div class="question-section">';
    html += '  <div class="section-header">';
    html += '    <h2>Investment Knowledge</h2>';
    html += '    <p>Quick check on your familiarity with investment concepts.</p>';
    html += '  </div>';
    questions.knowledge.forEach(function(q) {
        html += renderQuestion(q);
    });
    html += '</div>';
    
    document.getElementById('questionnaire').innerHTML = html;
    attachHandlers();
}

function renderQuestion(q) {
    var html = '<div class="question-block">';
    html += '<div class="question-text">' + q.q + '</div>';
    
    if (q.type === "radio") {
        html += '<div class="options">';
        q.opts.forEach(function(opt, i) {
            var val = q.vals ? q.vals[i] : i;
            var correctAttr = (q.correct && val === q.correct) ? 'data-correct="1"' : '';
            html += '<label class="option">';
            html += '<input type="radio" name="' + q.name + '" value="' + val + '" ' + correctAttr + '>';
            html += '<span class="option-text">' + opt + '</span>';
            html += '</label>';
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
    
    // Update progress bar
    updateProgressBar();
}

function handleRadioChange(e) {
    var radio = e.target;
    document.querySelectorAll('input[name="' + radio.name + '"]').forEach(function(r) {
        r.closest('.option').classList.remove('selected');
    });
    radio.closest('.option').classList.add('selected');
    
    // Update progress bar
    updateProgressBar();
}

function handleLikertKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.target.click();
    }
}

// ============================================================================
// VALUE RETRIEVAL
// ============================================================================

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

// ============================================================================
// SCORE CALCULATION
// ============================================================================

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
            return;
        } else {
            person2Data = JSON.parse(JSON.stringify(lastComputed));
            showCoupleComparison();
        }
    }
    
    // Display results (renders them in background)
    displayResults(finalScore, Math.round(behavioralPoints), Math.round(traditionalPoints), riskBandData.riskBand, riskBandData.rbClass);
    
    // Show splash screen for 6 seconds (covers results with high z-index)
    showSplashThenDisplayResults();
}

function calculateBehavioralScores(values) {
    return {
        lossAversion: ((1 - values.lossAversion) + (1 - values.lossAversion2)) / 2,
        overconfidence: (values.overconfidence + (1 - values.overconfidence2)) / 2,
        recency: ((1 - values.recency) + values.recency2) / 2,
        herdBehavior: ((1 - values.herdBehavior) + (1 - values.herdBehavior2)) / 2,
        confirmationBias: ((1 - values.confirmationBias) + (1 - values.confirmationBias2)) / 2,
        mentalAccounting: (values.mentalAccounting1 + (1 - values.mentalAccounting2)) / 2,
        statusQuo: values.statusQuo,
        familiarity: values.familiarity,
        optimism: values.optimism
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

// ============================================================================
// KNOWLEDGE CALCULATION
// ============================================================================

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

// ============================================================================
// RESULTS DISPLAY
// ============================================================================

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
    if (isCoupleMode && person1Data && person2Data) {
        var k1 = person1Data.knowledge;
        var k2 = person2Data.knowledge;
        
        document.getElementById('knowledgeIndex').textContent = person1Name + ': ' + k1.index + '/100 | ' + person2Name + ': ' + k2.index + '/100';
        
        var calibrationText = person1Name + ': ' + (k1.flag || 'aligned') + ' | ' + person2Name + ': ' + (k2.flag || 'aligned');
        document.getElementById('knowledgeCalibration').textContent = calibrationText;
        document.getElementById('knowledgeCalibration').style.fontSize = '1rem';
        
        var flagsHTML = generateKnowledgeFlags(person1Name, person1Data);
        flagsHTML += '<div style="margin: 15px 0; border-top: 1px solid #e0e7ff; padding-top: 15px;"></div>';
        flagsHTML += generateKnowledgeFlags(person2Name, person2Data);
        
        document.getElementById('knowledgeFlags').innerHTML = flagsHTML;
    } else {
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

// ============================================================================
// COUPLE COMPARISON
// ============================================================================

function showCoupleComparison() {
    document.getElementById('coupleComparison').style.display = 'block';
    
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
    
    window.scrollTo({ top: document.getElementById('coupleComparison').offsetTop - 100, behavior: 'smooth' });
}

// ============================================================================
// ADVISOR CONTENT GENERATION
// ============================================================================

function generateAdvisorContent() {
    if (!lastComputed && !(person1Data && person2Data)) return;
    
    var advisorHTML = '<div class="advisor-view-header">ADVISOR VIEW</div>';
    
    if (isCoupleMode && person1Data && person2Data) {
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

// ============================================================================
// ADVISOR MODE FUNCTIONS
// ============================================================================

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

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

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

// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================

function downloadPDF() {
    // PDF generation code remains the same...
    // (keeping your existing PDF generation code)
}

function generateClientPersonPDF(name, data) {
    // Existing code...
}

function generateAdvisorPersonPDF(name, data) {
    // Existing code...
}

function generateAnswersSummary(data) {
    // Existing code...
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
}

function printFullAssessment() {
    window.print();
}