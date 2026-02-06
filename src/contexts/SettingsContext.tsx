import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { NotificationSettings } from '../types';

interface AppSettings {
  biometricEnabled: boolean;
  hideBalances: boolean;
  currency: string;
  language: string;
  notificationSettings: NotificationSettings;
  quickActions: string[];
  defaultAccountId?: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  biometricAvailable: boolean;
  authenticateWithBiometric: () => Promise<boolean>;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

const defaultSettings: AppSettings = {
  biometricEnabled: false,
  hideBalances: false,
  currency: 'BRL',
  language: 'pt-BR',
  notificationSettings: {
    bill_reminders: true,
    bill_reminder_days: [1, 3, 7],
    budget_alerts: true,
    budget_alert_threshold: 80,
    goal_updates: true,
    weekly_summary: true,
    monthly_report: true,
    unusual_expense_alert: true,
    unusual_expense_threshold: 500,
  },
  quickActions: ['add_expense', 'add_income', 'view_bills'],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = '@financeapp:settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      // Verificar disponibilidade de biometria
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      // Carregar configurações salvas
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });

        // Se biometria está habilitada, não autenticar automaticamente
        if (!parsed.biometricEnabled) {
          setAuthenticated(true);
        }
      } else {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      setAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o app',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar senha',
      });

      if (result.success) {
        setAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return false;
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        biometricAvailable,
        authenticateWithBiometric,
        isAuthenticated,
        setAuthenticated,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
