import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuth } from './AuthContext';

export interface TeacherSubject {
  id: number | string;
  name?: string;
  code?: string;
}

export interface TeacherClass {
  id: number;
  subject_id?: number | string | null;
  subject_name?: string;
  subject_code?: string;
  year: number;
  section: string;
}

interface AppDataContextType {
  subjects: TeacherSubject[];
  professorClasses: TeacherClass[];
  isHydrated: boolean;
  isRefreshing: boolean;
  refreshProfessorCommonData: () => Promise<{ subjects: TeacherSubject[]; classes: TeacherClass[] } | null>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

function getStorageKeys(userId: string) {
  return {
    subjects: `app_cache_subjects_${userId}`,
    classes: `app_cache_classes_${userId}`,
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [professorClasses, setProfessorClasses] = useState<TeacherClass[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProfessorCommonData = useCallback(async () => {
    if (!user || user.role !== 'professor') {
      return null;
    }

    try {
      setIsRefreshing(true);
      const [fetchedClasses, fetchedSubjects] = await Promise.all([
        api.get<TeacherClass[]>('/teachers/classes'),
        api.get<TeacherSubject[]>('/teachers/subjects'),
      ]);

      const safeClasses = Array.isArray(fetchedClasses) ? fetchedClasses : [];
      const safeSubjects = Array.isArray(fetchedSubjects) ? fetchedSubjects : [];

      setProfessorClasses(safeClasses);
      setSubjects(safeSubjects);

      const keys = getStorageKeys(user.id);
      await AsyncStorage.multiSet([
        [keys.classes, JSON.stringify(safeClasses)],
        [keys.subjects, JSON.stringify(safeSubjects)],
      ]);

      return { classes: safeClasses, subjects: safeSubjects };
    } catch (error) {
      console.warn('Failed to refresh shared app cache:', error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (!user) {
        if (!isMounted) return;
        setSubjects([]);
        setProfessorClasses([]);
        setIsHydrated(true);
        return;
      }

      setIsHydrated(false);

      if (user.role !== 'professor') {
        if (!isMounted) return;
        setSubjects([]);
        setProfessorClasses([]);
        setIsHydrated(true);
        return;
      }

      try {
        const keys = getStorageKeys(user.id);
        const entries = await AsyncStorage.multiGet([keys.classes, keys.subjects]);
        if (!isMounted) return;

        const classRaw = entries.find(([key]) => key === keys.classes)?.[1];
        const subjectRaw = entries.find(([key]) => key === keys.subjects)?.[1];

        const cachedClasses = classRaw ? (JSON.parse(classRaw) as TeacherClass[]) : [];
        const cachedSubjects = subjectRaw ? (JSON.parse(subjectRaw) as TeacherSubject[]) : [];

        setProfessorClasses(Array.isArray(cachedClasses) ? cachedClasses : []);
        setSubjects(Array.isArray(cachedSubjects) ? cachedSubjects : []);
      } catch (error) {
        console.warn('Failed to hydrate shared app cache:', error);
        if (!isMounted) return;
        setProfessorClasses([]);
        setSubjects([]);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }

      // Note: Removed automatic background refresh after hydration.
      // User can manually pull-to-refresh or navigate away/back to trigger refresh.
      // This prevents unwanted auto-reload that jars the user experience.
      // await refreshProfessorCommonData();
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, [refreshProfessorCommonData, user]);

  const value = useMemo(
    () => ({
      subjects,
      professorClasses,
      isHydrated,
      isRefreshing,
      refreshProfessorCommonData,
    }),
    [isHydrated, isRefreshing, professorClasses, refreshProfessorCommonData, subjects]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
