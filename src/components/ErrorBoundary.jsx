class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-red-700 text-center">
                    Qualcosa è andato storto.
                </div>
            );
        }
        return this.props.children;
    }
}
