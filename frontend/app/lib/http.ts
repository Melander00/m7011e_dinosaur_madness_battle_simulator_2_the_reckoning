type SuccessBody<T> = {
    success: true,
    data: T
}

type ErrorBody = {
    success: false,
    status: number,
    statusText: string,
    text: string
}

type Body<T> = SuccessBody<T> | ErrorBody

export async function req<T>(url: URL | string, init?: RequestInit) {
    let body: Body<T|string>
    
    const res = await fetch(url, init)

    if(res.ok) {
        let b: T|string;
        if(res.headers.get("Content-Type")?.includes("application/json")) b = await res.json() as T;
        else b = await res.text();
        body = {
            success: true,
            data: b
        }
    } else {
        body = {
            success: false,
            status: res.status,
            statusText: res.statusText,
            text: await res.text()
        }
    }
    return body;
}


export const request = {
    get: req,
    post: <T>(url: URL | string, init?: RequestInit) => req<T>(url, {method: "POST", ...init}),
}