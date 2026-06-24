import { supabase } from './supabase.js';

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
    });
    if (error) throw error;
    return data;
}

export async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
