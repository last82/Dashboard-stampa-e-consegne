const { useState, useEffect, createContext, useContext } = React;

const USERS = {
    camaioni: {
        password: 'camaioni2024',
        laboratorio: 'camaioni',
        displayName: 'Laboratorio Camaioni',
        role: 'lab'
    },
    rota: {
        password: 'rota2024',
        laboratorio: 'rota',
        displayName: 'Laboratorio Rota',
        role: 'lab'
    },
    studio: {
        password: 'mandelli2024',
        laboratorio: null,
        displayName: 'Studio Dottori Mandelli',
        role: 'admin'
    }
};

const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = loadUserSession();
        if (userData) {
            setUser(userData);
            console.log('✅ Sessione recuperata automaticamente:', userData.displayName);
        }
        setLoading(false);
    }, []);

    const login = (username, password) => {
        const cleanUsername = sanitizeInput(username.toLowerCase());
        const cleanPassword = sanitizeInput(password);
        const userData = USERS[cleanUsername];
        if (!userData || userData.password !== cleanPassword) {
            throw new Error('Nome utente o password non corretti');
        }
        const userSession = { username: cleanUsername, ...userData };
        setUser(userSession);
        saveUserSession(userSession);
        console.log('✅ Login effettuato e salvato:', userSession.displayName);
        return userSession;
    };

    const logout = () => {
        setUser(null);
        clearUserSession();
        console.log('👋 Logout effettuato - sessione cancellata');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve essere usato dentro AuthProvider');
    }
    return context;
}
