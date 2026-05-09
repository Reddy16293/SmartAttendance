# Dual Verification Workflow - Test Guide

## Overview
This guide explains the proper dual verification workflow when BOTH facial recognition AND code/QR generation are enabled.

## Correct Workflow

### Stage 1: Session Creation
**What the professor does:**
1. Navigate to "Take Attendance" page
2. Select a class
3. **Enable Both:**
   - Toggle "Facial Recognition" ON
   - Toggle "Code/QR" ON
   - Select code or QR method
4. Click "Generate Attendance Code" or "Generate QR Code"

**What happens in backend:**
- Session created with `face_recognition_enabled=true` AND `attendance_code` OR `qr_enabled=true`
- `_requires_dual_verification(session)` returns TRUE
- All enrolled students' records created with `status="manual_review"`

### Stage 2: Face Recognition (Professor uploads image)
**What the professor does:**
1. Click "Capture Attendance" or "Upload Image"
2. Professor uploads classroom image
3. Face recognition model processes image

**Expected Backend Behavior:**
```
[DUAL_VERIFICATION_CHECK] Session X:
  face_recognition_enabled=true
  attendance_code=123456
  qr_enabled=false
  requires_dual_verification=true

[ATTENDANCE_LOGIC] Updating record Y:
  Current state: face=false, qr=false, status=manual_review
  Updates: face=true, qr=false, require_both=true
  compute_status: require_both=true, face=true, qr=false => pending_approval
  Final state: face=true, qr=false, status=manual_review → pending_approval
```

**Expected Student Experience:**
- Student status should show: ⏳ "Pending Approval" or similar
- Student sees the attendance code/QR prompt
- Student IS NOT yet marked as PRESENT

### Stage 3: Code/QR Submission (Student submits code)
**What the student does:**
1. Sees "Pending Approval" or "Awaiting Code Submission" status
2. Enters the 6-digit attendance code OR scans QR code
3. Submits code/QR

**Expected Backend Behavior:**
```
[DUAL_VERIFICATION_CHECK] Session X:
  requires_dual_verification=true

[ATTENDANCE_LOGIC] Updating record Y:
  Current state: face=true, qr=false, status=pending_approval
  Updates: face=true (unchanged), qr=true, require_both=true
  compute_status: require_both=true, face=true, qr=true => present
  Final state: face=true, qr=true, status=pending_approval → present
```

**Expected Student Experience:**
- Status changes to ✅ "Present"
- Attendance confirmed

### Stage 4: No Code Submission (Student doesn't submit code)
**If student doesn't submit code before session expires (5 minutes):**
- Status remains as ⏳ "Pending Approval"
- Or transitions to "Manual Review" for teacher review

## Debug Logging

When testing, check the backend terminal output for these log patterns:

### ✅ Correct Dual Verification Flow:
```
[DUAL_VERIFICATION_CHECK] Session X:
  ...
  requires_dual_verification=true

[ATTENDANCE_LOGIC] compute_status: require_both=true, face=true, qr=false => pending_approval
[ATTENDANCE_LOGIC] Updating record Y: ... => pending_approval

... student submits code ...

[ATTENDANCE_LOGIC] compute_status: require_both=true, face=true, qr=true => present
[ATTENDANCE_LOGIC] Updating record Y: ... => present
```

### ❌ Problem: Dual verification not enabled:
```
[DUAL_VERIFICATION_CHECK] Session X:
  face_recognition_enabled=false  # or requires_dual_verification=false
```
**Solution:** Make sure BOTH toggles are ON when generating code/QR

### ❌ Problem: Student marked PRESENT after face recognition:
```
[ATTENDANCE_LOGIC] compute_status: require_both=true, face=true, qr=false => present
```
**This is wrong!** Should be `pending_approval` when `require_both=true`
**Debug:** Check if `require_both=true` is being passed correctly

### ❌ Problem: Code submission doesn't finalize:
```
[ATTENDANCE_LOGIC] compute_status: require_both=true, face=true, qr=true => pending_approval
```
**This is wrong!** Should be `present` when both face and qr are true
**Debug:** Check if `face_detected=true` is persisted from previous update

## Testing Checklist

- [ ] Backend logs show `requires_dual_verification=true` after image upload
- [ ] Backend logs show status changing to `pending_approval` after face recognition
- [ ] Student dashboard shows "Pending Approval" status
- [ ] Student can submit attendance code
- [ ] Backend logs show status changing to `present` after code submission
- [ ] Student dashboard updates to show "Present" status
- [ ] If no code submitted, status remains "Pending Approval"

## Status Values

| Status | Meaning | When Triggered |
|--------|---------|-----------------|
| `manual_review` | Created but not verified | Session starts |
| `pending_approval` | Partially verified, awaiting second signal | After face OR code/QR (when dual required) |
| `present` | Fully verified by both signals OR single signal when not dual | After face+code OR face+QR (when dual) OR just face (when not dual) |
| `absent` | No verification attempted | Default when session ends without any verification |

## Common Issues

### Issue: Students immediately see "Present"
**Check:**
1. Verify `requires_dual_verification=true` in logs
2. Verify `compute_status` is being called with `require_both=true`
3. Check if `qr_verified` is being set to True prematurely

### Issue: Students see "Pending" but can't submit code
**Check:**
1. Verify code is correctly generated and displayed
2. Verify student can scan/enter the code
3. Check for session expiration issues

### Issue: Code submission doesn't change status to Present
**Check:**
1. Verify `face_detected=true` from previous update is preserved
2. Verify `qr_verified` is set to True in this update
3. Verify `compute_status` receives both signals as True

