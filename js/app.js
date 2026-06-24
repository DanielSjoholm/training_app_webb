import { programs, motivationalQuotes } from './programs.js';
import { exercisesForProgram } from './exercises.js';
import {
    loadWorkouts, saveWorkouts,
    loadWorkoutState, saveWorkoutState, clearWorkoutState,
    getFormData, setFormData, clearFormData,
    fetchWorkoutsFromCloud, saveWorkoutToCloud, deleteWorkoutFromCloud,
    fetchProfile, saveProfile, fetchWeightLogs, addWeightLog, uploadAvatar,
    saveProgramExercises
} from './storage.js';
import { signIn, signUp, signOut, getSession, onAuthStateChange, getUser, updatePassword, deleteAccount } from './auth.js';
import { searchUserByEmail, sendFriendRequest, fetchFriendsWithProfiles, acceptFriendRequest, declineOrRemoveFriend, fetchFriendWorkouts } from './friends.js';

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
        this.profile = null;
        this.user = null;
        this.workoutExercises = [];

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
                // Fires on real login AND on resume/token refresh. Ignore the latter
                // so we don't wipe an in-progress workout when returning to the app.
                if (this.user && session?.user?.id === this.user.id) return;
                await this.loadUserData();
                clearWorkoutState();
                this.showScreen('main-menu');
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                this.workouts = [];
                saveWorkouts([]);
                this.showScreen('auth-screen');
            }
        });
    }

    async loadUserData() {
        try {
            this.user = await getUser();
        } catch {
            this.user = null;
        }
        try {
            this.profile = await fetchProfile();
        } catch {
            this.profile = null;
        }
        this.renderAvatars();
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
        document.getElementById('auth-submit').textContent = mode === 'login' ? 'Log in' : 'Sign up';
        document.getElementById('name-field').hidden = mode !== 'signup';
        document.getElementById('auth-error').textContent = '';
    }

    async handleAuthSubmit() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const displayName = document.getElementById('auth-name').value.trim();
        const errorEl = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        if (this.authMode === 'signup' && !displayName) {
            errorEl.style.color = '';
            errorEl.textContent = 'Please enter a display name.';
            return;
        }

        submitBtn.disabled = true;
        errorEl.textContent = '';

        try {
            if (this.authMode === 'login') {
                await signIn(email, password);
            } else {
                await signUp(email, password, displayName);
                errorEl.textContent = 'Account created. Check your email to confirm if required.';
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
            const ok = await this.showConfirm({
                title: 'Log out?',
                message: 'You have an active workout. Are you sure you want to log out?',
                confirmText: 'Log out',
                cancelText: 'Cancel',
                danger: true
            });
            if (!ok) return;
        }
        try {
            await signOut();
        } catch (e) {
            this.showToast('Could not log out', 'error');
        }
    }

    // --- Account menu ---

    toggleAccountMenu() {
        const dropdown = document.getElementById('account-dropdown');
        const isOpen = !dropdown.hidden;
        dropdown.hidden = isOpen;
        document.getElementById('avatar-btn').setAttribute('aria-expanded', String(!isOpen));
    }

    closeAccountMenu() {
        const dropdown = document.getElementById('account-dropdown');
        if (!dropdown.hidden) {
            dropdown.hidden = true;
            document.getElementById('avatar-btn').setAttribute('aria-expanded', 'false');
        }
    }

    // --- Profile ---

    displayName() {
        return this.profile?.name || this.user?.user_metadata?.display_name || 'Athlete';
    }

    async openProfile() {
        this.showScreen('profile-screen');
        try {
            this.profile = await fetchProfile();
        } catch {
            this.showToast('Could not load profile', 'error');
        }
        this.renderProfile();
        this.renderAvatars();
        this.loadWeightChart();
    }

    renderAvatars() {
        const url = this.profile?.avatar_url;
        const show = (el) => el.removeAttribute('hidden');
        const hide = (el) => el.setAttribute('hidden', '');
        const pairs = [
            ['header-avatar-img', 'header-avatar-default'],
            ['profile-avatar-img', 'profile-avatar-default']
        ];
        pairs.forEach(([imgId, defId]) => {
            const img = document.getElementById(imgId);
            const def = document.getElementById(defId);
            if (!img || !def) return;
            if (url) {
                img.src = url + '?t=' + (this.profile.updated_at ? Date.parse(this.profile.updated_at) : Date.now());
                show(img);
                hide(def);
            } else {
                hide(img);
                show(def);
            }
        });
    }

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.showToast('Please choose an image file', 'error');
            return;
        }

        const blob = await this.openCropper(file);
        if (!blob) return;

        this.showToast('Uploading…', 'info');
        try {
            const url = await uploadAvatar(blob);
            await saveProfile({ ...this.profile, avatar_url: url });
            this.profile = { ...this.profile, avatar_url: url, updated_at: new Date().toISOString() };
            this.renderAvatars();
            this.showToast('Photo updated', 'success');
        } catch {
            this.showToast('Could not upload photo', 'error');
        }
    }

    async openCropper(file) {
        const { default: Cropper } = await import('https://esm.sh/cropperjs@1.6.2');
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay visible';
            overlay.innerHTML = `
                <div class="modal crop-modal">
                    <h3 class="modal-title">Crop photo</h3>
                    <div class="crop-area">
                        <img id="crop-image" src="${url}" alt="">
                    </div>
                    <div class="modal-actions">
                        <button class="btn modal-cancel">Cancel</button>
                        <button class="btn btn-primary crop-save">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const image = overlay.querySelector('#crop-image');
            const cropper = new Cropper(image, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                background: false,
                guides: false
            });

            const cleanup = (result) => {
                cropper.destroy();
                overlay.remove();
                URL.revokeObjectURL(url);
                resolve(result);
            };

            overlay.querySelector('.modal-cancel').addEventListener('click', () => cleanup(null));
            overlay.querySelector('.crop-save').addEventListener('click', () => {
                cropper.getCroppedCanvas({ width: 512, height: 512 })
                    .toBlob((blob) => cleanup(blob), 'image/jpeg', 0.9);
            });
        });
    }

    renderProfile() {
        const p = this.profile || {};
        document.getElementById('profile-hero-name').textContent = this.displayName();
        document.getElementById('profile-hero-email').textContent = this.user?.email || '';
        document.getElementById('profile-name').value = p.name || this.user?.user_metadata?.display_name || '';
        document.getElementById('profile-birthdate').value = p.birthdate || '';
        document.getElementById('profile-gender').value = p.gender || '';
        document.getElementById('profile-height').value = p.height ?? '';
        document.getElementById('profile-weight').value = p.current_weight ?? '';
        document.getElementById('profile-goal-weight').value = p.goal_weight ?? '';
        document.getElementById('profile-weekly-goal').value = p.weekly_goal ?? '';
    }

    async saveProfileForm() {
        const num = (id) => {
            const v = document.getElementById(id).value;
            return v === '' ? null : parseFloat(v);
        };
        const profile = {
            name: document.getElementById('profile-name').value.trim() || null,
            birthdate: document.getElementById('profile-birthdate').value || null,
            gender: document.getElementById('profile-gender').value || null,
            height: num('profile-height'),
            current_weight: num('profile-weight'),
            goal_weight: num('profile-goal-weight'),
            weekly_goal: num('profile-weekly-goal')
        };

        try {
            await saveProfile(profile);
            this.profile = { ...this.profile, ...profile };
            document.getElementById('profile-hero-name').textContent = this.displayName();
            this.showToast('Profile saved', 'success');
        } catch {
            this.showToast('Could not save profile', 'error');
        }
    }

    async logWeight() {
        const input = document.getElementById('weight-log-value');
        const weight = parseFloat(input.value);
        if (!weight || weight <= 0) {
            this.showToast('Enter a valid weight', 'error');
            return;
        }

        try {
            await addWeightLog(weight);
            await saveProfile({ ...this.profile, current_weight: weight });
            this.profile = { ...this.profile, current_weight: weight };
            document.getElementById('profile-weight').value = weight;
            input.value = '';
            this.showToast('Weight logged', 'success');
            this.loadWeightChart();
        } catch {
            this.showToast('Could not log weight', 'error');
        }
    }

    async loadWeightChart() {
        const container = document.getElementById('weight-chart');
        let logs = [];
        try {
            logs = await fetchWeightLogs();
        } catch {
            container.innerHTML = '<p class="no-last-workout">Could not load weight history.</p>';
            return;
        }

        if (logs.length === 0) {
            container.innerHTML = '<p class="no-last-workout">No weight logged yet.</p>';
            return;
        }

        const weights = logs.map(l => parseFloat(l.weight));
        const max = Math.max(...weights);
        const min = Math.min(...weights);
        const range = max - min || 1;

        container.innerHTML = `
            <div class="chart-container">
                <div class="chart-bars">
                    ${logs.map(log => {
                        const w = parseFloat(log.weight);
                        const height = 20 + ((w - min) / range) * 80;
                        const dateStr = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return `
                            <div class="chart-bar-container">
                                <div class="chart-bar" style="height: ${height}%">
                                    <div class="bar-value">${w}kg</div>
                                </div>
                                <div class="bar-date">${dateStr}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // --- Settings ---

    openSettings() {
        this.showScreen('settings-screen');
        this.syncThemeToggle();
        document.getElementById('password-message').textContent = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    currentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    syncThemeToggle() {
        const theme = this.currentTheme();
        document.querySelectorAll('#theme-toggle .theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('training-theme', theme);
        this.syncThemeToggle();
    }

    async changePassword() {
        const password = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        const message = document.getElementById('password-message');

        if (password.length < 6) {
            message.style.color = '';
            message.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (password !== confirm) {
            message.style.color = '';
            message.textContent = 'Passwords do not match.';
            return;
        }

        try {
            await updatePassword(password);
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            message.textContent = '';
            this.showToast('Password updated', 'success');
        } catch (e) {
            message.style.color = '';
            message.textContent = e.message;
        }
    }

    async deleteAccountFlow() {
        const ok = await this.showConfirm({
            title: 'Delete account?',
            message: 'This permanently deletes your account and all your data. This cannot be undone.',
            confirmText: 'Delete account',
            cancelText: 'Cancel',
            danger: true
        });
        if (!ok) return;

        try {
            await deleteAccount();
            this.showToast('Account deleted', 'success');
        } catch {
            this.showToast('Could not delete account', 'error');
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
            container.innerHTML = '<p class="no-last-workout">No previous workout found for this program. Start fresh.</p>';
            return;
        }

        const date = new Date(lastWorkout.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        container.innerHTML = `
            <div class="last-workout-header">
                <h3>Last Workout · ${date}</h3>
                <span class="last-workout-duration">${this.formatDuration(lastWorkout.duration)}</span>
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
        document.getElementById('back-from-friends').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('friend-search-btn').addEventListener('click', () => this.searchFriend());
        document.getElementById('friend-search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.searchFriend();
        });
        document.getElementById('back-to-menu').addEventListener('click', () => this.exitWorkout());
        document.getElementById('back-from-history').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('back-from-progress').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('save-workout').addEventListener('click', () => this.saveWorkout());

        // Account dropdown menu
        document.getElementById('avatar-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAccountMenu();
        });
        document.getElementById('menu-profile').addEventListener('click', () => {
            this.closeAccountMenu();
            this.openProfile();
        });
        document.getElementById('menu-friends').addEventListener('click', () => {
            this.closeAccountMenu();
            this.showScreen('friends-screen');
        });
        document.getElementById('menu-settings').addEventListener('click', () => {
            this.closeAccountMenu();
            this.openSettings();
        });
        document.getElementById('menu-logout').addEventListener('click', () => {
            this.closeAccountMenu();
            this.handleLogout();
        });
        document.addEventListener('click', () => this.closeAccountMenu());

        // Profile
        document.getElementById('back-from-profile-page').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfileForm();
        });
        document.getElementById('add-weight-log').addEventListener('click', () => this.logWeight());
        document.getElementById('avatar-upload-btn').addEventListener('click', () => {
            document.getElementById('avatar-file').click();
        });
        document.getElementById('avatar-file').addEventListener('change', (e) => this.handleAvatarUpload(e));

        // Settings
        document.getElementById('back-from-settings').addEventListener('click', () => this.showScreen('main-menu'));
        document.querySelectorAll('#theme-toggle .theme-option').forEach(btn => {
            btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
        });
        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });
        document.getElementById('delete-account-btn').addEventListener('click', () => this.deleteAccountFlow());

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

        if (screenId === 'history-screen') this.loadHistory();
        else if (screenId === 'progress-screen') this.loadProgress();
        else if (screenId === 'friends-screen') this.loadFriendsScreen();
    }

    async exitWorkout() {
        if (this.isWorkoutActive) {
            const ok = await this.showConfirm({
                title: 'Leave workout?',
                message: 'You have an active workout that hasn\'t been saved. Are you sure you want to leave?',
                confirmText: 'Leave',
                cancelText: 'Stay',
                danger: true
            });
            if (!ok) return;
        }
        this.stopWorkoutTimer();
        this.isWorkoutActive = false;
        this.showScreen('main-menu');
    }

    showRandomQuote() {
        const quoteElement = document.getElementById('quote');
        if (quoteElement) {
            quoteElement.textContent = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        }
    }

    // --- Workout form ---

    // Safe DOM id from an exercise name (handles spaces, slashes, parentheses).
    exId(name) {
        return name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    renderWorkoutForm(exercises) {
        this.workoutExercises = [...exercises];
        const container = document.getElementById('exercises-container');
        container.innerHTML = '';

        this.workoutExercises.forEach(exercise => {
            container.appendChild(this.buildExerciseCard(exercise));
            this.addSet(this.exId(exercise));
        });

        container.appendChild(this.buildAddExerciseButton());
        this.addFormDataListeners();
    }

    buildExerciseCard(exercise) {
        const id = this.exId(exercise);
        const entry = document.createElement('div');
        entry.className = 'exercise-entry';
        entry.dataset.exercise = exercise;
        entry.innerHTML = `
            <div class="exercise-header">
                <div class="exercise-name">${this.escapeHtml(exercise)}</div>
                <button class="remove-exercise-btn" title="Remove exercise" aria-label="Remove exercise">✕</button>
            </div>
            <div class="sets-container" id="sets-${id}">
                <div class="set-row set-header">
                    <div class="set-number">Set</div>
                    <div class="set-weight">Weight (kg)</div>
                    <div class="set-reps">Reps</div>
                    <div class="set-actions"></div>
                </div>
                <div class="sets-list" id="sets-list-${id}"></div>
            </div>
            <div class="exercise-actions">
                <button class="btn btn-secondary add-set-btn" onclick="app.addSet('${id}')">+ Add Set</button>
            </div>
        `;
        entry.querySelector('.remove-exercise-btn').addEventListener('click', () => this.removeExercise(exercise));
        return entry;
    }

    buildAddExerciseButton() {
        const wrap = document.createElement('div');
        wrap.className = 'add-exercise-wrap';
        wrap.innerHTML = '<button class="add-exercise-btn" id="add-exercise-btn">+ Add exercise</button>';
        wrap.querySelector('#add-exercise-btn').addEventListener('click', () => this.openExercisePicker());
        return wrap;
    }

    async removeExercise(exercise) {
        if (this.workoutExercises.length <= 1) {
            this.showToast('A workout needs at least one exercise', 'info');
            return;
        }
        this.workoutExercises = this.workoutExercises.filter(e => e !== exercise);
        const card = document.querySelector(`.exercise-entry[data-exercise="${this.cssEscape(exercise)}"]`);
        if (card) card.remove();
        this.saveFormData();
        this.persistProgramExercises();
    }

    cssEscape(value) {
        return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
    }

    addExerciseToWorkout(exercise) {
        if (this.workoutExercises.includes(exercise)) {
            this.showToast('Already in this workout', 'info');
            return;
        }
        this.workoutExercises.push(exercise);
        const addWrap = document.querySelector('.add-exercise-wrap');
        const card = this.buildExerciseCard(exercise);
        document.getElementById('exercises-container').insertBefore(card, addWrap);
        this.addSet(this.exId(exercise));
        this.addFormDataListeners();
        this.saveFormData();
        this.persistProgramExercises();
    }

    async persistProgramExercises() {
        if (!this.currentProgram) return;
        const map = { ...(this.profile?.program_exercises || {}) };
        map[this.currentProgram] = [...this.workoutExercises];
        this.profile = { ...(this.profile || {}), program_exercises: map };
        try {
            await saveProgramExercises(map);
        } catch {
            /* offline — kept in localStorage-backed profile object for this session */
        }
    }

    openExercisePicker() {
        const candidates = exercisesForProgram(this.currentProgram)
            .filter(ex => !this.workoutExercises.includes(ex.name));

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal picker-modal" role="dialog" aria-modal="true">
                <h3 class="modal-title">Add exercise</h3>
                <div class="picker-list">
                    ${candidates.length
                        ? candidates.map(ex => `
                            <button class="picker-item" data-name="${this.escapeHtml(ex.name)}"${ex.variants ? ` data-variants="${this.escapeHtml(ex.variants.join('|'))}"` : ''}>
                                <span>${this.escapeHtml(ex.name)}</span>
                                ${ex.variants ? '<span class="picker-chevron">›</span>' : ''}
                            </button>
                        `).join('')
                        : '<p class="picker-empty">No more exercises for this muscle group.</p>'}
                </div>
                <div class="modal-actions">
                    <button class="btn modal-cancel">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const close = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.querySelector('.modal-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelectorAll('.picker-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const variants = btn.dataset.variants ? btn.dataset.variants.split('|') : null;
                if (variants) {
                    this.showVariantStep(overlay, name, variants, close);
                } else {
                    this.addExerciseToWorkout(name);
                    close();
                }
            });
        });
    }

    showVariantStep(overlay, name, variants, close) {
        const modal = overlay.querySelector('.modal');
        modal.querySelector('.modal-title').textContent = name;
        modal.querySelector('.picker-list').innerHTML = variants.map(v => `
            <button class="picker-item picker-variant" data-variant="${this.escapeHtml(v)}">
                <span>${this.escapeHtml(v)}</span>
            </button>
        `).join('');
        modal.querySelectorAll('.picker-variant').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addExerciseToWorkout(`${name} (${btn.dataset.variant})`);
                close();
            });
        });
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
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No workouts yet. Start training.</p>';
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
                        <button class="btn-delete-workout" onclick="app.deleteWorkout('${workout.id}')" title="Delete workout">×</button>
                    </div>
                </div>
                <div class="workout-duration">
                    <span class="duration-label">Total time</span>
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
        const ok = await this.showConfirm({
            title: 'Delete workout?',
            message: 'This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            danger: true
        });
        if (!ok) return;

        try {
            await deleteWorkoutFromCloud(workoutId);
        } catch {
            this.showToast('Kunde inte radera från molnet', 'error');
            return;
        }

        this.workouts = this.workouts.filter(w => w.id !== workoutId);
        saveWorkouts(this.workouts);
        this.loadHistory();
        this.showToast('Workout deleted', 'success');
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
                    <h3>No Data Yet</h3>
                    <p>Start tracking this exercise to see your progress.</p>
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
        this.showToast('Rest complete. Ready for next set', 'success');
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

        this.workoutExercises.forEach(exercise => {
            const exerciseId = this.exId(exercise);
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

    async checkForActiveWorkout() {
        if (this.workoutState && this.workoutState.isActive) {
            const stateAge = Date.now() - this.workoutState.timestamp;
            if (stateAge < 24 * 60 * 60 * 1000) {
                const time = new Date(this.workoutState.timestamp).toLocaleTimeString();
                const ok = await this.showConfirm({
                    title: 'Resume workout?',
                    message: `You have an active workout session from ${time}. Would you like to continue where you left off?`,
                    confirmText: 'Resume',
                    cancelText: 'Discard'
                });
                if (ok) this.restoreWorkoutState();
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
        const exercises = Array.isArray(this.workoutState.exercises) && this.workoutState.exercises.length
            ? this.workoutState.exercises
            : program.exercises;
        document.getElementById('workout-title').textContent = program.name;
        this.renderWorkoutForm(exercises);
        this.initializeRestTimer();
        setTimeout(() => this.loadFormData(), 100);
        this.renderLastWorkout(this.getLastWorkout(this.currentProgram));
        this.showScreen('workout-screen');
        this.startWorkoutTimer();
        this.showToast('Workout session restored', 'success');
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
                    exercises: this.workoutExercises,
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
        const saved = this.profile?.program_exercises?.[programId];
        const exercises = Array.isArray(saved) && saved.length ? saved : program.exercises;

        document.getElementById('workout-title').textContent = program.name;
        this.renderWorkoutForm(exercises);
        this.renderLastWorkout(this.getLastWorkout(programId));
        this.showScreen('workout-screen');
        this.startWorkoutTimer();

        saveWorkoutState({
            program: this.currentProgram,
            exercises: this.workoutExercises,
            startTime: this.workoutStartTime,
            duration: this.workoutDuration,
            isActive: this.isWorkoutActive,
            timestamp: Date.now()
        });
    }

    async saveWorkout() {
        if (!this.currentProgram) return;

        const confirmSave = await this.showConfirm({
            title: 'Save workout?',
            message: 'This will save and end your current workout.',
            confirmText: 'Save',
            cancelText: 'Cancel'
        });
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

        this.workoutExercises.forEach(exercise => {
            const exerciseId = this.exId(exercise);
            const setsContainer = document.getElementById(`sets-${exerciseId}`);
            if (!setsContainer) return;
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
            this.showToast('Workout saved', 'success');
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

    // --- Friends ---

    async loadFriendsScreen() {
        document.getElementById('friend-search-result').innerHTML = '';
        document.getElementById('friend-search-input').value = '';
        try {
            const all = await fetchFriendsWithProfiles();
            const incoming = all.filter(f => f.status === 'pending' && !f.i_am_requester);
            const accepted = all.filter(f => f.status === 'accepted');
            this.renderFriendRequests(incoming);
            this.renderFriendsList(accepted);
            this.updateFriendsBadge(incoming.length);
        } catch {
            this.showToast('Could not load friends', 'error');
        }
    }

    updateFriendsBadge(count) {
        const badge = document.getElementById('friends-badge');
        if (count > 0) {
            badge.textContent = count;
            badge.removeAttribute('hidden');
        } else {
            badge.setAttribute('hidden', '');
        }
    }

    renderFriendRequests(requests) {
        const section = document.getElementById('friend-requests-section');
        const list = document.getElementById('friend-requests-list');
        if (requests.length === 0) {
            section.setAttribute('hidden', '');
            return;
        }
        section.removeAttribute('hidden');
        list.innerHTML = requests.map(r => `
            <div class="friend-card" data-id="${r.friendship_id}">
                <div class="friend-card-info">
                    ${this.friendAvatarHtml(r.avatar_url)}
                    <span class="friend-name">${this.escapeHtml(r.display_name || 'Unknown')}</span>
                </div>
                <div class="friend-card-actions">
                    <button class="btn btn-primary btn-sm friend-accept">Accept</button>
                    <button class="btn btn-secondary btn-sm friend-decline">Decline</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.friend-card').forEach(card => {
            const id = card.dataset.id;
            card.querySelector('.friend-accept').addEventListener('click', async () => {
                try {
                    await acceptFriendRequest(id);
                    this.showToast('Friend request accepted', 'success');
                    this.loadFriendsScreen();
                } catch {
                    this.showToast('Could not accept request', 'error');
                }
            });
            card.querySelector('.friend-decline').addEventListener('click', async () => {
                try {
                    await declineOrRemoveFriend(id);
                    this.showToast('Request declined', 'info');
                    this.loadFriendsScreen();
                } catch {
                    this.showToast('Could not decline request', 'error');
                }
            });
        });
    }

    renderFriendsList(friends) {
        const list = document.getElementById('friends-list');
        if (friends.length === 0) {
            list.innerHTML = '<p class="friends-empty">No friends yet. Search by email to add someone.</p>';
            return;
        }
        list.innerHTML = friends.map(f => `
            <div class="friend-card friend-card-accepted" data-id="${f.friendship_id}" data-friend-id="${f.friend_id}">
                <div class="friend-card-info friend-card-toggle">
                    ${this.friendAvatarHtml(f.avatar_url)}
                    <span class="friend-name">${this.escapeHtml(f.display_name || 'Unknown')}</span>
                    <span class="friend-chevron">›</span>
                </div>
                <div class="friend-workouts" hidden></div>
                <div class="friend-card-actions">
                    <button class="btn btn-secondary btn-sm friend-remove">Remove</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.friend-card-accepted').forEach(card => {
            const id = card.dataset.id;
            const friendId = card.dataset.friendId;

            card.querySelector('.friend-card-toggle').addEventListener('click', () => {
                this.toggleFriendWorkouts(card, friendId);
            });

            card.querySelector('.friend-remove').addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = await this.showConfirm({
                    title: 'Remove friend?',
                    message: 'You will no longer see each other\'s workouts.',
                    confirmText: 'Remove',
                    cancelText: 'Cancel',
                    danger: true
                });
                if (!ok) return;
                try {
                    await declineOrRemoveFriend(id);
                    this.showToast('Friend removed', 'info');
                    this.loadFriendsScreen();
                } catch {
                    this.showToast('Could not remove friend', 'error');
                }
            });
        });
    }

    async toggleFriendWorkouts(card, friendId) {
        const workoutsEl = card.querySelector('.friend-workouts');
        const chevron = card.querySelector('.friend-chevron');
        const isOpen = !workoutsEl.hidden;

        if (isOpen) {
            workoutsEl.setAttribute('hidden', '');
            chevron.classList.remove('open');
            return;
        }

        workoutsEl.removeAttribute('hidden');
        chevron.classList.add('open');

        if (workoutsEl.dataset.loaded) return;
        workoutsEl.dataset.loaded = '1';
        workoutsEl.innerHTML = '<p class="friend-workouts-loading">Loading...</p>';

        try {
            const workouts = await fetchFriendWorkouts(friendId);
            if (workouts.length === 0) {
                workoutsEl.innerHTML = '<p class="friend-workouts-empty">No workouts yet.</p>';
                return;
            }
            workoutsEl.innerHTML = workouts.map(w => {
                const date = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return `
                    <div class="friend-workout-item">
                        <div class="friend-workout-header">
                            <span class="friend-workout-program">${this.escapeHtml(w.programName)}</span>
                            <span class="friend-workout-date">${date}</span>
                        </div>
                        <div class="friend-workout-exercises">
                            ${w.exercises.map(ex => `
                                <div class="friend-exercise-row">
                                    <span class="friend-exercise-name">${this.escapeHtml(ex.name)}</span>
                                    <span class="friend-exercise-sets">${ex.sets.map(s => `${s.weight}kg×${s.reps}`).join(', ')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        } catch {
            workoutsEl.innerHTML = '<p class="friend-workouts-empty">Could not load workouts.</p>';
        }
    }

    friendAvatarHtml(url) {
        if (url) {
            return `<img class="friend-avatar-img" src="${this.escapeHtml(url)}" alt="">`;
        }
        return `<svg class="friend-avatar-img friend-avatar-default" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="currentColor"/>
            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" fill="currentColor"/>
        </svg>`;
    }

    async searchFriend() {
        const input = document.getElementById('friend-search-input');
        const result = document.getElementById('friend-search-result');
        const email = input.value.trim();
        if (!email) return;

        result.innerHTML = '<p class="friend-search-status">Searching...</p>';

        try {
            const user = await searchUserByEmail(email);
            if (!user) {
                result.innerHTML = '<p class="friend-search-status">No user found with that email.</p>';
                return;
            }
            result.innerHTML = `
                <div class="friend-card friend-result-card">
                    <div class="friend-card-info">
                        ${this.friendAvatarHtml(user.avatar_url)}
                        <span class="friend-name">${this.escapeHtml(user.display_name || 'Unknown')}</span>
                    </div>
                    <div class="friend-card-actions">
                        <button class="btn btn-primary btn-sm" id="send-request-btn">Add friend</button>
                    </div>
                </div>
            `;
            document.getElementById('send-request-btn').addEventListener('click', async () => {
                try {
                    await sendFriendRequest(user.user_id);
                    result.innerHTML = '<p class="friend-search-status">Friend request sent!</p>';
                    input.value = '';
                } catch (e) {
                    const msg = e.message?.includes('duplicate') ? 'Request already sent.' : 'Could not send request.';
                    result.innerHTML = `<p class="friend-search-status">${msg}</p>`;
                }
            });
        } catch {
            result.innerHTML = '<p class="friend-search-status">Search failed. Try again.</p>';
        }
    }

    showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true">
                    <h3 class="modal-title">${title}</h3>
                    <p class="modal-message">${message}</p>
                    <div class="modal-actions">
                        <button class="btn modal-cancel">${cancelText}</button>
                        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));

            const close = (result) => {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 200);
                document.removeEventListener('keydown', onKey);
                resolve(result);
            };
            const onKey = (e) => {
                if (e.key === 'Escape') close(false);
                else if (e.key === 'Enter') close(true);
            };

            overlay.querySelector('.modal-confirm').addEventListener('click', () => close(true));
            overlay.querySelector('.modal-cancel').addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
            document.addEventListener('keydown', onKey);
        });
    }
}
