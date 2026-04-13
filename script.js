// Security violations log
let violations = [];
let startTime = null;
let isExamStarted = false;
let studentName = '';
let studentClass = '';
let questionsData = [];
let testAnswers = [];
let testScore = 0;
let numQuestions = 0;\n\n// Save/Restore State Functions\n\nfunction saveState() {\n  const state = {\n    studentName,\n    studentClass,\n    startTime: startTime ? startTime.getTime() : null,\n    violations,\n    answers: {}\n  };\n\n  // Capture current answers if in test\n  for (let i = 0; i < numQuestions; i++) {\n    const selected = document.querySelector(`input[name="q${i+1}"]:checked`);\n    if (selected) {\n      state.answers[`q${i+1}`] = selected.value;\n    }\n  }\n\n  localStorage.setItem('quizState', JSON.stringify(state));\n}\n\nfunction loadSavedState(saved) {\n  studentName = saved.studentName || '';\n  studentClass = saved.studentClass || '';\n  if (saved.startTime) startTime = new Date(saved.startTime);\n  violations = saved.violations || [];\n  document.getElementById('student-info').textContent = `Aluno: ${studentName} | Sala: ${studentClass}`;\n  isExamStarted = true;\n  attachSecurityListeners();\n}\n\nfunction restoreSelections(saved) {\n  if (!saved.answers) return;\n  Object.keys(saved.answers).forEach(qName => {\n    const radio = document.querySelector(`input[name="${qName}"][value="${saved.answers[qName]}"]`);\n    if (radio) radio.checked = true;\n  });\n}\n\nfunction showUnlockScreen() {\n  // Hide all\n  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));\n  document.getElementById('unlock-section').classList.add('active');\n\n  // Unlock handler\n  const unlockForm = document.getElementById('unlock-form');\n  if (unlockForm.dataset.listener === 'attached') return;\n  unlockForm.addEventListener('submit', (e) => {\n    e.preventDefault();\n    const pw = document.getElementById('prof-password').value;\n    if (pw === 'senha123') {\n      const saved = JSON.parse(localStorage.getItem('quizState'));\n      document.getElementById('unlock-section').classList.remove('active');\n      document.getElementById('test-section').classList.add('active');\n      document.getElementById('test-form').style.display = 'block';\n      loadQuestions().then(() => {\n        generateQuestions(questionsData);\n        loadSavedState(saved);\n        restoreSelections(saved);\n      });\n    } else {\n      alert('Senha incorreta! Reiniciando prova.');\n      localStorage.removeItem('quizState');\n      document.getElementById('unlock-section').classList.remove('active');\n      document.getElementById('login-section').classList.add('active');\n    }\n  });\n  unlockForm.dataset.listener = 'attached';\n}\n\nasync function loadQuestions() {\n  try {\n    const response = await fetch('questions.json');\n    const data = await response.json();\n    questionsData = data;\n    numQuestions = questionsData.length;\n    console.log(`Loaded ${numQuestions} questions from questions.json`);\n  } catch (error) {\n    console.error('Erro ao carregar questions.json:', error);\n    // Fallback para embedded se falhar\n    questionsData = [{"question":"Erro: não foi possível carregar questões","options":["Tente novamente"],"correct":0}];\n    numQuestions = 1;\n  }\n}

function attachSecurityListeners() {
  // Prevent DevTools and right-click
  document.addEventListener('contextmenu', e => {
      e.preventDefault();
      logViolation('Tentou clique direito (possível inspect)');
  });

  document.addEventListener('keydown', e => {
      // F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && e.key === 's')) {
          e.preventDefault();
          logViolation(`Tentou abrir DevTools (${e.key})`);
      }
      // Prevent copy/paste
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
          e.preventDefault();
          logViolation('Tentou copiar/colar');
      }
  }, true);

  // Monitor tab switches and focus
  document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
          logViolation('Retornou à aba');
      } else {
          logViolation('Mudou de aba/alt+tab');
      }
  });

  window.addEventListener('blur', () => {
      logViolation('Perdeu foco da janela');
  });

  window.addEventListener('pagehide', () => {
      logViolation('Tentou sair da página');
  });
}

// Log function
function logViolation(action) {
    if (!isExamStarted) return;
    const now = new Date().toLocaleString('pt-BR');
    violations.push(`${now}: ${action}`);
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    studentName = document.getElementById('student-name').value.trim();
    studentClass = document.getElementById('class-select').value;
    
    if (!studentName || !studentClass) return alert('Preencha todos os campos!');
    
    startTime = new Date();
    document.getElementById('student-info').textContent = `Aluno: ${studentName} | Sala: ${studentClass}`;
    
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('test-section').classList.add('active');
    
    // Auto fullscreen
    document.getElementById('fullscreen-prompt').style.display = 'block';
    try {
        await document.documentElement.requestFullscreen();
    } catch {
        logViolation('Falha ao entrar em fullscreen (permita no browser)');
    } finally {
        document.getElementById('fullscreen-prompt').style.display = 'none';
        document.getElementById('test-form').style.display = 'block';
        await loadQuestions();
        generateQuestions(questionsData);
        if (questionsData.length === 0) {
            console.error('Nenhuma questão disponível após carregar questions.json');
        }
        isExamStarted = true;\n        attachSecurityListeners();\n        saveState();  // Save initial state\n    }\n\n});

function generateQuestions(data) {\n    const container = document.getElementById('questions-container');\n    if (!container) {\n        console.error('Container not found');\n        return;\n    }\n    container.innerHTML = '';\n    data.forEach((q, index) => {\n        const div = document.createElement('div');\n        div.className = 'question';\n        div.innerHTML = `\n            <h3>${index + 1}. ${q.question}</h3>\n            ${q.options.map((option, optIndex) => \n                `<label><input type="radio" name="q${index + 1}" value="${optIndex}"> ${option}</label>`\n            ).join('')}\n        `;\n        container.appendChild(div);\n    });\n    console.log('Questões geradas:', data.length);\n\n    // Restore selections if saved state exists (for unlock resume)\n    const saved = localStorage.getItem('quizState') ? JSON.parse(localStorage.getItem('quizState')) : null;\n    if (saved && saved.answers) {\n      restoreSelections(saved);\n    }\n}

// Removed early generateQuestions as data loads after login\ndocument.addEventListener('DOMContentLoaded', () => {\n  // Check for saved state\n  if (localStorage.getItem('quizState')) {\n    showUnlockScreen();\n  }\n  // Hide unlock initially\n  document.getElementById('unlock-section').style.display = 'none';\n});

// Test submit
document.getElementById('test-form').addEventListener('submit', (e) => {\n    e.preventDefault();\n    saveState();  // Final save before score\n    \n    testScore = 0;\n    testAnswers = [];\n    \n    for (let i = 0; i < numQuestions; i++) {\n        const selected = document.querySelector(`input[name="q${i+1}"]:checked`);\n        const suaIndex = selected ? parseInt(selected.value) : -1;\n        const suaText = suaIndex >= 0 ? questionsData[i].options[suaIndex] : 'não respondida';\n        const correctIndex = questionsData[i].correct;\n        const correctText = questionsData[i].options[correctIndex];\n        const isWrong = suaIndex !== correctIndex;\n        \n        testAnswers.push({\n            qNum: i+1,\n            suaText,\n            correctText,\n            isWrong\n        });\n        \n        if (!isWrong) testScore++;\n    }\n    \n    const totalTime = new Date() - startTime;\n    const percentage = Math.round((testScore / numQuestions) * 100);\n    \n    document.getElementById('score').innerHTML = `\n        <strong>${testScore}/${numQuestions} (${percentage}%)</strong><br>\n        Tempo: ${Math.floor(totalTime / 60000)}min ${Math.floor((totalTime % 60000) / 1000)}s\n    `;\n    \n    document.getElementById('test-section').classList.remove('active');\n    document.getElementById('results-section').classList.add('active');\n});

// PDF Download
document.getElementById('download-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      encryption: {
        userPassword: 'abacate',
        ownerPassword: '',
        encryptionType: 'aes256'
      }
    });
    
    let y = 20;

    doc.setFontSize(16);
    doc.text('RELATÓRIO DO SIMULADO - 1º BIMESTRE', 20, y);
    y += 15;
    
    doc.setFontSize(12);
    doc.text(`Aluno: ${studentName}`, 20, y); y += 8;
    doc.text(`Sala: ${studentClass}`, 20, y); y += 10;
    
    doc.text('Respostas:', 20, y); y += 8;
    testAnswers.forEach((item) => {
        let line1 = `Q${item.qNum}: Sua: ${item.suaText.substring(0, 80)}...`;
        if (line1.length > 80) line1 = line1.substring(0, 80) + '...';
        doc.text(line1, 20, y);
        y += 6;
        if (item.isWrong) {
            let line2 = `Correta: ${item.correctText.substring(0, 80)}...`;
            if (line2.length > 80) line2 = line2.substring(0, 80) + '...';
            doc.text(line2, 20, y);
            y += 6;
        }
        if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 5;
    
    doc.text(`Pontuação: ${testScore}/${numQuestions} (${Math.round((testScore / numQuestions) * 100)}%)`, 20, y); y += 10;
    
    if (violations.length > 0) {
        y += 5;
        doc.setTextColor(220, 20, 60);
        doc.text('VIOLAÇÕES DE SEGURANÇA:', 20, y); y += 8;
        doc.setTextColor(0, 0, 0);
        violations.forEach(vio => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(vio, 20, y);
            y += 6;
        });
        doc.setTextColor(0, 0, 0);
    }
    
    
// Password protect (user password 'abacate', owner empty for simplicity)\n    doc.save(`prova_${studentName.replace(/[^a-zA-Z0-9]/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`);\n    localStorage.removeItem('quizState');  // Clear state after PDF\n});
