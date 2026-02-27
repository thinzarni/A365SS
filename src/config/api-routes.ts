/* ═══════════════════════════════════════════════════════════
   API Routes — Extracted from Flutter api_routes.dart
   ═══════════════════════════════════════════════════════════ */

// ── Auth ──
export const RENEW_TOKEN = 'generate/renew-token';
export const GENERATE_QR = 'generate/qr';
export const QR_SUCCESS = 'qr-success';
export const DOMAIN_LIST = 'hxm/payroll/domainlist';
export const USER_PROFILE = 'api/employees/profile';
export const USER_PROFILE_UPDATE = 'api/employees/profile/update';

// ── Request Management ──
export const REQUEST_TYPES = 'hxm/request/getrequesttypelist';
export const SAVE_REQUEST = 'hxm/request/saverequest';
export const GET_REQUEST_LIST = 'hxm/request/getrequestlist';
export const GET_REQUEST_DETAIL = 'hxm/request/getrequestdetail';
export const DELETE_REQUEST = 'hxm/request/deleterequest';

// ── Request Lookups ──
export const TRANSPORTATION_TYPES = 'hxm/request/getTransportationType';
export const CARS_LIST = 'hxm/request/getCarList';
export const DRIVERS_LIST = 'hxm/request/getDriverList';
export const RESERVATION_TYPES = 'hxm/request/reservationtypelist';
export const ROOM_TYPES = 'hxm/request/getRoomType';
export const ROOM_REQUEST_LIST = 'hxm/request/getRoomRequestList';
export const PRODUCT_LIST = 'hxm/request/getProductList';
export const PROJECT_LIST = 'hxm/request/getProjectList';
export const TRAVEL_TYPE_LIST = 'hxm/request/getModeoftravelList';
export const VEHICLE_USE_LIST = 'hxm/request/getVehicleuseList';
export const SHIFT_TIME = 'hxm/request/getshifttime';
export const GAP_TIME = 'hxm/request/requestgaptime';

// ── Approvals ──
export const APPROVAL_LIST = 'hxm/approval/approvallist';
export const APPROVAL_DETAIL = 'hxm/approval/getapprovaldetail';
export const SAVE_APPROVAL = 'hxm/approval/saveapproval';

// ── Leave ──
export const SAVE_LEAVE = 'hxm/leave/saveleave';
export const LEAVE_LIST = 'hxm/leave/getleavelist';
export const LEAVE_SUMMARY = 'hxm/leave/totalleavetaken';
export const LEAVE_DETAIL = 'hxm/leave/getleavedetail';
export const DELETE_LEAVE = 'hxm/leave/deleteleaverequest';
export const LEAVE_TYPES = 'hxm/leave/empleavetypelist';
export const LEAVE_TYPE_LIST = 'hxm/leave/leavetypelist';
export const HANDOVER_PERSONS = 'hxm/leave/handoverpersonlist';

// ── Claims ──
export const CLAIM_LIST = 'hxm/claim/getclaimlist';
export const SAVE_CLAIM = 'hxm/claim/saveclaimlist';
export const CLAIM_DETAIL = 'hxm/claim/getClaimDetail';
export const DELETE_CLAIM = 'hxm/claim/deleteclaimrequest';
export const CLAIM_TYPES = 'hxm/claim/claimtypelist';

// ── Setup ──
export const CURRENCY_TYPES = 'hxm/setup/getSetupList/currency';
export const MEMBER_LIST = 'hxm/integration/memberlist';
export const PHOTO_UPLOAD = 'hxm/integration/photoupload';

// ── Team (uses mainUrl / a365.omnicloudapi.com) ──
export const TEAM_LIST = 'api/teams';
export const TEAM_BY_ID = 'api/teams/by-id';
export const TEAM_MEMBER_ATTENDANCE = 'api/teams/teamMemberAttendance';
export const TEAM_LEAVE_SUMMARY = 'api/teams/leaveSummary';
export const TEAM_EMPLOYEE_RANK = '/api/teams/employee/rank';
export const USER_PROFILE_BY_ID = 'api/teams/employees/profile';
export const CALENDAR_VIEW = 'api/checkin/calendarView';
export const HOLIDAYS = 'api/checkin/holidays';
export const MONTHLY_SUMMARY = 'api/checkin/monthly-summary';
export const HOME_DATA = 'api/checkin/home';
