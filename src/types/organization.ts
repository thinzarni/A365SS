/* ═══════════════════════════════════════════════════════════
   Organization Models — Based on Functional Specification
   ═══════════════════════════════════════════════════════════ */

export type OrgUnitType =
    | 'CEO'
    | 'Head Office'
    | 'Office'
    | 'Division'
    | 'Department'
    | 'Team'
    | 'States & Regions'
    | 'Region'
    | 'Regional Branch'
    | 'Regional Team'
    | 'Regional Group';

export interface OrgUnit {
    syskey: string;
    code: string;
    name: string;
    type: OrgUnitType;
    parentSyskey: string | null;
    effectiveStartDate: string;
    effectiveEndDate?: string;
    status: 'Active' | 'Inactive';
}

export interface DepartmentHead {
    syskey: string;
    orgUnitSyskey: string;
    employeeId: string;
    employeeName: string;
    approvalPriority: 'Primary' | 'Secondary' | string;
    effectiveStartDate: string;
    effectiveEndDate?: string;
}

export interface EmployeeOrgMapping {
    employeeId: string;
    employeeName: string;
    orgUnitSyskey: string;
    orgUnitName: string;
    jobTitle: string;
    reportingLine?: string;
}

export interface OrgHierarchyNode extends OrgUnit {
    children?: OrgHierarchyNode[];
}

export interface OrgChangeLog {
    syskey: string;
    timestamp: string;
    user: string;
    changeType: 'Created' | 'Updated' | 'Split' | 'Merged' | 'Deactivated';
    affectedUnits: string[];
    beforeValue?: any;
    afterValue?: any;
}

export interface ImportResult {
    success: boolean;
    totalRecords: number;
    successCount: number;
    errorCount: number;
    errors: { line: number; message: string; data?: any }[];
}
