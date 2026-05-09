import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight } from 'lucide-react-native';
import { config } from '../../../src/config';
import { Colors } from '../../../src/constants/Colors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/Card';
import { ProfessorFaceRecognitionModal } from '../../../src/components/dashboard/ProfessorFaceRecognitionModal';
import { resolveClassSubjectCode, resolveClassSubjectName } from '../../../src/utils/classLabels';

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

interface ClassWithSubject {
	id: number;
	subject_name: string;
	subject_code: string;
	year: number;
	section: string;
}

export default function ProfessorFaceRecognitionScreen() {
	const params = useLocalSearchParams<{ classId?: string }>();
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [classes, setClasses] = useState<ClassWithSubject[]>([]);
	const [selectedClass, setSelectedClass] = useState<ClassWithSubject | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	const fetchClasses = async () => {
		try {
			setLoading(true);
			const token = await AsyncStorage.getItem('auth_token');
			const [classesRes, subjectsRes] = await Promise.all([
				fetch(`${config.apiUrl}/teachers/classes`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${config.apiUrl}/teachers/subjects`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);

			if (!classesRes.ok || !subjectsRes.ok) {
				return;
			}

			const classData: TeacherClass[] = await classesRes.json();
			const subjectData: Subject[] = await subjectsRes.json();
			const subjectMap = new Map(subjectData.map((subject) => [Number(subject.id), subject]));

			const merged = classData.map((cls) => {
				return {
					id: cls.id,
					subject_name: resolveClassSubjectName(cls, subjectMap),
					subject_code: resolveClassSubjectCode(cls, subjectMap),
					year: cls.year,
					section: cls.section,
				};
			});

			setClasses(merged);

			// Pre-select class from route param if provided
			if (params.classId) {
				const classId = parseInt(params.classId, 10);
				const preSelectedClass = merged.find((cls) => cls.id === classId);
				if (preSelectedClass) {
					setSelectedClass(preSelectedClass);
					setModalVisible(true);
				}
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

	const onRefresh = () => {
		setRefreshing(true);
		fetchClasses();
	};

	const openModal = (cls: ClassWithSubject) => {
		setSelectedClass(cls);
		setModalVisible(true);
	};

	return (
		<ScrollView
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			<View style={styles.header}>
				<Text style={styles.title}>Face Recognition</Text>
				<Text style={styles.subtitle}>Select a class and capture a classroom image for AI attendance</Text>
			</View>

			<View style={styles.content}>
				{loading && !refreshing ? (
					<ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
				) : classes.length === 0 ? (
					<Card>
						<CardContent style={styles.emptyState}>
							<Text style={styles.emptyTitle}>No Classes Available</Text>
							<Text style={styles.emptySubtitle}>Create classes first to use face recognition attendance.</Text>
						</CardContent>
					</Card>
				) : (
					classes.map((cls) => (
						<TouchableOpacity key={cls.id} onPress={() => openModal(cls)}>
							<Card style={styles.classCard}>
								<CardHeader>
									<CardTitle>{cls.subject_name}</CardTitle>
									<CardDescription>{cls.subject_code} • Year {cls.year} Section {cls.section}</CardDescription>
								</CardHeader>
								<CardContent style={styles.rowEnd}>
									<View style={styles.launchTag}>
										<Camera size={14} color={Colors.light.primary} />
										<Text style={styles.launchText}>Start Capture</Text>
									</View>
									<ChevronRight size={18} color={Colors.light.mutedForeground} />
								</CardContent>
							</Card>
						</TouchableOpacity>
					))
				)}
			</View>

			{selectedClass ? (
				<ProfessorFaceRecognitionModal
					visible={modalVisible}
					onClose={() => setModalVisible(false)}
					classId={selectedClass.id}
					className={`${selectedClass.subject_name} (${selectedClass.subject_code})`}
				/>
			) : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.light.background,
	},
	header: {
		padding: 20,
		backgroundColor: 'white',
		borderBottomWidth: 1,
		borderBottomColor: Colors.light.border,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: Colors.light.text,
	},
	subtitle: {
		marginTop: 4,
		fontSize: 14,
		color: Colors.light.mutedForeground,
	},
	content: {
		padding: 16,
		gap: 12,
	},
	classCard: {
		marginBottom: 2,
	},
	rowEnd: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	launchTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderWidth: 1,
		borderColor: Colors.light.primary + '40',
		borderRadius: 999,
		backgroundColor: Colors.light.primary + '12',
	},
	launchText: {
		color: Colors.light.primary,
		fontWeight: '700',
		fontSize: 12,
	},
	emptyState: {
		paddingVertical: 28,
		alignItems: 'center',
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: Colors.light.text,
	},
	emptySubtitle: {
		marginTop: 6,
		color: Colors.light.mutedForeground,
		textAlign: 'center',
	},
});
