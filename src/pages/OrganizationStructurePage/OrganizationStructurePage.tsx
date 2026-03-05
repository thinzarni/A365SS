import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    Network,
    GitBranch,
    Users,
    FileText,
    History,
    Plus,
    Upload,
    Download,
    ChevronRight,
    ChevronDown,
    ArrowRightLeft,
    Search,
    Clock,
    Save,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Select, Modal } from '../../components/ui';
import orgClient from '../../lib/organization-client';
import { MOCK_ORG_HIERARCHY, MOCK_ORG_UNITS, MOCK_AUDIT_LOGS } from '../../lib/mock-org-data';
import type { OrgHierarchyNode, OrgUnit, OrgUnitType } from '../../types/organization';
import styles from './OrganizationStructurePage.module.css';

type TabType = 'hierarchy' | 'units' | 'restructuring' | 'reporting' | 'audit';

const UNIT_TYPES: OrgUnitType[] = [
    'CEO', 'Head Office', 'Office', 'Division', 'Department', 'Team',
    'States & Regions', 'Region', 'Regional Branch', 'Regional Team', 'Regional Group'
];

export default function OrganizationStructurePage() {
    const [activeTab, setActiveTab] = useState<TabType>('hierarchy');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Queries
    const { data: hierarchy = MOCK_ORG_HIERARCHY } = useQuery({
        queryKey: ['org-hierarchy'],
        queryFn: () => orgClient.getOrgHierarchy().catch(() => MOCK_ORG_HIERARCHY),
        initialData: MOCK_ORG_HIERARCHY
    });

    const { data: units = MOCK_ORG_UNITS } = useQuery({
        queryKey: ['org-units'],
        queryFn: () => orgClient.getOrgUnits().catch(() => MOCK_ORG_UNITS),
        initialData: MOCK_ORG_UNITS
    });

    const { data: auditLogs = MOCK_AUDIT_LOGS } = useQuery({
        queryKey: ['org-audit'],
        queryFn: () => orgClient.getAuditLogs().catch(() => MOCK_AUDIT_LOGS),
        initialData: MOCK_AUDIT_LOGS
    });

    // Mutation for creating new unit
    const createMutation = useMutation({
        mutationFn: (newUnit: Partial<OrgUnit>) => orgClient.saveOrgUnit(newUnit),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] });
            queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] });
            toast.success('Organization unit created successfully');
            setIsCreateModalOpen(false);
        },
        onError: () => {
            toast.error('Failed to create organization unit');
        }
    });

    const handleCreateUnit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        createMutation.mutate({
            code: data.code as string,
            name: data.name as string,
            type: data.type as OrgUnitType,
            parentSyskey: data.parentSyskey as string || null,
            effectiveStartDate: data.effectiveStartDate as string,
            status: 'Active'
        });
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Organization Structure</h1>
                    <p className={styles.subtitle}>Design and manage your company's organizational hierarchy</p>
                </div>
                <div className={styles.headerActions}>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <Download size={18} /> Export Template
                    </Button>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <Upload size={18} /> Import Mapping
                    </Button>
                    <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} /> Create Unit
                    </Button>
                </div>
            </header>

            <nav className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'hierarchy' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('hierarchy')}
                >
                    <Network size={18} /> Hierarchy
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'units' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('units')}
                >
                    <Building2 size={18} /> Unit List
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'restructuring' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('restructuring')}
                >
                    <ArrowRightLeft size={18} /> Restructuring
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'reporting' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('reporting')}
                >
                    <FileText size={18} /> Reporting
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'audit' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    <History size={18} /> Audit History
                </button>
            </nav>

            <main className={styles.content}>
                {activeTab === 'hierarchy' && renderHierarchy(hierarchy)}
                {activeTab === 'units' && renderUnitList(units)}
                {activeTab === 'restructuring' && renderRestructuring()}
                {activeTab === 'audit' && renderAuditHistory(auditLogs)}
            </main>

            {/* ── Create Unit Modal ── */}
            <Modal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Organization Unit"
                large
            >
                <form onSubmit={handleCreateUnit} className="space-y-6">
                    <div className={styles.formGrid}>
                        <Input
                            label="Unit Code"
                            name="code"
                            placeholder="e.g. DEPT-HR-001"
                            required
                        />
                        <Input
                            label="Unit Name"
                            name="name"
                            placeholder="e.g. Human Resources Department"
                            required
                        />
                        <Select
                            label="Unit Type"
                            name="type"
                            options={UNIT_TYPES.map(t => ({ value: t, label: t }))}
                            placeholder="Select Unit Type"
                            required
                        />
                        <Select
                            label="Parent Unit"
                            name="parentSyskey"
                            options={units.map(u => ({ value: u.syskey, label: `${u.name} (${u.code})` }))}
                            placeholder="Select Parent Unit (Optional for CEO)"
                        />
                        <Input
                            label="Effective Start Date"
                            name="effectiveStartDate"
                            type="date"
                            required
                            defaultValue={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={createMutation.isPending}>
                            <Save size={18} className="mr-2" /> Save Organization Unit
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );

    function renderHierarchy(nodes: OrgHierarchyNode[]) {
        return (
            <div className={styles.treeContainer}>
                {nodes.map(node => (
                    <TreeNode key={node.syskey} node={node} />
                ))}
            </div>
        );
    }

    function renderUnitList(unitList: OrgUnit[]) {
        return (
            <div>
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search units by name or code..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Effective Date</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unitList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.code.toLowerCase().includes(searchQuery.toLowerCase())).map(unit => (
                                <tr key={unit.syskey} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-sm">{unit.code}</td>
                                    <td className="px-4 py-3 font-medium">{unit.name}</td>
                                    <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">{unit.type}</span></td>
                                    <td className="px-4 py-3 text-slate-500 text-sm">{unit.effectiveStartDate}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${unit.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {unit.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                        <span className="mx-2 text-slate-300">|</span>
                                        <button className="text-slate-600 hover:text-slate-800 text-sm font-medium">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    function renderRestructuring() {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <GitBranch size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Split or Merge Organization Units</h3>
                <p className="text-slate-500 max-w-md text-center mb-8">
                    Select organization units to perform restructure operations with automatic employee reassignment and audit trail.
                </p>
                <div className="flex gap-4">
                    <Button variant="ghost" className="px-8 font-semibold">Start Split Process</Button>
                    <Button variant="secondary" className="px-8 font-semibold">Start Merge Process</Button>
                </div>
            </div>
        );
    }

    function renderAuditHistory(logs: any[]) {
        return (
            <div className="space-y-4">
                {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50/30 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.changeType === 'Created' ? 'bg-emerald-100 text-emerald-600' :
                                log.changeType === 'Updated' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                            <Clock size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-slate-900">{log.changeType} Organizational Unit</span>
                                <span className="text-xs text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                                User <span className="text-slate-900 font-medium">{log.user}</span> modified {log.affectedUnits.length} unit(s).
                            </p>
                            {log.afterValue && (
                                <div className="bg-slate-100 p-2 rounded text-xs font-mono text-slate-500 overflow-hidden whitespace-nowrap text-ellipsis">
                                    {JSON.stringify(log.afterValue)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
}

function TreeNode({ node }: { node: OrgHierarchyNode }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className={styles.treeNode}>
            <div className={styles.unitCard} onClick={() => setIsExpanded(!isExpanded)}>
                {hasChildren && (
                    <div className="mr-1 text-slate-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                )}
                <div className={`${styles.unitIcon} ${getNodeColor(node.type)}`}>
                    {node.type === 'CEO' ? <Users size={16} /> : <Building2 size={16} />}
                </div>
                <div className={styles.unitInfo}>
                    <span className={styles.unitName}>{node.name}</span>
                    <span className={styles.unitType}>{node.type} • {node.code}</span>
                </div>
                <div className={styles.unitBadges}>
                    <span className={`${styles.badge} ${styles.activeBadge}`}>Active</span>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="tree-children">
                    {node.children!.map(child => (
                        <TreeNode key={child.syskey} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
}

function getNodeColor(type: string): string {
    switch (type) {
        case 'CEO': return 'bg-indigo-100 text-indigo-600';
        case 'Head Office': return 'bg-blue-100 text-blue-600';
        case 'Division': return 'bg-amber-100 text-amber-600';
        case 'Department': return 'bg-rose-100 text-rose-600';
        case 'Team': return 'bg-slate-100 text-slate-600';
        default: return 'bg-slate-100 text-slate-500';
    }
}
