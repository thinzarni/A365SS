/* ═══════════════════════════════════════════════════════════
   API Routes — Extracted from Flutter api_routes.dart
   ═══════════════════════════════════════════════════════════ */
import { flavor } from './features';

const hxmPrefix = flavor === 'prd' || flavor === 'mpt' ? 'api/hxm/' : 'hxm/';

// ── Auth ──
export const RENEW_TOKEN = 'generate/renew-token';
export const GENERATE_QR = 'generate/qr';
export const QR_SUCCESS = 'qr-success';
export const CHECK_PASSWORD_EXPIRY = 'check/password-expried';
export const DOMAIN_LIST = `${hxmPrefix}payroll/domainlist`;
export const PAYROLL_PERIOD = `${hxmPrefix}payroll/payperiod`;
export const SAVE_DEVICE_INFO = `${hxmPrefix}payroll/savedeviceinfo`

export const USER_PROFILE = flavor == 'prd' || flavor === 'mpt' ? 'api/employees/extended-profile' : 'api/employees/profile';
export const USER_PROFILE_UPDATE = 'api/employees/profile/update';
export const GET_FAMILY = 'api/employees/getfamily';
export const FAMILY_UPDATE = 'api/employees/family/update';
export const FAMILY_COMPARE = 'api/employees/family/compare';
export const GET_EXPERIENCE = 'api/employees/getexperience';
export const EXPERIENCE_UPDATE = 'api/employees/experience/update';
export const EXPERIENCE_COMPARE = 'api/employees/experience/compare';
export const EMERGENCY_UPDATE = 'api/employees/emergency/update';
export const EMERGENCY_COMPARE = 'api/employees/emergencycontact/compare';
export const GET_QUALIFICATION = 'api/employees/getqualification';
export const QUALIFICATION_UPDATE = 'api/employees/qualification/update';
export const QUALIFICATION_COMPARE = 'api/employees/qualification/compare';
export const GET_EDUCATION_NAME = 'api/setup/educationname';
export const ADDRESS_UPDATE = 'api/employees/address/update';
export const ADDRESS_COMPARE = 'api/employees/address/compare';
export const GET_DISTRICT_LIST = 'api/setup/getdistrict';
export const GET_TOWNSHIP_LIST = 'api/setup/gettownship';
export const GET_CITY_LIST = 'api/setup/getcity';
export const GET_WARD_LIST = 'api/setup/getward';
export const LOCATION_LIST = 'api/checkin/locations/reference';

// ── Request Management ──
export const REQUEST_TYPES = `${hxmPrefix}request/getrequesttypelist`;
export const SAVE_REQUEST = `${hxmPrefix}request/saverequest`;
export const GET_REQUEST_LIST = `${hxmPrefix}request/getrequestlist`;
export const GET_REQUEST_DETAIL = `${hxmPrefix}request/getrequestdetail`;
export const DELETE_REQUEST = `${hxmPrefix}request/deleterequest`;

// ── Request Lookups ──
export const LEAVE_REASONS = `${hxmPrefix}leavereason/getlist`;
export const TRANSPORTATION_TYPES = `${hxmPrefix}request/getTransportationType`;
export const CARS_LIST = `${hxmPrefix}request/getCarList`;
export const CAR_TYPES = `${hxmPrefix}cartype/list`;
export const DRIVERS_LIST = `${hxmPrefix}request/getDriverList`;
export const RESERVATION_TYPES = `${hxmPrefix}request/reservationtypelist`;
export const ROOM_TYPES = `${hxmPrefix}request/getRoomType`;
export const ROOM_REQUEST_LIST = `${hxmPrefix}request/getRoomRequestList`;
export const PRODUCT_LIST = `${hxmPrefix}request/getProductList`;
export const PROJECT_LIST = `${hxmPrefix}request/getProjectList`;
export const TRAVEL_TYPE_LIST = `${hxmPrefix}request/getModeoftravelList`;
export const VEHICLE_USE_LIST = `${hxmPrefix}request/getVehicleuseList`;
export const SHIFT_TIME = `${hxmPrefix}request/getshifttime`;
export const GAP_TIME = `${hxmPrefix}request/requestgaptime`;
export const ATTENDANCE_SHIFT_DATA = 'api/checkin/shift';

// ── Attendance Overrides (Mobile) ──
export const SAVE_ATTENDANCE_REQ = 'api/attendancerequest/saveattendancerequest';
export const GET_ATTENDANCE_REQ_LIST = 'api/attendancerequest/getAttendanceRequestList';
export const GET_ATTENDANCE_REQ_DETAIL = 'api/attendancerequest/getAttendanceRequestDetail';
export const GET_ATTENDANCE_REASON = 'api/attendancerequest/getAttendanceReason';
export const DELETE_ATTENDANCE_REQ = 'api/attendancerequest/attendancedelete';
export const EXPORT_ATTENDANCE_REQ_TEMPLATE = 'api/attendancerequest/exportattendancerequesttemplate';
export const PREPARE_IMPORT_ATTENDANCE_REQ = 'api/attendancerequest/prepareimportattendancerequest';
export const PREVIEW_IMPORT_ATTENDANCE_REQ = 'api/attendancerequest/previewlistattendancerequest';
export const CONFIRM_IMPORT_ATTENDANCE_REQ = 'api/attendancerequest/importdataattendancerequest';
export const CLEAR_IMPORT_ATTENDANCE_REQ = 'api/attendancerequest/clearattendancerequest';
export const GET_ATTENDANCE_APPROVAL_LIST = 'api/checkin/getapproval';
export const SAVE_ATTENDANCE_APPROVAL = 'api/checkin/saveapproval';
export const MULTI_APPROVE_REJECT = 'api/checkin/multiapproveorreject';

// ── Supervised Attendance / Attendance Import ──
export const EXPORT_ATTENDANCE_RAW_TEMPLATE = `${hxmPrefix}attendance/exportrawtemplate`;
export const PREPARE_IMPORT_ATTENDANCE = `${hxmPrefix}attendance/prepareimportrawdata`;
export const PREVIEW_IMPORT_ATTENDANCE = `${hxmPrefix}attendance/previewrawlist`;
export const CONFIRM_IMPORT_ATTENDANCE = `${hxmPrefix}attendance/importraw`;
export const CLEAR_IMPORT_ATTENDANCE = `api/attendancerequest/clearattendancerequest`;

// ── Approvals ──
export const APPROVAL_LIST = `${hxmPrefix}approval/approvallist`;
export const APPROVAL_DETAIL = `${hxmPrefix}approval/getapprovaldetail`;
export const SAVE_APPROVAL = `${hxmPrefix}approval/saveapproval`;
export const MULTI_SAVE_APPROVAL = `${hxmPrefix}approval/saveApproveOrReject`;

// ── Leave ──
export const SAVE_LEAVE = `${hxmPrefix}leave/saveleave`;
export const LEAVE_LIST = `${hxmPrefix}leave/getleavelist`;
export const LEAVE_SUMMARY = `${hxmPrefix}leave/totalleavetaken`;
export const LEAVE_DETAIL = `${hxmPrefix}leave/getleavedetail`;
export const DELETE_LEAVE = `${hxmPrefix}leave/deleteleaverequest`;
export const LEAVE_TYPES = `${hxmPrefix}leave/empleavetypelist`;
export const LEAVE_TYPE_LIST = `${hxmPrefix}leave/leavetypelist`;
export const HANDOVER_PERSONS = `${hxmPrefix}leave/handoverpersonlist`;
export const EXPORT_LEAVE_TEMPLATE = 'api/request/exportLeaverequesttemplate';
export const EXPORT_LEAVE_DATA = 'api/request/export/leaverequestdata';
export const PREPARE_IMPORT_LEAVE = 'api/request/prepareimportdataleaverequest';
export const PREVIEW_IMPORT_LEAVE = 'api/request/previewlistleaverequest';
export const CONFIRM_IMPORT_LEAVE = 'api/request/importleaverequest';
export const CLEAR_IMPORT_LEAVE = 'api/request/clearleaverequest';
export const SAVE_LEAVE_HR = `${hxmPrefix}request/saverequesthr`;

// ── Claims ──
export const CLAIM_LIST = `${hxmPrefix}claim/getclaimlist`;
export const SAVE_CLAIM = `${hxmPrefix}claim/saveclaimlist`;
export const CLAIM_DETAIL = `${hxmPrefix}claim/getClaimDetail`;
export const DELETE_CLAIM = `${hxmPrefix}claim/deleteclaimrequest`;
export const CLAIM_TYPES = `${hxmPrefix}claim/claimtypelist`;

// ── Setup ──
export const CURRENCY_TYPES = `${hxmPrefix}setup/getSetupList/currency`;
export const GET_SETUP_LIST = 'api/setup/getsetuplist';
export const MEMBER_LIST = `${hxmPrefix}integration/memberlist`;
export const MENU_ITEMS = `${hxmPrefix}integration/get/menuitems`;

// ── Assets ──
export const FILE_UPLOAD = `${hxmPrefix}fileUpload`;
export const FILE_GENERATE_UPLOAD_URL = `${hxmPrefix}fileUpload/generate-upload-url`;
export const FILE_STREAM_UPLOAD = `${hxmPrefix}stream`;
export const FILE_DIRECT_DOWNLOAD = `${hxmPrefix}fileUpload/directdownloadfile`;
export const RULES_AND_REGULATIONS_LIST = `${hxmPrefix}rulesandregulations/getall`;
export const RULES_AND_REGULATIONS_DETAIL = `${hxmPrefix}rulesandregulations`;
export const PHOTO_UPLOAD = `${hxmPrefix}integration/photoupload`;

// ── Separation Authorize (uses base backend) ──
export const SEPARATION_LEAVE_LIST = 'api/separation/leave-authorize/list';
export const SEPARATION_LEAVE_STATUS = 'api/separation/leave-authorize/status';
export const SEPARATION_ATTENDANCE_LIST = 'api/separation/attendance-authorize/list';
export const SEPARATION_ATTENDANCE_STATUS = 'api/separation/attendance-authorize/status';

// ── Organization Structure ──
export const ORG_UNITS = `${hxmPrefix}org/units`;
export const ORG_HIERARCHY = `${hxmPrefix}org/hierarchy`;
export const ORG_UNIT_DETAIL = `${hxmPrefix}org/units/:syskey`;
export const ORG_SPLIT = `${hxmPrefix}org/split`;
export const ORG_MERGE = `${hxmPrefix}org/merge`;
export const ORG_DEPT_HEADS = `${hxmPrefix}org/dept-heads`;
export const ORG_EMPLOYEE_MAPPING = `${hxmPrefix}org/employee-mapping`;
export const ORG_IMPORT_MAPPING = `${hxmPrefix}org/import-mapping`;
export const ORG_EXPORT_MAPPING = `${hxmPrefix}org/export-mapping`;
export const ORG_REPORT_HIERARCHY = `${hxmPrefix}org/report/hierarchy`;
export const ORG_REPORT_EMPLOYEES = `${hxmPrefix}org/report/employees`;
export const ORG_AUDIT_LOGS = `${hxmPrefix}org/audit-logs`;
export const ORG_TYPE_LIST = `${hxmPrefix}typeoforganizationchange/list`;
export const ORG_UNIT_LIST = `${hxmPrefix}unitsubjecttochange/list`;

// ── Team (uses mainUrl / a365.omnicloudapi.com) ──
export const TEAM_LIST = 'api/teams';
export const TEAM_BY_ID = 'api/teams/by-id';
export const TEAM_MEMBER_ATTENDANCE = 'api/teams/teamMemberAttendance';
export const TEAM_LEAVE_SUMMARY = 'api/teams/leaveSummary';
export const TEAM_EMPLOYEE_RANK = '/api/teams/employee/rank';
export const USER_PROFILE_BY_ID = 'api/teams/employees/profile';
export const CALENDAR_VIEW = 'api/checkin/calendarView';
export const CALENDAR_DETAIL = `${hxmPrefix}calendar/detail`;
export const HOLIDAYS = 'api/checkin/holidays';
export const MONTHLY_SUMMARY = 'api/checkin/monthly-summary';
export const ACTIVITY_TYPES = 'api/activity-type';
export const SAVE_CHECKIN = 'api/checkin';

// ── Admin Attendance ──
export const ADMIN_ATTENDANCE_LIST = 'api/checkin/members';
export const ADMIN_ATTENDANCE_COUNTS = 'api/checkin/counts';
export const ADMIN_MEMBER_LIST = `${hxmPrefix}integration/memberlist`;
export const ADMIN_CARD_DATA = `${hxmPrefix}integration/getadmincarddata`;
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

// ── Posts & Comments (uses chatUrl) ──
export const POST_CREATE = 'chat-new/create-post';
export const POST_UPDATE = 'chat-new/update-post';
export const POST_LIST = 'chat-new/get-posts';
export const POST_REACT = 'chat-new/react-post';
export const POST_DELETE = 'chat-new/delete-post';
export const POST_REACTION_USERS = 'chat-new/get-reaction-users';
export const COMMENT_CREATE = 'chat-new/create-comment';
export const COMMENT_LIST = 'chat-new/get-comments';
export const COMMENT_DELETE = 'chat-new/delete-comment';
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

// ── Supervise ──
export const SUPERVISE_WORKPOLICY_LIST = 'api/supervise/workpolicy/list';
export const SUPERVISE_USER_LIST = 'api/supervise/users';
export const WORKPOLICY_PERSONALIZE = `${hxmPrefix}workpolicyconfig/personalize`;
export const WORKPOLICY_INSERT = `${hxmPrefix}workpolicyconfig/insert`;
export const SETUP_WORKPOLICY = `${hxmPrefix}setup/getSetupList/workpolicy`;
export const SETUP_ROSTER = `${hxmPrefix}setup/getSetupList/roster`;
export const SETUP_CALENDAR = `${hxmPrefix}setup/getSetupList/calendar`;

// ── Work Policy Import ──
export const WORKPOLICY_DELETE = `${hxmPrefix}workpolicyconfig/delete`;
export const WORKPOLICY_EXPORT_TEMPLATE = `${hxmPrefix}workpolicyconfig/workpolicy/exporttemplate`;
export const WORKPOLICY_EXPORT = `${hxmPrefix}workpolicyconfig/workpolicy/export`;
export const WORKPOLICY_PREPARE_IMPORT = `${hxmPrefix}workpolicyconfig/prepareimportdata`;
export const WORKPOLICY_PREVIEW_DB = `${hxmPrefix}workpolicyconfig/previewdb`;
export const WORKPOLICY_PREVIEW_IMPORT = `${hxmPrefix}workpolicyconfig/previewlist`;
export const WORKPOLICY_CONFIRM_IMPORT = `${hxmPrefix}workpolicyconfig/import`;
export const WORKPOLICY_CLEAR_IMPORT = `${hxmPrefix}workpolicyconfig/clear`;
export const WORKPOLICY_CHECK_IMPORT_STATUS = `${hxmPrefix}workpolicyconfig/checkinputstatus`;
