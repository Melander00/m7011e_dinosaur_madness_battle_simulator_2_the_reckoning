import { useEffect, useState } from "react";
import keycloak from "~/keycloak/keycloak";
import { getUserElo } from "~/api/leaderboard";

export default function LandingPage() {

    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    // State for API testing
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize Keycloak
        keycloak.init({
            onLoad: 'login-required',  // Redirect to login if not authenticated
            checkLoginIframe: false
        }).then(authenticated => {
            setAuthenticated(authenticated);

            if (authenticated) {
                // Load user profile
                keycloak.loadUserProfile().then(profile => {
                    setUser(profile);
                });
            }
        });
    }, []);

    const logout = () => {
        keycloak.logout();
    };

    // Function to call the protected API
    const handleCallAPI = async () => {
        try {
            setError(null);
            
            // Refresh token if needed (within 30 seconds of expiry)
            await keycloak.updateToken(30);
            
            // Get the user ID from the token (Keycloak user ID)
            const userId = keycloak.tokenParsed?.sub;
            
            if (!userId) {
                throw new Error('User ID not found in token');
            }
            
            // Call the protected API with the current token
            const data = await getUserElo(keycloak.token!, userId);
            
            setApiResponse(data);
            console.log('API response:', data);
        } catch (err: any) {
            console.error('API call failed:', err);
            setError(err.message);
        }
    };

    if (!authenticated) {
        return <div>Loading...</div>;
    }


    return (
        <div>
            <h1>Welcome, {user?.firstName} {user?.lastName}!</h1>
            <p>Email: {user?.email}</p>
            <p>Username: {user?.username}</p>

            <h2>Your Access Token</h2>
            <pre style={{ fontSize: '10px', overflow: 'auto' }}>
                {keycloak.token}
            </pre>

            {/* Button to test protected API */}
            <button onClick={handleCallAPI} style={{ marginRight: '10px' }}>
                Test Protected API (Get My ELO)
            </button>

            <button onClick={logout}>Logout</button>

            {/* Display API response */}
            {apiResponse && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#e8f5e9' }}>
                    <h3>API Response:</h3>
                    <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                </div>
            )}

            {/* Display errors */}
            {error && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee', color: 'red' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
        // <div className="p-10">
        //     <h1>Index pagess</h1>
        //     <NavLink to="/login">Login Page</NavLink>
        //     <br/>
        //     <NavLink to="/signup">Signup Page</NavLink>
        // </div>
    )
}