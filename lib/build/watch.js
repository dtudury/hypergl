const fs = require("fs");

module.exports = promise => {
    let last_run = 0;
    let watchers = [];
    let f = () => {
        if (Date.now() - last_run < 1000) return;
        watchers.forEach(watcher => watcher.close());
        watchers = [];
        Promise.resolve()
            .then(promise)
            .then(includedFiles => {
                last_run = Date.now();
                includedFiles.forEach(includedFile => {
                    let watcher = fs.watch(includedFile, f);
                    watchers.push(watcher);
                });
            })
            .catch(console.error)
    };
    return f();
};

/*
var hash = crypto.createHash('md5'),
    stream = fs.createReadStream('mybigfile.dat');

stream.on('data', function (data) {
    hash.update(data, 'utf8')
})

stream.on('end', function () {
    hash.digest('hex'); // 34f7a3113803f8ed3b8fd7ce5656ebec
})
*/
