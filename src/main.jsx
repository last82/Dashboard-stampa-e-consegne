const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <AuthProvider>
            <App />
        </AuthProvider>
    </ErrorBoundary>
);
