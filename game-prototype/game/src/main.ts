import { getMatchDomain } from './domain';
import { initGame } from './game/game';
import { getToken } from './keycloak/keycloak';
import './style.css';

const loadingDiv = document.getElementById("loading")!
const gameDiv = document.getElementById("game")!

async function load() {

    const token = await getToken()
    if(!token) return;

    try {
        const domain = await getMatchDomain(token)
        loadingDiv.classList.add("hidden")
        gameDiv.classList.remove("hidden")
        initGame(domain, token)
    } catch (err) {

        if(err instanceof Error) {
            loadingDiv.innerText = err.message + " Try again in a few moments.";
        }
    }


}

load()