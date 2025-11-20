import type { MouseEventHandler } from "react"

export default function Icon({
    children,
    className,
    onClick,
    style
}: {
    children: React.ReactNode
    className?: string,
    onClick?: MouseEventHandler<HTMLSpanElement>
    style?: React.CSSProperties
}) {
    return(
        <span 
            className={["material-symbols-outlined", className || ""].join(" ")} 
            onClick={onClick}
            style={style}
        >
            {children}
        </span>
    )
}


const Icons = [
    // login
    "visibility",
    "visibility_off",
    // menu
    // "menu",
    // "menu_open",
    // "home",
    // "calendar_month",
    // "schedule",
    // "task",
    // "build",
    // "info",
    // "person",
    // "dataset",
    // "admin_panel_settings",
    // "logout",
    // // annat
    // "arrow_back_ios",
    // "arrow_back_ios_new",
    // "arrow_forward_ios",
    // // time
    // "cloud_done",
    // "cloud_sync",
    // "undo",
    // "check",
    // "close",
    // "arrow_drop_up",
    // "arrow_drop_down",
    
].sort()

const iconLinkHref = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block&icon_names=${Icons.join(",")}`
export function IconFontLink() {
    return(
        <link
            rel="stylesheet"
            href={iconLinkHref}
        />
    )
}

export function IconFontString() {
    return iconLinkHref
}