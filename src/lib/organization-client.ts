import apiClient from './api-client';
import * as routes from '../config/api-routes';
import type {
    OrgUnit,
    OrgHierarchyNode,
    DepartmentHead,
    EmployeeOrgMapping,
    OrgChangeLog,
    ImportResult
} from '../types/organization';
import type { ApiResponse } from '../types/models';

class OrganizationClient {
    async getOrgUnits(): Promise<OrgUnit[]> {
        const res = await apiClient.get<ApiResponse<OrgUnit[]>>(routes.ORG_UNITS);
        return res.data.datalist || [];
    }

    async getOrgHierarchy(): Promise<OrgHierarchyNode[]> {
        const res = await apiClient.get<ApiResponse<OrgHierarchyNode[]>>(routes.ORG_HIERARCHY);
        return res.data.datalist || [];
    }

    async getOrgUnitDetail(syskey: string): Promise<OrgUnit | null> {
        const url = routes.ORG_UNIT_DETAIL.replace(':syskey', syskey);
        const res = await apiClient.get<ApiResponse<OrgUnit>>(url);
        return res.data.datalist || null;
    }

    async saveOrgUnit(unit: Partial<OrgUnit>): Promise<OrgUnit> {
        const res = await apiClient.post<ApiResponse<OrgUnit>>(routes.ORG_UNITS, unit);
        return res.data.datalist!;
    }

    async deactivateOrgUnit(syskey: string): Promise<void> {
        const url = routes.ORG_UNIT_DETAIL.replace(':syskey', syskey);
        await apiClient.delete(url);
    }

    async splitOrgUnit(data: {
        sourceSyskey: string;
        targets: Partial<OrgUnit>[];
        effectiveDate: string;
        reassignments: { unitSyskey: string; targetSyskey: string }[];
    }): Promise<void> {
        await apiClient.post(routes.ORG_SPLIT, data);
    }

    async mergeOrgUnits(data: {
        sourceSyskeys: string[];
        targetUnit: Partial<OrgUnit>;
        effectiveDate: string;
    }): Promise<void> {
        await apiClient.post(routes.ORG_MERGE, data);
    }

    async getDeptHeads(orgUnitSyskey: string): Promise<DepartmentHead[]> {
        const res = await apiClient.get<ApiResponse<DepartmentHead[]>>(routes.ORG_DEPT_HEADS, {
            params: { orgUnitSyskey }
        });
        return res.data.datalist || [];
    }

    async saveDeptHead(head: Partial<DepartmentHead>): Promise<void> {
        await apiClient.post(routes.ORG_DEPT_HEADS, head);
    }

    async getEmployeeMappings(orgUnitSyskey?: string): Promise<EmployeeOrgMapping[]> {
        const res = await apiClient.get<ApiResponse<EmployeeOrgMapping[]>>(routes.ORG_EMPLOYEE_MAPPING, {
            params: { orgUnitSyskey }
        });
        return res.data.datalist || [];
    }

    async importMappings(file: File): Promise<ImportResult> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post<ApiResponse<ImportResult>>(routes.ORG_IMPORT_MAPPING, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.datalist!;
    }

    async exportMappings(): Promise<Blob> {
        const res = await apiClient.get(routes.ORG_EXPORT_MAPPING, { responseType: 'blob' });
        return res.data;
    }

    async getAuditLogs(orgUnitSyskey?: string): Promise<OrgChangeLog[]> {
        const res = await apiClient.get<ApiResponse<OrgChangeLog[]>>(routes.ORG_AUDIT_LOGS, {
            params: { orgUnitSyskey }
        });
        return res.data.datalist || [];
    }
}

export default new OrganizationClient();
