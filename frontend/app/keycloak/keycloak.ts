import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: 'https://keycloak.ltu-m7011e-1.se',           // Your Keycloak URL
    realm: 'myapp',                                    // The realm you created
    clientId: 'my-frontend-app'                        // The client you created
});

export default keycloak;