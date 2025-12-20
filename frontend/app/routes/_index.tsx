import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import keycloak from "~/keycloak/keycloak";

export default function LandingPage() {
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        // Initialize Keycloak
        keycloak.init({
            onLoad: 'login-required',  // Redirect to login if not authenticated
            checkLoginIframe: false
        }).then(authenticated => {
            setAuthenticated(authenticated);

            if (authenticated) {
                // Redirect to home page after successful login
                navigate('/home');
            }
        });
    }, [navigate]);

    if (!authenticated) {
        return <div>Authenticating...</div>;
    }

    // This will never render as we redirect immediately after authentication
    return <div>Redirecting to home...</div>;
}