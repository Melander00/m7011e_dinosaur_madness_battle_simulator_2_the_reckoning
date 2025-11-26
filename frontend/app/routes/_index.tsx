import { NavLink } from "react-router";

export default function LandingPage() {
    return(
        <div className="p-10">
            <h1>Index pagess, Hej nu är den uppdaterad</h1>
            <NavLink to="/login">Login Page</NavLink>
            <br/>
            <NavLink to="/signup">Signup Page</NavLink>
        </div>
    )
}