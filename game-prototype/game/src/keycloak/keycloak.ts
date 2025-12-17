import Keycloak from 'keycloak-js';

const globalKeycloak = globalThis as unknown as { keycloak: Keycloak }

export const keycloak = globalKeycloak.keycloak || new Keycloak({
    url: 'https://keycloak.ltu-m7011e-1.se',           // Your Keycloak URL
    realm: 'myapp',                                    // The realm you created
    clientId: 'my-frontend-app'                        // The client you created
})

if(!import.meta.env.PROD) globalKeycloak.keycloak = keycloak;


let loggedIn = false;

export async function getToken() {
    if(loggedIn) {
        await keycloak.updateToken(60)
        return keycloak.token;
    } else {
        return new Promise<string|undefined>((resolve) => {
            keycloak.init({
                onLoad: "login-required",
                checkLoginIframe: false,
            }).then(auth => {
                if(auth) {
                    loggedIn = true;
                    resolve(keycloak.token)
                }
            })
        })
    }
}