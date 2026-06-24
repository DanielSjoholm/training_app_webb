const KEYS = {
    workouts: 'training-workouts',
    formData: 'training-form-data',
    workoutState: 'training-workout-state'
};

export function loadWorkouts() {
    const stored = localStorage.getItem(KEYS.workouts);
    return stored ? JSON.parse(stored) : [];
}

export function saveWorkouts(workouts) {
    localStorage.setItem(KEYS.workouts, JSON.stringify(workouts));
}

export function loadWorkoutState() {
    const stored = localStorage.getItem(KEYS.workoutState);
    return stored ? JSON.parse(stored) : null;
}

export function saveWorkoutState(state) {
    localStorage.setItem(KEYS.workoutState, JSON.stringify(state));
}

export function clearWorkoutState() {
    localStorage.removeItem(KEYS.workoutState);
}

export function getFormData() {
    const stored = localStorage.getItem(KEYS.formData);
    return stored ? JSON.parse(stored) : null;
}

export function setFormData(data) {
    localStorage.setItem(KEYS.formData, JSON.stringify(data));
}

export function clearFormData() {
    localStorage.removeItem(KEYS.formData);
}
