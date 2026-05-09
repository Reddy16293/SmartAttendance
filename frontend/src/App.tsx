import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

// Professor Pages
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import Classes from "./pages/professor/Classes";
import CaptureAttendance from "./pages/professor/CaptureAttendance";
import TakeAttendance from "./pages/professor/TakeAttendance";
import AttendanceResults from "./pages/professor/AttendanceResults";
import EnrollmentManagementPage from "./pages/professor/EnrollmentManagementPage";
import ProfessorSchedule from "./pages/professor/ProfessorSchedule";
import ClassSchedulePage from "./pages/professor/ClassSchedulePage";
import FaceRecognitionAttendance from "./pages/professor/FaceRecognitionAttendance";
import ProfessorTimetable from "./pages/professor/ProfessorTimetable";
import Sessions from "./pages/professor/Sessions";
import SessionDetails from "./pages/professor/SessionDetails";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import VerifyAttendance from "./pages/student/VerifyAttendance";
import MyAttendance from "./pages/student/MyAttendance";
import { StudentEnrollment } from "./pages/student/Enrollment";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentTimetable from "./pages/student/StudentTimetable";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'professor' | 'student' }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'professor' ? '/professor' : '/student'} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Professor Routes */}
      <Route path="/professor" element={<ProtectedRoute role="professor"><ProfessorDashboard /></ProtectedRoute>} />
      <Route path="/professor/dashboard" element={<ProtectedRoute role="professor"><ProfessorDashboard /></ProtectedRoute>} />
      <Route path="/professor/classes" element={<ProtectedRoute role="professor"><Classes /></ProtectedRoute>} />
      <Route path="/professor/classes/:classId/schedule" element={<ProtectedRoute role="professor"><ClassSchedulePage /></ProtectedRoute>} />
      <Route path="/professor/schedule" element={<ProtectedRoute role="professor"><ProfessorSchedule /></ProtectedRoute>} />
      <Route path="/professor/capture" element={<ProtectedRoute role="professor"><TakeAttendance /></ProtectedRoute>} />
      <Route path="/professor/capture/:classId" element={<ProtectedRoute role="professor"><TakeAttendance /></ProtectedRoute>} />
      <Route path="/professor/results" element={<ProtectedRoute role="professor"><AttendanceResults /></ProtectedRoute>} />
      <Route path="/professor/sessions" element={<ProtectedRoute role="professor"><Sessions /></ProtectedRoute>} />
      <Route path="/professor/session/:sessionId" element={<ProtectedRoute role="professor"><SessionDetails /></ProtectedRoute>} />
      <Route path="/professor/enrollments" element={<ProtectedRoute role="professor"><EnrollmentManagementPage /></ProtectedRoute>} />
      <Route path="/professor/attendance/face/:sessionId?" element={<ProtectedRoute role="professor"><FaceRecognitionAttendance /></ProtectedRoute>} />
      <Route path="/professor/timetable" element={<ProtectedRoute role="professor"><ProfessorTimetable /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/schedule" element={<ProtectedRoute role="student"><StudentSchedule /></ProtectedRoute>} />
      <Route path="/student/verify" element={<ProtectedRoute role="student"><VerifyAttendance /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute role="student"><MyAttendance /></ProtectedRoute>} />
      <Route path="/student/enroll" element={<ProtectedRoute role="student"><StudentEnrollment /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute role="student"><StudentTimetable /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
