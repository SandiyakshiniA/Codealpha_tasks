// --- STATE MANAGEMENT ---
let cards = [];
let currentCardIndex = 0;
let isFlipped = false;

// --- DEFAULT FLASHCARDS ---
const DEFAULT_CARDS = [
  {
    id: "default-1",
    category: "JavaScript",
    question: "What is a closure in JavaScript?",
    answer: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer function's scope even after the outer function has returned."
  },
  {
    id: "default-2",
    category: "CSS",
    question: "Explain the difference between absolute, relative, fixed, and sticky positioning.",
    answer: "• Relative: Positioned relative to its normal flow.\n• Absolute: Positioned relative to its nearest positioned ancestor.\n• Fixed: Positioned relative to the viewport, staying in place during scroll.\n• Sticky: Acts like relative until a scroll threshold, then becomes fixed."
  },
  {
    id: "default-3",
    category: "HTML",
    question: "What is Semantic HTML and why is it important?",
    answer: "Semantic HTML uses tags that clearly describe their meaning (e.g., <article>, <main>, <nav>). It is critical for accessibility (screen readers), SEO indexing, and maintainability by making the code structure meaningful."
  },
  {
    id: "default-4",
    category: "Web Security",
    question: "What is Cross-Site Scripting (XSS) and how can you prevent it?",
    answer: "XSS is a vulnerability where malicious scripts are injected into trusted websites. Prevention includes: sanitizing and escaping all user inputs, implementing Content Security Policy (CSP) headers, and using HTTPOnly flags for session cookies."
  }
];

// --- DOM ELEMENTS ---
const elements = {
  // Navigation Tabs
  tabQuiz: document.getElementById('tab-quiz'),
  tabManage: document.getElementById('tab-manage'),
  quizView: document.getElementById('quiz-view'),
  manageView: document.getElementById('manage-view'),

  // Quiz Mode elements
  quizCardIndex: document.getElementById('quiz-card-index'),
  quizPercent: document.getElementById('quiz-percent'),
  quizProgressBar: document.getElementById('quiz-progress-bar'),
  flashcardContainer: document.getElementById('flashcard-container'),
  flashcard: document.getElementById('flashcard'),
  cardFrontTag: document.getElementById('card-front-tag'),
  cardFrontQuestion: document.getElementById('card-front-question'),
  cardBackTag: document.getElementById('card-back-tag'),
  cardBackAnswer: document.getElementById('card-back-answer'),
  btnShowAnswer: document.getElementById('btn-show-answer'),
  btnShowQuestion: document.getElementById('btn-show-question'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),

  // Manage Mode elements
  deckStatsText: document.getElementById('deck-stats-text'),
  btnOpenAddModal: document.getElementById('btn-open-add-modal'),
  cardsGrid: document.getElementById('cards-grid'),
  emptyState: document.getElementById('empty-state'),
  btnEmptyAdd: document.getElementById('btn-empty-add'),

  // Modal elements
  cardModal: document.getElementById('card-modal'),
  modalTitle: document.getElementById('modal-title'),
  cardForm: document.getElementById('card-form'),
  formCardId: document.getElementById('form-card-id'),
  formCategory: document.getElementById('form-category'),
  formQuestion: document.getElementById('form-question'),
  formAnswer: document.getElementById('form-answer'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),

  // Toast container
  toastContainer: document.getElementById('toast-container')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }
});

function initApp() {
  // Load data from LocalStorage
  const storedCards = localStorage.getItem('deck_cards');
  if (storedCards) {
    cards = JSON.parse(storedCards);
  } else {
    // Inject defaults if empty
    cards = [...DEFAULT_CARDS];
    localStorage.setItem('deck_cards', JSON.stringify(cards));
  }
  
  currentCardIndex = 0;
  isFlipped = false;
  
  // Render views
  renderQuiz();
  renderManageGrid();
}

// --- RENDER CONTROLLERS ---

function renderQuiz() {
  if (cards.length === 0) {
    // If deck has no cards, display empty card state
    elements.quizCardIndex.textContent = "Card 0 of 0";
    elements.quizPercent.textContent = "0% Completed";
    elements.quizProgressBar.style.width = "0%";
    
    elements.cardFrontTag.textContent = "NONE";
    elements.cardFrontQuestion.textContent = "Your deck is empty! Please go to the 'Manage Deck' panel and add some flashcards.";
    elements.cardBackTag.textContent = "NONE";
    elements.cardBackAnswer.textContent = "No cards available.";
    
    elements.btnPrev.disabled = true;
    elements.btnNext.disabled = true;
    elements.btnShowAnswer.disabled = true;
    elements.btnShowQuestion.disabled = true;
    return;
  }

  // Enable action buttons
  elements.btnShowAnswer.disabled = false;
  elements.btnShowQuestion.disabled = false;

  const currentCard = cards[currentCardIndex];
  
  // Progress Calculations
  const progressText = `Card ${currentCardIndex + 1} of ${cards.length}`;
  const percentComplete = Math.round(((currentCardIndex + 1) / cards.length) * 100);
  
  elements.quizCardIndex.textContent = progressText;
  elements.quizPercent.textContent = `${percentComplete}% Completed`;
  elements.quizProgressBar.style.width = `${percentComplete}%`;
  
  // Load card contents
  elements.cardFrontTag.textContent = currentCard.category || "General";
  elements.cardFrontQuestion.textContent = currentCard.question;
  elements.cardBackTag.textContent = currentCard.category || "General";
  elements.cardBackAnswer.textContent = currentCard.answer;
  
  // Navigation states
  elements.btnPrev.disabled = (currentCardIndex === 0);
  elements.btnNext.disabled = (currentCardIndex === cards.length - 1);
}

function renderManageGrid() {
  elements.deckStatsText.textContent = `Total Cards: ${cards.length}`;
  elements.cardsGrid.innerHTML = '';
  
  if (cards.length === 0) {
    elements.cardsGrid.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    return;
  }
  
  elements.cardsGrid.classList.remove('hidden');
  elements.emptyState.classList.add('hidden');
  
  cards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'manage-card';
    cardEl.innerHTML = `
      <div class="manage-card-meta">
        <span class="category-badge">${escapeHTML(card.category || 'General')}</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight:600;">#${index + 1}</span>
      </div>
      <div class="manage-card-content">
        <h4 class="manage-card-q">${escapeHTML(card.question)}</h4>
        <p class="manage-card-a">${escapeHTML(card.answer).replace(/\n/g, '<br>')}</p>
      </div>
      <div class="manage-card-actions">
        <button class="btn-icon edit-action" data-id="${card.id}" title="Edit Flashcard">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="btn-icon delete-action" data-id="${card.id}" title="Delete Flashcard">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    elements.cardsGrid.appendChild(cardEl);
  });
  
  // Re-run Lucide on newly created icon elements
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Attach Event Listeners to actions
  document.querySelectorAll('.edit-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = e.currentTarget.getAttribute('data-id');
      openModal(cardId);
    });
  });
  
  document.querySelectorAll('.delete-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = e.currentTarget.getAttribute('data-id');
      deleteCard(cardId);
    });
  });
}

// --- TRANSITIONS & ACTIONS ---

function flipCard() {
  if (cards.length === 0) return;
  isFlipped = !isFlipped;
  if (isFlipped) {
    elements.flashcard.classList.add('flipped');
  } else {
    elements.flashcard.classList.remove('flipped');
  }
}

function resetFlip() {
  isFlipped = false;
  elements.flashcard.classList.remove('flipped');
}

function navigateCard(direction) {
  if (cards.length === 0) return;
  
  let newIndex = currentCardIndex;
  if (direction === 'next' && currentCardIndex < cards.length - 1) {
    newIndex++;
  } else if (direction === 'prev' && currentCardIndex > 0) {
    newIndex--;
  } else {
    // Shake the card deck container if trying to go out of bounds
    elements.flashcardContainer.classList.add('shake');
    setTimeout(() => {
      elements.flashcardContainer.classList.remove('shake');
    }, 400);
    return;
  }

  // Animation layout handling
  const slideOutClass = (direction === 'next') ? 'slide-out-left' : 'slide-out-right';
  const slideInClass = (direction === 'next') ? 'slide-in-right' : 'slide-in-left';
  
  // 1. Unflip card first if it is showing the back side
  if (isFlipped) {
    resetFlip();
    // Allow small delay for unflipping transition before sliding out
    setTimeout(() => proceedNavigation(), 200);
  } else {
    proceedNavigation();
  }

  function proceedNavigation() {
    // 2. Add slide out animation
    elements.flashcard.classList.add(slideOutClass);
    
    // 3. Switch content at the peak of slide-out
    setTimeout(() => {
      currentCardIndex = newIndex;
      renderQuiz();
      
      // Remove slide-out and add slide-in animation
      elements.flashcard.classList.remove(slideOutClass);
      elements.flashcard.classList.add(slideInClass);
      
      // Clean classes when done
      setTimeout(() => {
        elements.flashcard.classList.remove(slideInClass);
      }, 350);
    }, 280);
  }
}

// --- CRUD OPERATIONS ---

function saveCardSubmit(e) {
  e.preventDefault();
  
  const cardId = elements.formCardId.value;
  const category = elements.formCategory.value.trim();
  const question = elements.formQuestion.value.trim();
  const answer = elements.formAnswer.value.trim();
  
  if (!question || !answer) {
    showToast("Please fill in both Question and Answer fields.", "danger");
    return;
  }
  
  if (cardId) {
    // Edit existing card
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
      cards[cardIndex] = { ...cards[cardIndex], category, question, answer };
      showToast("Flashcard updated successfully!", "success");
    } else {
      showToast("Error finding card to edit.", "danger");
      return;
    }
  } else {
    // Add new card
    const newCard = {
      id: 'card-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      category: category || "General",
      question,
      answer
    };
    cards.push(newCard);
    
    // Move index to the newly created card in quiz view
    currentCardIndex = cards.length - 1;
    showToast("New flashcard created successfully!", "success");
  }
  
  // Save, refresh components
  localStorage.setItem('deck_cards', JSON.stringify(cards));
  resetFlip();
  renderQuiz();
  renderManageGrid();
  closeModal();
}

function deleteCard(id) {
  const cardIndex = cards.findIndex(c => c.id === id);
  if (cardIndex === -1) return;
  
  const cardTitle = cards[cardIndex].question;
  const shortTitle = cardTitle.length > 25 ? cardTitle.substr(0, 25) + '...' : cardTitle;
  
  // Remove card
  cards.splice(cardIndex, 1);
  
  // Adjust current index if it becomes out of bounds
  if (currentCardIndex >= cards.length) {
    currentCardIndex = Math.max(0, cards.length - 1);
  }
  
  localStorage.setItem('deck_cards', JSON.stringify(cards));
  resetFlip();
  renderQuiz();
  renderManageGrid();
  showToast(`Deleted: "${shortTitle}"`, "info");
}

// --- MODAL UTILS ---

function openModal(cardId = '') {
  elements.cardForm.reset();
  
  if (cardId) {
    // EDIT MODE
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    elements.modalTitle.textContent = "Edit Flashcard";
    elements.formCardId.value = card.id;
    elements.formCategory.value = card.category;
    elements.formQuestion.value = card.question;
    elements.formAnswer.value = card.answer;
  } else {
    // ADD MODE
    elements.modalTitle.textContent = "Create Flashcard";
    elements.formCardId.value = '';
    elements.formCategory.value = '';
    elements.formQuestion.value = '';
    elements.formAnswer.value = '';
  }
  
  elements.cardModal.classList.remove('hidden');
  elements.cardModal.setAttribute('aria-hidden', 'false');
  elements.formCategory.focus();
}

function closeModal() {
  elements.cardModal.classList.add('hidden');
  elements.cardModal.setAttribute('aria-hidden', 'true');
  elements.cardForm.reset();
}

// --- TOAST NOTIFICATIONS ---

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'danger') iconName = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Initialize Lucide icon in toast
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Slide out after 3.5s
  setTimeout(() => {
    toast.classList.add('removing');
    // Remove from DOM after transition completes
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}

// --- VIEW STATE TOGGLING ---

function switchTab(target) {
  if (target === 'quiz') {
    elements.tabQuiz.classList.add('active');
    elements.tabQuiz.setAttribute('aria-selected', 'true');
    elements.tabManage.classList.remove('active');
    elements.tabManage.setAttribute('aria-selected', 'false');
    
    elements.quizView.classList.remove('hidden');
    elements.manageView.classList.add('hidden');
    
    resetFlip();
    renderQuiz();
  } else {
    elements.tabManage.classList.add('active');
    elements.tabManage.setAttribute('aria-selected', 'true');
    elements.tabQuiz.classList.remove('active');
    elements.tabQuiz.setAttribute('aria-selected', 'false');
    
    elements.manageView.classList.remove('hidden');
    elements.quizView.classList.add('hidden');
    
    renderManageGrid();
  }
}

// --- UTILITIES ---

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- EVENTS BINDINGS ---

function setupEventListeners() {
  // Tabs switcher
  elements.tabQuiz.addEventListener('click', () => switchTab('quiz'));
  elements.tabManage.addEventListener('click', () => switchTab('manage'));
  
  // Card interactions (Flip)
  elements.flashcardContainer.addEventListener('click', flipCard);
  
  // Quiz controls
  elements.btnPrev.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering card flip on navigation buttons
    navigateCard('prev');
  });
  
  elements.btnNext.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering card flip on navigation buttons
    navigateCard('next');
  });
  
  // Reveal/Back triggers specifically (for accessibility click, click delegation, etc.)
  elements.btnShowAnswer.addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard();
  });
  elements.btnShowQuestion.addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard();
  });

  // Modal display toggles
  elements.btnOpenAddModal.addEventListener('click', () => openModal());
  elements.btnEmptyAdd.addEventListener('click', () => openModal());
  
  elements.btnCloseModal.addEventListener('click', closeModal);
  elements.btnCancelModal.addEventListener('click', closeModal);
  
  // Close modal clicking overlay
  elements.cardModal.addEventListener('click', (e) => {
    if (e.target === elements.cardModal) {
      closeModal();
    }
  });

  // Save submit
  elements.cardForm.addEventListener('submit', saveCardSubmit);

  // Keyboard navigation shortcuts
  document.addEventListener('keydown', (e) => {
    // Only capture when modal is closed
    if (!elements.cardModal.classList.contains('hidden')) return;
    
    // Ignore input text areas
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    
    if (elements.quizView.classList.contains('hidden')) return; // Only trigger in quiz view
    
    if (e.code === 'ArrowRight') {
      navigateCard('next');
    } else if (e.code === 'ArrowLeft') {
      navigateCard('prev');
    } else if (e.code === 'Space') {
      e.preventDefault(); // Stop default scroll behavior
      flipCard();
    }
  });
}
