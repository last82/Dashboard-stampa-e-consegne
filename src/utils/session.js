function loadUserSession() {
    const saved = localStorage.getItem('dashboard_user');
    if (!saved) return null;
    try {
        const json = atob(saved);
        return JSON.parse(json);
    } catch (e) {
        console.error('Errore nel recupero sessione:', e);
        localStorage.removeItem('dashboard_user');
        return null;
    }
}

function saveUserSession(session) {
    try {
        const encoded = btoa(JSON.stringify(session));
        localStorage.setItem('dashboard_user', encoded);
    } catch (e) {
        console.error('Errore salvataggio sessione:', e);
    }
}

function clearUserSession() {
    localStorage.removeItem('dashboard_user');
}
