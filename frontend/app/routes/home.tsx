import { useState } from "react";

// ===========================================
// COMPONENT: Tab Navigation Box
// ===========================================
function TabNavigationBox({ activeTab, onTabChange }: { 
    activeTab: 'global' | 'friends', 
    onTabChange: (tab: 'global' | 'friends') => void 
}) {
    return (
        <div className="bg-white rounded border-2 border-gray-800 p-2 flex gap-2">
            <button
                onClick={() => onTabChange('global')}
                className={`flex-1 px-4 py-2 rounded ${
                    activeTab === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
            >
                global
            </button>
            <button
                onClick={() => onTabChange('friends')}
                className={`flex-1 px-4 py-2 rounded ${
                    activeTab === 'friends' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
            >
                friends
            </button>
        </div>
    );
}

// ===========================================
// COMPONENT: Leaderboard List Box
// ===========================================
function LeaderboardListBox({ data }: { data: Array<{ rank: number, username: string, score: number }> }) {
    return (
        <div className="bg-white rounded border-2 border-gray-800 p-4 overflow-hidden">
            <div className="space-y-2">
                {data.map((player) => (
                    <div 
                        key={player.rank}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-300"
                    >
                        <span className="font-bold text-lg w-8">{player.rank}</span>
                        <div className="flex-1">
                            <div className="font-medium">{player.username}</div>
                            <div className="text-sm text-gray-600">userrank: {player.score}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// COMPONENT: Sort Controls Box
// ===========================================
function SortControlsBox() {
    return (
        <div className="bg-white rounded border-2 border-gray-800 p-4 overflow-hidden">
            <select className="w-full p-2 border border-gray-300 rounded">
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
        <div className="flex gap-4 overflow-hidden">
            <div className="flex-1 bg-white rounded border-2 border-gray-800 p-8 text-center overflow-hidden">
                <button className="text-xl font-semibold">ranked</button>
            </div>
            <div className="flex-1 bg-white rounded border-2 border-gray-800 p-8 text-center overflow-hidden">
                <button className="text-xl font-semibold">friendly</button>
            </div>
        </div>
    );
}

// ===========================================
// COMPONENT: User Profile Box
// ===========================================
function UserProfileBox({ friendsList }: { friendsList: string[] }) {
    return (
        <div className="bg-white rounded border-2 border-gray-800 p-4 overflow-hidden">
            
            {/* Username and Logout - Fixed section */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-gray-800">
                <input 
                    type="text" 
                    placeholder="username" 
                    className="flex-1 p-2 border border-gray-300 rounded"
                    readOnly
                />
                <button className="px-4 py-2 bg-gray-100 border border-gray-300 rounded whitespace-nowrap">
                    logout
                </button>
            </div>

            {/* Profile Picture and Quote - Fixed section */}
            <div className="flex gap-2 mt-4">
                <div className="w-24 h-24 bg-gray-100 border-2 border-gray-800 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                    profile
                </div>
                <div className="flex-1 min-w-0">
                    <textarea 
                        placeholder="userquote/gametag"
                        className="w-full h-24 p-2 border-2 border-gray-800 rounded resize-none text-sm"
                        readOnly
                    />
                </div>
            </div>

            {/* Friend List - Scrollable section */}
            <div className="mt-4">
                <div className="text-sm font-semibold mb-2 pb-1 border-b border-gray-300">
                    friendlist, scrollable
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {friendsList.map((friend, index) => (
                        <div 
                            key={index}
                            className="p-2 bg-gray-50 border border-gray-300 rounded text-sm"
                        >
                            {friend}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===========================================
// MAIN PAGE: Box-based layout structure
// ===========================================
export default function HomePage() {
    const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');

    // Mock data - replace with actual API calls later
    const leaderboardData = [
        { rank: 1, username: 'Player1', score: 2500 },
        { rank: 2, username: 'Player2', score: 2300 },
        { rank: 3, username: 'Player3', score: 2100 },
    ];

    const friendsList = ['Friend1', 'Friend2', 'Friend3', 'Friend4', 'Friend5'];

    return (
        // Canvas: Full screen with blue background
        <div className="w-screen h-screen bg-blue-600 overflow-hidden">
            
            {/* Container: Centers content and adds padding */}
            <div className="w-full h-full p-4 flex gap-4">
                
                {/* LEFT COLUMN: 65% of width - Main game content */}
                <div className="flex flex-col gap-4" style={{ width: '65%' }}>
                    
                    {/* Box 1: Tab Navigation - Fixed height */}
                    <div style={{ height: '60px' }}>
                        <TabNavigationBox activeTab={activeTab} onTabChange={setActiveTab} />
                    </div>

                    {/* Box 2: Leaderboard - Takes remaining vertical space */}
                    <div className="flex-1 min-h-0">
                        <LeaderboardListBox data={leaderboardData} />
                    </div>

                    {/* Box 3: Sort Controls - Fixed height */}
                    <div style={{ height: '80px' }}>
                        <SortControlsBox />
                    </div>

                    {/* Box 4: Game Mode Buttons - Fixed height */}
                    <div style={{ height: '120px' }}>
                        <GameModeButtonsBox />
                    </div>
                </div>

                {/* RIGHT COLUMN: 35% of width - User profile */}
                <div className="flex flex-col" style={{ width: '35%' }}>
                    
                    {/* Box 5: User Profile - Takes full height */}
                    <div className="h-full">
                        <UserProfileBox friendsList={friendsList} />
                    </div>
                </div>
            </div>
        </div>
    );
}