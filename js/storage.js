import { supabase } from './supabase.js';

const KEYS = {
    workouts: 'training-workouts',
    formData: 'training-form-data',
    workoutState: 'training-workout-state'
};

// --- LocalStorage (offline cache) ---

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

// --- Supabase (cloud) ---

export async function fetchWorkoutsFromCloud() {
    const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
        id: row.id,
        program: row.program,
        programName: row.program_name,
        date: row.date,
        duration: row.duration,
        exercises: row.exercises
    }));
}

export async function saveWorkoutToCloud(workout) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('workouts')
        .insert({
            user_id: user.id,
            program: workout.program,
            program_name: workout.programName,
            date: workout.date,
            duration: workout.duration,
            exercises: workout.exercises
        })
        .select()
        .single();
    if (error) throw error;
    return data.id;
}

export async function deleteWorkoutFromCloud(id) {
    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// --- Profile ---

export async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function saveProfile(profile) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
    if (error) throw error;
}

export async function saveProgramExercises(map) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, program_exercises: map });
    if (error) throw error;
}

// --- Weight logs ---

export async function fetchWeightLogs() {
    const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .order('date', { ascending: true });
    if (error) throw error;
    return data;
}

export async function addWeightLog(weight) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('weight_logs')
        .insert({ user_id: user.id, weight });
    if (error) throw error;
}

// --- Avatar ---

export async function uploadAvatar(blob) {
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
}
