import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, GuestOnly } from '../components/auth/AuthGuard';
import AppLayout from '../components/layout/AppLayout';
import GlobalErrorBoundary from '../components/layout/GlobalErrorBoundary';
import { Loader2 } from 'lucide-react';
import { flavor } from '../config/features';

const FallbackLoading = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
        <Loader2 className="animate-spin" size={32} color="#3b82f6" />
    </div>
);

const Loadable = (Component: React.ComponentType<any>) => (props: any) => (
    <Suspense fallback={<FallbackLoading />}>
        <Component {...props} />
    </Suspense>
);

const LoginPage = Loadable(lazy(() => import('../pages/LoginPage/LoginPage')));
const QRLoginPage = Loadable(lazy(() => import('../pages/LoginPage/QRLoginPage')));
const RequestListPage = Loadable(lazy(() => import('../pages/RequestListPage/RequestListPage')));
const NewRequestPage = Loadable(lazy(() => import('../pages/NewRequestPage/NewRequestPage')));
const RequestDetailPage = Loadable(lazy(() => import('../pages/RequestDetailPage/RequestDetailPage')));
const ApprovalListPage = Loadable(lazy(() => import('../pages/ApprovalListPage/ApprovalListPage')));
const ApprovalDetailPage = Loadable(lazy(() => import('../pages/ApprovalDetailPage/ApprovalDetailPage')));
const AttendanceApprovalListPage = Loadable(lazy(() => import('../pages/AttendanceApprovalListPage/AttendanceApprovalListPage')));
const AttendanceApprovalDetailPage = Loadable(lazy(() => import('../pages/AttendanceApprovalDetailPage/AttendanceApprovalDetailPage')));
const ReservationsPage = Loadable(lazy(() => import('../pages/ReservationsPage/ReservationsPage')));
const ClaimsPage = Loadable(lazy(() => import('../pages/ClaimsPage/ClaimsPage')));
const NewClaimPage = Loadable(lazy(() => import('../pages/ClaimsPage/NewClaimPage')));
const ClaimDetailPage = Loadable(lazy(() => import('../pages/ClaimsPage/ClaimDetailPage')));
const LeaveSummaryPage = Loadable(lazy(() => import('../pages/LeaveSummaryPage/LeaveSummaryPage')));
const LeavePage = Loadable(lazy(() => import('../pages/LeavePage/LeavePage')));
const TeamPage = Loadable(lazy(() => import('../pages/TeamPage/TeamPage')));
const TeamDetailView = Loadable(lazy(() => import('../pages/TeamPage/TeamDetailView')));
const MemberDetailView = Loadable(lazy(() => import('../pages/TeamPage/MemberDetailView')));
const HRViewPage = Loadable(lazy(() => import('../pages/HRViewPage/HRViewPage')));
const HolidaysPage = Loadable(lazy(() => import('../pages/HolidaysPage/HolidaysPage')));
const DashboardPage = Loadable(lazy(() => import('../pages/DashboardPage/DashboardPage')));
const ChatPage = Loadable(lazy(() => import('../pages/ChatPage/ChatPage')));
const DomainSelectPage = Loadable(lazy(() => import('../pages/DomainSelectPage/DomainSelectPage')));
const SecurityQuestionsPage = Loadable(lazy(() => import('../pages/SecurityQuestionsPage/SecurityQuestionsPage')));
const ForceChangePasswordPage = Loadable(lazy(() => import('../pages/ForceChangePasswordPage/ForceChangePasswordPage')));
const VerifyOtpPage = Loadable(lazy(() => import('../pages/VerifyOtpPage/VerifyOtpPage')));
const ForgotPasswordPage = Loadable(lazy(() => import('../pages/ForgotPasswordPage/ForgotPasswordPage')));
const ComingSoonPage = Loadable(lazy(() => import('../pages/ComingSoonPage/ComingSoonPage')));
const RulesAndRegulationsPage = Loadable(lazy(() => import('../pages/RulesAndRegulationsPage/RulesAndRegulationsPage')));
const PdfListPage = Loadable(lazy(() => import('../pages/RulesAndRegulationsPage/PdfListPage')));
const NotificationPage = Loadable(lazy(() => import('../pages/NotificationPage/NotificationPage')));
const AttendancePage = Loadable(lazy(() => import('../pages/AttendancePage/AttendancePage')));
const SeparationLeaveAuthorizePage = Loadable(lazy(() => import('../pages/SeparationLeaveAuthorizePage/SeparationLeaveAuthorizePage')));
const SeparationAttendanceAuthorizePage = Loadable(lazy(() => import('../pages/SeparationAttendanceAuthorizePage/SeparationAttendanceAuthorizePage')));
const SupervisedAttendancePage = Loadable(lazy(() => import('../pages/SupervisedAttendancePage/SupervisedAttendancePage')));
const WorkPolicyChangePage = Loadable(lazy(() => import('../pages/WorkPolicyChangePage/WorkPolicyChangePage')));
const WorkPolicyCreatePage = Loadable(lazy(() => import('../pages/WorkPolicyCreatePage/WorkPolicyCreatePage')));
const FerryRequestPage = Loadable(lazy(() => import('../pages/FerryRequestPage/FerryRequestPage')));
const FerryRequestListPage = Loadable(lazy(() => import('../pages/FerryRequestPage/FerryRequestListPage')));
const FerryRequestDetailPage = Loadable(lazy(() => import('../pages/FerryRequestPage/FerryRequestDetailPage')));
const FerryApprovalFormPage = Loadable(lazy(() => import('../pages/FerryApprovalFormPage/FerryApprovalFormPage')));

// ── Flavor-based profile page ──
// prd  → 7-tab ESS profile (Employment, Personal, Emergency Contacts, Work Experience, etc.)
// a365 → original simple profile view
const ProfilePage = Loadable(lazy(() => import('../pages/ProfilePage/ProfilePage')));
const ProfilePagePrd = Loadable(lazy(() => import('../pages/ProfilePage/ProfilePagePrd')));
const NewAttendanceRequestPage = Loadable(lazy(() => import('../pages/AttendanceRequestPage/NewAttendanceRequestPage')));
const PayslipPage = Loadable(lazy(() => import('../pages/PayslipPage/PayslipPage'))); // route disabled

const ActiveProfilePage = flavor === 'prd' || flavor === 'mpt' ? ProfilePagePrd : ProfilePage;

export const router = createBrowserRouter([
    // ── Guest routes ──
    {
        element: <GuestOnly />,
        errorElement: <GlobalErrorBoundary />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/qr-login', element: <QRLoginPage /> },
            { path: '/verify-otp', element: <VerifyOtpPage /> },
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
            { path: '/security-questions', element: <SecurityQuestionsPage /> },
        ],
    },

    // ── Unguarded routes (accessible by both guests and authenticated users) ──
    { path: '/force-change-password', element: <ForceChangePasswordPage />, errorElement: <GlobalErrorBoundary /> },

    // ── Authenticated routes ──
    {
        element: <RequireAuth />,
        errorElement: <GlobalErrorBoundary />,
        children: [
            { path: '/select', element: <DomainSelectPage /> },
            {
                element: <AppLayout />,
                errorElement: <GlobalErrorBoundary />,
                children: [
                    { index: true, element: <Navigate to="/dashboard" replace /> },
                    { path: '/dashboard', element: <DashboardPage /> },
                    // ── Plural routes (canonical) ──
                    { path: '/requests', element: <RequestListPage /> },
                    { path: '/requests/new', element: <NewRequestPage /> },
                    { path: '/requests/edit/:id', element: <NewRequestPage /> },
                    { path: '/requests/:id', element: <RequestDetailPage /> },
                    { path: '/approvals', element: <ApprovalListPage /> },
                    { path: '/approvals/:id', element: <ApprovalDetailPage /> },
                    { path: '/ferry_approval/:id', element: <FerryApprovalFormPage /> },
                    { path: '/reservations', element: <ReservationsPage /> },
                    { path: '/claims', element: <ClaimsPage /> },
                    { path: '/claims/new', element: <NewClaimPage /> },
                    { path: '/claims/:id', element: <ClaimDetailPage /> },
                    { path: '/leave-summary', element: <LeaveSummaryPage /> },
                    { path: '/holidays', element: <HolidaysPage /> },
                    // ── Singular aliases — API datalist returns these router values ──
                    { path: '/request', element: <RequestListPage /> },
                    { path: '/request/new', element: <NewRequestPage /> },
                    { path: '/request/edit/:id', element: <NewRequestPage /> },
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
                    // ── Ferry Service (company ferry/bus system) ──
                    { path: '/ferry_request', element: <FerryRequestListPage /> },
                    { path: '/ferry_request/new', element: <FerryRequestPage /> },
                    { path: '/ferry_request/edit/:id', element: <FerryRequestPage /> },
                    { path: '/ferry_request/:id', element: <FerryRequestDetailPage /> },
                    // ── HR Complaint Request Flow ──
                    { path: '/hr_complaint', element: <FerryRequestListPage /> },
                    { path: '/hr_complaint/new', element: <FerryRequestPage /> },
                    { path: '/hr_complaint/edit/:id', element: <FerryRequestPage /> },
                    { path: '/hr_complaint/:id', element: <FerryRequestDetailPage /> },
                    { path: '/hrcomplaint', element: <FerryRequestListPage /> },
                    { path: '/hrcomplaint/new', element: <FerryRequestPage /> },
                    { path: '/hrcomplaint/edit/:id', element: <FerryRequestPage /> },
                    { path: '/hrcomplaint/:id', element: <FerryRequestDetailPage /> },
                    // ── Attendance subtypes — use existing approval pages ──
                    { path: '/attendanceapproval', element: <AttendanceApprovalListPage /> },
                    { path: '/attendanceapproval/:id/:type', element: <AttendanceApprovalDetailPage /> },
                    { path: '/attendancerequest', element: <RequestListPage /> },
                    { path: '/attendancerequest/new', element: <NewAttendanceRequestPage /> },
                    { path: '/attendancerequest/edit/:id', element: <NewAttendanceRequestPage /> },
                    { path: '/attendancerequest/:id', element: <NewAttendanceRequestPage /> },
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
                    // { path: '/profile/:userId', element: <ActiveProfilePage /> },
                    { path: '/rulesandreg', element: <RulesAndRegulationsPage /> },
                    { path: '/rulesandreg/:id', element: <PdfListPage /> },
                    { path: '/notifications', element: <NotificationPage /> },
                    { path: '/attendance', element: <AttendancePage /> },
                    { path: '/separation-leave-authorize', element: <SeparationLeaveAuthorizePage /> },
                    { path: '/separation-attendance-authorize', element: <SeparationAttendanceAuthorizePage /> },
                    { path: '/separationLeaveAuthorize', element: <SeparationLeaveAuthorizePage /> },
                    { path: '/separationAttendanceAuthorize', element: <SeparationAttendanceAuthorizePage /> },
                    { path: '/attendancelist', element: <SupervisedAttendancePage /> },
                    { path: '/employeeworkpolicy', element: <WorkPolicyChangePage /> },
                    { path: '/employeeworkpolicy/new', element: <WorkPolicyCreatePage /> },
                    { path: '/employeeworkpolicy/edit/:syskey', element: <WorkPolicyCreatePage /> },
                    { path: '/payslip/list', element: <PayslipPage /> },


                    // ── Catch-all for unimplemented tabs (e.g., socialpost, customai, visionai) ──
                    { path: '*', element: <ComingSoonPage /> },
                ],
            },
        ],
    },

    // ── Fallback ──
    { path: '*', element: <Navigate to="/" replace /> },
], { basename: import.meta.env.BASE_URL });
