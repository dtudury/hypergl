const sass = require("node-sass");
const lib = require("../");

module.exports = (file, outFile) => {
    let sourceMap = outFile + ".map";
    return () => (new Promise((resolve, reject) => sass.render({
            file,
            outFile,
            sourceMap
        }, (err, result) => err ? reject(err) : resolve(result))))
        .then(result => Promise.all([
                lib.fs.writeFile(outFile, result.css),
                lib.fs.writeFile(sourceMap, result.map)
            ])
            .then(() => result.stats.includedFiles)
        );
};
