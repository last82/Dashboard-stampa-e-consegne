function sanitizeInput(value) {
    return value.replace(/[<>&'"`]/g, '');
}
