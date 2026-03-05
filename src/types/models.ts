/* ═══════════════════════════════════════════════════════════
   Data Models — Derived from Flutter source
   ═══════════════════════════════════════════════════════════ */

export type RequestStatusCode = '1' | '2' | '3' | '4';

export const RequestStatus = {
  Pending: '1',
  Approved: '2',
  Rejected: '3',
  All: '4',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const RequestType = {
  Reservation: '1',
  Transportation: '2',
  All: '4',
} as const;
export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export interface Approver {
  syskey: string;
  name: string;
  userid: string;
  position: string;
  photo: string;
}

export interface RequestModel {
  syskey: string;
  eid: string;
  name: string;
  refno: number;
  requesttype: string;
  requesttypedesc: string;
  requestsubtype: string;
  requestsubtypedesc: string;
  requeststatus: RequestStatusCode;
  // Dates & times
  startdate: string;
  enddate: string;
  starttime: string;
  endtime: string;
  date: string;
  time: string;
  duration: string;
  selectday: string;
  hour: string;
  // Approvals
  approver: string;
  approvedby: string;
  employee_syskey: string;
  selectedApprovers: Approver[];
  selectedMembers: Approver[];
  selectedAcconpanyPersons: Approver[];
  selectedHandovers: Approver[];
  // Transportation
  pickupplace: string;
  dropoffplace: string;
  userleavetime: string;
  arrivaltime: string;
  returntime: string;
  gobackarrivaltime: string;
  gobackreturntime: string;
  isgoing: boolean;
  isreturn: boolean;
  isgoback: boolean;
  car: string;
  driver: string;
  // Location (WFH)
  latitude: number;
  longitude: number;
  locationname: string;
  locationsyskey: string;
  // Financial
  amount: number;
  currencytype: string;
  estimatedbudget: number;
  // Reservation
  rooms: string;
  roomsdesc: string;
  roomname: string;
  maxpeople: number;
  // Travel
  departuredate: string;
  arrivaldate: string;
  departuretime: string;
  plannedreturn: string;
  fromPlace: string;
  toPlace: string;
  fromplace: string;
  toplace: string;
  modeoftravel: string[];
  vehicleuse: string[];
  product: string;
  project: string;
  days: number;
  // Overtime
  otday: string;
  ottype: number;
  // Meta
  remark: string;
  comment: string;
  attachment: string[];
  createddate: string;
  createdtime: string;
}

export interface RequestDetailModel {
  syskey: string;
  eid: string;
  approver: string;
  duration: string;
  startdate: string;
  enddate: string;
  starttime: string;
  endtime: string;
  date: string;
  time: string;
  refno: number;
  remark: string;
  requesttype: string;
  requesttypedesc: string;
  requestsubtype: string;
  requestsubtypedesc: string;
  approvedby: string;
  employee_syskey: string;
  requeststatus: number;
  attachment: Array<Record<string, unknown>>;
  selectedApprovers: Approver[];
  latitude?: number;
  longitude?: number;
  locationname?: string;
  locationsyskey?: string;
  selectday: string;
  fromplace: string;
  toplace: string;
  pickupplace: string;
  dropoffplace: string;
  userleavetime: string;
  isgoing: boolean;
  arrivaltime: string;
  isreturn: boolean;
  returntime: string;
  isgoback: boolean;
  gobackarrivaltime: string;
  gobackreturntime: string;
  car: string;
  driver: string;
  comment: string;
  amount: number;
  currencytype: string;
  hour: string;
  otday: string;
  rooms: string;
  roomsdesc: string;
  maxpeople: number;
  departuredate: string;
  arrivaldate: string;
  departuretime: string;
  plannedreturn: string;
  product: string;
  project: string;
  modeoftravel: string[];
  vehicleuse: string[];
  estimatedbudget: number;
  days: string;
  ottype: number;
  selectedAcconpanyPersons: Approver[];
}

export interface RequestDetail {
  statuscode: number;
  datalist: RequestDetailModel;
  approverList: Approver[];
}

export interface ClaimModel {
  syskey: string;
  date: string;
  refno: number;
  remark: string;
  requeststatus: RequestStatusCode;
  requesttype: string;
  claimtype: string;
  approvedby: string;
  amount: number;
  currencytype: string;
  attachment: string[];
  selectedApprovers: Approver[];
  fromPlace: string;
  toPlace: string;
}

export interface ApprovalDataModel {
  syskey: string;
  status: string;
  comment: string;
  car: string;
  driver: string;
  selectedApprovers: Approver[];
}

export interface ApprovalDetailModel {
  statuscode: number;
  datalist: ApprovalModel;
  isAdmin: boolean;
  isCarWayAdmin: boolean;
  accompanyPersonList: Approver[];
  memberList: Approver[];
}

export interface ApprovalModel {
  syskey: string;
  [key: string]: unknown;
}

export interface TypesModel {
  syskey: string;
  description: string;
  code?: string;
  maxpeople?: number;
}

export interface LeaveType {
  syskey: string;
  description: string;
  balance?: number;
  used?: number;
  remaining?: number;
}

export interface CarsModel {
  syskey: string;
  description: string;
}

export interface DriverModel {
  syskey: string;
  description: string;
}

export interface RoomRequest {
  syskey: string;
  roomname: string;
  startdate: string;
  enddate: string;
  starttime: string;
  endtime: string;
  status: string;
  requestedby: string;
  [key: string]: unknown;
}

export interface MenuListItem {
  id: string;
  label: string;
  iconPath: string;
  type?: number;
  badgeCount?: number;
  router?: string;
}

export interface UserProfile {
  syskey: string;
  userid: string;
  name: string;
  email: string;
  position: string;
  department: string;
  division: string;
  photo: string;
  domain: string;
  domainName?: string;
  usersyskey?: string;
  role?: string;
}

export interface ApiResponse<T = unknown> {
  statuscode: string | number;
  message?: string;
  datalist?: T;
}

/* ═══════════════════════════════════════════════════════════
   Team Models — Derived from Flutter team_member.dart, team.dart
   ═══════════════════════════════════════════════════════════ */

export interface TeamMember {
  syskey: string;
  userName: string;
  employeeId: string;
  profile: string | null;
  userid: string;
  rank: string;
  department: string;
  division: string;
  teamId: string;
  level: 'senior' | 'user' | 'junior' | '';
  /** Priority 1-6 = management level */
  priority: string;
  /** e.g. "Leader" */
  role: string | null;
  /** e.g. "Reporting Officer" */
  type: string | null;
  hasJunior: boolean;
  // Attendance stats
  workingDays: string;
  timeInCount: string;
  timeOutCount: string;
  activityCount: string;
  leaveCount: string;
  requiredWorkDays: string;
  todayTimeInCount: string;
  todayTimeOutCount: string;
  todayIsLeave: string;
  /** 0 = none, 1 = pending, 2 = approved, 3 = rejected */
  leaveStatus: number;
  /** 601 = clocked in, other = clocked out */
  lastRecordTypeName: number;
  timeInTime: string;
  timeOutTime: string;
  key: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  syskey: string;
  teamMembers?: TeamMember[];
  key: string;
  role?: string;
}

export interface TeamPageModel {
  user: TeamMember | null;
  seniors: TeamMember[];
  juniors: TeamMember[];
  teams: Team[];
}

export interface AttendanceRecord {
  syskey: string;
  date: string;
  time: string;
  /** 601 = time-in, 602 = time-out, 603 = activity */
  type: number;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  starttime: string | null;
  endtime: string | null;
  checkInType: string;
  activityType: string;
  timezone: string;
  employeeName: string;
}

export interface LeaveSummaryItem {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
}
