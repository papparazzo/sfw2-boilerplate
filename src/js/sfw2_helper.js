
export function sfw2Reload() {
    const url = new URL(window.location)
    url.searchParams.delete('getForm');
    url.searchParams.delete('hash');
    window.location.href = url.toString();
    window.location.reload();
}

