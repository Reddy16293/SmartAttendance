import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ProfessorScheduleScreen from './schedule';

/**
 * Class Schedule Screen - Wrapper around the professor schedule screen
 * to support class-specific schedule viewing via classId route parameter
 * (e.g., /class-schedule?classId=5 will show only class 5's schedule)
 */
export default function ProfessorClassScheduleScreen() {
	const params = useLocalSearchParams();
	return <ProfessorScheduleScreen />;
}
