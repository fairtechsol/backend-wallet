exports.setDeleteBody = async (req, res, next) => {
    req.body.isPermanentDelete = true;
    next();
};
