import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Colors } from '../../constants/Colors';

interface SubjectAttendanceData {
	class_id: number;
	subject_name: string;
	subject_code: string;
	total_sessions: number;
	attended_sessions: number;
	attendance_percentage: number;
	year: number;
	section: string;
}

interface AttendanceChartProps {
	attendanceData: SubjectAttendanceData[];
}

function getProgressColor(percentage: number) {
	if (percentage >= 85) return Colors.light.success;
	if (percentage >= 75) return Colors.light.warning;
	return Colors.light.destructive;
}

function getStatusText(percentage: number) {
	if (percentage >= 85) return { text: 'Good Standing', color: Colors.light.success };
	if (percentage >= 75) return { text: 'Warning', color: Colors.light.warning };
	return { text: 'Critical', color: Colors.light.destructive };
}

export function AttendanceChart({ attendanceData }: AttendanceChartProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Subject-wise Attendance</CardTitle>
			</CardHeader>
			<CardContent>
				{attendanceData.length === 0 ? (
					<Text style={styles.emptyText}>No attendance data available</Text>
				) : (
					<View style={styles.list}>
						{attendanceData.map((subject) => {
							const status = getStatusText(subject.attendance_percentage);
							return (
								<View key={subject.class_id} style={styles.item}>
									<View style={styles.topRow}>
										<View style={{ flex: 1 }}>
											<Text style={styles.subjectName}>{subject.subject_name}</Text>
											<Text style={styles.subjectMeta}>
												{subject.attended_sessions}/{subject.total_sessions} classes attended
											</Text>
										</View>
										<View style={styles.rightColumn}>
											<Text style={styles.percentText}>{Math.round(subject.attendance_percentage)}%</Text>
											<Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
										</View>
									</View>

									<View style={styles.progressBg}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${Math.max(0, Math.min(100, subject.attendance_percentage))}%`,
													backgroundColor: getProgressColor(subject.attendance_percentage),
												},
											]}
										/>
									</View>
								</View>
							);
						})}
					</View>
				)}
			</CardContent>
		</Card>
	);
}

const styles = StyleSheet.create({
	list: {
		gap: 18,
	},
	item: {
		gap: 8,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
	},
	subjectName: {
		fontSize: 14,
		fontWeight: '700',
		color: Colors.light.text,
	},
	subjectMeta: {
		marginTop: 2,
		fontSize: 12,
		color: Colors.light.mutedForeground,
	},
	rightColumn: {
		alignItems: 'flex-end',
	},
	percentText: {
		fontSize: 18,
		fontWeight: '800',
		color: Colors.light.text,
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
	},
	progressBg: {
		width: '100%',
		height: 8,
		backgroundColor: Colors.light.accent,
		borderRadius: 999,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 999,
	},
	emptyText: {
		textAlign: 'center',
		color: Colors.light.mutedForeground,
		paddingVertical: 18,
	},
});
