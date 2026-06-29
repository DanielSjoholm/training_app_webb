import { supabase } from './supabase.js';

export async function searchUserByEmail(email) {
    const { data, error } = await supabase.rpc('find_user_by_email', { search_email: email });
    if (error) throw error;
    return data?.[0] ?? null;
}

export async function searchUsersByName(name) {
    const { data, error } = await supabase.rpc('find_users_by_name', { search_name: name });
    if (error) throw error;
    return data ?? [];
}

export async function sendFriendRequest(addresseeId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: user.id, addressee_id: addresseeId });
    if (error) throw error;
}

export async function fetchFriendsWithProfiles() {
    const { data, error } = await supabase.rpc('get_friends_with_profiles');
    if (error) throw error;
    return data ?? [];
}

export async function acceptFriendRequest(friendshipId) {
    const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
    if (error) throw error;
}

export async function declineOrRemoveFriend(friendshipId) {
    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
    if (error) throw error;
}

export async function fetchFriendWorkouts(friendId) {
    const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', friendId)
        .order('date', { ascending: false })
        .limit(5);
    if (error) throw error;
    return (data ?? []).map(row => ({
        id: row.id,
        programName: row.program_name,
        date: row.date,
        duration: row.duration,
        exercises: row.exercises
    }));
}
