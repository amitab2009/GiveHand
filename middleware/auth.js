function requireAuth(message) {
    return function(req, res, next) {
        if (!req.session.userId) {
            return res.status(401).json({ error: message });
        }

        next();
    };
}

module.exports = requireAuth;
