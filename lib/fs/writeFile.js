const fs = require("fs");

module.exports = (file, data) => new Promise((resolve, reject) => {
    fs.writeFile(file, data, err => err ? reject(err) : resolve());
});
