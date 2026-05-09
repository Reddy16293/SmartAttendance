import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertCircle, CheckCircle2, Keyboard, QrCode, XCircle } from 'lucide-react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';
import { StudentQRCodeScanModal } from '../dashboard/StudentQRCodeScanModal';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'pending' | 'failed';

export function QRVerification() {
	const [status, setStatus] = useState<VerificationStatus>('idle');
	const [manualCode, setManualCode] = useState('');
	const [showManualInput, setShowManualInput] = useState(false);
	const [qrModalVisible, setQrModalVisible] = useState(false);

	const handleManualSubmit = async () => {
		if (manualCode.length < 6) {
			setStatus('failed');
			return;
		}

		try {
			setStatus('verifying');
			const token = await AsyncStorage.getItem('auth_token');
			const res = await fetch(`${config.apiUrl}/attendance/submit-code`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ code: manualCode }),
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				setStatus('failed');
				return;
			}

			const awaiting = typeof data.message === 'string' && data.message.toLowerCase().includes('awaiting');
			setStatus(awaiting ? 'pending' : 'success');
		} catch (error) {
			console.error('Manual code verification failed:', error);
			setStatus('failed');
		}
	};

	const reset = () => {
		setStatus('idle');
		setManualCode('');
		setShowManualInput(false);
	};

	const renderStatusCard = () => {
		if (status === 'idle') return null;

		const config = {
			verifying: {
				icon: <AlertCircle size={42} color={Colors.light.primary} />,
				title: 'Verifying',
				subtitle: 'Checking your attendance submission...',
			},
			success: {
				icon: <CheckCircle2 size={42} color={Colors.light.success} />,
				title: 'Attendance Confirmed',
				subtitle: 'Your presence has been marked successfully.',
			},
			pending: {
				icon: <AlertCircle size={42} color={Colors.light.warning} />,
				title: 'Pending Manual Review',
				subtitle: 'Your submission is awaiting professor approval.',
			},
			failed: {
				icon: <XCircle size={42} color={Colors.light.destructive} />,
				title: 'Verification Failed',
				subtitle: 'Invalid/expired code or verification failed.',
			},
		}[status];

		return (
			<Card style={{ marginBottom: 12 }}>
				<CardContent style={styles.statusBox}>
					{config.icon}
					<Text style={styles.statusTitle}>{config.title}</Text>
					<Text style={styles.statusSubtitle}>{config.subtitle}</Text>
					{status !== 'verifying' ? (
						<Button variant="outline" onPress={reset} style={{ marginTop: 14 }}>
							Done
						</Button>
					) : null}
				</CardContent>
			</Card>
		);
	};

	return (
		<>
			{renderStatusCard()}

			{status === 'idle' ? (
				<Card>
					<CardHeader>
						<CardTitle>Verify Your Attendance</CardTitle>
						<CardDescription>Scan QR code or enter a 6-digit attendance code</CardDescription>
					</CardHeader>
					<CardContent>
						{!showManualInput ? (
							<View style={styles.actionsContainer}>
								<Button onPress={() => setQrModalVisible(true)}>
									<QrCode size={16} color="#FFF" style={{ marginRight: 8 }} />
									Scan QR Code
								</Button>

								<Button variant="outline" onPress={() => setShowManualInput(true)}>
									<Keyboard size={16} color={Colors.light.primary} style={{ marginRight: 8 }} />
									Enter Code Manually
								</Button>
							</View>
						) : (
							<View style={styles.manualContainer}>
								<Input
									placeholder="Enter 6-digit code"
									value={manualCode}
									onChangeText={(value) => setManualCode(value.replace(/\D/g, '').slice(0, 6))}
									  keyboardType="numeric"
									style={styles.codeInput}
								/>
								<View style={styles.manualButtonsRow}>
									<Button variant="outline" onPress={() => setShowManualInput(false)} style={styles.halfBtn}>
										Back
									</Button>
									<Button onPress={handleManualSubmit} style={styles.halfBtn} disabled={manualCode.length < 6}>
										Verify
									</Button>
								</View>
							</View>
						)}
					</CardContent>
				</Card>
			) : null}

			<StudentQRCodeScanModal
				visible={qrModalVisible}
				onClose={() => setQrModalVisible(false)}
				onSuccess={() => {
					setQrModalVisible(false);
					setStatus('success');
				}}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	actionsContainer: {
		gap: 10,
	},
	manualContainer: {
		gap: 12,
	},
	manualButtonsRow: {
		flexDirection: 'row',
		gap: 8,
	},
	halfBtn: {
		flex: 1,
	},
	codeInput: {
		textAlign: 'center',
		fontSize: 24,
		letterSpacing: 6,
		fontWeight: '700',
	},
	statusBox: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	statusTitle: {
		marginTop: 10,
		fontSize: 18,
		fontWeight: '700',
		color: Colors.light.text,
	},
	statusSubtitle: {
		marginTop: 4,
		textAlign: 'center',
		color: Colors.light.mutedForeground,
		fontSize: 13,
	},
});
