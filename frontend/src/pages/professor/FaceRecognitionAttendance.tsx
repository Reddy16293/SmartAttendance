import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ClassInfo {
  id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
}

interface SessionInfo {
  id: number;
  class_id: number;
  status: string;
  created_at: string;
}

interface RecognizedStudent {
  name: string;
  confidence: number;
}

interface AttendanceRecord {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  attendance_status: string;
  face_confidence: number;
  marked_at: string;
}

interface FaceRecognitionResponse {
  success: boolean;
  faces_detected: number;
  recognized_faces: RecognizedStudent[];
  unknown_faces: RecognizedStudent[];
  image_with_boxes: string;
  timestamp: string;
}

interface UploadResponse {
  session_id: number;
  recognized_students: RecognizedStudent[];
  updated_records: number;
}

export default function FaceRecognitionAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Class selection state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [step, setStep] = useState<"select-class" | "upload-image" | "results">("select-class");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [recognitionResults, setRecognitionResults] = useState<RecognizedStudent[]>([]);
  const [imageWithBoxes, setImageWithBoxes] = useState<string>("");
  const [facesDetected, setFacesDetected] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch professor's classes on mount
  useEffect(() => {
    if (!sessionId) {
      fetchProfessorClasses();
    } else {
      // If sessionId provided, skip class selection
      setStep("upload-image");
    }
  }, [sessionId]);

  // Fetch professor's classes
  const fetchProfessorClasses = async () => {
    try {
      setLoadingClasses(true);
      const token = localStorage.getItem("auth_token");

      // Fetch classes and subjects in parallel
      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`${API_URL}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!classesRes.ok) throw new Error("Failed to load classes");
      if (!subjectsRes.ok) throw new Error("Failed to load subjects");

      const teacherClasses = await classesRes.json();
      const subjects: Array<{ id: number; name: string; code: string }> = await subjectsRes.json();
      const subjectMap = new Map<number, { name: string; code: string }>(
        subjects.map((subject) => [subject.id, { name: subject.name, code: subject.code }])
      );

      // Map classes with subject info
      const classesWithInfo = teacherClasses.map((cls: any) => {
        const subject = subjectMap.get(cls.subject_id);
        return {
          id: cls.id,
          subject_name: subject?.name || "Unknown",
          subject_code: subject?.code || "",
          year: cls.year,
          section: cls.section,
        };
      });

      setClasses(classesWithInfo);
    } catch (err: any) {
      setError(err.message || "Failed to load classes");
    } finally {
      setLoadingClasses(false);
    }
  };

  // Create attendance session for selected class
  const handleClassSelect = async (classInfo: ClassInfo) => {
    try {
      setLoading(true);
      setError("");
      setSelectedClass(classInfo);

      const token = localStorage.getItem("auth_token");

      // Create new attendance session
      const response = await fetch(
        `${API_URL}/attendance/session/create-with-code?class_id=${classInfo.id}&face_recognition_enabled=false&generate_code=false`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create session");
      }

      const sessionData = await response.json();
      console.log("✅ Session created:", sessionData);
      setSessionInfo(sessionData); // Backend returns session directly

      // Move to upload step
      setStep("upload-image");
      setSuccess(`✅ Session created for ${classInfo.subject_name} - ${classInfo.section}`);
    } catch (err: any) {
      console.error("❌ Session creation error:", err);
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
      setSuccess("");
    }
  };

  // Upload image and process face recognition
  const handleUploadImage = async () => {
    if (!selectedImage) {
      setError("Please select an image");
      return;
    }

    const activeSessionId = sessionId || sessionInfo?.id;
    if (!activeSessionId) {
      setError("No active session. Please select a class first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      console.log(`📤 Uploading image to /attendance/session/${activeSessionId}/upload-image`);

      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/attendance/session/${activeSessionId}/upload-image`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to process image");
      }

      const data = await response.json();

      console.log("✅ Recognition Response:", data);

      // Update UI with results
      setRecognitionResults(data.recognized_students);
      setFacesDetected(data.recognized_students.length);
      
      // Set annotated image if available
      if (data.image_with_boxes) {
        setImageWithBoxes(data.image_with_boxes);
        console.log("🖼️ Annotated image received");
      }
      
      setSuccess(
        `✅ Successfully recognized ${data.recognized_students.length} students! ${data.updated_records} marked present.`
      );

      // Show confirmation dialog
      setShowConfirmation(true);
      setStep("results");

      // Fetch updated attendance records
      await fetchAttendanceRecords(activeSessionId);
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      const errorMsg = err.message || "Failed to process image. Make sure the model API is running.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for the session
  const fetchAttendanceRecords = async (activeSessionId?: number | string) => {
    const sid = activeSessionId || sessionId || sessionInfo?.id;
    if (!sid) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/attendance/session/${sid}/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch attendance records:", err);
    }
  };

  // Clear uploaded image
  const handleClearImage = () => {
    setSelectedImage(null);
    setPreviewUrl("");
    setRecognitionResults([]);
    setImageWithBoxes("");
    setFacesDetected(0);
  };

  // Approve and close attendance
  const handleApproveAndClose = async () => {
    const activeSessionId = sessionId || sessionInfo?.id;
    if (!activeSessionId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/attendance/session/${activeSessionId}/approve-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "approve" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to approve attendance");
      }

      setSuccess("✅ Attendance approved and session closed!");
      setTimeout(() => {
        navigate(`/professor/dashboard`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to approve attendance");
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Face Recognition Attendance</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-2">
            {step === "select-class" && "Select a class to start attendance"}
            {step === "upload-image" && "Upload classroom photo for automatic student recognition"}
            {step === "results" && "Review recognized students"}
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Class Selection */}
        {step === "select-class" && (
          <Card>
            <CardHeader>
              <CardTitle>Select Class</CardTitle>
              <CardDescription>Choose which class you're taking attendance for</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingClasses ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : classes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No classes found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((classInfo) => (
                    <Card
                      key={classInfo.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                      onClick={() => handleClassSelect(classInfo)}
                    >
                      <CardContent className="pt-6">
                        <h3 className="font-bold text-lg text-gray-900">
                          {classInfo.subject_name}
                        </h3>
                        <p className="text-sm text-gray-600">{classInfo.subject_code}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Year {classInfo.year} - Section {classInfo.section}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2 & 3: Upload Image and Results */}
        {(step === "upload-image" || step === "results") && (
          <>
            {/* Selected Class Info */}
            {selectedClass && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-blue-900">
                        {selectedClass.subject_name} - {selectedClass.section}
                      </h3>
                      <p className="text-sm text-blue-700">
                        {selectedClass.subject_code} | Year {selectedClass.year}
                      </p>
                    </div>
                    {step === "upload-image" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStep("select-class");
                          setSelectedClass(null);
                          setSessionInfo(null);
                        }}
                      >
                        Change Class
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Image Upload Card */}
              <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Image
                </CardTitle>
                <CardDescription>Upload a classroom photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Preview */}
                {previewUrl && (
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* File Input */}
                <div className="space-y-2">
                  <label htmlFor="image-input" className="block text-sm font-medium text-gray-700">
                    Select Image
                  </label>
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleUploadImage}
                    disabled={!selectedImage || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Recognize
                      </>
                    )}
                  </Button>

                  {selectedImage && (
                    <Button
                      onClick={handleClearImage}
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                    >
                      Clear Image
                    </Button>
                  )}
                </div>

                {/* Stats */}
                {facesDetected > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {facesDetected} students recognized
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-2">
            {recognitionResults.length > 0 ? (
              <Tabs defaultValue="recognized" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="recognized">
                    Recognized ({recognitionResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="records">Attendance Records</TabsTrigger>
                </TabsList>

                {/* Recognized Faces Tab */}
                <TabsContent value="recognized">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recognized Students</CardTitle>
                      <CardDescription>
                        Students identified by face recognition model
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Annotated Image Display */}
                      {imageWithBoxes && (
                        <div className="mb-6">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            🖼️ Detected Faces with Bounding Boxes
                          </h4>
                          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300">
                            <img
                              src={`data:image/jpeg;base64,${imageWithBoxes}`}
                              alt="Annotated classroom"
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {recognitionResults.map((student, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-600">
                                Confidence: {(student.confidence * 100).toFixed(1)}%
                              </p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ))}
                      </div>

                      {/* Confirmation Actions */}
                      {showConfirmation && (
                        <div className="mt-6 space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-900">
                            ⚠️ Review the recognized students above. Are you sure?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleApproveAndClose}
                              disabled={loading}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {loading ? "Approving..." : "✅ Approve & Close"}
                            </Button>
                            <Button
                              onClick={() => setShowConfirmation(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Re-upload
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Attendance Records Tab */}
                <TabsContent value="records">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Attendance Summary</CardTitle>
                      <CardDescription>All students in this session</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Enrollment #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Confidence</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceRecords.map((record, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {record.student_name}
                                </TableCell>
                                <TableCell>{record.enrollment_number}</TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      record.attendance_status === "present"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {record.attendance_status.toUpperCase()}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {record.face_confidence > 0
                                    ? (record.face_confidence * 100).toFixed(1) + "%"
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="pt-10 text-center text-gray-500">
                  <Upload className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Upload an image to see recognition results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
