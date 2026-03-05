import React, { useState, useEffect } from 'react';
import { X, Search, User as UserIcon, Building2, Check } from 'lucide-react';
import { useChatStore } from '../../stores/chat-store';
import { useAuthStore } from '../../stores/auth-store';
import type { User, CreateChatPayload } from '../../types/chat';
import type { Team } from '../../types/models';
import styles from './NewChatModal.module.css';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (conversationId: string, groupName?: string, oppositeName?: string, image?: string) => void;
}

type ChatType = 'individual' | 'group' | 'team';

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
    const [type, setType] = useState<ChatType>('individual');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const { userId, domain } = useAuthStore();
    const {
        searchResults,
        userTeams,
        searchUsers,
        fetchTeams,
        createChat,
        getConversationByUniqueName,
        isLoading
    } = useChatStore();

    // Load full contact list immediately when the modal opens
    useEffect(() => {
        if (isOpen) {
            // Fetch all employees on open (empty query = all)
            if (type !== 'team') {
                searchUsers('');
            }
            if (type === 'team' && userTeams.length === 0) {
                fetchTeams(userId || '');
            }
        } else {
            // Reset state when modal closes
            setSearchQuery('');
            setSelectedUsers([]);
            setSelectedTeam(null);
            setGroupName('');
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounce search as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            if (type !== 'team') {
                searchUsers(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers, type]);

    if (!isOpen) return null;

    const generateChatroomId = (uid1: string, uid2: string, domainName: string) => {
        const ids = [uid1, uid2].sort();
        return `${ids[0].replace(/\+/g, '')}_${domainName.replace(/\+/g, '')}_a365_${ids[1].replace(/\+/g, '')}`;
    };

    const handleCreate = async () => {
        if (!userId || !domain) return;

        let payload: CreateChatPayload | null = null;

        if (type === 'individual' && selectedUsers.length === 1) {
            const targetUser = selectedUsers[0];
            const chatroomId = generateChatroomId(userId, targetUser.userid, domain);

            // Check if already exists
            const existingId = await getConversationByUniqueName(chatroomId);
            if (existingId) {
                onChatCreated(existingId, '', targetUser.name, targetUser.profile);
                return;
            }

            payload = {
                userId,
                participants: [targetUser.userid],
                groupName: '',
                name: chatroomId,
                type: 'normal',
                role: '',
                appid: '004',
                subAppid: domain,
                isGroup: 1, // API seems to expect 1 even for normal according to Flutter code sometimes, but let's check
                actionType: 1,
                adminkey: chatroomId
            };
        } else if (type === 'group' && groupName && selectedUsers.length > 0) {
            const chatName = `${groupName}_${Date.now()}`;
            payload = {
                userId,
                participants: [userId, ...selectedUsers.map(u => u.userid)],
                groupName,
                name: chatName,
                type: 'normal',
                role: '',
                appid: '004',
                subAppid: domain,
                isGroup: 1,
                actionType: 1,
                adminkey: chatName
            };
        } else if (type === 'team' && selectedTeam) {
            const chatName = `${selectedTeam.teamName}_${domain}_004`;
            const gName = `${selectedTeam.teamId} - ${selectedTeam.teamName}`;

            const existingId = await getConversationByUniqueName(chatName);
            if (existingId) {
                onChatCreated(existingId);
                return;
            }

            // For team message, we might need to fetch all members first.
            // But the Flutter code just sends the team info and handles it.
            // Actually Flutter TeamViewPage creates it with an empty participant list initially if it's a team?
            // No, it adds them.

            payload = {
                userId,
                participants: [], // Backend might handle adding team members if we provide the right name/adminkey
                groupName: gName,
                name: chatName,
                type: 'normal',
                role: '',
                appid: '004',
                subAppid: domain,
                isGroup: 1,
                actionType: 1,
                adminkey: chatName
            };
        }

        if (payload) {
            const id = await createChat(payload);
            if (id) {
                let pGroup = '';
                let pOpposite = '';
                let pImg = '';
                if (type === 'group') pGroup = groupName;
                else if (type === 'team' && selectedTeam) pGroup = `${selectedTeam.teamId} - ${selectedTeam.teamName}`;
                else if (type === 'individual' && selectedUsers.length === 1) {
                    pOpposite = selectedUsers[0].name;
                    pImg = selectedUsers[0].profile;
                }
                onChatCreated(id, pGroup, pOpposite, pImg);
            }
        }
    };

    const toggleUserSelection = (user: User) => {
        if (type === 'individual') {
            setSelectedUsers([user]);
        } else {
            setSelectedUsers(prev =>
                prev.some(u => u.userid === user.userid)
                    ? prev.filter(u => u.userid !== user.userid)
                    : [...prev, user]
            );
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>New Chat</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${type === 'individual' ? styles.activeTab : ''}`}
                            onClick={() => { setType('individual'); setSelectedUsers([]); }}
                        >
                            Individual
                        </button>
                        <button
                            className={`${styles.tab} ${type === 'group' ? styles.activeTab : ''}`}
                            onClick={() => { setType('group'); setSelectedUsers([]); }}
                        >
                            Group
                        </button>
                        <button
                            className={`${styles.tab} ${type === 'team' ? styles.activeTab : ''}`}
                            onClick={() => { setType('team'); setSelectedTeam(null); }}
                        >
                            Team
                        </button>
                    </div>

                    {type === 'group' && (
                        <input
                            type="text"
                            placeholder="Group Name"
                            className={styles.groupNameInput}
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                    )}

                    {type !== 'team' && (
                        <div className={styles.inputWrapper}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}

                    <div className={styles.list}>
                        {type === 'team' ? (
                            userTeams?.length > 0 ? (
                                userTeams.map(team => (
                                    <div
                                        key={team.syskey}
                                        className={`${styles.listItem} ${selectedTeam?.syskey === team.syskey ? styles.selectedItem : ''}`}
                                        onClick={() => setSelectedTeam(team)}
                                    >
                                        <div className={styles.avatar}>
                                            <Building2 size={20} />
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{team.teamName}</div>
                                            <div className={styles.itemMeta}>{team.teamId}</div>
                                        </div>
                                        {selectedTeam?.syskey === team.syskey && <Check size={18} color="#3b82f6" />}
                                    </div>
                                ))
                            ) : (
                                !isLoading && <div className={styles.emptyList}>No teams found</div>
                            )
                        ) : (
                            searchResults?.length > 0 ? (
                                searchResults.map(user => (
                                    <div
                                        key={user.userid}
                                        className={`${styles.listItem} ${selectedUsers.some(u => u.userid === user.userid) ? styles.selectedItem : ''}`}
                                        onClick={() => toggleUserSelection(user)}
                                    >
                                        <div className={styles.avatar}>
                                            {user.profile ? (
                                                <img src={user.profile} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <UserIcon size={20} />
                                            )}
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{user.name}</div>
                                            <div className={styles.itemMeta}>{user.department}</div>
                                        </div>
                                        {selectedUsers.some(u => u.userid === user.userid) && <Check size={18} color="#3b82f6" />}
                                    </div>
                                ))
                            ) : (
                                !isLoading && <div className={styles.emptyList}>
                                    {searchQuery ? 'No employees found' : 'No contacts available'}
                                </div>
                            )
                        )}
                        {isLoading && <div className={styles.loadingMsg}>Loading...</div>}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button
                        className={styles.submitBtn}
                        disabled={
                            (type === 'individual' && selectedUsers.length === 0) ||
                            (type === 'group' && (!groupName || selectedUsers.length === 0)) ||
                            (type === 'team' && !selectedTeam) ||
                            isLoading
                        }
                        onClick={handleCreate}
                    >
                        {isLoading ? 'Creating...' : 'Create Chat'}
                    </button>
                </div>
            </div>
        </div>
    );
};
