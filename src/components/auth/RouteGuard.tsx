import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import toast from 'react-hot-toast';

// Routes that don't need explicit menu access (they are accessible to all authenticated users)
const ALWAYS_ALLOWED_ROUTES = [
    '/dashboard',
    '/profile',
    '/team',
    '/socialpost',
    '/feed',
    '/chat',
    '/notifications',
    '/select',
    '/force-change-password',
    '/rulesandreg',
    '/payslip',
    '/attendance',
];

// Mapping of canonical API routers to their frontend aliases/sub-routes
// For example, if a user has access to '/request', they are allowed to access '/requests', '/claim', etc.
const ROUTE_ALIASES: Record<string, string[]> = {
    '/request': ['/requests', '/claim', '/overtime', '/wfh', '/transportation', '/travel', '/cashadvance', '/offinlieu'],
    '/approval': ['/approvals'],
    '/reservation': ['/reservations'],
    '/holiday': ['/holidays'],
    '/leave': ['/leave-summary', '/separation-leave-authorize', '/separation-attendance-authorize', '/separationLeaveAuthorize', '/separationAttendanceAuthorize'],
    '/ferry_request': ['/ferry'],
    '/hr_complaint': ['/hrcomplaint'],
};

export function RouteGuard() {
    const location = useLocation();
    const menuList = useAuthStore(state => state.menuList);
    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        const path = location.pathname;
        
        // Bypass guard for client-side navigations (i.e. 'onclick' routes)
        // location.key is 'default' only on initial page load / manual URL entry
        if (location.key !== 'default') {
            setIsAuthorized(true);
            return;
        }

        // 1. Check if path is in always allowed list (prefix match)
        if (ALWAYS_ALLOWED_ROUTES.some(route => path.startsWith(route) || path === '/')) {
            setIsAuthorized(true);
            return;
        }

        // 2. Get the base segment of the current path (e.g. "/requests/new" -> "/requests")
        const pathSegments = path.split('/').filter(Boolean);
        const baseRoute = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';

        // 3. Build a set of all allowed base routes based on the user's menuList
        const allowedBaseRoutes = new Set<string>();
        
        menuList.forEach(item => {
            if (!item.router) return;
            // Standardize to start with slash
            const itemRouter = item.router.startsWith('/') ? item.router : `/${item.router}`;
            allowedBaseRoutes.add(itemRouter);
            
            // Add any aliases defined for this router
            if (ROUTE_ALIASES[itemRouter]) {
                ROUTE_ALIASES[itemRouter].forEach(alias => allowedBaseRoutes.add(alias));
            }
        });

        // 4. Check if the current base route is in the allowed set
        const hasAccess = allowedBaseRoutes.has(baseRoute);

        if (!hasAccess) {
            toast.error("You don't have permission to access this page.");
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }
    }, [location.pathname, menuList]);

    if (!isAuthorized) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
