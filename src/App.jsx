import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { initStore } from './store/localStorage';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminClasses from './pages/admin/AdminClasses';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminLogs from './pages/admin/AdminLogs';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherClassDetail from './pages/teacher/TeacherClassDetail';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherVocabulary from './pages/teacher/TeacherVocabulary';
import TeacherGrammar from './pages/teacher/TeacherGrammar';

// Student pages
import StudentHome from './pages/student/StudentHome';
import StudentClassDetail from './pages/student/StudentClassDetail';
import StudentVocabulary from './pages/student/StudentVocabulary';
import StudentGrammar from './pages/student/StudentGrammar';

// Shared pages
import ProfilePage from './pages/shared/ProfilePage';
import CalendarPage from './pages/shared/CalendarPage';

initStore();

function getRedirect(role) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
}

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={getRedirect(user.role)} replace />;
  return children;
}

function AuthRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={getRedirect(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="accounts" element={<AdminAccounts />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="vocabulary" element={<TeacherVocabulary />} />
              <Route path="grammar" element={<TeacherGrammar />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Teacher */}
            <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="classes/:classId" element={<TeacherClassDetail />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="vocabulary" element={<TeacherVocabulary />} />
              <Route path="grammar" element={<TeacherGrammar />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Student */}
            <Route path="/student" element={<ProtectedRoute roles={['student']}><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<StudentHome />} />
              <Route path="class/:classId" element={<StudentClassDetail />} />
              <Route path="vocabulary" element={<StudentVocabulary />} />
              <Route path="grammar" element={<StudentGrammar />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
