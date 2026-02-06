import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { DEFAULT_CATEGORIES } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const waitForProfile = async (userId: string, maxAttempts = 10): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (data) return true;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  };

  const createDefaultCategories = async (userId: string) => {
    const categories = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      user_id: userId,
    }));

    const { error } = await supabase.from('categories').insert(categories);
    if (error) console.error('Error creating categories:', error);
  };

  const createDefaultAccount = async (userId: string) => {
    const { error } = await supabase.from('accounts').insert({
      user_id: userId,
      name: 'Carteira',
      type: 'cash',
      balance: 0,
      color: '#6366F1',
      icon: 'cash',
    });
    if (error) console.error('Error creating account:', error);
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('Starting signup...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      console.log('User created:', data.user?.id);

      // Aguardar o trigger criar o perfil
      if (data.user) {
        console.log('Waiting for profile...');
        const profileExists = await waitForProfile(data.user.id);

        if (profileExists) {
          console.log('Profile exists, creating defaults...');
          await createDefaultCategories(data.user.id);
          await createDefaultAccount(data.user.id);
          console.log('Defaults created!');
        } else {
          console.error('Profile was not created by trigger');
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Signup catch error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
