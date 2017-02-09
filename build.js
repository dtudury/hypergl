"use strict";

const fs = require("fs");
const path = require("path");

const sass = require("node-sass");
const rollup = require("rollup");
const typescript = require("rollup-plugin-typescript");
const uglify = require("rollup-plugin-uglify");

let is_watching = process.argv.pop() === "--watch";
let plugins = [
    typescript({
        typescript: require("typescript")
    })
];
if (!is_watching) plugins.push(uglify());

mkdirps(["dist"], err => {
    if (err) return console.error(err);
    copy("src/index.html", "dist/index.html");
    //copy("src/favicon.ico", "dist/favicon.ico");
    build_script("src/main.tsx", "dist/main.js");
    build_style("src/styles.scss", "dist/styles.css");
    //build_script("src/service.js", "dist/service.js");
});

function mkdirps(paths, cb) {
    let errs = [];
    paths.forEach(path => {
        mkdirp(path, err => {
            errs.push(err);
            if (errs.length != paths.length) return;
            errs = errs.filter(err => err);
            cb(errs.length ? errs : null);
        });
    });
}

function mkdirp(subpath, cb) {
    if (subpath === '.') return cb();
    mkdirp(path.dirname(subpath), err => {
        if (err) return cb(err);
        fs.mkdir(subpath, err => {
            if (err && err.code !== "EEXIST") return cb(err);
            cb();
        });
    });
}

function copy(src, dest) {
    console.log(`    COPYING:  ${src} -> ${dest}: ${new Date().toUTCString()}`);
    fs.createReadStream(src)
        .pipe(fs.createWriteStream(dest));
    if (is_watching) {
        let watcher = fs.watch(src, () => {
            watcher.close();
            copy(src, dest);
        });
    }
}

function writeFile_promise(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function build_style(file, outFile) {
    let task = `${file} -> ${outFile}`;
    let sourceMap = outFile + ".map";
    let watchers = [];
    let includedFiles = [];

    let f = () => {
        console.log(`    BUILDING: ${task}: ${new Date().toUTCString()}`);
        console.time(`    SUCCESS:  ${task}`);
        watchers.forEach(watcher => watcher.close());
        watchers = [];
        return new Promise((resolve, reject) => {
                sass.render({
                    file,
                    outFile,
                    sourceMap
                }, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            })
            .then(result => writeFile_promise(outFile, result.css)
                .then(() => writeFile_promise(sourceMap, result.map))
                .then(() => {
                    console.timeEnd(`    SUCCESS:  ${task}`);
                })
                .then(() => includedFiles = result.stats.includedFiles)
            )
            .then(() => {
                if (is_watching) {
                    includedFiles.forEach(includedFile => {
                        let watcher = fs.watch(includedFile, f);
                        watchers.push(watcher);
                    });
                }
            })
            .catch(console.error);
    };
    return f();
}

function build_script(entry, dest) {
    let task = `${entry} -> ${dest}`;
    let cache;
    let timeout;
    let watchers = [];
    let onwarn = msg => console.error(`    WARN:     ${task}\n${msg}`);
    let f = (eventType, filename) => {
        console.log(`    BUILDING: ${task}: ${new Date().toUTCString()}`);
        console.time(`    SUCCESS:  ${task}`);
        if (timeout) clearTimeout(timeout);
        timeout = null;
        return rollup.rollup({
                entry,
                plugins,
                cache,
                onwarn
            })
            .then(bundle => cache = bundle)
            .then(bundle => bundle.write({
                dest,
                format: "es",
                sourceMap: true
            }))
            .then(() => console.timeEnd(`    SUCCESS:  ${task}`))
            .then(() => {
                if (is_watching) {
                    watchers.forEach(watcher => watcher.close());
                    watchers = [];
                    cache.modules.forEach(module => {
                        //typescript results into some weird module in the cache
                        try {
                            let watcher = fs.watch(module.id, f);
                            watchers.push(watcher);
                        } catch (e) {
                            //let's just ignore this...
                            //console.log(e);
                        }
                    });
                }
            })
            .catch(err => {
                console.error(`    FAILURE:  ${task}\n${err}`);
                if (!is_watching) return;
                cache = null;
                timeout = setTimeout(f, 5000);
                if (watchers.length) return;
                try {
                    watchers = [fs.watch(entry, f)];
                } catch (e) {
                    console.error(e);
                    process.exit(1);
                }
            });
    };
    return f();
}
