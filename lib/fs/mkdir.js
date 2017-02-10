const fs = require("fs");

module.exports = path => new Promise((resolve, reject) => {
    fs.mkdir(path, err => err ? reject(err) : resolve());
});
