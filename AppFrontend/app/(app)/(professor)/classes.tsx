import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Camera, BarChart3, Users, History, Plus, X, Calendar, GraduationCap, Clock } from 'lucide-react-native';
import api from '../../../src/services/api';
import { Colors } from '../../../src/constants/Colors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { MobileTimetable } from '../../../src/components/timetable/MobileTimetable';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAppData } from '../../../src/contexts/AppDataContext';
import { normalizeId, resolveClassSubjectCode, resolveClassSubjectName } from '../../../src/utils/classLabels';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface TeacherClass {
	id: number;
	subject_id: number;
	year: number;
	section: string;
}

interface Subject {
	id: number;
	name: string;
	code: string;
}

interface ClassWithSubject extends TeacherClass {
	subject_name: string;
	subject_code: string;
}

export default function ProfessorClassesScreen() {
	const { user } = useAuth();
	const { refreshProfessorCommonData } = useAppData();
	const teacherId = user?.id ? Number(user.id) : NaN;
	const router = useRouter();
	
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [classes, setClasses] = useState<ClassWithSubject[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [view, setView] = useState<'list' | 'schedule'>('list');
	
	// Modals State
	const [addClassVisible, setAddClassVisible] = useState(false);
	const [addScheduleVisible, setAddScheduleVisible] = useState(false);
	
	// Create Class State
	const [newSubjectName, setNewSubjectName] = useState('');
	const [newSubjectCode, setNewSubjectCode] = useState('');
	const [newYear, setNewYear] = useState('1');
	const [newSection, setNewSection] = useState('A');
	const [isCreatingClass, setIsCreatingClass] = useState(false);

	// Create Schedule State
	const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
	const [newDay, setNewDay] = useState('0');
	const [startTime, setStartTime] = useState('09:00');
	const [endTime, setEndTime] = useState('10:00');
	const [roomNumber, setRoomNumber] = useState('');
	const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

	const fetchClasses = async () => {
		try {
			setLoading(true);
			const [classData, subjectData] = await Promise.all([
				api.get<TeacherClass[]>('/teachers/classes'),
				api.get<Subject[]>('/teachers/subjects'),
			]);

			setSubjects(subjectData);

			const subjectMap = new Map(subjectData.map((subject) => [Number(subject.id), subject]));

			const merged: ClassWithSubject[] = classData.map((cls) => {
				return {
					...cls,
					subject_name: resolveClassSubjectName(cls, subjectMap),
					subject_code: resolveClassSubjectCode(cls, subjectMap),
				};
			});

			setClasses(merged);
			if (merged.length > 0 && !selectedClassId) {
				setSelectedClassId(merged[0].id);
			}
		} catch (error) {
			console.error('Failed to load classes:', error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchClasses();
	}, []);

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchClasses();
			// Also refresh global app cache so other screens pick up the changes
			if (refreshProfessorCommonData) {
				await refreshProfessorCommonData();
			}
		} catch (err) {
			console.error('Refresh failed:', err);
		} finally {
			setRefreshing(false);
		}
	}, [fetchClasses, refreshProfessorCommonData]);

	const handleCreateClass = async () => {
		const subjectName = newSubjectName.trim();
		const subjectCode = newSubjectCode.trim().toUpperCase();

		if (!subjectName) {
			Alert.alert('Missing subject name', 'Please enter a subject name.');
			return;
		}

		if (!subjectCode) {
			Alert.alert('Missing subject code', 'Please enter a subject code.');
			return;
		}

		const parsedYear = Number(newYear);
		if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 4) {
			Alert.alert('Invalid year', 'Year must be a number between 1 and 4.');
			return;
		}

		const section = newSection.trim().toUpperCase();
		if (!section) {
			Alert.alert('Invalid section', 'Section is required.');
			return;
		}

		try {
			setIsCreatingClass(true);
			const createdSubject = await api.post<{ id: number }>('/teachers/subjects', {
				name: subjectName,
				code: subjectCode,
			});

			await api.post('/teachers/classes', {
				subject_id: createdSubject.id,
				teacher_id: teacherId,
				year: parsedYear,
				section,
			});

			Alert.alert('Success', 'Course created successfully');
			setAddClassVisible(false);
			setNewSubjectName('');
			setNewSubjectCode('');
			// Refresh local list and shared app cache so other screens (home, sessions, enrollments) pick up the new class
			await fetchClasses();
			try {
				if (refreshProfessorCommonData) await refreshProfessorCommonData();
			} catch (e) {
				// ignore
			}
		} catch (error: any) {
			const errorMsg = error.message || 'Failed to create course';
			// Handle specific errors
			let userMessage = errorMsg;
			if (errorMsg.includes('HTTP 502') || errorMsg.includes('502')) {
				// 502 Bad Gateway - server temporarily unavailable
				userMessage = 'Course creation is in progress. Please check your courses list in a moment or pull down to refresh.';
			} else if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
				userMessage = 'Course code already exists. Please use a different code.';
			} else if (errorMsg.includes('subject') || errorMsg.includes('Subject')) {
				userMessage = 'Failed to create subject. Please check the subject name and code.';
			}

			// Even if there was an error, try to refresh in case the course was actually created
			try {
				await fetchClasses();
				if (refreshProfessorCommonData) await refreshProfessorCommonData();
			} catch (refreshErr) {
				// ignore refresh errors
			}

			Alert.alert('Error', userMessage);
		} finally {
			setIsCreatingClass(false);
		}
	};

	const handleCreateSchedule = async () => {
		if (!selectedClassId) {
			Alert.alert('Error', 'Please select a course.');
			return;
		}

		try {
			setIsCreatingSchedule(true);
			await api.post(`/enrollments/schedules?class_id=${selectedClassId}`, {
				day_of_week: parseInt(newDay),
				start_time: startTime,
				end_time: endTime,
				room_number: roomNumber || null,
			});

			Alert.alert('Success', 'Schedule added successfully');
			setAddScheduleVisible(false);
			// Trigger refresh of timetable if in schedule view
			if (view === 'schedule') {
				// We might need to force a re-render of MobileTimetable
				onRefresh();
			}
		} catch (error: any) {
			Alert.alert('Error', error.message || 'Failed to create schedule');
		} finally {
			setIsCreatingSchedule(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerTop}>
					<View>
						<Text style={styles.title}>Courses</Text>
						<Text style={styles.subtitle}>Manage your courses and lectures</Text>
					</View>
					<TouchableOpacity 
						style={styles.addScheduleHeaderBtn}
						onPress={() => setAddScheduleVisible(true)}
					>
						<Clock size={18} color="#FFF" />
						<Text style={styles.addClassText}>Add Lecture</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.tabContainer}>
					<TouchableOpacity 
						style={[styles.tab, view === 'list' && styles.activeTab]}
						onPress={() => setView('list')}
					>
						<BookOpen size={18} color={view === 'list' ? Colors.light.primary : Colors.light.mutedForeground} />
						<Text style={[styles.tabText, view === 'list' && styles.activeTabText]}>My Courses</Text>
					</TouchableOpacity>
					<TouchableOpacity 
						style={[styles.tab, view === 'schedule' && styles.activeTab]}
						onPress={() => setView('schedule')}
					>
						<Calendar size={18} color={view === 'schedule' ? Colors.light.primary : Colors.light.mutedForeground} />
						<Text style={[styles.tabText, view === 'schedule' && styles.activeTabText]}>Timetable</Text>
					</TouchableOpacity>
				</View>
			</View>

			{view === 'list' ? (
				<ScrollView
					style={styles.scrollContainer}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				>
					<View style={styles.content}>
						<View style={styles.topActionsSection}>
							<TouchableOpacity style={styles.primaryActionCard} onPress={() => setAddClassVisible(true)}>
								<View style={styles.primaryActionIcon}>
									<Plus size={20} color={Colors.light.primary} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.primaryActionTitle}>Create New Course</Text>
									<Text style={styles.primaryActionSubtitle}>Add a new subject, year, and section for this term</Text>
								</View>
							</TouchableOpacity>

							<TouchableOpacity style={styles.secondaryActionCard} onPress={() => router.push('/(app)/(professor)/enrollments')}>
								<View style={[styles.primaryActionIcon, styles.secondaryActionIcon]}>
									<Users size={20} color={Colors.light.primary} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.primaryActionTitle}>Enrollments</Text>
									<Text style={styles.primaryActionSubtitle}>Manage class codes, students, and schedules</Text>
								</View>
							</TouchableOpacity>
						</View>

						{loading && !refreshing ? (
							<ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
						) : classes.length === 0 ? (
							<Card style={styles.emptyCard}>
								<CardContent style={styles.emptyState}>
									<GraduationCap size={48} color={Colors.light.mutedForeground} />
									<Text style={styles.emptyTitle}>No Courses Found</Text>
									<Text style={styles.emptySubtitle}>Start by creating a course for this semester.</Text>
								</CardContent>
							</Card>
						) : (
							<>
								{classes.map((cls) => (
									<Card key={cls.id} style={styles.classCard}>
										<CardHeader>
											<CardTitle>{cls.subject_name}</CardTitle>
											<CardDescription>{cls.subject_code} • Year {cls.year} Section {cls.section}</CardDescription>
										</CardHeader>
										<CardContent>
											<View style={styles.actionsGrid}>
												<TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(app)/(professor)/capture?classId=${cls.id}`)}>
													<Camera size={16} color={Colors.light.primary} />
													<Text style={styles.actionText}>Attendance</Text>
												</TouchableOpacity>
												<TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(app)/(professor)/sessions?classId=${cls.id}`)}>
													<History size={16} color={Colors.light.primary} />
													<Text style={styles.actionText}>Sessions</Text>
												</TouchableOpacity>
												<TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(app)/(professor)/enrollments?classId=${cls.id}`)}>
													<Users size={16} color={Colors.light.primary} />
													<Text style={styles.actionText}>Students</Text>
												</TouchableOpacity>
												<TouchableOpacity style={styles.actionBtn} onPress={() => {
													setSelectedClassId(cls.id);
													setAddScheduleVisible(true);
												}}>
													<Plus size={16} color={Colors.light.primary} />
													<Text style={styles.actionText}>Add Lecture</Text>
												</TouchableOpacity>
											</View>
										</CardContent>
									</Card>
								))}
								
							</>
						)}
					</View>
					<View style={{ height: 40 }} />
				</ScrollView>
			) : (
				<View style={{ flex: 1 }}>
					<MobileTimetable userRole="professor" />
				</View>
			)}

			{/* Create Course Modal */}
			<Modal visible={addClassVisible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.addModal}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Create New Course</Text>
							<TouchableOpacity onPress={() => setAddClassVisible(false)}>
								<X size={24} color={Colors.light.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={{ maxHeight: 450 }}>
							<Text style={styles.fieldLabel}>Subject Name</Text>
							<Input value={newSubjectName} onChangeText={setNewSubjectName} placeholder="e.g. Data Structures" />

							<Text style={styles.fieldLabel}>Subject Code</Text>
							<Input value={newSubjectCode} onChangeText={setNewSubjectCode} placeholder="e.g. CS301" autoCapitalize="characters" />

							<Text style={styles.fieldLabel}>Year</Text>
							<Input value={newYear} onChangeText={setNewYear} placeholder="1 to 4" keyboardType="numeric" />

							<Text style={styles.fieldLabel}>Section</Text>
							<Input value={newSection} onChangeText={setNewSection} placeholder="e.g. A" autoCapitalize="characters" />

							<Button 
								onPress={handleCreateClass} 
								style={{ marginTop: 24 }} 
								isLoading={isCreatingClass}
							>
								Create Course
							</Button>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Add Schedule Modal */}
			<Modal visible={addScheduleVisible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.addModal}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Lecture Schedule</Text>
							<TouchableOpacity onPress={() => setAddScheduleVisible(false)}>
								<X size={24} color={Colors.light.text} />
							</TouchableOpacity>
						</View>

						<ScrollView style={{ maxHeight: 500 }}>
							<Text style={styles.fieldLabel}>Course</Text>
							<View style={styles.subjectList}>
								{classes.map((cls) => {
									const isSelected = selectedClassId === cls.id;
									return (
										<TouchableOpacity
											key={cls.id}
											style={[styles.subjectChip, isSelected && styles.selectedSubjectChip]}
											onPress={() => setSelectedClassId(cls.id)}
										>
											<Text style={[styles.subjectChipText, isSelected && styles.selectedSubjectChipText]}>
												{cls.subject_code}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
							<Text style={styles.helperText}>
								{classes.find((c) => c.id === selectedClassId)?.subject_name || 'Select a course'}
							</Text>

							<Text style={styles.fieldLabel}>Day of Week</Text>
							<View style={styles.subjectList}>
								{DAYS.map((day, idx) => {
									const isSelected = newDay === idx.toString();
									return (
										<TouchableOpacity
											key={idx}
											style={[styles.subjectChip, isSelected && styles.selectedSubjectChip]}
											onPress={() => setNewDay(idx.toString())}
										>
											<Text style={[styles.subjectChipText, isSelected && styles.selectedSubjectChipText]}>
												{day.substring(0, 3)}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							<View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
								<View style={{ flex: 1 }}>
									<Text style={styles.fieldLabel}>Start Time</Text>
									<Input value={startTime} onChangeText={setStartTime} placeholder="09:00" />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.fieldLabel}>End Time</Text>
									<Input value={endTime} onChangeText={setEndTime} placeholder="10:00" />
								</View>
							</View>

							<Text style={styles.fieldLabel}>Room Number (Optional)</Text>
							<Input value={roomNumber} onChangeText={setRoomNumber} placeholder="e.g. A101" />

							<Button 
								onPress={handleCreateSchedule} 
								style={{ marginTop: 24 }} 
								isLoading={isCreatingSchedule}
							>
								Add Lecture Entry
							</Button>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.light.background,
	},
	header: {
		backgroundColor: 'white',
		borderBottomWidth: 1,
		borderBottomColor: Colors.light.border,
	},
	headerTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: Colors.light.text,
	},
	subtitle: {
		marginTop: 4,
		color: Colors.light.mutedForeground,
		fontSize: 14,
	},
	addScheduleHeaderBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.light.primary,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		gap: 6,
	},
	addClassText: {
		color: 'white',
		fontWeight: '600',
		fontSize: 14,
	},
	tabContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingBottom: 0,
	},
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
		gap: 8,
	},
	activeTab: {
		borderBottomColor: Colors.light.primary,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '600',
		color: Colors.light.mutedForeground,
	},
	activeTabText: {
		color: Colors.light.primary,
	},
	scrollContainer: {
		flex: 1,
	},
	content: {
		padding: 16,
		gap: 12,
	},
	modeToggleRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	modeToggle: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.light.border,
		backgroundColor: Colors.light.accent,
		alignItems: 'center',
	},
	modeToggleActive: {
		borderColor: Colors.light.primary,
		backgroundColor: Colors.light.primary,
	},
	modeToggleText: {
		fontSize: 13,
		fontWeight: '700',
		color: Colors.light.text,
	},
	modeToggleTextActive: {
		color: '#FFF',
	},
	topActionsSection: {
		gap: 12,
		marginBottom: 4,
	},
	primaryActionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: Colors.light.primary + '30',
		backgroundColor: Colors.light.primary + '08',
	},
	secondaryActionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: Colors.light.border,
		backgroundColor: Colors.light.card,
	},
	primaryActionIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.light.card,
		borderWidth: 1,
		borderColor: Colors.light.primary + '20',
	},
	secondaryActionIcon: {
		backgroundColor: Colors.light.accent,
	},
	primaryActionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: Colors.light.text,
	},
	primaryActionSubtitle: {
		fontSize: 13,
		color: Colors.light.mutedForeground,
		marginTop: 3,
	},
	classCard: {
		marginBottom: 8,
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	actionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: Colors.light.border,
		borderRadius: 10,
		backgroundColor: Colors.light.accent,
		minWidth: '48%',
		flexGrow: 1,
	},
	actionText: {
		color: Colors.light.text,
		fontWeight: '600',
		fontSize: 13,
	},
	secondaryAddBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.light.primary,
		borderStyle: 'dashed',
		marginTop: 8,
		gap: 8,
	},
	secondaryAddBtnText: {
		color: Colors.light.primary,
		fontWeight: '700',
		fontSize: 15,
	},
	emptyCard: {
		marginTop: 20,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyTitle: {
		marginTop: 16,
		fontSize: 18,
		fontWeight: '700',
		color: Colors.light.text,
	},
	emptySubtitle: {
		marginTop: 8,
		fontSize: 14,
		color: Colors.light.mutedForeground,
		textAlign: 'center',
		paddingHorizontal: 20,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	addModal: {
		width: '90%',
		backgroundColor: 'white',
		borderRadius: 24,
		padding: 24,
	},
	subjectList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	subjectChip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: Colors.light.border,
		backgroundColor: Colors.light.accent,
	},
	selectedSubjectChip: {
		borderColor: Colors.light.primary,
		backgroundColor: Colors.light.primary,
	},
	subjectChipText: {
		fontSize: 12,
		fontWeight: '700',
		color: Colors.light.text,
	},
	selectedSubjectChipText: {
		color: '#FFF',
	},
	helperText: {
		marginTop: 8,
		color: Colors.light.mutedForeground,
		fontSize: 12,
	},
});
