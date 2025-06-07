const { useState } = React;
        function LoginPage() {
            const [username, setUsername] = useState('');
            const [password, setPassword] = useState('');
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);
            const { login } = useAuth();

            const handleSubmit = async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');

                try {
                    await login(username.trim(), password);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            return (
                <div className="login-background flex items-center justify-center min-h-screen p-4">
                    <div className="w-full max-w-lg mx-auto text-center">
                        
                        {/* ✅ SOLO LOGO */}
                        <div className="mb-12">
                            <img 
                                src="./logoDM.png" 
                                alt="Studio Dottori Mandelli" 
                                className="logo-large mx-auto"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    console.warn('Logo non trovato: ./logoDM.png');
                                }}
                            />
                        </div>

                        {/* ✅ FORM DI LOGIN PULITO */}
                        <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    {error}
                                </div>
                            )}

                            {/* ✅ CAMPO USERNAME SENZA SUGGERIMENTI */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                    <i className="fas fa-user mr-2"></i>
                                    Nome utente
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                                    placeholder=""
                                    required
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                    <i className="fas fa-lock mr-2"></i>
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                                    placeholder=""
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !username.trim() || !password}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-4 rounded-lg transition-colors duration-200 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Accesso in corso...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sign-in-alt mr-2"></i>
                                        Accedi alla Dashboard
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

