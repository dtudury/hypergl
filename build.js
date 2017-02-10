"use strict";

const fs = require("fs");
const lib = require("./lib");
const mkdirp = lib.fs.mkdirp;
const copyFile = lib.fs.copyFile;
const watch = lib.build.watch;
const time = lib.build.time;
const sass = lib.build.sass;
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

mkdirp("dist/foo/bar/baz")
    .then(() => {
        copy("src/index.html", "dist/index.html");
        copy("src/favicon.ico", "dist/favicon.ico");
        build_script("src/main.tsx", "dist/main.js");
        build_style("src/styles.scss", "dist/styles.css");
    })
    .catch(console.error);

function copy(src, dest) {
    let task = `${src} -> ${dest}`;
    if (is_watching) watch(time(task, copyFile(src, dest)))
    else time(copyFile(src, dest))();
    /*
    console.log(`    COPYING:  ${src} -> ${dest}: ${new Date().toUTCString()}`);
    fs.createReadStream(src)
        .pipe(fs.createWriteStream(dest));
    if (is_watching) {
        let watcher = fs.watch(src, () => {
            watcher.close();
            copy(src, dest);
        });
    }
    */
}

function build_style(file, outFile) {
    let task = `${file} -> ${outFile}`;
    if (is_watching) watch(time(task, sass(file, outFile)))
    else time(sass(file, outFile))();
}


function build_script(entry, dest) {
    let task = `${entry} -> ${dest}`;
    let cache;
    let timeout;
    let watchers = [];
    let onwarn = msg => console.error(`    WARN:     ${task}\n${msg}`);
    let f = () => {
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
