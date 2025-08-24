// Training Tracker App - Main JavaScript
class TrainingApp {
    constructor() {
        this.currentProgram = null;
        this.workouts = this.loadWorkouts();
        this.workoutTimer = null;
        this.workoutStartTime = null;
        this.workoutDuration = 0;
        this.isWorkoutActive = false; // Ny variabel för att spåra om träning pågår
        this.motivationalQuotes = [
            "Push yourself, because no one else is going to do it for you!",
            "The pain you feel today will be the strength you feel tomorrow.",
            "Success starts with self-discipline.",
            "Don't limit your challenges. Challenge your limits!",
            "Strength does not come from the physical capacity. It comes from an indomitable will.",
            "The only bad workout is the one that didn't happen.",
            "Make yourself proud.",
            "Your body can stand almost anything. It's your mind you have to convince."
        ];
        
        this.programs = {
            'chest-triceps': {
                name: 'Chest & Triceps',
                exercises: [
                    'Bench Press',
                    'Incline Dumbbell Press', 
                    'Chest Flyes',
                    'Triceps Pushdown',
                    'Overhead Triceps Ext'
                ]
            },
            'shoulder-biceps': {
                name: 'Shoulder & Biceps',
                exercises: [
                    'Shoulder Press',
                    'Lateral Raise',
                    'Reverse Flies',
                    'Curl Cable Front',
                    'Curl Cable Back',
                    'Hammer Curl'
                ]
            },
            'back': {
                name: 'PullPass',
                exercises: [
                    'Chins',
                    'Bred Maskin Rodd',
                    'Lat Pull Down',
                    'En Arm Lats Drag'
                ]
            },
            'legs': {
                name: 'Legs',
                exercises: [
                    'Squats',
                    'Deadlifts',
                    'Hipthrusters'
                ]
            },
            'abs': {
                name: 'Abs',
                exercises: [
                    'Rope Curls'
                ]
            }
        };
        
        this.init();
    }
    
    startWorkoutTimer() {
        // Stop any existing timer
        if (this.workoutTimer) {
            this.stopWorkoutTimer();
        }
        
        this.workoutStartTime = Date.now();
        this.workoutDuration = 0;
        
        // Update timer every second
        this.workoutTimer = setInterval(() => {
            this.workoutDuration = Date.now() - this.workoutStartTime;
            this.updateTimerDisplay();
        }, 1000);
        
        // Initial display update
        this.updateTimerDisplay();
    }
    
    stopWorkoutTimer() {
        if (this.workoutTimer) {
            clearInterval(this.workoutTimer);
            this.workoutTimer = null;
        }
        
        // Calculate final duration
        if (this.workoutStartTime) {
            this.workoutDuration = Date.now() - this.workoutStartTime;
        }
    }
    
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
        // Find the most recent workout for this program
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
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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
                            ${ex.sets.map(set => `
                                <span class="last-set-display">${set.weight}kg × ${set.reps}</span>
                            `).join(' • ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    init() {
        this.setupEventListeners();
        this.setupPageProtection(); // Ny metod för sidans skydd
        this.showRandomQuote();
        this.populateExerciseSelect();
    }
    
    setupPageProtection() {
        // Skydda mot sidans refresh
        window.addEventListener('beforeunload', (e) => {
            if (this.isWorkoutActive) {
                e.preventDefault();
                e.returnValue = 'Du har en aktiv träning som inte är sparad. Är du säker på att du vill lämna sidan?';
                return e.returnValue;
            }
        });
        
        // Lägg till en pushState när träning startar
        window.history.pushState(null, null, window.location.href);
    }
    
    forceStopWorkout() {
        // Tvinga stopp av träning
        this.stopWorkoutTimer();
        this.isWorkoutActive = false;
        this.currentProgram = null;
    }
    
    setupEventListeners() {
        // Program selection
        document.querySelectorAll('.program-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const program = e.currentTarget.dataset.program;
                this.openWorkout(program);
            });
        });
        
        // Navigation
        document.getElementById('history-btn').addEventListener('click', () => this.showScreen('history-screen'));
        document.getElementById('progress-btn').addEventListener('click', () => this.showScreen('progress-screen'));
        
        // Back buttons
        document.getElementById('back-to-menu').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('back-from-history').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('back-from-progress').addEventListener('click', () => this.showScreen('main-menu'));
        
        // Save workout
        document.getElementById('save-workout').addEventListener('click', () => this.saveWorkout());
        
        // Filters
        document.getElementById('program-filter').addEventListener('change', () => this.filterHistory());
        document.getElementById('exercise-select').addEventListener('change', () => this.updateProgressChart());
    }
    
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenId).classList.add('active');
        
        // Stop workout timer if going back to main menu from workout
        if (screenId === 'main-menu' && this.workoutTimer) {
            // Lägg till bekräftelse om träning pågår
            if (this.isWorkoutActive) {
                const confirmExit = confirm('Du har en aktiv träning som inte är sparad. Är du säker på att du vill avsluta?');
                if (!confirmExit) {
                    // Visa träningsskärmen igen
                    this.showScreen('workout-screen');
                    return; // Stanna kvar på träningsskärmen
                }
            }
            
            this.stopWorkoutTimer();
            this.isWorkoutActive = false;
        }
        
        // Load content for specific screens
        if (screenId === 'history-screen') {
            this.loadHistory();
        } else if (screenId === 'progress-screen') {
            this.loadProgress();
        }
    }
    
    showRandomQuote() {
        const quoteElement = document.getElementById('quote');
        const randomQuote = this.motivationalQuotes[Math.floor(Math.random() * this.motivationalQuotes.length)];
        quoteElement.textContent = randomQuote;
    }
    
    openWorkout(programId) {
        this.currentProgram = programId;
        this.isWorkoutActive = true; // Markera att träning är aktiv
        const program = this.programs[programId];
        
        document.getElementById('workout-title').textContent = program.name;
        this.renderWorkoutForm(program.exercises);
        
        // Get and display last workout for this program
        const lastWorkout = this.getLastWorkout(programId);
        this.renderLastWorkout(lastWorkout);
        
        this.showScreen('workout-screen');
        
        // Start the workout timer
        this.startWorkoutTimer();
    }
    
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
                    <div class="sets-list" id="sets-list-${exercise.replace(/\s+/g, '-')}">
                        <!-- Sets will be added here -->
                    </div>
                </div>
                <div class="exercise-actions">
                    <button class="btn btn-secondary add-set-btn" onclick="app.addSet('${exercise.replace(/\s+/g, '-')}')">
                        ➕ Add Set
                    </button>
                </div>
            `;
            container.appendChild(exerciseEntry);
            
            // Add initial set
            this.addSet(exercise.replace(/\s+/g, '-'));
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
                <input type="number" class="weight-input" placeholder="0" min="0" step="0.5" data-exercise="${exerciseId}" data-set="${setNumber}" data-field="weight">
            </div>
            <div class="set-reps">
                <input type="number" class="reps-input" placeholder="0" min="0" data-exercise="${exerciseId}" data-set="${setNumber}" data-field="reps">
            </div>
            <div class="set-actions">
                <button class="btn-remove-set" onclick="app.removeSet(this, '${exerciseId}')" title="Remove set">✕</button>
            </div>
        `;
        
        setsList.appendChild(setRow);
        
        // Update set numbers
        this.updateSetNumbers(exerciseId);
    }
    
    removeSet(button, exerciseId) {
        const setRow = button.closest('.set-row');
        setRow.remove();
        this.updateSetNumbers(exerciseId);
    }
    
    updateSetNumbers(exerciseId) {
        const setsList = document.getElementById(`sets-list-${exerciseId}`);
        const setRows = setsList.querySelectorAll('.set-row');
        
        setRows.forEach((row, index) => {
            const setNumber = index + 1;
            row.querySelector('.set-number').textContent = setNumber;
            
            // Update data attributes
            const weightInput = row.querySelector('.weight-input');
            const repsInput = row.querySelector('.reps-input');
            
            if (weightInput) {
                weightInput.dataset.set = setNumber;
            }
            if (repsInput) {
                repsInput.dataset.set = setNumber;
            }
        });
    }
    
    saveWorkout() {
        if (!this.currentProgram) return;
        
        // Lägg till bekräftelse innan sparande
        const confirmSave = confirm('Är du säker på att du vill spara och avsluta denna träning? Detta kan inte ångras.');
        if (!confirmSave) {
            return;
        }
        
        // Stop the workout timer
        this.stopWorkoutTimer();
        this.isWorkoutActive = false; // Markera att träning är avslutad
        
        const program = this.programs[this.currentProgram];
        const workoutData = {
            program: this.currentProgram,
            programName: program.name,
            date: new Date().toISOString(),
            duration: this.workoutDuration,
            exercises: []
        };
        
        // Collect exercise data
        program.exercises.forEach(exercise => {
            const exerciseId = exercise.replace(/\s+/g, '-');
            const setsContainer = document.getElementById(`sets-${exerciseId}`);
            const setsList = setsContainer.querySelector('.sets-list');
            const setRows = setsList.querySelectorAll('.set-row');
            
            const exerciseData = {
                name: exercise,
                sets: []
            };
            
            setRows.forEach(setRow => {
                const weightInput = setRow.querySelector('.weight-input');
                const repsInput = setRow.querySelector('.reps-input');
                
                if (weightInput && repsInput) {
                    const weight = weightInput.value;
                    const reps = repsInput.value;
                    
                    if (weight || reps) {
                        exerciseData.sets.push({
                            weight: weight || '0',
                            reps: reps || '0'
                        });
                    }
                }
            });
            
            if (exerciseData.sets.length > 0) {
                workoutData.exercises.push(exerciseData);
            }
        });
        
        // Save workout
        this.workouts.push(workoutData);
        this.saveWorkouts();
        
        // Show success message
        this.showToast('Workout saved successfully! 💪', 'success');
        
        // Return to main menu
        setTimeout(() => {
            this.showScreen('main-menu');
        }, 1500);
    }
    
    loadHistory() {
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (this.workouts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No workouts yet. Start training! 💪</p>';
            return;
        }
        
        // Sort workouts by date (newest first)
        const sortedWorkouts = [...this.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedWorkouts.forEach((workout, index) => {
            const workoutCard = document.createElement('div');
            workoutCard.className = 'workout-card';
            
            const date = new Date(workout.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            workoutCard.innerHTML = `
                <div class="workout-header">
                    <span class="workout-program">${workout.programName}</span>
                    <div class="workout-actions">
                        <span class="workout-date">${date}</span>
                        <button class="btn-delete-workout" onclick="app.deleteWorkout(${index})" title="Delete workout">
                            🗑️
                        </button>
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
                                ${ex.sets.map((set, index) => `
                                    <span class="set-display">${set.weight}kg × ${set.reps}${index < ex.sets.length - 1 ? ', ' : ''}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(workoutCard);
        });
    }
    
    deleteWorkout(workoutIndex) {
        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
            // Remove workout from array
            this.workouts.splice(workoutIndex, 1);
            
            // Save updated workouts
            this.saveWorkouts();
            
            // Reload history
            this.loadHistory();
            
            // Show success message
            this.showToast('Workout deleted successfully! 🗑️', 'success');
        }
    }
    
    filterHistory() {
        const filter = document.getElementById('program-filter').value;
        const workoutCards = document.querySelectorAll('.workout-card');
        
        workoutCards.forEach(card => {
            const programName = card.querySelector('.workout-program').textContent;
            const shouldShow = !filter || this.programs[filter]?.name === programName;
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }
    
    loadProgress() {
        this.populateExerciseSelect();
        this.updateProgressChart();
    }
    
    populateExerciseSelect() {
        const select = document.getElementById('exercise-select');
        const exercises = new Set();
        
        this.workouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                exercises.add(exercise.name);
            });
        });
        
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
            chartContainer.innerHTML = '<p>Select an exercise to view progress</p>';
            return;
        }
        
        // Filter workouts for this exercise
        const exerciseData = this.workouts
            .filter(workout => workout.exercises.some(ex => ex.name === exerciseName))
            .map(workout => {
                const exercise = workout.exercises.find(ex => ex.name === exerciseName);
                return {
                    date: new Date(workout.date),
                    sets: exercise.sets
                };
            })
            .sort((a, b) => a.date - b.date);
        
        if (exerciseData.length === 0) {
            chartContainer.innerHTML = '<p>No data for this exercise yet</p>';
            return;
        }
        
        // Calculate best weight from all sets
        let bestWeight = 0;
        exerciseData.forEach(workout => {
            workout.sets.forEach(set => {
                const weight = parseFloat(set.weight);
                if (weight > bestWeight) bestWeight = weight;
            });
        });
        
        const chartHTML = `
            <div style="width: 100%;">
                <h3 style="margin-bottom: 20px;">${exerciseName} Progress</h3>
                <div style="margin-bottom: 20px;">
                    <strong>Total workouts:</strong> ${exerciseData.length}<br>
                    <strong>Best weight:</strong> ${bestWeight}kg<br>
                    <strong>Last workout:</strong> ${exerciseData[exerciseData.length - 1].date.toLocaleDateString()}
                </div>
                <div style="height: 200px; display: flex; align-items: end; gap: 4px; justify-content: center;">
                    ${exerciseData.map((workout, index) => {
                        // Find the highest weight from this workout
                        const maxWeight = Math.max(...workout.sets.map(set => parseFloat(set.weight)));
                        const height = (maxWeight / bestWeight) * 150;
                        return `<div style="width: 20px; height: ${height}px; background: var(--primary-color); border-radius: 2px; position: relative;" title="${workout.date.toLocaleDateString()}: ${workout.sets.map(set => `${set.weight}kg × ${set.reps}`).join(', ')}"></div>`;
                    }).join('')}
                </div>
                <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                    Weight progression over time
                </div>
            </div>
        `;
        
        chartContainer.innerHTML = chartHTML;
    }
    
    loadWorkouts() {
        const stored = localStorage.getItem('training-workouts');
        return stored ? JSON.parse(stored) : [];
    }
    
    saveWorkouts() {
        localStorage.setItem('training-workouts', JSON.stringify(this.workouts));
    }
    
    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TrainingApp();
});

// Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
