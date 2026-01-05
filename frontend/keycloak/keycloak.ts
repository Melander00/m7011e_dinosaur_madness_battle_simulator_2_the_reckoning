import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "https://keycloak.ltu-m7011e-1.se",
  realm: "myapp",
  clientId: "my-frontend-app`",
});

export default keycloak;

