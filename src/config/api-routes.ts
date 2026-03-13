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
export const CAR_TYPES = 'hxm/cartype/list';
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
export const ATTENDANCE_SHIFT_DATA = 'api/checkin/shift';

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

// ── Assets ──
export const RULES_AND_REGULATIONS_LIST = 'hxm/rulesandregulations/getall';
export const RULES_AND_REGULATIONS_DETAIL = 'hxm/rulesandregulations';
export const PHOTO_UPLOAD = 'hxm/integration/photoupload';

// ── Organization Structure ──
export const ORG_UNITS = 'hxm/org/units';
export const ORG_HIERARCHY = 'hxm/org/hierarchy';
export const ORG_UNIT_DETAIL = 'hxm/org/units/:syskey';
export const ORG_SPLIT = 'hxm/org/split';
export const ORG_MERGE = 'hxm/org/merge';
export const ORG_DEPT_HEADS = 'hxm/org/dept-heads';
export const ORG_EMPLOYEE_MAPPING = 'hxm/org/employee-mapping';
export const ORG_IMPORT_MAPPING = 'hxm/org/import-mapping';
export const ORG_EXPORT_MAPPING = 'hxm/org/export-mapping';
export const ORG_REPORT_HIERARCHY = 'hxm/org/report/hierarchy';
export const ORG_REPORT_EMPLOYEES = 'hxm/org/report/employees';
export const ORG_AUDIT_LOGS = 'hxm/org/audit-logs';
export const ORG_TYPE_LIST = 'hxm/typeoforganizationchange/list';
export const ORG_UNIT_LIST = 'hxm/unitsubjecttochange/list';

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
export const ACTIVITY_TYPES = 'api/activity-type';
export const SAVE_CHECKIN = 'api/checkin';
// ── Chat (uses chatUrl) ──
export const CHAT_CREATE = 'chat-new/create';
export const CHAT_SEARCH = 'chat-new/search';
export const CHAT_CONV_LIST = 'chat-new/list';
export const CHAT_MSG_LIST = 'chat/listbyID';
export const CHAT_SEND_MSG = 'chat/messages';
export const CHAT_READ_MSG = 'chat-new/read-message';
export const CHAT_REACTION = 'chat-new/reaction';
export const CHAT_DELETE_MSG = 'chat-new/delete-message';
export const CHAT_EDIT_MSG = 'chat-new/edit-message';
export const CHAT_ATTACHMENT = 'chat/attachment';
export const CHAT_PARTICIPANTS = 'chat-new/conversations/:id/participants';  // GET — view all
export const CHAT_ADD_PARTICIPANTS = 'chat-new/add/participants';             // POST
export const CHAT_REMOVE_PARTICIPANT = 'chat-new/leave-group';                 // POST
export const CHAT_CHANGE_NAME = 'chat-new/conversations/:id/name';
export const CHAT_CONV_BY_NAME = 'chat/conversation-id';
export const CHAT_SEARCH_USER = 'api/employees/search';

// ── Notifications ──
export const NOTIFICATION_LIST = 'api/notification/list';
export const NOTIFICATION_READ = 'api/notification/read-status';

// ── ESS Profile (UI-only placeholders — no backend yet) ──
export const ESS_EMPLOYMENT_PROFILE = 'api/employees/employment-profile';
export const ESS_PERSONAL_PROFILE = 'api/employees/personal-profile';
export const ESS_EMERGENCY_CONTACTS = 'api/employees/emergency-contacts';
export const ESS_WORK_EXPERIENCE = 'api/employees/work-experience';
export const ESS_QUALIFICATION = 'api/employees/qualification';
export const ESS_FAMILY_INFO = 'api/employees/family-info';
export const ESS_CONTACT_INFO = 'api/employees/contact-info';
export const ESS_ADDRESS_STATES = 'api/master/states';
export const ESS_ADDRESS_DISTRICTS = 'api/master/districts';
export const ESS_ADDRESS_TOWNSHIPS = 'api/master/townships';
