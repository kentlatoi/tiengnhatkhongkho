/**
 * User Service — profiles table + localStorage fallback
 */
import { supabase, isSupabase } from '../lib/supabaseClient';
import { usersStore } from '../store/localStorage';
import { mapProfile } from './authService';

const userService = {
  getAll: async () => {
    if (isSupabase()) {
      console.log('[userService] 🔄 Loading profiles from Supabase...');
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[userService] ❌ Supabase profiles load error:', error);
        throw error;
      }
      const mapped = (data || []).map(mapProfile);
      console.log('[userService] ✅ Loaded', mapped.length, 'profiles');
      return mapped;
    }
    return usersStore.getAll();
  },

  getById: async (id) => {
    if (isSupabase()) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) return null;
      return mapProfile(data);
    }
    return usersStore.getById(id);
  },

  getByEmail: async (email) => {
    if (isSupabase()) {
      const { data } = await supabase.from('profiles').select('*').eq('email', email).single();
      return data ? mapProfile(data) : null;
    }
    return usersStore.getByEmail(email);
  },

  getStudents: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'student').order('full_name');
      return (data || []).map(mapProfile);
    }
    return usersStore.getStudents();
  },

  getTeachers: async () => {
    if (isSupabase()) {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name');
      return (data || []).map(mapProfile);
    }
    return usersStore.getTeachers();
  },

  getByRole: async (role) => {
    if (isSupabase()) {
      const { data } = await supabase.from('profiles').select('*').eq('role', role).order('full_name');
      return (data || []).map(mapProfile);
    }
    return usersStore.getByRole(role);
  },

  update: async (id, data) => {
    if (isSupabase()) {
      const mapped = {};
      if (data.name !== undefined) mapped.full_name = data.name;
      if (data.phone !== undefined) mapped.phone = data.phone;
      if (data.birthday !== undefined) mapped.birthday = data.birthday;
      if (data.bio !== undefined) mapped.bio = data.bio;
      if (data.avatar !== undefined) mapped.avatar_url = data.avatar;
      if (data.role !== undefined) mapped.role = data.role;
      const { error } = await supabase.from('profiles').update(mapped).eq('id', id);
      if (error) throw error;
      return { id, ...data };
    }
    return usersStore.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  remove: async (id) => {
    if (isSupabase()) {
      await supabase.from('profiles').delete().eq('id', id);
      return;
    }
    usersStore.remove(id);
  },
};

export default userService;
