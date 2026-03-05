import type { OrgUnit, OrgHierarchyNode, DepartmentHead, OrgChangeLog } from '../types/organization';

export const MOCK_ORG_UNITS: OrgUnit[] = [
    {
        syskey: '1',
        code: 'CEO-001',
        name: 'Chief Executive Officer',
        type: 'CEO',
        parentSyskey: null,
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '2',
        code: 'HO-001',
        name: 'Head Office',
        type: 'Head Office',
        parentSyskey: '1',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '3',
        code: 'OFF-CFO',
        name: 'CFO Office',
        type: 'Office',
        parentSyskey: '2',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '4',
        code: 'OFF-CTO',
        name: 'CTO Office',
        type: 'Office',
        parentSyskey: '2',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '5',
        code: 'DIV-TECH',
        name: 'Technology Division',
        type: 'Division',
        parentSyskey: '4',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '6',
        code: 'DEPT-ENG',
        name: 'Engineering Department',
        type: 'Department',
        parentSyskey: '5',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '7',
        code: 'TEAM-FE',
        name: 'Frontend Team',
        type: 'Team',
        parentSyskey: '6',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '8',
        code: 'TEAM-BE',
        name: 'Backend Team',
        type: 'Team',
        parentSyskey: '6',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '9',
        code: 'SR-MM',
        name: 'Myanmar States & Regions',
        type: 'States & Regions',
        parentSyskey: '1',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '10',
        code: 'REG-YGN',
        name: 'Yangon Region',
        type: 'Region',
        parentSyskey: '9',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    },
    {
        syskey: '11',
        code: 'REG-MDY',
        name: 'Mandalay Region',
        type: 'Region',
        parentSyskey: '9',
        effectiveStartDate: '2020-01-01',
        status: 'Active'
    }
];

export const MOCK_ORG_HIERARCHY: OrgHierarchyNode[] = [
    {
        ...MOCK_ORG_UNITS[0],
        children: [
            {
                ...MOCK_ORG_UNITS[1],
                children: [
                    { ...MOCK_ORG_UNITS[2], children: [] },
                    {
                        ...MOCK_ORG_UNITS[3],
                        children: [
                            {
                                ...MOCK_ORG_UNITS[4],
                                children: [
                                    {
                                        ...MOCK_ORG_UNITS[5],
                                        children: [
                                            { ...MOCK_ORG_UNITS[6], children: [] },
                                            { ...MOCK_ORG_UNITS[7], children: [] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                ...MOCK_ORG_UNITS[8],
                children: [
                    { ...MOCK_ORG_UNITS[9], children: [] },
                    { ...MOCK_ORG_UNITS[10], children: [] }
                ]
            }
        ]
    }
];

export const MOCK_DEPT_HEADS: DepartmentHead[] = [
    {
        syskey: 'h1',
        orgUnitSyskey: '6',
        employeeId: 'EMP-001',
        employeeName: 'John Doe',
        approvalPriority: 'Primary',
        effectiveStartDate: '2020-01-01'
    },
    {
        syskey: 'h2',
        orgUnitSyskey: '6',
        employeeId: 'EMP-002',
        employeeName: 'Jane Smith',
        approvalPriority: 'Secondary',
        effectiveStartDate: '2021-06-15'
    }
];

export const MOCK_AUDIT_LOGS: OrgChangeLog[] = [
    {
        syskey: 'l1',
        timestamp: '2024-03-01T10:00:00Z',
        user: 'HR Admin',
        changeType: 'Created',
        affectedUnits: ['6'],
        afterValue: { name: 'Engineering Department' }
    },
    {
        syskey: 'l2',
        timestamp: '2024-03-02T14:30:00Z',
        user: 'HR Admin',
        changeType: 'Updated',
        affectedUnits: ['7'],
        beforeValue: { name: 'UI Team' },
        afterValue: { name: 'Frontend Team' }
    }
];
