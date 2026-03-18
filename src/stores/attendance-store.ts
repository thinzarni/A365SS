import { create } from 'zustand';
import mainClient from '../lib/main-client';
import { ACTIVITY_TYPES } from '../config/api-routes';
import { useAuthStore } from './auth-store';

export interface ActivityType {
    syskey: string;
    name: string;
}

interface AttendanceState {
    selectedDate: Date;
    activityTypes: ActivityType[];
    isLoadingTypes: boolean;

    setSelectedDate: (date: Date) => void;
    fetchActivityTypes: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
    selectedDate: new Date(),
    activityTypes: [],
    isLoadingTypes: false,

    setSelectedDate: (date: Date) => {
        set({ selectedDate: date });
    },

    fetchActivityTypes: async () => {
        const { activityTypes, isLoadingTypes } = get();
        if (activityTypes.length > 0 || isLoadingTypes) return;

        set({ isLoadingTypes: true });
        try {
            const authState = useAuthStore.getState();
            const res = await mainClient.post(ACTIVITY_TYPES, {
                userid: authState.userId,
                domain: authState.domain
            });
            const data = res.data?.data?.activityTypes || res.data?.activityTypes || [];
            if (Array.isArray(data)) {
                set({ activityTypes: data });
            }
        } catch (error) {
            console.error('Failed to fetch activity types', error);
        } finally {
            set({ isLoadingTypes: false });
        }
    },
}));
