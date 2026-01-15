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
  // Update the top progress bar
  updateSectionProgress();
}

/**
 * Initialize section navigation
 */
let sectionNavigationInitialized = false;

function initializeSectionNavigation() {
  // Show top progress bar
  document.getElementById('topProgressBar').style.display = 'block';

  // Show navigation buttons
  document.getElementById('sectionNavigation').style.display = 'flex';

  // Show first section
  currentSectionIndex = 0;
  showSection(0);
  updateSectionProgress();

  // Attach button handlers only once
  if (!sectionNavigationInitialized) {
    document.getElementById('nextBtn').addEventListener('click', handleNextSection);
    document.getElementById('backBtn').addEventListener('click', handleBackSection);
    sectionNavigationInitialized = true;
  }
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
 * Update top progress bar based on section completion
 */
function updateSectionProgress() {
  const progressFill = document.getElementById('topProgressFill');
  if (!progressFill) return;

  // Calculate progress: each section represents 33.33% of total progress
  // Section 0: 0-33%, Section 1: 33-66%, Section 2: 66-100%
  const progressPerSection = 100 / totalSections;
  const baseProgress = currentSectionIndex * progressPerSection;

  // Add partial progress within current section based on answered questions
  const currentSectionQuestions = document.querySelectorAll('.question-section.active .question-block');
  let answeredInSection = 0;

  currentSectionQuestions.forEach(block => {
    const radios = block.querySelectorAll('input[type="radio"]');
    const likerts = block.querySelectorAll('.likert-option.selected');
    if (radios.length > 0 && block.querySelector('input[type="radio"]:checked')) {
      answeredInSection++;
    } else if (likerts.length > 0) {
      answeredInSection++;
    }
  });

  const sectionProgress = currentSectionQuestions.length > 0
    ? (answeredInSection / currentSectionQuestions.length) * progressPerSection
    : 0;

  const totalProgress = Math.min(baseProgress + sectionProgress, 100);
  progressFill.style.width = totalProgress + '%';
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
    drawdownDiscipline: 0.20,
    rewardStability: 0.15,
    emotionalComfort: 0.15,
    disciplineConfidence: 0.15,
    timeHorizon: 0.15,
    lossFrequencyTolerance: 0.10,
    returnVsLossTradeOff: 0.10
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
            q: "If your long-term portfolio dropped 25% and financial headlines were negative, which response fits you best?",
            type: "likert",
            name: "drawdownDiscipline",
            labels: ["Move to cash immediately", "Reduce exposure", "Wait before making any changes", "Stay invested but uneasy", "Stay invested confidently"],
            weight: 0.20
        },
        {
            q: "Choose between: A) 6% avg return with a 20% worst year; B) 9% avg return with a 35% worst year. How likely are you to choose B?",
            type: "likert",
            name: "rewardStability",
            labels: ["Definitely A", "Probably A", "Unsure", "Probably B", "Definitely B"],
            weight: 0.15
        },
        {
            q: "When markets swing sharply, I feel...",
            type: "likert",
            name: "emotionalComfort",
            labels: ["Very anxious", "Somewhat anxious", "Neutral", "Somewhat excited", "Very excited"],
            weight: 0.15
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
            weight: 0.15
        },
        {
            q: "Experiencing several losing months in a row would not lead me to abandon my long-term strategy.",
            type: "likert",
            name: "lossFrequencyTolerance",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            weight: 0.10
        },
        {
            q: "I am willing to accept large temporary losses in pursuit of higher long-term returns.",
            type: "likert",
            name: "returnVsLossTradeOff",
            labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            weight: 0.10
        }
    ],
    knowledge: [
        {
            q: "How comfortable are you with financial terminology and concepts (e.g., stocks, bonds, commodities, volatility, inflation, diversification, dollar-cost averaging, etc.)?",
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
            q: "Which best describes your investing experience? (Choose all that apply)",
            type: "checkbox",
            name: "kn_exp",
            opts: [
                "Never beyond savings or CDs",
                "Mutual funds / ETFs",
                "Traded stocks or bonds",
                "Individual stocks",
                "Options or derivatives",
                "Alternative investments (real estate, private credit, commodities, etc.)"
            ],
            vals: [0, 0.15, 0.25, 0.30, 0.40, 0.50]
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

    // Hide mode selection
    document.getElementById('couplesSetup').style.display = 'none';

    // Show questionnaire container
    document.getElementById('questionnaire').style.display = 'block';

    // Initialize section navigation (this calls showSection(0))
    initializeSectionNavigation();

    // Show current person banner if couples mode
    if (isCoupleMode) {
        document.getElementById('currentPerson').style.display = 'block';
        document.getElementById('currentPersonName').textContent =
            currentPerson === 1 ? person1Name : person2Name;
    }
}
// ============================================================================
// MODE SELECTION FUNCTIONS
// ============================================================================

window.startSolo = function() {
    console.log('[startSolo] Button clicked');
    isCoupleMode = false;

    var couplesSetupEl = document.getElementById('couplesSetup');
    console.log('[startSolo] couplesSetup element:', couplesSetupEl);
    if (couplesSetupEl) {
        couplesSetupEl.style.display = 'none';
        console.log('[startSolo] Hidden couplesSetup');
    } else {
        console.error('[startSolo] couplesSetup element not found!');
    }

    var clientInfoEl = document.getElementById('clientInfoSection');
    console.log('[startSolo] clientInfoSection element:', clientInfoEl);
    if (clientInfoEl) {
        clientInfoEl.style.display = 'block';
        console.log('[startSolo] Showed clientInfoSection');
    } else {
        console.error('[startSolo] clientInfoSection element not found!');
    }

    // Add continue button handler
    const continueBtn = document.getElementById('continueToQuestions');
    if (continueBtn) {
        continueBtn.onclick = function() {
            // Validate client info
            const firstName = document.getElementById('clientFirstName').value.trim();
            const lastName = document.getElementById('clientLastName').value.trim();
            const email = document.getElementById('clientEmail').value.trim();

            if (!firstName || !lastName || !email) {
                alert('Please fill in all required fields.');
                return;
            }

            // Start questionnaire
            startQuestionnaire();
        };
    }
};

window.startCouple = function() {
    console.log('[startCouple] Button clicked');
    // Show the couple names input section
    var coupleNamesEl = document.getElementById('coupleNames');
    console.log('[startCouple] coupleNames element:', coupleNamesEl);
    if (coupleNamesEl) {
        coupleNamesEl.style.display = 'block';
        console.log('[startCouple] Set display to block');
    } else {
        console.error('[startCouple] coupleNames element not found!');
    }
};

// ============================================================================
// COUPLES MODE FUNCTIONS
// ============================================================================

window.beginCoupleAssessment = function() {
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

            if (!firstName || !lastName || !email) {
                alert('Please fill in all required fields.');
                return;
            }

            // Start questionnaire
            startQuestionnaire();
        };
    }
};

window.startPerson2 = function() {
    currentPerson = 2;
    document.getElementById('partnerTransition').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    // Reset to beginning
    currentSectionIndex = 0;

    // Clear all answers - radio, checkbox, and Likert selections
    document.querySelectorAll('.selected').forEach(function(el) {
        el.classList.remove('selected');
    });
    document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
        radio.checked = false;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
        checkbox.checked = false;
    });

    // Restart questionnaire
    startQuestionnaire();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPartnerTransition() {
    document.getElementById('questionnaire').style.display = 'none';
    document.getElementById('calculateBtn').style.display = 'none';
    document.getElementById('currentPerson').style.display = 'none';
    document.getElementById('topProgressBar').style.display = 'none';
    document.getElementById('sectionNavigation').style.display = 'none';
    document.getElementById('person1NameDisplay').textContent = person1Name;
    document.getElementById('person2NameDisplay').textContent = person2Name;
    document.getElementById('partnerTransition').style.display = 'block';

    // Scroll to transition screen so user sees it
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// QUESTION RENDERING WITH SECTION WRAPPERS
// ============================================================================

function renderQuestions() {
    var html = '';
    
    // SECTION 1: Investment Mindset
    html += '<div class="question-section">';
    html += '  <div class="section-header">';
    html += '    <h2>Investment Mindset</h2>';
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
    html += '    <p>The practical side: how long you plan to invest, what you\'ve experienced before, and what goals matter most to you.</p>'
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
    } else if (q.type === "checkbox") {
        html += '<div class="options">';
        q.opts.forEach(function(opt, i) {
            var val = q.vals ? q.vals[i] : i;
            html += '<label class="option">';
            html += '<input type="checkbox" name="' + q.name + '" value="' + val + '" data-index="' + i + '">';
            html += '<span class="option-text">' + opt + '</span>';
            html += '</label>';
        });
        html += '</div>';
    } else if (q.type === "likert") {
        html += '<div class="likert-scale">';
        for (var i = 0; i < 5; i++) {
            html += '<div class="likert-option" data-name="' + q.name + '" data-value="' + (i * 0.25) + '" tabindex="0">';
            html += '<span class="likert-label">' + q.labels[i] + '</span>';
            html += '<span class="likert-number">' + (i + 1) + '</span>';
            html += '</div>';
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

    document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
        checkbox.addEventListener('change', handleCheckboxChange);
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
        var optionEl = r.closest('.option');
        if (optionEl) {
            optionEl.classList.remove('selected');
        }
    });

    var radioOption = radio.closest('.option');
    if (radioOption) {
        radioOption.classList.add('selected');
    }

    // Update progress bar
    updateProgressBar();
}

function handleCheckboxChange(e) {
    var checkbox = e.target;
    var optionElement = checkbox.closest('.option');
    if (!optionElement) return; // Guard against missing DOM element

    if (checkbox.checked) {
        optionElement.classList.add('selected');
    } else {
        optionElement.classList.remove('selected');
    }

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

function getCheckboxValue(name) {
    var checkboxes = document.querySelectorAll('input[name="' + name + '"]:checked');
    if (checkboxes.length === 0) return null;

    var sum = 0;
    checkboxes.forEach(function(cb) {
        sum += parseFloat(cb.value);
    });

    // Cap at 1.0 to maintain balance with other questions
    return Math.min(sum, 1.0);
}

function getAllValues() {
    var values = {};
    var allQuestions = questions.behavioral.concat(questions.traditional).concat(questions.knowledge);
    allQuestions.forEach(function(q) {
        if (q.type === "radio") {
            values[q.name] = getRadioValue(q.name);
        } else if (q.type === "checkbox") {
            values[q.name] = getCheckboxValue(q.name);
        } else {
            values[q.name] = getLikertValue(q.name);
        }
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
            // Display couple results with tabbed interface
            displayCoupleResults();
            // Show splash screen for 6 seconds (covers results with high z-index)
            showSplashThenDisplayResults();
            return;
        }
    }

    // Solo mode: Display individual results
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
        drawdownDiscipline: values.drawdownDiscipline,
        rewardStability: values.rewardStability,
        emotionalComfort: values.emotionalComfort,
        disciplineConfidence: values.disciplineConfidence,
        timeHorizon: values.timeHorizon,
        lossFrequencyTolerance: values.lossFrequencyTolerance,
        returnVsLossTradeOff: values.returnVsLossTradeOff
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
    
    // kn_exp is now a checkbox that returns a summed score (0-1.0)
    var expScore = values.kn_exp || 0;
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
    var resultsEl = document.getElementById('results');
    if (!resultsEl) return; // Guard: results section doesn't exist

    resultsEl.style.display = 'block';

    // Show solo results container, hide couple-specific elements
    document.getElementById('soloResultsContainer').style.display = 'block';
    document.getElementById('coupleOrientation').style.display = 'none';
    document.getElementById('coupleTabs').style.display = 'none';
    document.getElementById('coupleTabContent').style.display = 'none';

    var mainScoreEl = document.getElementById('mainScore');
    var behavioralScoreEl = document.getElementById('behavioralScore');
    var traditionalScoreEl = document.getElementById('traditionalScore');
    var riskBandEl = document.getElementById('riskBand');
    var progressFillEl = document.getElementById('progressFill');

    if (mainScoreEl) mainScoreEl.textContent = finalScore;
    if (behavioralScoreEl) behavioralScoreEl.textContent = behavioralScore;
    if (traditionalScoreEl) traditionalScoreEl.textContent = traditionalScore;
    if (riskBandEl) {
        riskBandEl.textContent = riskBand;
        riskBandEl.className = 'risk-band ' + rbClass;
    }

    // Set progress bar width and color based on risk band
    if (progressFillEl) {
        progressFillEl.style.width = finalScore + '%';
        progressFillEl.style.backgroundColor = getRiskBandColor(finalScore);
    }

    displayPersonalizedInsights();
    displayRiskScale(finalScore);

    // Hide advisor FAB button in results view
    var advisorFab = document.getElementById('advisorAccess');
    if (advisorFab && !isAdvisorView) {
        advisorFab.style.display = 'none';
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
        interpretationText = 'You exhibit risk-awareness without risk-aversion. You accept market fluctuation as part of progress and tend to make decisions based on information rather than emotion. Your behavior reflects a stable midpoint between caution and conviction: rational, consistent, and generally disciplined under moderate volatility.';
    } else if (score <= 74) {
        interpretationText = 'Your profile suggests growth orientation with adaptive emotional control. You display confidence under uncertainty, interpreting volatility as data rather than danger. While you remain conscious of potential loss, your decisions are guided more by long-term opportunity than short-term protection.';
    } else if (score <= 89) {
        interpretationText = 'You have low loss aversion and high return motivation, often focusing on outcomes rather than interim noise. You demonstrate resilience during drawdowns and are comfortable taking positions that require conviction. You likely engage actively with investment narratives and respond well to evidence-based framing.';
    } else {
        interpretationText = 'This profile reflects high risk tolerance and analytical independence. You thrive in environments with complexity and uncertainty, where decision-making depends on conviction and long-range perspective. Volatility is not discouraging, it\'s often seen as a strategic opportunity. Your loss aversion is minimal, and your confidence level is typically high, sometimes warranting calibration to avoid overconfidence bias.';
    }
    
    document.getElementById('scoreInterpretation').style.display = 'block';
    document.getElementById('interpretationTitle').textContent = isAdvisorView ? "Client's Risk Profile" : 'Your Risk Profile';
    document.getElementById('interpretationText').textContent = interpretationText;
}

function displayPersonalizedInsights() {
    if (!lastComputed) return;

    // Show all insight sections
    document.getElementById('resultsIntroduction').style.display = 'block';
    document.getElementById('overallSummary').style.display = 'block';
    document.getElementById('mindsetSection').style.display = 'block';
    document.getElementById('traditionalSection').style.display = 'block';
    document.getElementById('alignmentCheck').style.display = 'block';
    document.getElementById('planningRelevance').style.display = 'block';

    // Generate content
    document.getElementById('resultsIntroText').textContent = generateResultsIntroduction();
    document.getElementById('overallSummaryText').textContent = generateOverallSummary(lastComputed);
    document.getElementById('mindsetInsight').textContent = generateMindsetInsight(lastComputed);
    document.getElementById('traditionalInsight').textContent = generateTraditionalInsight(lastComputed);
    document.getElementById('alignmentText').textContent = generateAlignmentCheck(lastComputed);
    document.getElementById('planningText').textContent = generatePlanningRelevance(lastComputed);
}

function generateResultsIntroduction() {
    return 'These results are a starting point, not a label. Risk tolerance is personal, nuanced, and influenced by real-life experiences that no questionnaire can fully capture. This assessment helps us organize our discussion and ask better questions, but the most important insights come from talking together.\n\nWe want to understand your goals, your circumstances, and what you truly need from your portfolio, both financially and emotionally. Your advisor will use these results to inform our work, but your investment strategy will always be built around you, not a score.';
}

function generateOverallSummary(data) {
    var score = data.finalScore;
    var band = data.riskBand;
    var behavioral = data.behavioralScore;
    var traditional = data.traditionalScore;

    var summary = 'Your overall score is ' + score + ' out of 100, which places you in the "' + band + '" range. ';

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

    summary += ' Your behavioral score (' + behavioral + ' out of 60) and traditional score (' + traditional + ' out of 40) combine to shape this overall picture.';

    return summary;
}

function generateMindsetInsight(data) {
    var behavioral = data.behavioralScore;
    var normalized = behavioral / 60; // 0-1 scale

    var insight = 'This score (' + behavioral + ' out of 60) reflects how you tend to think and feel about investment decisions: your natural reactions to gains, losses, and uncertainty. ';

    if (normalized >= 0.75) {
        insight += 'Your responses suggest you stay calm during market turbulence. If the market dropped 20% over a few months, you\'d probably see it as part of the process, not a reason to change course. You likely don\'t obsess over your portfolio, and when you do check and see red numbers, they don\'t create an urgent need to act. You might even view weak periods as a chance to buy more of what you already believe in. This mindset works well with equity-heavy portfolios, where the path to long-term growth always includes short-term pain.';
    } else if (normalized >= 0.55) {
        insight += 'Your responses point to a thoughtful, measured approach. You don\'t panic when markets fall, but you don\'t shrug it off either. If your portfolio dropped 15% during a rough quarter, you\'d want to know why and whether anything fundamental changed. You might feel uneasy, but you probably wouldn\'t act on it, especially if your advisor confirmed the decline was normal market behavior. You want strategies that balance growth with some downside awareness, and you appreciate communication that keeps you steady when things get uncertain.';
    } else if (normalized >= 0.35) {
        insight += 'Your responses show a more cautious relationship with risk. You feel losses more sharply than gains, and market declines can rattle you even when you know they\'re temporary. If your portfolio fell 10% over a few weeks, you\'d want reassurance that the plan still holds. You might not sell right away, but you\'d think hard about it. That doesn\'t mean you can\'t invest successfully, it just means your portfolio shouldn\'t test your limits too often. Lower volatility strategies, clear downside rules, or more conservative positioning might fit you better.';
    } else {
        insight += 'Your responses suggest market volatility feels stressful, and protecting what you have outweighs chasing growth. If your investments dropped just 5-8%, you\'d probably feel anxious and consider moving to cash or something safer. That\'s not a flaw. It\'s honest. The goal isn\'t to change how you feel, it\'s to build a strategy that respects it. That could mean conservative positioning, more frequent check-ins during down markets, or portfolios built for stability even if it costs some long-term return.';
    }

    return insight;
}

function generateKnowledgeInsight(data) {
    var knowledge = data.knowledge;
    var index = knowledge.index;
    var flag = knowledge.flag;

    var insight = '';

    if (index >= 75) {
        insight = 'You demonstrate strong familiarity with investment concepts and feel confident evaluating financial decisions. ';
    } else if (index >= 50) {
        insight = 'You show solid foundational knowledge of investment principles and moderate confidence in financial decision-making. ';
    } else {
        insight = 'You have developing knowledge of investment concepts and may benefit from educational support as your portfolio grows in complexity. ';
    }

    if (flag === 'overconfidence') {
        insight += 'Your confidence in this area runs slightly ahead of your objective knowledge base. This is common and easily addressed through targeted education on specific topics as they become relevant to your plan.';
    } else if (flag === 'underconfidence') {
        insight += 'You may be more knowledgeable than you give yourself credit for. Building confidence through experience and education will help you feel more comfortable with investment decisions.';
    } else {
        insight += 'Your self-assessment of your knowledge level aligns well with your demonstrated understanding, indicating good awareness of your capabilities.';
    }

    return insight;
}

function generateTraditionalInsight(data) {
    var traditional = data.traditionalScore;
    var normalized = traditional / 40; // 0-1 scale
    var scores = data.traditionalScores;

    var insight = 'This score (' + traditional + ' out of 40) reflects your time horizon, your comfort with specific market scenarios, and your goals. ';

    var timeHorizon = scores.timeHorizon;
    var drawdown = scores.drawdownDiscipline;

    // Combined narrative based on time + discipline
    if (timeHorizon >= 0.75 && drawdown >= 0.75) {
        insight += 'You have a long time horizon and say you can stay invested through major declines. That\'s a powerful combination. It means you can ride out the bad stretches without being forced to sell at the wrong time. You probably don\'t need your portfolio to work every quarter or even every year. You\'re thinking in decades, not months, and that gives you room to pursue strategies that might look awful short-term but make sense long-term. This kind of mindset supports equity-heavy portfolios, concentrated positions, or approaches that need patience to pay off.';
    } else if (timeHorizon >= 0.75 && drawdown < 0.75) {
        insight += 'You have a long time horizon, which gives you flexibility on paper, but your responses suggest you aren\'t totally comfortable with severe drawdowns. That\'s worth noting. Just because you don\'t need the money for 20 years doesn\'t mean you\'ll sleep well if your portfolio drops 30%. Your advisor can help find a middle path: enough risk to meet your goals without making you miserable during the down cycles.';
    } else if (timeHorizon < 0.5 && drawdown >= 0.75) {
        insight += 'Your time horizon is shorter, but you say you can handle declines. That\'s an interesting mix. You may have near-term needs, but you also don\'t panic when markets drop. Your advisor will probably build your portfolio with both realities in mind: keeping enough stable for what\'s coming while still letting you participate in growth where it fits.';
    } else if (timeHorizon < 0.5) {
        insight += 'Your time horizon is relatively short, which naturally leans toward more conservative positioning. You probably need part of your portfolio to be stable and available, and you may not have the luxury of waiting through long recoveries if the market tanks. That doesn\'t mean zero risk, but it does mean your strategy should reflect that you might need this money sooner, not later.';
    } else {
        insight += 'You have a moderate time horizon and a measured take on market stress. You\'re not super aggressive, but you\'re also not avoiding all volatility. You probably want growth without recklessness, and you value portfolios that balance upside with some downside protection. Your advisor will help dial in that balance based on what you\'re actually trying to do.';
    }

    return insight;
}

function generateAlignmentCheck(data) {
    var behavioral = data.behavioralScore;
    var traditional = data.traditionalScore;
    var behavioralNorm = behavioral / 60;
    var traditionalNorm = traditional / 40;

    var diff = Math.abs(behavioralNorm - traditionalNorm);

    var alignment = '';

    if (diff < 0.15) {
        alignment = 'Your emotional approach to risk and your practical circumstances line up well. Your behavioral score (' + behavioral + ') and traditional score (' + traditional + ') tell a consistent story. That makes it easier to build a portfolio that feels right both intellectually and emotionally. You\'re not fighting yourself. Your instincts about what you can handle match your goals and timeline. That consistency is valuable, it means your advisor can focus on execution instead of reconciling mixed signals.';
    } else if (diff < 0.30) {
        alignment = 'There\'s some gap between your emotional comfort with risk (behavioral: ' + behavioral + ') and your practical capacity for it (traditional: ' + traditional + '). That\'s common, and not a problem, just something to talk through. You might have the time and goals to support more risk than feels comfortable, or you might feel braver than your situation allows. Your advisor will help close that gap. The goal isn\'t to force you into something that feels wrong, it\'s to find an approach that works on both levels.';
    } else {
        alignment = 'Your behavioral score (' + behavioral + ') and traditional score (' + traditional + ') show some real divergence. Maybe you have a long timeline but hate losing money, or maybe you\'re emotionally fine with volatility but need cash soon. These mismatches aren\'t failures, they\'re just realities to work with. The portfolio that comes out of this won\'t be a simple plug-and-play from your score. It\'ll be a thoughtful blend of what you need, what you can handle, and what actually makes sense for your life.';
    }

    return alignment;
}

function generatePlanningRelevance(data) {
    return 'We don\'t build portfolios by plugging your score into a formula. This assessment gives us insight into how you think, what matters to you, and where friction might show up between your goals and your comfort level. Your advisor will use these results to frame conversations about portfolio structure: not just what you should own, but why, and how it works in different market conditions. It also helps calibrate communication. Some clients want detailed explanations when markets drop. Others prefer to trust the plan and not hear much. Some need reassurance during volatility. Others want to talk about opportunities. Knowing your tendencies helps us support you the right way at the right time. This also shapes practical calls: how much cash to keep accessible, when to rebalance, how to set up accounts for tax efficiency, and when to revisit your strategy as life shifts. But none of this is automatic. Your advisor will talk through these decisions with you, not for you.';
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
// COUPLE MODE: TABBED RESULTS DISPLAY
// ============================================================================

function generateIndividualResultsHTML(personData, personName) {
    var data = personData;
    var finalScore = data.finalScore;
    var behavioralScore = data.behavioralScore;
    var traditionalScore = data.traditionalScore;
    var riskBand = data.riskBand;
    var rbClass = getRiskBand(finalScore).rbClass;

    var html = '';

    // Results Introduction
    html += '<div class="insight-section results-intro" style="display: block;">';
    html += '<h3>How to Read These Results</h3>';
    html += '<p>' + generateResultsIntroduction() + '</p>';
    html += '</div>';

    // Main Score Display
    html += '<div class="score-display">';
    html += '<div class="risk-band ' + rbClass + '">' + riskBand + '</div>';
    html += '<div class="main-score">' + finalScore + '</div>';
    html += '<div class="score-label">Risk Alignment Score</div>';
    html += '<div class="progress-bar">';
    html += '<div class="progress-fill" style="width: ' + finalScore + '%; background-color: ' + getRiskBandColor(finalScore) + ';"></div>';
    html += '</div>';
    html += '</div>';

    // Component Scores
    html += '<div class="sub-scores">';
    html += '<div class="sub-score">';
    html += '<div class="sub-score-value">' + behavioralScore + '</div>';
    html += '<div class="sub-score-label">Behavioral Component (0-60)</div>';
    html += '<div class="sub-score-description">How you tend to think and feel about risk: your natural reactions to gains, losses, and uncertainty.</div>';
    html += '</div>';
    html += '<div class="sub-score">';
    html += '<div class="sub-score-value">' + traditionalScore + '</div>';
    html += '<div class="sub-score-label">Traditional Component (0-40)</div>';
    html += '<div class="sub-score-description">The practical side: how long you plan to invest, what you've experienced before, and what goals you're prioritizing.</div>';
    html += '</div>';
    html += '</div>';

    // Understanding the Scale
    html += '<div class="scale-explanation-section">';
    html += '<h4>Understanding the Scale</h4>';
    html += '<p>Scores closer to 0 typically reflect a preference for stability and capital preservation, where protecting what you have matters more than maximizing growth. Scores closer to 100 tend to indicate comfort with significant market volatility and a focus on long-term wealth accumulation, even when that means accepting substantial short-term fluctuations. Neither approach is better or worse. They represent different priorities, timeframes, and emotional relationships with uncertainty.</p>';
    html += '</div>';

    // Risk Scale Visualization
    html += generateRiskScaleHTML(finalScore);

    // Insight Sections
    html += '<div class="insight-section" style="display: block;">';
    html += '<h3>What Your Score Reflects</h3>';
    html += '<p>' + generateOverallSummary(data) + '</p>';
    html += '</div>';

    html += '<div class="insight-section" style="display: block;">';
    html += '<h3>Behavioral Tendencies and Investment Mindset</h3>';
    html += '<p>' + generateMindsetInsight(data) + '</p>';
    html += '</div>';

    html += '<div class="insight-section" style="display: block;">';
    html += '<h3>Time Horizon and Risk Capacity</h3>';
    html += '<p>' + generateTraditionalInsight(data) + '</p>';
    html += '</div>';

    html += '<div class="insight-section" style="display: block;">';
    html += '<h3>How These Elements Work Together</h3>';
    html += '<p>' + generateAlignmentCheck(data) + '</p>';
    html += '</div>';

    html += '<div class="insight-section" style="display: block;">';
    html += '<h3>How Petra Uses This Information</h3>';
    html += '<p>' + generatePlanningRelevance(data) + '</p>';
    html += '</div>';

    return html;
}

function generateRiskScaleHTML(score) {
    var html = '<div class="risk-scale-visualization" style="display: block;">';
    html += '<h4>Risk Profile Scale</h4>';
    html += '<div class="risk-scale-bar">';

    var segments = [
        { label: 'Very Conservative', range: '0-24', class: 'rs-very-cons', max: 24 },
        { label: 'Conservative', range: '25-44', class: 'rs-cons', max: 44 },
        { label: 'Balanced', range: '45-59', class: 'rs-balanced', max: 59 },
        { label: 'Balanced Growth', range: '60-74', class: 'rs-bal-growth', max: 74 },
        { label: 'Growth', range: '75-89', class: 'rs-growth', max: 89 },
        { label: 'Aggressive Growth', range: '90-100', class: 'rs-agg-growth', max: 100 }
    ];

    segments.forEach(function(seg, index) {
        var isActive = (score <= seg.max && (index === 0 || score > segments[index - 1].max));
        var activeClass = isActive ? ' active' : '';
        html += '<div class="risk-scale-segment ' + seg.class + activeClass + '" data-range="' + seg.range + '">';
        html += '<span class="risk-scale-label">' + seg.label + '</span>';
        html += '<span class="risk-scale-range">' + seg.range + '</span>';
        html += '</div>';
    });

    html += '</div>';
    html += '</div>';
    return html;
}

function displayCoupleResults() {
    // Show results container
    document.getElementById('results').style.display = 'block';

    // Hide solo results container
    document.getElementById('soloResultsContainer').style.display = 'none';

    // Show couple-specific elements
    document.getElementById('coupleOrientation').style.display = 'block';
    document.getElementById('coupleTabs').style.display = 'flex';
    document.getElementById('coupleTabContent').style.display = 'block';

    // Set tab names
    document.getElementById('tab1Name').textContent = person1Name;
    document.getElementById('tab2Name').textContent = person2Name;

    // Generate and insert individual results for each person
    document.getElementById('person1TabPanel').innerHTML = generateIndividualResultsHTML(person1Data, person1Name);
    document.getElementById('person2TabPanel').innerHTML = generateIndividualResultsHTML(person2Data, person2Name);

    // Set up tab event listeners
    setupCoupleTabs();

    // Show couple comparison below tabs
    showCoupleComparison();

    // Hide advisor FAB if not in advisor view
    var advisorFab = document.getElementById('advisorAccess');
    if (advisorFab && !isAdvisorView) {
        advisorFab.style.display = 'none';
    }

    // Show advisor sections if in advisor view
    if (isAdvisorView) {
        displayKnowledgeOverlay();
        generateAdvisorContent();
    }

    // Scroll to results
    setTimeout(function() {
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function setupCoupleTabs() {
    var tabs = document.querySelectorAll('.couple-tab');
    var panels = document.querySelectorAll('.person-tab-panel');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var personNumber = this.dataset.person;

            // Remove active class from all tabs and panels
            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });

            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            document.getElementById('person' + personNumber + 'TabPanel').classList.add('active');
        });
    });
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
    narrative += 'This reflects how each of you naturally thinks and feels about risk: your instinctive reactions to market movements, losses, and uncertainty. ';
    
    if (behavioralDiff <= 10) {
        narrative += person1Name + ' and ' + person2Name + ' show similar emotional and cognitive patterns when it comes to investment decisions. ';
    } else if (behavioralDiff <= 20) {
        narrative += person1Name + ' and ' + person2Name + ' have moderately different behavioral tendencies, which means you may react differently to the same market events. ';
    } else {
        narrative += person1Name + ' and ' + person2Name + ' show notably different behavioral responses to risk and uncertainty. ';
    }
    
    narrative += '<br><br><strong>Traditional Component (' + person1Data.traditionalScore + ' vs ' + person2Data.traditionalScore + '):</strong> ';
    narrative += 'This captures the practical factors: your time horizon, past experiences, and comfort with volatility. ';
    
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

    var drawdown = data.traditionalScores.drawdownDiscipline;
    html += '<p><strong>Drawdown Discipline (' + (drawdown * 100).toFixed(0) + '/100):</strong> ';
    if (drawdown > 0.75) {
        html += 'Would stay invested confidently during 25% decline. Strong conviction and long-term orientation.';
    } else if (drawdown > 0.5) {
        html += 'Would stay invested or wait during 25% decline. Disciplined approach to market volatility.';
    } else if (drawdown > 0.25) {
        html += 'Would consider reducing exposure during 25% decline. Moderate discomfort with volatility.';
    } else {
        html += 'Would move to cash during 25% decline. High sensitivity to portfolio losses. Conservative positioning recommended.';
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

    var lossFreq = data.traditionalScores.lossFrequencyTolerance;
    html += '<p><strong>Loss Frequency Tolerance (' + (lossFreq * 100).toFixed(0) + '/100):</strong> ';
    if (lossFreq > 0.75) {
        html += 'High tolerance for sequential losses. Would maintain strategy through extended drawdowns.';
    } else if (lossFreq > 0.5) {
        html += 'Moderate tolerance for sequential losses. May require reassurance during extended periods of underperformance.';
    } else {
        html += 'Low tolerance for sequential losses. Conservative approach recommended to minimize behavioral risk.';
    }
    html += '</p>';

    var returnLoss = data.traditionalScores.returnVsLossTradeOff;
    html += '<p><strong>Return vs. Loss Trade-Off (' + (returnLoss * 100).toFixed(0) + '/100):</strong> ';
    if (returnLoss > 0.75) {
        html += 'Willing to accept large temporary losses for higher returns. Growth-oriented mindset.';
    } else if (returnLoss > 0.5) {
        html += 'Moderate acceptance of temporary losses. Balanced risk-return perspective.';
    } else {
        html += 'Low acceptance of temporary losses. Capital preservation is a priority.';
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
    if (score <= 24) return '#E8B84E';  // Very Conservative (warm gold)
    if (score <= 44) return '#8B9DC3';  // Conservative (cool blue-gray)
    if (score <= 59) return '#7EADAD';  // Balanced (teal/cyan)
    if (score <= 74) return '#6B8E7F';  // Balanced Growth (forest green)
    if (score <= 89) return '#976491';  // Growth (purple)
    return '#CD6969';  // Aggressive Growth (red)
}

function printFullAssessment() {
    window.print();
}

function downloadCompletePDF() {
    if (!lastComputed) {
        alert('No results available to download.');
        return;
    }

    // Get client name
    var clientName = 'Client';
    if (isCoupleMode) {
        clientName = person1Name + ' and ' + person2Name;
    } else {
        var firstNameEl = document.getElementById('clientFirstName');
        var lastNameEl = document.getElementById('clientLastName');
        if (firstNameEl && lastNameEl) {
            clientName = firstNameEl.value + ' ' + lastNameEl.value;
        }
    }

    // Prepare result data with all answers
    var resultData = {
        finalScore: lastComputed.finalScore,
        riskBand: lastComputed.riskBand,
        behavioralScore: lastComputed.behavioralScore,
        traditionalScore: lastComputed.traditionalScore,
        answers: answers,
        traditionalScores: lastComputed.traditionalScores || {},
        knowledge: lastComputed.knowledge || {}
    };

    // Call the PDF generator
    try {
        generateCompletePDF(resultData, clientName, isCoupleMode);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('There was an error generating the PDF. Please try again.');
    }
}

// Make sure couples setup shows on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show the initial card
    const couplesSetup = document.getElementById('couplesSetup');
    if (couplesSetup) {
        couplesSetup.style.display = 'block';
    }
});
