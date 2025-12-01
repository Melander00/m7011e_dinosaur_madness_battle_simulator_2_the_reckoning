import { useEffect, useState } from "react";
import keycloak from "~/keycloak/keycloak";

export default function LandingPage() {

    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);

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

            <button onClick={logout}>Logout</button>
        </div>
        // <div className="p-10">
        //     <h1>Index pagess</h1>
        //     <NavLink to="/login">Login Page</NavLink>
        //     <br/>
        //     <NavLink to="/signup">Signup Page</NavLink>
        // </div>
    )
}