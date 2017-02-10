const path = require("path");
const mkdir = require("./mkdir");
module.exports = subpath => {
    if (subpath === '.') return Promise.resolve();
    return module.exports(path.dirname(subpath))
    .then(() => mkdir(subpath))
    .catch(err => {
        if (err.code !== "EEXIST") throw err;
    });
};
