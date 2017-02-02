"use strict";

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const buble = require('rollup-plugin-buble');
const typescript = require('rollup-plugin-typescript');
const uglify = require('rollup-plugin-uglify');

let is_watching = process.argv.pop() === "--watch";
let plugins = [
    typescript({typescript: require('typescript')}),
    buble({jsx: "h"})
];
if (!is_watching) plugins.push(uglify());

mkdirps(["dist"], err => {
    if (err) return console.error(err);
    //copy("src/index.html", "dist/index.html");
    //copy("src/favicon.ico", "dist/favicon.ico");
    build("src/main.tsx", "dist/main.js");
    //build("src/service.js", "dist/service.js");
});

function mkdirps (paths, cb) {
    let errs = [];
    paths.forEach(path => {
        mkdirp(path, err => {
            errs.push(err);
            if (errs.length != paths.length) return;
            errs = errs.filter(err => err);
            cb(errs.length ? errs : null) ;
        });
    });
}

function mkdirp (subpath, cb) {
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

function build(entry, dest) {
    let task = `${entry} -> ${dest}`;
    let cache;
    let timeout;
    let watchers = [];
    let onwarn = msg => console.error(`    WARN:     ${task}\n${msg}`);
    let f = (eventType, filename) => {
        return Promise.resolve()
        .then(() => {
            console.log(`    BUILDING: ${task}: ${new Date().toUTCString()}`);
            console.time(`    SUCCESS:  ${task}`);
            if (timeout) clearTimeout(timeout);
            timeout = null;
            return rollup.rollup({entry, plugins, cache, onwarn});
        })
        .then(bundle => (cache = bundle).write({dest, format: 'es', sourceMap: true}))
        .then(() => console.timeEnd(`    SUCCESS:  ${task}`))
        .then(() => {
            if (is_watching) {
                watchers.forEach(watcher => watcher.close());
                watchers = cache.modules.map(module => fs.watch(module.id, f));
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
