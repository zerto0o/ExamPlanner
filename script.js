(function () {
    'use strict';

    //Константы
    const STORAGE_KEY = 'exam_planner_exams';
    const SESSION_KEY = 'exam_planner_selected_exam';

    //Ограничения по кол-ву символов
    const EXAM_NAME_REGEX = /^.{2,50}$/; // 2–50 символов
    const TOPIC_NAME_REGEX = /^.{2,100}$/; // 2–100 символов

    //Состояние
    let exams = [];
    let selectedExamId = null;

    //DOM
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = {
        examsSection: document.getElementById('examsSection'),
        calendarSection: document.getElementById('calendarSection'),
        statsSection: document.getElementById('statsSection')
    };

    const examForm = document.getElementById('examForm');
    const examNameInput = document.getElementById('examName');
    const examDateInput = document.getElementById('examDate');
    const examDescInput = document.getElementById('examDesc');
    const examNameError = document.getElementById('examNameError');
    const examDateError = document.getElementById('examDateError');

    const examsListContainer = document.getElementById('examsListContainer');

    const examDetail = document.getElementById('examDetail');
    const detailName = document.getElementById('detailName');
    const detailDate = document.getElementById('detailDate');
    const detailProgressFill = document.getElementById('detailProgressFill');
    const detailProgressText = document.getElementById('detailProgressText');
    const topicsList = document.getElementById('topicsList');
    const topicForm = document.getElementById('topicForm');
    const topicNameInput = document.getElementById('topicName');
    const topicNameError = document.getElementById('topicNameError');
    const deleteExamBtn = document.getElementById('deleteExamBtn');

    const calendarGrid = document.getElementById('calendarGrid');
    const calendarEmpty = document.getElementById('calendarEmpty');
    const statOverallProgress = document.getElementById('statOverallProgress');
    const statExamsCount = document.getElementById('statExamsCount');
    const upcomingExamsList = document.getElementById('upcomingExamsList');

    //Утилиты
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }

    function daysUntil(dateStr) {
        if (!dateStr) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr + 'T00:00:00');
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    }

    function isFutureDate(dateStr) {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr + 'T00:00:00');
        return target >= today;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"]/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        })[m]);
    }

    //Хранилище
    function saveExams() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
    }

    function loadExams() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                exams = JSON.parse(stored);
            } catch (e) {
                exams = [];
            }
        } else {
            exams = [];
        }
        const storedSelected = sessionStorage.getItem(SESSION_KEY);
        if (storedSelected && exams.some(e => e.id === storedSelected)) {
            selectedExamId = storedSelected;
        } else {
            selectedExamId = null;
            sessionStorage.removeItem(SESSION_KEY);
        }
    }

    function saveSelectedExam() {
        if (selectedExamId) {
            sessionStorage.setItem(SESSION_KEY, selectedExamId);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
    }

    //Прогресс
    function calcExamProgress(exam) {
        if (!exam.topics || exam.topics.length === 0) return 0;
        const completed = exam.topics.filter(t => t.completed).length;
        return Math.round((completed / exam.topics.length) * 100);
    }

    function calcOverallProgress() {
        let totalTopics = 0;
        let completedTopics = 0;
        exams.forEach(ex => {
            if (ex.topics) {
                totalTopics += ex.topics.length;
                completedTopics += ex.topics.filter(t => t.completed).length;
            }
        });
        if (totalTopics === 0) return 0;
        return Math.round((completedTopics / totalTopics) * 100);
    }

    //Список экзаменов
    function renderExamsList() {
        if (exams.length === 0) {
            examsListContainer.innerHTML = '<div class="empty-message">У вас пока нет экзаменов.</div>';
            return;
        }
        const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
        examsListContainer.innerHTML = sorted.map(exam => {
            const progress = calcExamProgress(exam);
            const days = daysUntil(exam.date);
            let countdownText;
            if (days < 0) countdownText = 'просрочен';
            else if (days === 0) countdownText = 'сегодня!';
            else countdownText = `через ${days} дн.`;

            const isSelected = (exam.id === selectedExamId) ? 'selected' : '';
            return `
                <div class="exam-card ${isSelected}" data-exam-id="${exam.id}">
                    <h4>${escapeHtml(exam.name)}</h4>
                    <div class="exam-date">
                        <span>${formatDate(exam.date)}</span>
                        <span class="countdown">${countdownText}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <div class="progress-text">${progress}% готово</div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.exam-card').forEach(card => {
            card.addEventListener('click', () => selectExam(card.dataset.examId));
        });
    }

    function selectExam(id) {
        selectedExamId = id;
        saveSelectedExam();
        renderExamsList();
        renderExamDetail();
        if (examDetail.style.display !== 'none') {
            examDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    //Детальный просмотр экзаменов
    function renderExamDetail() {
        const exam = exams.find(e => e.id === selectedExamId);
        if (!exam) {
            examDetail.style.display = 'none';
            return;
        }
        examDetail.style.display = 'block';
        detailName.textContent = exam.name;
        detailDate.textContent = `Дата экзамена: ${formatDate(exam.date)} (${daysUntil(exam.date)} дн.)`;

        let descBlock = document.getElementById('detailDescription');
        if (!descBlock) {
            descBlock = document.createElement('div');
            descBlock.id = 'detailDescription';
            descBlock.className = 'detail-description';
            detailDate.parentNode.insertBefore(descBlock, detailDate.nextSibling);
        }
        if (exam.description && exam.description.trim()) {
            descBlock.textContent = exam.description.trim();
            descBlock.style.display = 'block';
        } else {
            descBlock.style.display = 'none';
        }

        const progress = calcExamProgress(exam);
        detailProgressFill.style.width = progress + '%';
        const completed = exam.topics ? exam.topics.filter(t => t.completed).length : 0;
        const total = exam.topics ? exam.topics.length : 0;
        detailProgressText.textContent = `Готовность: ${progress}% (${completed} из ${total} тем)`;

        if (!exam.topics || exam.topics.length === 0) {
            topicsList.innerHTML = '<div class="empty-message" style="padding: 12px;">Нет тем.</div>';
        } else {
            topicsList.innerHTML = exam.topics.map(topic => `
                <div class="topic-item" data-topic-id="${topic.id}">
                    <label>
                        <input type="checkbox" ${topic.completed ? 'checked' : ''} data-topic-checkbox="${topic.id}">
                        <span>${escapeHtml(topic.name)}</span>
                    </label>
                    <button class="delete-topic" data-delete-topic="${topic.id}" title="Удалить тему">✕</button>
                </div>
            `).join('');

            document.querySelectorAll('[data-topic-checkbox]').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    toggleTopicCompleted(selectedExamId, e.target.dataset.topicCheckbox, e.target.checked);
                });
            });

            document.querySelectorAll('[data-delete-topic]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTopic(selectedExamId, btn.dataset.deleteTopic);
                });
            });
        }
    }

    //Интерактирование с темами
    function toggleTopicCompleted(examId, topicId, completed) {
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;
        const topic = exam.topics.find(t => t.id === topicId);
        if (topic) {
            topic.completed = completed;
            saveExams();
            renderExamsList();
            renderExamDetail();
            renderCalendar();
            renderStats();
        }
    }

    function deleteTopic(examId, topicId) {
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;
        exam.topics = exam.topics.filter(t => t.id !== topicId);
        saveExams();
        renderExamsList();
        renderExamDetail();
        renderCalendar();
        renderStats();
    }

    //Проверка ограничений
    function validateExamName(name) {
        const trimmed = name.trim();
        if (!EXAM_NAME_REGEX.test(trimmed)) {
            return 'Название должно содержать от 2 до 50 символов';
        }
        return '';
    }

    function validateTopicName(name) {
        const trimmed = name.trim();
        if (!TOPIC_NAME_REGEX.test(trimmed)) {
            return 'Название темы должно содержать от 2 до 100 символов';
        }
        return '';
    }

    examNameInput.addEventListener('input', () => {
        const err = validateExamName(examNameInput.value);
        examNameError.textContent = err;
        examNameInput.style.borderColor = err ? '#dc2626' : '#dbe1e9';
    });

    examDateInput.addEventListener('change', () => {
        const date = examDateInput.value;
        if (!date) {
            examDateError.textContent = 'Выберите дату экзамена';
            examDateInput.style.borderColor = '#dc2626';
        } else if (!isFutureDate(date)) {
            examDateError.textContent = 'Дата не может быть в прошлом';
            examDateInput.style.borderColor = '#dc2626';
        } else {
            examDateError.textContent = '';
            examDateInput.style.borderColor = '#dbe1e9';
        }
    });

    topicNameInput.addEventListener('input', () => {
        const err = validateTopicName(topicNameInput.value);
        topicNameError.textContent = err;
        topicNameInput.style.borderColor = err ? '#dc2626' : '#dbe1e9';
    });

    //Добавление экзамена
    examForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = examNameInput.value.trim();
        const date = examDateInput.value;
        const description = examDescInput.value.trim();

        const nameErr = validateExamName(name);
        let dateErr = '';
        if (!date) dateErr = 'Выберите дату экзамена';
        else if (!isFutureDate(date)) dateErr = 'Дата не может быть в прошлом';

        examNameError.textContent = nameErr;
        examDateError.textContent = dateErr;
        if (nameErr || dateErr) return;

        const newExam = {
            id: generateId(),
            name,
            date,
            description,
            topics: []
        };
        exams.push(newExam);
        saveExams();

        examForm.reset();
        examNameError.textContent = '';
        examDateError.textContent = '';
        examNameInput.style.borderColor = '#dbe1e9';
        examDateInput.style.borderColor = '#dbe1e9';

        renderExamsList();
        renderCalendar();
        renderStats();
        selectExam(newExam.id);
    });

    //Добавление темы
    topicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const topicName = topicNameInput.value.trim();
        const err = validateTopicName(topicName);
        if (err) {
            topicNameError.textContent = err;
            topicNameInput.style.borderColor = '#dc2626';
            return;
        }

        const exam = exams.find(e => e.id === selectedExamId);
        if (!exam) return;

        if (!exam.topics) exam.topics = [];
        exam.topics.push({
            id: generateId(),
            name: topicName,
            completed: false
        });

        saveExams();
        topicForm.reset();
        topicNameError.textContent = '';
        topicNameInput.style.borderColor = '#dbe1e9';

        renderExamsList();
        renderExamDetail();
        renderCalendar();
        renderStats();
    });

    //Удаление экзамена
    deleteExamBtn.addEventListener('click', () => {
        if (!selectedExamId) return;
        if (!confirm('Вы уверены, что хотите удалить этот экзамен?')) return;

        exams = exams.filter(e => e.id !== selectedExamId);
        selectedExamId = null;
        saveSelectedExam();
        saveExams();

        renderExamsList();
        renderExamDetail();
        renderCalendar();
        renderStats();
    });

    //Календарь
    function renderCalendar() {
        if (exams.length === 0) {
            calendarGrid.innerHTML = '';
            calendarEmpty.style.display = 'block';
            return;
        }
        calendarEmpty.style.display = 'none';

        const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
        calendarGrid.innerHTML = sorted.map(exam => {
            const days = daysUntil(exam.date);
            let countdown = days < 0 ? 'просрочен' : days === 0 ? 'сегодня' : `через ${days} дн.`;
            const descHtml = (exam.description && exam.description.trim())
                ? `<div class="exam-description">${escapeHtml(exam.description.trim())}</div>`
                : '';
            return `
                <div class="calendar-day">
                    <div class="date-num">${formatDate(exam.date)}</div>
                    <div class="exam-name">${escapeHtml(exam.name)}</div>
                    ${descHtml}
                    <div class="calendar-exam-badge">${countdown}</div>
                </div>
            `;
        }).join('');
    }

    //Статистика
    function renderStats() {
        statOverallProgress.textContent = calcOverallProgress() + '%';
        statExamsCount.textContent = exams.length;

        const upcoming = [...exams]
            .filter(e => daysUntil(e.date) >= 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        if (upcoming.length === 0) {
            upcomingExamsList.innerHTML = '<li class="empty-message" style="border-left-color: transparent;">Нет предстоящих экзаменов</li>';
        } else {
            upcomingExamsList.innerHTML = upcoming.map(exam => {
                const days = daysUntil(exam.date);
                return `<li><span>${escapeHtml(exam.name)}</span> <span class="text-muted">${formatDate(exam.date)} (${days} дн.)</span></li>`;
            }).join('');
        }
    }

    //Навигация
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.section;
            Object.keys(sections).forEach(id => {
                sections[id].classList.toggle('active', id === targetId);
            });
            if (targetId === 'calendarSection') renderCalendar();
            if (targetId === 'statsSection') renderStats();
        });
    });

    //Инициализация
    function init() {
        loadExams();
        const today = new Date().toISOString().split('T')[0];
        examDateInput.min = today;

        renderExamsList();
        renderExamDetail();
        renderCalendar();
        renderStats();
    }

    init();
})();