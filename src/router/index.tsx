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
import HolidaysPage from '../pages/HolidaysPage/HolidaysPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import ChatPage from '../pages/ChatPage/ChatPage';
import DomainSelectPage from '../pages/DomainSelectPage/DomainSelectPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import OrganizationStructurePage from '../pages/OrganizationStructurePage/OrganizationStructurePage';

export const router = createBrowserRouter([
    // ── Guest routes ──
    {
        element: <GuestOnly />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/qr-login', element: <QRLoginPage /> },
        ],
    },

    // ── Authenticated routes ──
    {
        element: <RequireAuth />,
        children: [
            { path: '/select', element: <DomainSelectPage /> },
            {
                element: <AppLayout />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: '/dashboard', element: <DashboardPage /> },
                    { path: '/requests', element: <RequestListPage /> },
                    { path: '/requests/new', element: <NewRequestPage /> },
                    { path: '/requests/:id', element: <RequestDetailPage /> },
                    { path: '/approvals', element: <ApprovalListPage /> },
                    { path: '/approvals/:id', element: <ApprovalDetailPage /> },
                    { path: '/reservations', element: <ReservationsPage /> },
                    { path: '/leave', element: <LeavePage /> },
                    { path: '/claims', element: <ClaimsPage /> },
                    { path: '/claims/new', element: <NewClaimPage /> },
                    { path: '/claims/:id', element: <ClaimDetailPage /> },
                    { path: '/leave-summary', element: <LeaveSummaryPage /> },
                    { path: '/holidays', element: <HolidaysPage /> },
                    { path: '/team', element: <TeamPage /> },
                    { path: '/team/view/:teamSyskey', element: <TeamDetailView /> },
                    { path: '/team/member/:memberSyskey', element: <MemberDetailView /> },
                    { path: '/chat', element: <ChatPage /> },
                    { path: '/profile', element: <ProfilePage /> },
                    { path: '/organization', element: <OrganizationStructurePage /> },
                ],
            },
        ],
    },

    // ── Fallback ──
    { path: '*', element: <Navigate to="/" replace /> },
]);
