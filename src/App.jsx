import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MoodProvider } from './context/MoodContext';
import { JournalProvider } from './context/JournalContext';
import { GoalProvider } from './context/GoalContext';
import { ChatProvider } from './context/ChatContext';
import { CounselorProvider } from './context/CounselorContext';
import { AppointmentProvider } from './context/AppointmentContext';
import { ReviewProvider } from './context/ReviewContext';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import CounselorRegisterPage from './pages/CounselorRegister';
import PendingApprovalPage from './pages/PendingApproval';
import ResetPasswordPage from './pages/ResetPassword';
import DashboardPage from './pages/Dashboard';
import MoodPage from './pages/Mood';
import JournalPage from './pages/Journal';
import GoalsPage from './pages/Goals';
import ChatPage from './pages/Chat';
import CounselorChatPage from './pages/CounselorChat';
import CounselorDashboardPage from './pages/CounselorDashboard';
import ProfilePage from './pages/Profile';
import MoodInsightsPage from './pages/MoodInsights';
import DiscoverPage from './pages/Discover';
import ArticleReaderPage from './pages/ArticleReader';
import CounselorSearchPage from './pages/CounselorSearch';
import CounselorProfilePage from './pages/CounselorProfile';
import BookAppointmentPage from './pages/BookAppointment';
import MyAppointmentsPage from './pages/MyAppointments';
import CounselorAppointmentsPage from './pages/CounselorAppointments';
import AppointmentSessionPage from './pages/AppointmentSession';
import CounselorAvailabilityPage from './pages/CounselorAvailability';

function PatientOnly({ children }) {
  return <RoleProtectedRoute roleType="patient">{children}</RoleProtectedRoute>;
}

function CounselorOnly({ children }) {
  return <RoleProtectedRoute roleType="counselor">{children}</RoleProtectedRoute>;
}

function AuthOnly({ children }) {
  return <RoleProtectedRoute roleType="auth">{children}</RoleProtectedRoute>;
}

function AdminOnly({ children }) {
  return <RoleProtectedRoute roleType="admin">{children}</RoleProtectedRoute>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <MoodProvider>
        <JournalProvider>
          <GoalProvider>
            <ChatProvider>
              <CounselorProvider>
                <AppointmentProvider>
                <ReviewProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public landing / auth routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/counselor-signup" element={<CounselorRegisterPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route
                      path="/pending-approval"
                      element={
                        <AuthOnly>
                          <PendingApprovalPage />
                        </AuthOnly>
                      }
                    />

                    {/* Patient-only workspace */}
                    <Route
                      path="/dashboard"
                      element={
                        <PatientOnly>
                          <DashboardPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/mood"
                      element={
                        <PatientOnly>
                          <MoodPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/mood/insights"
                      element={
                        <PatientOnly>
                          <MoodInsightsPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/discover"
                      element={
                        <PatientOnly>
                          <DiscoverPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/discover/:id"
                      element={
                        <PatientOnly>
                          <ArticleReaderPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/journal"
                      element={
                        <PatientOnly>
                          <JournalPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/goals"
                      element={
                        <PatientOnly>
                          <GoalsPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <PatientOnly>
                          <ChatPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/counselor-chat"
                      element={
                        <PatientOnly>
                          <CounselorChatPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/counselors"
                      element={
                        <PatientOnly>
                          <CounselorSearchPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/counselors/:id"
                      element={
                        <PatientOnly>
                          <CounselorProfilePage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/counselors/:id/book"
                      element={
                        <PatientOnly>
                          <BookAppointmentPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/appointments"
                      element={
                        <PatientOnly>
                          <MyAppointmentsPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/appointments/:id"
                      element={
                        <PatientOnly>
                          <AppointmentSessionPage />
                        </PatientOnly>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <AuthOnly>
                          <ProfilePage />
                        </AuthOnly>
                      }
                    />

                    {/* Legacy counselor-dashboard URL → redirect to new namespace */}
                    <Route
                      path="/counselor-dashboard"
                      element={
                        <CounselorOnly>
                          <Navigate to="/counselor/dashboard" replace />
                        </CounselorOnly>
                      }
                    />

                    {/* Counselor-only namespace /counselor/* */}
                    <Route
                      path="/counselor/dashboard"
                      element={
                        <CounselorOnly>
                          <CounselorDashboardPage />
                        </CounselorOnly>
                      }
                    />
                    {/* Legacy /counselor/tickets URL now aliases the same
                        dashboard (see consolidation note above). */}
                    <Route
                      path="/counselor/tickets"
                      element={
                        <CounselorOnly>
                          <Navigate to="/counselor/dashboard" replace />
                        </CounselorOnly>
                      }
                    />
                    <Route
                      path="/counselor/availability"
                      element={
                        <CounselorOnly>
                          <CounselorAvailabilityPage />
                        </CounselorOnly>
                      }
                    />
                    <Route
                      path="/counselor/appointments"
                      element={
                        <CounselorOnly>
                          <CounselorAppointmentsPage />
                        </CounselorOnly>
                      }
                    />
                    <Route
                      path="/counselor/appointments/:id"
                      element={
                        <CounselorOnly>
                          <AppointmentSessionPage />
                        </CounselorOnly>
                      }
                    />
                    <Route
                      path="/counselor"
                      element={
                        <CounselorOnly>
                          <Navigate to="/counselor/dashboard" replace />
                        </CounselorOnly>
                      }
                    />

                    {/* Admin entry point — the counselor-applications review
                        UI (Approvals tab) already lives on the Tickets page
                        and is only shown when the signed-in user is an
                        admin, so this is a thin, admin-only alias into it
                        rather than a second, duplicate approval screen. */}
                    <Route
                      path="/admin/dashboard"
                      element={
                        <AdminOnly>
                          <Navigate to="/counselor/tickets" replace />
                        </AdminOnly>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <AdminOnly>
                          <Navigate to="/counselor/tickets" replace />
                        </AdminOnly>
                      }
                    />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
                </ReviewProvider>
                </AppointmentProvider>
              </CounselorProvider>
            </ChatProvider>
          </GoalProvider>
        </JournalProvider>
      </MoodProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
