import { API_URL } from "@/config"

interface CallApiOptions extends RequestInit {
    noDefaultHeader?: boolean
}
export const callApi = async (route: string, {noDefaultHeader, ...options}: CallApiOptions = { noDefaultHeader: false }) => {
    const res = await fetch(`${API_URL}${route}/`, {
        ...options,
        headers: noDefaultHeader ? options.headers : {
            "Content-Type": "application/json",
            ...options.headers,
        },
    })
    if (!res.ok) {
        let errorMessage = 'An unknown error occurred.';
        try {
            const errorData = await res.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            errorMessage = await res.text();
        }
        throw new Error(`API call failed: ${errorMessage}`)
    }
    return await res.json()
}