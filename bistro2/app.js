const USERS = {
  admin: { username: 'admin', password: 'admin123' },
  student: { username: 'student', password: 'student123' }
};

const SUBJECTS = ['Maths', 'Science', 'English', 'Computer'];

const getSession = () => JSON.parse(localStorage.getItem('srpSession') || 'null');
const setSession = (session) => localStorage.setItem('srpSession', JSON.stringify(session));
const clearSession = () => localStorage.removeItem('srpSession');
const getResultData = () => JSON.parse(localStorage.getItem('srpResultData') || 'null');
const setResultData = (payload) => localStorage.setItem('srpResultData', JSON.stringify(payload));

const requireAuth = (allowedRoles = []) => {
  const session = getSession();
  if (!session || (allowedRoles.length && !allowedRoles.includes(session.role))) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
};

const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 50) return 'C';
  return 'Fail';
};

const attachLogout = () => {
  const logoutBtn = document.querySelector('#logoutBtn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    clearSession();
    window.location.href = 'login.html';
  });
};

const onLoginPage = () => {
  const form = document.querySelector('#loginForm');
  if (!form) return;

  if (getSession()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const message = document.querySelector('#loginMessage');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const role = document.querySelector('#role').value.trim();
    const username = document.querySelector('#username').value.trim();
    const password = document.querySelector('#password').value.trim();

    if (!role || !username || !password) {
      message.textContent = 'Please fill in all fields before login.';
      return;
    }

    const expected = USERS[role];
    if (!expected || username !== expected.username || password !== expected.password) {
      message.textContent = 'Invalid credentials for selected role.';
      return;
    }

    setSession({ role, username });
    message.textContent = 'Login successful. Redirecting...';
    message.style.color = '#7df9c1';
    window.setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 400);
  });
};

const onDashboardPage = () => {
  const linksWrap = document.querySelector('#dashboardLinks');
  if (!linksWrap) return;

  const session = requireAuth(['admin', 'student']);
  if (!session) return;

  const welcomeText = document.querySelector('#welcomeText');
  welcomeText.textContent = `Welcome, ${session.username} (${session.role})`;

  const links = [
    session.role === 'admin'
      ? '<a class="glass nav-item" href="marks-entry.html"><i class="fa-solid fa-pen-to-square"></i> Enter Marks</a>'
      : '<a class="glass nav-item" href="result.html"><i class="fa-solid fa-square-poll-vertical"></i> View Result</a>',
    '<a class="glass nav-item" href="result.html"><i class="fa-solid fa-file-lines"></i> Result Page</a>'
  ];

  linksWrap.innerHTML = links.join('');
};

const onMarksPage = () => {
  const form = document.querySelector('#marksForm');
  if (!form) return;

  const session = requireAuth(['admin']);
  if (!session) return;

  const message = document.querySelector('#marksMessage');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const studentName = document.querySelector('#studentName').value.trim();
    const rollNumber = document.querySelector('#rollNumber').value.trim();
    const marks = {
      Maths: Number(document.querySelector('#maths').value),
      Science: Number(document.querySelector('#science').value),
      English: Number(document.querySelector('#english').value),
      Computer: Number(document.querySelector('#computer').value)
    };

    if (!studentName || !rollNumber || Object.values(marks).some((score) => Number.isNaN(score))) {
      message.textContent = 'Please provide valid student information and all subject marks.';
      return;
    }

    if (Object.values(marks).some((score) => score < 0 || score > 100)) {
      message.textContent = 'Every subject mark must be between 0 and 100.';
      return;
    }

    const total = Object.values(marks).reduce((sum, score) => sum + score, 0);
    const percentage = Number((total / SUBJECTS.length).toFixed(2));
    const grade = calculateGrade(percentage);
    const status = Object.values(marks).every((score) => score >= 35) ? 'Pass' : 'Fail';

    setResultData({ studentName, rollNumber, marks, total, percentage, grade, status });

    message.textContent = 'Marks saved successfully.';
    message.style.color = '#7df9c1';
    form.reset();
  });
};

const onResultPage = () => {
  const resultContent = document.querySelector('#resultContent');
  if (!resultContent) return;

  const session = requireAuth(['admin', 'student']);
  if (!session) return;

  const data = getResultData();
  if (!data) {
    resultContent.innerHTML = '<p class="muted">No result data found. Ask admin to enter marks first.</p>';
    return;
  }

  const marksHtml = Object.entries(data.marks)
    .map(([subject, score]) => `<li><strong>${subject}</strong>: ${score} / 100</li>`)
    .join('');

  const statusClass = data.status === 'Pass' ? 'status-pass' : 'status-fail';

  resultContent.innerHTML = `
    <p><strong>Name:</strong> ${data.studentName}</p>
    <p><strong>Roll Number:</strong> ${data.rollNumber}</p>
    <ul class="result-list">${marksHtml}</ul>
    <p><strong>Total Marks:</strong> ${data.total} / ${SUBJECTS.length * 100}</p>
    <p><strong>Percentage:</strong> ${data.percentage}%</p>
    <p><strong>Grade:</strong> ${data.grade}</p>
    <p><strong>Result Status:</strong> <span class="${statusClass}">${data.status}</span></p>
  `;
};

onLoginPage();
onDashboardPage();
onMarksPage();
onResultPage();
attachLogout();
