import { useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router";
import Icon from "~/components/icon/Icon";
import { delay } from "~/lib/delay";
import { isString } from "~/lib/validator";
import styles from "./login.module.css";



export default function LoginPage() {
    // todo: if we are logged in, redirect to landing page.
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const login = async (username: string, password: string) => {
        console.log("Logging in with %o:%o", username, password)

        await delay(200)
        // const res = await request.post("/api/login", {
        //     body: JSON.stringify({ username, password }),
        // });
        // return res;

        return {success: false, status: 400};
    }

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {        
        e.preventDefault();
        e.stopPropagation();
        
        setErrorMsg("");
        setLoading(true);
        
        const formData = new FormData(e.currentTarget);
        const username = formData.get("username");
        const password = formData.get("password");
        
        if (!isString(username) || !isString(password)) {
            setLoading(false)
            setErrorMsg("Username or Password are not valid.")
            return;
        };
        
        const res = await login(username, password);
        
        if (res.success) {
            navigate("/");
            return;
        } else {
            await delay(200);
            if (res.status === 400) {
                setErrorMsg("Username or password are incorrect.");
            } else {
                setErrorMsg("Something went wrong");
            }
        }
        setLoading(false);
    };

    return (
        <>
            <main className={styles.main}>
                <div>{/* TODO: logo */}</div>

                <div className={styles.container}>
                    <form className={styles.form} onSubmit={onSubmit}>
                        <h1 className={styles.title}>Login to your account</h1>
                        <div className={styles.error}>
                            <span>{errorMsg}</span>
                        </div>
                        <label>
                            <input
                                placeholder="Username"
                                autoComplete="username"
                                name="username"
                                required
                                className={styles.input}
                            />
                        </label>
                        <label>
                            <input
                                placeholder="Password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                name="password"
                                required
                                className={styles.input}
                            />
                            <Icon
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowPassword((e) => !e);
                                }}
                                className={styles.visibility}
                            >
                                {showPassword ? "visibility" : "visibility_off"}
                            </Icon>
                        </label>
                        <label>
                            <input
                                type="submit"
                                value={loading ? "Loading..." : "Login"}
                                className={[styles.submit, loading ? styles.loading : ""].join(" ")}
                                disabled={loading}
                            />
                        </label>

                        <div className={styles["no-account"]}>
                            <span>
                                {"Don't have an account?"} <NavLink to="/signup">Sign up</NavLink>
                            </span>
                        </div>
                    </form>
                </div>

                <div>{/* TODO: Footer */}</div>
            </main>
        </>
    );
}
