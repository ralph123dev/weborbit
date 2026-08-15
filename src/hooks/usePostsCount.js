import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function usePostsCount() {
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchPostsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });
        
        if (!error && isMounted) {
          setPostsCount(count || 0);
        }
      } catch (e) {
        console.error('Error fetching posts count:', e);
      }
    };

    fetchPostsCount();

    // Create a unique channel name per hook instance to avoid adding callbacks
    // to an already-subscribed channel (which throws in the realtime client).
    const channelName = `public-posts-count-${Math.random().toString(36).slice(2,9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, () => {
        if (isMounted) setPostsCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts'
      }, () => {
        if (isMounted) setPostsCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return postsCount;
}
