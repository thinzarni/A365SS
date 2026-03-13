import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, GuestOnly } from '../components/auth/AuthGuard';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage/LoginPage';
import QRLoginPage from '../pages/LoginPage/QRLoginPage';
import RequestListPage from '../pages/RequestListPage/RequestListPage';
import NewRequestPage from '../pages/NewRequestPage/NewRequestPage';
import RequestDetailPage from '../pages/RequestDetailPage/RequestDetailPage';
import ApprovalListPage from '../pages/ApprovalListPage/ApprovalListPage';
import ApprovalDetailPage from '../pages/ApprovalDetailPage/ApprovalDetailPage';
import ReservationsPage from '../pages/ReservationsPage/ReservationsPage';
import ClaimsPage from '../pages/ClaimsPage/ClaimsPage';
import NewClaimPage from '../pages/ClaimsPage/NewClaimPage';
import ClaimDetailPage from '../pages/ClaimsPage/ClaimDetailPage';
import LeaveSummaryPage from '../pages/LeaveSummaryPage/LeaveSummaryPage';
import LeavePage from '../pages/LeavePage/LeavePage';
import TeamPage from '../pages/TeamPage/TeamPage';
import TeamDetailView from '../pages/TeamPage/TeamDetailView';
import MemberDetailView from '../pages/TeamPage/MemberDetailView';
import HRViewPage from '../pages/HRViewPage/HRViewPage';
import HolidaysPage from '../pages/HolidaysPage/HolidaysPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import ChatPage from '../pages/ChatPage/ChatPage';
import DomainSelectPage from '../pages/DomainSelectPage/DomainSelectPage';
import SecurityQuestionsPage from '../pages/SecurityQuestionsPage/SecurityQuestionsPage';
import ForceChangePasswordPage from '../pages/ForceChangePasswordPage/ForceChangePasswordPage';
import VerifyOtpPage from '../pages/VerifyOtpPage/VerifyOtpPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage/ForgotPasswordPage';
import ComingSoonPage from '../pages/ComingSoonPage/ComingSoonPage';
import RulesAndRegulationsPage from '../pages/RulesAndRegulationsPage/RulesAndRegulationsPage';
import PdfListPage from '../pages/RulesAndRegulationsPage/PdfListPage';
import NotificationPage from '../pages/NotificationPage/NotificationPage';
import AttendancePage from '../pages/AttendancePage/AttendancePage';

// ── Flavor-based profile page ──
// prd  → 7-tab ESS profile (Employment, Personal, Emergency Contacts, Work Experience, etc.)
// a365 → original simple profile view
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import ProfilePagePrd from '../pages/ProfilePage/ProfilePagePrd';
import { flavor } from '../config/features';
const ActiveProfilePage = flavor === 'prd' ? ProfilePagePrd : ProfilePage;

export const router = createBrowserRouter([
    // ── Guest routes ──
    {
        element: <GuestOnly />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/qr-login', element: <QRLoginPage /> },
            { path: '/verify-otp', element: <VerifyOtpPage /> },
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
            { path: '/security-questions', element: <SecurityQuestionsPage /> },
        ],
    },

    // ── Unguarded routes (accessible by both guests and authenticated users) ──
    { path: '/force-change-password', element: <ForceChangePasswordPage /> },

    // ── Authenticated routes ──
    {
        element: <RequireAuth />,
        children: [
            { path: '/select', element: <DomainSelectPage /> },
            {
                element: <AppLayout />,
                children: [
                    { index: true, element: <Navigate to="/dashboard" replace /> },
                    { path: '/dashboard', element: <DashboardPage /> },
                    // ── Plural routes (canonical) ──
                    { path: '/requests', element: <RequestListPage /> },
                    { path: '/requests/new', element: <NewRequestPage /> },
                    { path: '/requests/:id', element: <RequestDetailPage /> },
                    { path: '/approvals', element: <ApprovalListPage /> },
                    { path: '/approvals/:id', element: <ApprovalDetailPage /> },
                    { path: '/reservations', element: <ReservationsPage /> },
                    { path: '/claims', element: <ClaimsPage /> },
                    { path: '/claims/new', element: <NewClaimPage /> },
                    { path: '/claims/:id', element: <ClaimDetailPage /> },
                    { path: '/leave-summary', element: <LeaveSummaryPage /> },
                    { path: '/holidays', element: <HolidaysPage /> },
                    // ── Singular aliases — API datalist returns these router values ──
                    { path: '/request', element: <RequestListPage /> },
                    { path: '/request/new', element: <NewRequestPage /> },
                    { path: '/request/:id', element: <RequestDetailPage /> },
                    { path: '/approval', element: <ApprovalListPage /> },
                    { path: '/approval/:id', element: <ApprovalDetailPage /> },
                    { path: '/reservation', element: <ReservationsPage /> },
                    { path: '/holiday', element: <HolidaysPage /> },
                    // ── Request subtypes — each filters RequestListPage to that type ──
                    // Mirrors mobile: /claim, /overtime etc → RequestPage(requestType: matched)
                    { path: '/claim', element: <RequestListPage /> },
                    { path: '/claim/new', element: <NewRequestPage /> },
                    { path: '/overtime', element: <RequestListPage /> },
                    { path: '/overtime/new', element: <NewRequestPage /> },
                    { path: '/wfh', element: <RequestListPage /> },
                    { path: '/wfh/new', element: <NewRequestPage /> },
                    { path: '/transportation', element: <RequestListPage /> },
                    { path: '/transportation/new', element: <NewRequestPage /> },
                    { path: '/travel', element: <RequestListPage /> },
                    { path: '/travel/new', element: <NewRequestPage /> },
                    { path: '/cashadvance', element: <RequestListPage /> },
                    { path: '/cashadvance/new', element: <NewRequestPage /> },
                    { path: '/offinlieu', element: <RequestListPage /> },
                    { path: '/offinlieu/new', element: <NewRequestPage /> },
                    // ── Attendance subtypes — use existing approval pages ──
                    { path: '/attendanceapproval', element: <ApprovalListPage /> },
                    { path: '/attendancerequest', element: <RequestListPage /> },
                    { path: '/locationapproval', element: <ApprovalListPage /> },
                    // ── Other ──
                    { path: '/leave', element: <LeavePage /> },
                    { path: '/team', element: <TeamPage /> },
                    { path: '/team/view/:teamSyskey', element: <TeamDetailView /> },
                    { path: '/team/member/:memberSyskey', element: <MemberDetailView /> },
                    { path: '/hrview', element: <HRViewPage /> },
                    { path: '/employee', element: <HRViewPage /> },
                    { path: '/chat', element: <ChatPage /> },
                    { path: '/profile', element: <ActiveProfilePage /> },
                    { path: '/rulesandreg', element: <RulesAndRegulationsPage /> },
                    { path: '/rulesandreg/:id', element: <PdfListPage /> },
                    { path: '/notifications', element: <NotificationPage /> },
                    { path: '/attendance', element: <AttendancePage /> },

                    // ── Catch-all for unimplemented tabs (e.g., socialpost, customai, visionai) ──
                    { path: '*', element: <ComingSoonPage /> },
                ],
            },
        ],
    },

    // ── Fallback ──
    { path: '*', element: <Navigate to="/" replace /> },
]);
