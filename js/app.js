import { programs, motivationalQuotes } from './programs.js';
import {
    loadWorkouts, saveWorkouts,
    loadWorkoutState, saveWorkoutState, clearWorkoutState,
    getFormData, setFormData, clearFormData,
    fetchWorkoutsFromCloud, saveWorkoutToCloud, deleteWorkoutFromCloud
} from './storage.js';
import { signIn, signUp, signOut, getSession, onAuthStateChange } from './auth.js';

export class TrainingApp {
    constructor() {
        this.currentProgram = null;
        this.workouts = [];
        this.workoutTimer = null;
        this.workoutStartTime = null;
        this.workoutDuration = 0;
        this.isWorkoutActive = false;
        this.workoutState = loadWorkoutState();
        this.restTimer = null;
        this.restStartTime = null;
        this.restDuration = 0;
        this.restInterval = 90;
        this.authMode = 'login';

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupPageProtection();
        this.showRandomQuote();

        const session = await getSession();
        if (session) {
            await this.loadUserData();
            this.showScreen('main-menu');
            this.checkForActiveWorkout();
        } else {
            this.showScreen('auth-screen');
        }

        onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                await this.loadUserData();
                clearWorkoutState();
                this.showScreen('main-menu');
            } else if (event === 'SIGNED_OUT') {
                this.workouts = [];
                saveWorkouts([]);
                this.showScreen('auth-screen');
            }
        });
    }

    async loadUserData() {
        try {
            this.workouts = await fetchWorkoutsFromCloud();
            saveWorkouts(this.workouts);
            this.populateExerciseSelect();
        } catch {
            this.workouts = loadWorkouts();
            this.showToast('Offline — visar cachad data', 'info');
        }
    }

    // --- Auth ---

    setAuthMode(mode) {
        this.authMode = mode;
        document.getElementById('login-tab').classList.toggle('active', mode === 'login');
        document.getElementById('signup-tab').classList.toggle('active', mode === 'signup');
        document.getElementById('auth-submit').textContent = mode === 'login' ? 'Logga in' : 'Skapa konto';
        document.getElementById('auth-error').textContent = '';
    }

    async handleAuthSubmit() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        submitBtn.disabled = true;
        errorEl.textContent = '';

        try {
            if (this.authMode === 'login') {
                await signIn(email, password);
            } else {
                await signUp(email, password);
                errorEl.textContent = 'Konto skapat! Kolla din e-post för att bekräfta.';
                errorEl.style.color = 'var(--success-color)';
            }
        } catch (e) {
            errorEl.style.color = '';
            errorEl.textContent = e.message;
        } finally {
            submitBtn.disabled = false;
        }
    }

    async handleLogout() {
        if (this.isWorkoutActive) {
            const confirm = window.confirm('Du har en aktiv träning. Vill du verkligen logga ut?');
            if (!confirm) return;
        }
        try {
            await signOut();
        } catch (e) {
            this.showToast('Kunde inte logga ut', 'error');
        }
    }

    // --- Core ---

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}min ${seconds}sec`;
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('workout-timer');
        if (timerElement) {
            timerElement.textContent = this.formatDuration(this.workoutDuration);
        }
    }

    getLastWorkout(programId) {
        const programWorkouts = this.workouts
            .filter(workout => workout.program === programId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return programWorkouts.length > 0 ? programWorkouts[0] : null;
    }

    renderLastWorkout(lastWorkout) {
        const container = document.getElementById('last-workout-container');
        if (!container) return;

        if (!lastWorkout) {
            container.innerHTML = '<p class="no-last-workout">No previous workout found for this program. Start fresh! 💪</p>';
            return;
        }

        const date = new Date(lastWorkout.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        container.innerHTML = `
            <div class="last-workout-header">
                <h3>📊 Last Workout (${date})</h3>
                <span class="last-workout-duration">⏱️ ${this.formatDuration(lastWorkout.duration)}</span>
            </div>
            <div class="last-workout-exercises">
                ${lastWorkout.exercises.map(ex => `
                    <div class="last-exercise-item">
                        <span class="last-exercise-name">${ex.name}</span>
                        <div class="last-exercise-sets">
                            ${ex.sets.map(set => `<span class="last-set-display">${set.weight}kg × ${set.reps}</span>`).join(' • ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupPageProtection() {
        window.addEventListener('beforeunload', (e) => {
            if (this.isWorkoutActive) {
                e.preventDefault();
                e.returnValue = 'Du har en aktiv träning som inte är sparad. Är du säker på att du vill lämna sidan?';
                return e.returnValue;
            }
        });
        window.history.pushState(null, null, window.location.href);
    }

    setupEventListeners() {
        document.querySelectorAll('.program-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openWorkout(e.currentTarget.dataset.program));
        });

        document.getElementById('history-btn').addEventListener('click', () => this.showScreen('history-screen'));
        document.getElementById('progress-btn').addEventListener('click', () => this.showScreen('progress-screen'));
        document.getElementById('back-to-menu').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('back-from-history').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('back-from-progress').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('save-workout').addEventListener('click', () => this.saveWorkout());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        document.getElementById('rest-interval-select').addEventListener('change', (e) => {
            this.restInterval = parseInt(e.target.value);
        });
        document.getElementById('start-rest-btn').addEventListener('click', () => this.startRestTimer());
        document.getElementById('reset-rest-btn').addEventListener('click', () => this.resetRestTimer());
        document.getElementById('skip-rest-btn').addEventListener('click', () => this.skipRest());
        document.getElementById('extend-rest-btn').addEventListener('click', () => this.extendRest());

        document.getElementById('program-filter').addEventListener('change', () => this.filterHistory());
        document.getElementById('exercise-select').addEventListener('change', () => this.updateProgressChart());

        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuthSubmit();
        });
        document.getElementById('login-tab').addEventListener('click', () => this.setAuthMode('login'));
        document.getElementById('signup-tab').addEventListener('click', () => this.setAuthMode('signup'));
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        if (screenId === 'main-menu' && this.workoutTimer) {
            if (this.isWorkoutActive) {
                const confirmExit = confirm('Du har en aktiv träning som inte är sparad. Är du säker på att du vill avsluta?');
                if (!confirmExit) {
                    this.showScreen('workout-screen');
                    return;
                }
            }
            this.stopWorkoutTimer();
            this.isWorkoutActive = false;
        }

        if (screenId === 'history-screen') this.loadHistory();
        else if (screenId === 'progress-screen') this.loadProgress();
    }

    showRandomQuote() {
        const quoteElement = document.getElementById('quote');
        if (quoteElement) {
            quoteElement.textContent = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        }
    }

    // --- Workout form ---

    renderWorkoutForm(exercises) {
        const container = document.getElementById('exercises-container');
        container.innerHTML = '';

        exercises.forEach(exercise => {
            const exerciseEntry = document.createElement('div');
            exerciseEntry.className = 'exercise-entry';
            exerciseEntry.innerHTML = `
                <div class="exercise-name">${exercise}</div>
                <div class="sets-container" id="sets-${exercise.replace(/\s+/g, '-')}">
                    <div class="set-row set-header">
                        <div class="set-number">Set</div>
                        <div class="set-weight">Weight (kg)</div>
                        <div class="set-reps">Reps</div>
                        <div class="set-actions"></div>
                    </div>
                    <div class="sets-list" id="sets-list-${exercise.replace(/\s+/g, '-')}"></div>
                </div>
                <div class="exercise-actions">
                    <button class="btn btn-secondary add-set-btn" onclick="app.addSet('${exercise.replace(/\s+/g, '-')}')">
                        ➕ Add Set
                    </button>
                </div>
            `;
            container.appendChild(exerciseEntry);
            this.addSet(exercise.replace(/\s+/g, '-'));
        });

        this.addFormDataListeners();
    }

    addSet(exerciseId) {
        const setsList = document.getElementById(`sets-list-${exerciseId}`);
        const setNumber = setsList.children.length + 1;

        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <div class="set-number">${setNumber}</div>
            <div class="set-weight">
                <input type="number" class="weight-input" placeholder="0" min="0" step="0.5"
                    data-exercise="${exerciseId}" data-set="${setNumber}" data-field="weight">
            </div>
            <div class="set-reps">
                <input type="number" class="reps-input" placeholder="0" min="0"
                    data-exercise="${exerciseId}" data-set="${setNumber}" data-field="reps">
            </div>
            <div class="set-actions">
                <button class="btn-remove-set" onclick="app.removeSet(this, '${exerciseId}')" title="Remove set">✕</button>
            </div>
        `;

        setsList.appendChild(setRow);
        this.updateSetNumbers(exerciseId);
    }

    removeSet(button, exerciseId) {
        button.closest('.set-row').remove();
        this.updateSetNumbers(exerciseId);
    }

    updateSetNumbers(exerciseId) {
        const setsList = document.getElementById(`sets-list-${exerciseId}`);
        setsList.querySelectorAll('.set-row').forEach((row, index) => {
            const setNumber = index + 1;
            row.querySelector('.set-number').textContent = setNumber;
            const weightInput = row.querySelector('.weight-input');
            const repsInput = row.querySelector('.reps-input');
            if (weightInput) weightInput.dataset.set = setNumber;
            if (repsInput) repsInput.dataset.set = setNumber;
        });
    }

    // --- History ---

    loadHistory() {
        const container = document.getElementById('history-list');
        container.innerHTML = '';

        if (this.workouts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No workouts yet. Start training! 💪</p>';
            return;
        }

        const sortedWorkouts = [...this.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedWorkouts.forEach((workout) => {
            const workoutCard = document.createElement('div');
            workoutCard.className = 'workout-card';

            const date = new Date(workout.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            workoutCard.innerHTML = `
                <div class="workout-header">
                    <span class="workout-program">${workout.programName}</span>
                    <div class="workout-actions">
                        <span class="workout-date">${date}</span>
                        <button class="btn-delete-workout" onclick="app.deleteWorkout('${workout.id}')" title="Delete workout">🗑️</button>
                    </div>
                </div>
                <div class="workout-duration">
                    <span class="duration-label">⏱️ Total time workout:</span>
                    <span class="duration-value">${workout.duration ? this.formatDuration(workout.duration) : 'N/A'}</span>
                </div>
                <div class="exercise-list">
                    ${workout.exercises.map(ex => `
                        <div class="exercise-item">
                            <span class="exercise-item-name">${ex.name}</span>
                            <div class="exercise-sets">
                                ${ex.sets.map((set, i) => `
                                    <span class="set-display">${set.weight}kg × ${set.reps}${i < ex.sets.length - 1 ? ', ' : ''}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            container.appendChild(workoutCard);
        });
    }

    async deleteWorkout(workoutId) {
        if (!confirm('Are you sure you want to delete this workout? This action cannot be undone.')) return;

        try {
            await deleteWorkoutFromCloud(workoutId);
        } catch {
            this.showToast('Kunde inte radera från molnet', 'error');
            return;
        }

        this.workouts = this.workouts.filter(w => w.id !== workoutId);
        saveWorkouts(this.workouts);
        this.loadHistory();
        this.showToast('Workout deleted successfully! 🗑️', 'success');
    }

    filterHistory() {
        const filter = document.getElementById('program-filter').value;
        document.querySelectorAll('.workout-card').forEach(card => {
            const programName = card.querySelector('.workout-program').textContent;
            const shouldShow = !filter || programs[filter]?.name === programName;
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }

    // --- Progress ---

    loadProgress() {
        this.populateExerciseSelect();
        this.updateProgressChart();
    }

    populateExerciseSelect() {
        const select = document.getElementById('exercise-select');
        const exercises = new Set();
        this.workouts.forEach(workout => workout.exercises.forEach(ex => exercises.add(ex.name)));

        select.innerHTML = '<option value="">Select Exercise</option>';
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            select.appendChild(option);
        });
    }

    updateProgressChart() {
        const exerciseName = document.getElementById('exercise-select').value;
        const chartContainer = document.getElementById('progress-chart');

        if (!exerciseName) {
            chartContainer.innerHTML = `
                <div class="progress-placeholder">
                    <div class="placeholder-icon">📈</div>
                    <h3>Select an Exercise</h3>
                    <p>Choose an exercise from the dropdown above to view your progress</p>
                </div>
            `;
            return;
        }

        const exerciseData = this.workouts
            .filter(workout => workout.exercises.some(ex => ex.name === exerciseName))
            .map(workout => ({
                date: new Date(workout.date),
                sets: workout.exercises.find(ex => ex.name === exerciseName).sets
            }))
            .sort((a, b) => a.date - b.date);

        if (exerciseData.length === 0) {
            chartContainer.innerHTML = `
                <div class="progress-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <h3>No Data Yet</h3>
                    <p>Start tracking this exercise to see your progress!</p>
                </div>
            `;
            return;
        }

        let bestWeight = 0;
        exerciseData.forEach(workout => {
            workout.sets.forEach(set => {
                const weight = parseFloat(set.weight);
                if (weight > bestWeight) bestWeight = weight;
            });
        });

        const firstWorkout = exerciseData[0];
        const lastWorkout = exerciseData[exerciseData.length - 1];
        const improvement = bestWeight - Math.max(...firstWorkout.sets.map(set => parseFloat(set.weight)));

        chartContainer.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <h3 class="exercise-title">${exerciseName}</h3>
                    <div class="progress-stats">
                        <div class="stat-item">
                            <span class="stat-label">Workouts</span>
                            <span class="stat-value">${exerciseData.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Best Weight</span>
                            <span class="stat-value">${bestWeight}kg</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Improvement</span>
                            <span class="stat-value ${improvement > 0 ? 'positive' : 'neutral'}">${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}kg</span>
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-bars">
                        ${exerciseData.map((workout, index) => {
                            const maxWeight = Math.max(...workout.sets.map(set => parseFloat(set.weight)));
                            const height = bestWeight > 0 ? (maxWeight / bestWeight) * 100 : 0;
                            const dateStr = workout.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const setsInfo = workout.sets.map(set => `${set.weight}kg × ${set.reps}`).join(', ');
                            return `
                                <div class="chart-bar-container" data-workout="${index}">
                                    <div class="chart-bar" style="height: ${height}%">
                                        <div class="bar-value">${maxWeight}kg</div>
                                    </div>
                                    <div class="bar-date">${dateStr}</div>
                                    <div class="bar-details"><div class="bar-sets">${setsInfo}</div></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="progress-summary">
                    <div class="summary-item">
                        <span class="summary-label">First Workout:</span>
                        <span class="summary-value">${firstWorkout.date.toLocaleDateString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Last Workout:</span>
                        <span class="summary-value">${lastWorkout.date.toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;

        this.addProgressChartInteractions();
    }

    addProgressChartInteractions() {
        document.querySelectorAll('.chart-bar-container').forEach(container => {
            container.addEventListener('click', () => {
                const details = container.querySelector('.bar-details');
                const isVisible = details.style.display === 'block';
                document.querySelectorAll('.bar-details').forEach(d => d.style.display = 'none');
                document.querySelectorAll('.chart-bar-container').forEach(c => c.classList.remove('active'));
                if (!isVisible) {
                    details.style.display = 'block';
                    container.classList.add('active');
                }
            });
            container.addEventListener('touchstart', () => container.classList.add('touching'));
            container.addEventListener('touchend', () => container.classList.remove('touching'));
        });
    }

    // --- Rest Timer ---

    initializeRestTimer() {
        const container = document.getElementById('rest-timer-container');
        container.style.display = 'block';
        container.classList.remove('active', 'completed');

        const timeElement = document.getElementById('rest-timer-time');
        const progressElement = document.getElementById('rest-timer-progress');

        if (timeElement && progressElement) {
            const minutes = Math.floor(this.restInterval / 60);
            const seconds = this.restInterval % 60;
            timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            progressElement.style.background = `conic-gradient(transparent 0deg, transparent 0deg)`;
        }

        this.updateRestTimerButtons('ready');
    }

    updateRestTimerButtons(state) {
        const startBtn = document.getElementById('start-rest-btn');
        const resetBtn = document.getElementById('reset-rest-btn');
        const skipBtn = document.getElementById('skip-rest-btn');
        const extendBtn = document.getElementById('extend-rest-btn');

        if (state === 'ready') {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (resetBtn) resetBtn.style.display = 'inline-block';
            if (skipBtn) skipBtn.style.display = 'none';
            if (extendBtn) extendBtn.style.display = 'none';
        } else if (state === 'running') {
            if (startBtn) startBtn.style.display = 'none';
            if (resetBtn) resetBtn.style.display = 'inline-block';
            if (skipBtn) skipBtn.style.display = 'inline-block';
            if (extendBtn) extendBtn.style.display = 'inline-block';
        } else if (state === 'completed') {
            if (startBtn) startBtn.style.display = 'none';
            if (resetBtn) resetBtn.style.display = 'none';
            if (skipBtn) skipBtn.style.display = 'none';
            if (extendBtn) extendBtn.style.display = 'none';
        }
    }

    startRestTimer() {
        if (this.restTimer) this.stopRestTimer();

        this.restStartTime = Date.now();
        this.restDuration = 0;

        const container = document.getElementById('rest-timer-container');
        container.style.display = 'block';
        container.classList.add('active');
        container.classList.remove('completed');

        this.updateRestTimerButtons('running');

        this.restTimer = setInterval(() => {
            this.restDuration = Date.now() - this.restStartTime;
            this.updateRestTimerDisplay();
            if (this.restDuration >= this.restInterval * 1000) this.completeRest();
        }, 100);

        this.updateRestTimerDisplay();
    }

    stopRestTimer() {
        if (this.restTimer) {
            clearInterval(this.restTimer);
            this.restTimer = null;
        }
    }

    updateRestTimerDisplay() {
        const timeElement = document.getElementById('rest-timer-time');
        const progressElement = document.getElementById('rest-timer-progress');
        if (!timeElement || !progressElement) return;

        const remaining = Math.max(0, this.restInterval - Math.floor(this.restDuration / 1000));
        timeElement.textContent = `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;

        const progress = (this.restDuration / (this.restInterval * 1000)) * 100;
        const degrees = Math.min(progress * 3.6, 360);
        const color = progress >= 0.8 ? 'var(--success-color)' : progress >= 0.6 ? 'var(--accent-color)' : 'var(--primary-color)';
        progressElement.style.background = `conic-gradient(${color} ${degrees}deg, transparent ${degrees}deg)`;
    }

    completeRest() {
        this.stopRestTimer();
        const container = document.getElementById('rest-timer-container');
        container.classList.remove('active');
        container.classList.add('completed');
        this.updateRestTimerButtons('completed');
        this.showToast('Rest complete! Ready for next set 💪', 'success');
        setTimeout(() => {
            container.classList.remove('completed');
            this.initializeRestTimer();
        }, 3000);
    }

    resetRestTimer() {
        this.stopRestTimer();
        const timeElement = document.getElementById('rest-timer-time');
        const progressElement = document.getElementById('rest-timer-progress');
        if (timeElement && progressElement) {
            const minutes = Math.floor(this.restInterval / 60);
            const seconds = this.restInterval % 60;
            timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            progressElement.style.background = `conic-gradient(transparent 0deg, transparent 0deg)`;
        }
        this.updateRestTimerButtons('ready');
        this.showToast('Rest timer reset', 'info');
    }

    skipRest() {
        this.stopRestTimer();
        document.getElementById('rest-timer-container').classList.remove('active', 'completed');
        this.initializeRestTimer();
    }

    extendRest() {
        this.restInterval += 30;
        document.getElementById('rest-interval-select').value = this.restInterval;
        this.updateRestTimerDisplay();
        this.showToast('Rest extended by 30 seconds', 'info');
    }

    // --- Form data persistence ---

    addFormDataListeners() {
        document.querySelectorAll('.weight-input, .reps-input').forEach(input => {
            input.addEventListener('input', () => this.saveFormData());
        });
    }

    saveFormData() {
        if (!this.isWorkoutActive || !this.currentProgram) return;

        const formData = { program: this.currentProgram, exercises: {} };
        const program = programs[this.currentProgram];

        program.exercises.forEach(exercise => {
            const exerciseId = exercise.replace(/\s+/g, '-');
            const setsContainer = document.getElementById(`sets-${exerciseId}`);
            if (!setsContainer) return;

            formData.exercises[exerciseId] = [];
            setsContainer.querySelector('.sets-list').querySelectorAll('.set-row').forEach(setRow => {
                const weightInput = setRow.querySelector('.weight-input');
                const repsInput = setRow.querySelector('.reps-input');
                if (weightInput && repsInput) {
                    formData.exercises[exerciseId].push({ weight: weightInput.value, reps: repsInput.value });
                }
            });
        });

        setFormData(formData);
    }

    loadFormData() {
        if (!this.isWorkoutActive || !this.currentProgram) return;

        const formData = getFormData();
        if (!formData || formData.program !== this.currentProgram) return;

        Object.keys(formData.exercises).forEach(exerciseId => {
            const setsList = document.getElementById(`sets-list-${exerciseId}`);
            if (!setsList) return;

            setsList.innerHTML = '';
            formData.exercises[exerciseId].forEach((setData, index) => {
                const setNumber = index + 1;
                const setRow = document.createElement('div');
                setRow.className = 'set-row';
                setRow.innerHTML = `
                    <div class="set-number">${setNumber}</div>
                    <div class="set-weight">
                        <input type="number" class="weight-input" placeholder="0" min="0" step="0.5"
                            data-exercise="${exerciseId}" data-set="${setNumber}" data-field="weight" value="${setData.weight}">
                    </div>
                    <div class="set-reps">
                        <input type="number" class="reps-input" placeholder="0" min="0"
                            data-exercise="${exerciseId}" data-set="${setNumber}" data-field="reps" value="${setData.reps}">
                    </div>
                    <div class="set-actions">
                        <button class="btn-remove-set" onclick="app.removeSet(this, '${exerciseId}')" title="Remove set">✕</button>
                    </div>
                `;
                setsList.appendChild(setRow);
            });
        });

        this.addFormDataListeners();
    }

    // --- Workout state persistence ---

    checkForActiveWorkout() {
        if (this.workoutState && this.workoutState.isActive) {
            const stateAge = Date.now() - this.workoutState.timestamp;
            if (stateAge < 24 * 60 * 60 * 1000) {
                const confirmRestore = confirm(
                    `You have an active workout session from ${new Date(this.workoutState.timestamp).toLocaleTimeString()}. ` +
                    `Would you like to continue where you left off?`
                );
                if (confirmRestore) this.restoreWorkoutState();
                else clearWorkoutState();
            } else {
                clearWorkoutState();
            }
        }
    }

    restoreWorkoutState() {
        if (!this.workoutState) return;

        this.currentProgram = this.workoutState.program;
        this.isWorkoutActive = true;
        this.workoutStartTime = this.workoutState.startTime;
        this.workoutDuration = this.workoutState.duration + (Date.now() - this.workoutState.timestamp);

        const program = programs[this.currentProgram];
        document.getElementById('workout-title').textContent = program.name;
        this.renderWorkoutForm(program.exercises);
        this.initializeRestTimer();
        setTimeout(() => this.loadFormData(), 100);
        this.renderLastWorkout(this.getLastWorkout(this.currentProgram));
        this.showScreen('workout-screen');
        this.startWorkoutTimer();
        this.showToast('Workout session restored! 💪', 'success');
    }

    // --- Workout timer ---

    startWorkoutTimer() {
        if (this.workoutTimer) this.stopWorkoutTimer();

        if (!this.workoutStartTime) {
            this.workoutStartTime = Date.now();
            this.workoutDuration = 0;
        }

        this.workoutTimer = setInterval(() => {
            this.workoutDuration = Date.now() - this.workoutStartTime;
            this.updateTimerDisplay();
            if (this.isWorkoutActive && this.currentProgram) {
                saveWorkoutState({
                    program: this.currentProgram,
                    startTime: this.workoutStartTime,
                    duration: this.workoutDuration,
                    isActive: this.isWorkoutActive,
                    timestamp: Date.now()
                });
            }
        }, 1000);

        this.updateTimerDisplay();
    }

    stopWorkoutTimer() {
        if (this.workoutTimer) {
            clearInterval(this.workoutTimer);
            this.workoutTimer = null;
        }
        if (this.workoutStartTime) {
            this.workoutDuration = Date.now() - this.workoutStartTime;
        }
    }

    // --- Open / Save workout ---

    openWorkout(programId) {
        this.currentProgram = programId;
        this.isWorkoutActive = true;
        this.workoutStartTime = null;
        this.workoutDuration = 0;

        this.stopRestTimer();
        this.initializeRestTimer();

        const program = programs[programId];
        document.getElementById('workout-title').textContent = program.name;
        this.renderWorkoutForm(program.exercises);
        this.renderLastWorkout(this.getLastWorkout(programId));
        this.showScreen('workout-screen');
        this.startWorkoutTimer();

        saveWorkoutState({
            program: this.currentProgram,
            startTime: this.workoutStartTime,
            duration: this.workoutDuration,
            isActive: this.isWorkoutActive,
            timestamp: Date.now()
        });
    }

    async saveWorkout() {
        if (!this.currentProgram) return;

        const confirmSave = confirm('Är du säker på att du vill spara och avsluta denna träning?');
        if (!confirmSave) return;

        this.stopWorkoutTimer();
        this.stopRestTimer();
        this.isWorkoutActive = false;

        const program = programs[this.currentProgram];
        const workoutData = {
            program: this.currentProgram,
            programName: program.name,
            date: new Date().toISOString(),
            duration: this.workoutDuration,
            exercises: []
        };

        program.exercises.forEach(exercise => {
            const exerciseId = exercise.replace(/\s+/g, '-');
            const setsContainer = document.getElementById(`sets-${exerciseId}`);
            const setRows = setsContainer.querySelector('.sets-list').querySelectorAll('.set-row');
            const exerciseData = { name: exercise, sets: [] };

            setRows.forEach(setRow => {
                const weightInput = setRow.querySelector('.weight-input');
                const repsInput = setRow.querySelector('.reps-input');
                if (weightInput && repsInput) {
                    const weight = weightInput.value;
                    const reps = repsInput.value;
                    if (weight || reps) {
                        exerciseData.sets.push({ weight: weight || '0', reps: reps || '0' });
                    }
                }
            });

            if (exerciseData.sets.length > 0) workoutData.exercises.push(exerciseData);
        });

        try {
            const id = await saveWorkoutToCloud(workoutData);
            workoutData.id = id;
            this.showToast('Workout saved! 💪', 'success');
        } catch {
            this.showToast('Sparad lokalt — ingen internetanslutning', 'info');
        }

        this.workouts.unshift(workoutData);
        saveWorkouts(this.workouts);
        clearWorkoutState();
        clearFormData();

        setTimeout(() => this.showScreen('main-menu'), 1500);
    }

    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}
