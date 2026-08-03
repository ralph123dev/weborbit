import { useEffect, useState } from 'react';
import { auth, hasFirebaseConfig, onAuthStateChanged } from '../services/firebase';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasFirebaseConfig && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const normalizedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            ...firebaseUser,
          };
          setUser(normalizedUser);
          await fetchProfile(normalizedUser.id, normalizedUser.email);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

      return () => unsubscribe();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, userEmail = '', userMeta = {}) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // If the user signed in via Google OAuth and is_verified is false, auto-verify
        const isGoogleUser = userMeta?.provider === 'google' || userMeta?.iss?.includes('google');
        if (isGoogleUser && !data.is_verified) {
          await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
          data.is_verified = true;
        }
        setProfile(data);
      } else {
        // Generate a username from email for new users (including Google OAuth)
        const baseName = userEmail ? userEmail.split('@')[0] : 'user';
        const username = baseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
        
        // Detect if this is a Google OAuth user
        const isGoogleUser = userMeta?.provider === 'google' || userMeta?.iss?.includes('google');
        
        const newProfileData = { 
          id: userId, 
          email: userEmail, 
          username,
          is_verified: isGoogleUser ? true : false,
          updated_at: new Date().toISOString() 
        };

        // Extract name from Google metadata if available
        if (userMeta?.full_name) {
          const nameParts = userMeta.full_name.split(' ');
          newProfileData.first_name = nameParts[0] || null;
          newProfileData.last_name = nameParts.slice(1).join(' ') || null;
        }
        if (userMeta?.avatar_url) {
          newProfileData.avatar_url = userMeta.avatar_url;
        }

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert(newProfileData)
          .select()
          .single();

        if (!createError && newProfile) {
          setProfile(newProfile);
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  return { user, profile, loading, setProfile };
}
