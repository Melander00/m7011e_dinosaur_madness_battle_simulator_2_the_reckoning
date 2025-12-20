import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import keycloak from "~/keycloak/keycloak";
import { getTopPlayers, getMyRank } from "~/api/leaderboard";
import styles from "~/styles/home.module.css";

// ===========================================
// COMPONENT: Tab Navigation Box
// ===========================================
function TabNavigationBox({ activeTab, onTabChange }: { 
    activeTab: 'global' | 'friends', 
    onTabChange: (tab: 'global' | 'friends') => void 
}) {
    return (
        <div className={styles.tabContainer}>
            <button
                onClick={() => onTabChange('global')}
                className={`${styles.tabButton} ${activeTab === 'global' ? styles.active : styles.inactive}`}
            >
                global
            </button>
            <button
                onClick={() => onTabChange('friends')}
                className={`${styles.tabButton} ${activeTab === 'friends' ? styles.active : styles.inactive}`}
            >
                friends
            </button>
        </div>
    );
}

// ===========================================
// COMPONENT: Leaderboard List Box
// ===========================================
function LeaderboardListBox({ data, loading, error, userRank, username }: {
    data: Array<{ rank: number, username: string, score: number }>,
    loading: boolean,
    error: string | null,
    userRank: { rank: number, points: number } | null,
    username: string
}) {
    // Top 3
    const top3 = data.slice(0, 3);
    // Find user index
    const userIdx = userRank ? data.findIndex(p => p.rank === userRank.rank) : -1;
    // Show 2 above, user, 2 below
    let userArea: typeof data = [];
    if (userIdx !== -1) {
        userArea = data.slice(Math.max(0, userIdx - 2), userIdx + 3);
    }
    return (
        <div className={styles.leaderboardContainer}>
            <div className={styles.leaderboardList}>
                {/* Loading skeletons */}
                {loading && (
                    <>
                        <div className={styles.sectionHeader}><span role="img" aria-label="trophy">🏆</span> TOP 3 CHAMPIONS</div>
                        {[1,2,3].map(i => (
                            <div key={i} className={styles.playerCard + ' ' + styles.skeleton} style={{height:'2.5rem'}} />
                        ))}
                        <div className={styles.sectionDivider} />
                        <div className={styles.sectionHeader}><span role="img" aria-label="pin">📍</span> YOUR RANK AREA</div>
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className={styles.playerCard + ' ' + styles.skeleton} style={{height:'2.5rem'}} />
                        ))}
                    </>
                )}
                {/* Error */}
                {error && <div className={styles.playerCard}>Error: {error}</div>}
                {/* Data loaded */}
                {!loading && !error && (
                    <>
                        <div className={styles.sectionHeader}><span role="img" aria-label="trophy">🏆</span> TOP 3 CHAMPIONS</div>
                        {top3.map(player => (
                            <div key={player.rank} className={styles.playerCard + ' ' + styles.top3}>
                                <span className={styles.playerRank}>#{player.rank}</span>
                                <div className={styles.playerInfo}>
                                    <div className={styles.playerUsername}>{player.username}</div>
                                    <div className={styles.playerScore}>{player.score} pts</div>
                                </div>
                            </div>
                        ))}
                        <div className={styles.sectionDivider}><span className={styles.gapIndicator}>...</span></div>
                        <div className={styles.sectionHeader}><span role="img" aria-label="pin">📍</span> YOUR RANK AREA</div>
                        {userArea.length === 0 && (
                            <div className={styles.playerCard}>Not ranked yet</div>
                        )}
                        {userArea.map(player => (
                            <div
                                key={player.rank}
                                className={styles.playerCard + (username && userRank && player.rank === userRank.rank ? ' ' + styles.highlight : '')}
                            >
                                <span className={styles.playerRank}>#{player.rank}</span>
                                <div className={styles.playerInfo}>
                                    <div className={styles.playerUsername}>{player.username}{username && userRank && player.rank === userRank.rank ? ' ★' : ''}</div>
                                    <div className={styles.playerScore}>{player.score} pts</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ===========================================
// COMPONENT: Sort Controls Box
// ===========================================
function SortControlsBox() {
    return (
        <div className={styles.sortContainer}>
            <select className={styles.sortSelect}>
                <option>sort by highest</option>
                <option>sort by lowest</option>
            </select>
        </div>
    );
}

// ===========================================
// COMPONENT: Game Mode Buttons Box
// ===========================================
function GameModeButtonsBox() {
    return (
        <div className={styles.gameModeContainer}>
            <button className={styles.gameModeButton}>ranked</button>
            <button className={styles.gameModeButton}>unranked</button>
        </div>
    );
}

// ===========================================
// COMPONENT: User Profile Box
// ===========================================
function UserProfileBox({ friendsList, onLogout, username, userRank }: { 
    friendsList: string[], 
    onLogout: () => void,
    username: string,
    userRank: { rank: number, points: number } | null
}) {
    return (
        <div className={styles.profileContainer}>
            
            {/* Username and Logout - Fixed section */}
            <div className={styles.profileHeader}>
                <input 
                    type="text" 
                    value={username || 'loading...'}
                    className={styles.usernameInput}
                    readOnly
                />
                <button className={styles.logoutButton} onClick={onLogout}>
                    logout
                </button>
            </div>

            {/* Profile Picture and Quote - Fixed section */}
            <div className={styles.profileContent}>
                <div className={styles.profilePicture}>
                    profile
                </div>
                <div className={styles.profileQuote}>
                    <textarea 
                        placeholder="userquote/gametag"
                        value={userRank ? `Rank: #${userRank.rank}\nPoints: ${userRank.points}` : ''}
                        className={styles.quoteTextarea}
                        readOnly
                    />
                </div>
            </div>

            {/* Friend List - Scrollable section */}
            <div className={styles.friendsSection}>
                <div className={styles.friendsHeader}>
                    friendlist, scrollable
                </div>
                <div className={styles.friendsList}>
                    {friendsList.length === 0 ? (
                        <div className={styles.friendCard}>No friends yet</div>
                    ) : (
                        friendsList.map((friend, index) => (
                            <div 
                                key={index}
                                className={styles.friendCard}
                            >
                                {friend}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ===========================================
// MAIN COMPONENT: Home Page
// ===========================================
export default function HomePage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
    
    // State for API data
    const [leaderboardData, setLeaderboardData] = useState<Array<{ rank: number, username: string, score: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [userRank, setUserRank] = useState<{ rank: number, points: number } | null>(null);

    const handleLogout = () => {
        keycloak.logout({
            redirectUri: window.location.origin
        });
    };

    // Fetch leaderboard data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch global leaderboard (public endpoint)
                const topPlayers = await getTopPlayers(20);
                
                // Transform API data to match component props
                const formattedData = topPlayers.map(player => ({
                    rank: player.rank,
                    username: player.userId.substring(0, 8), // Show first 8 chars of UUID
                    score: player.rankedPoints
                }));
                
                setLeaderboardData(formattedData);

                // Fetch user info if authenticated
                if (keycloak.authenticated && keycloak.token) {
                    try {
                        const tokenUsername = keycloak.tokenParsed?.preferred_username;
                        const tokenEmail = keycloak.tokenParsed?.email;
                        const tokenSub = keycloak.tokenParsed?.sub;
                        setUsername(tokenUsername || tokenEmail || tokenSub || 'Player');

                        // Fetch user's rank 
                        const myRank = await getMyRank(keycloak.token);
                        setUserRank({
                            rank: myRank.rank,
                            points: myRank.rankedPoints
                        });
                    } catch (err) {
                        console.log('User not in leaderboard yet:', err);
                        setUsername(keycloak.tokenParsed?.preferred_username || 'Player');
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const friendsList: string[] = []; // Friends feature not implemented yet

    return (
        <div className={styles.canvas}>
            <div className={styles.container}>
                {/* LEFT COLUMN: Main game content */}
                <div className={styles.leftColumn}>
                    {/* Box 1: Tab Navigation */}
                    <div className={styles.tabBox}>
                        <TabNavigationBox activeTab={activeTab} onTabChange={setActiveTab} />
                    </div>
                    {/* Box 2: Leaderboard (custom layout) */}
                    <div className={styles.leaderboardBox}>
                        <LeaderboardListBox 
                            data={leaderboardData} 
                            loading={loading} 
                            error={error} 
                            userRank={userRank}
                            username={username}
                        />
                    </div>
                    {/* Box 3: Game Mode Buttons */}
                    <div className={styles.gameModeBox}>
                        <GameModeButtonsBox />
                    </div>
                </div>
                {/* RIGHT COLUMN: User profile */}
                <div className={styles.rightColumn}>
                    <div className={styles.profileBox}>
                        <UserProfileBox 
                            friendsList={friendsList} 
                            onLogout={handleLogout}
                            username={username}
                            userRank={userRank}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
