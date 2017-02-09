module.exports = (label, promise) => {
    let _output;
    return () => Promise.resolve()
    .then(() => console.log(`    BUILDING: ${label}: ${new Date().toUTCString()}`))
    .then(() => console.time(`    SUCCESS:  ${label}`))
    .then(promise)
    .then(output => _output = output)
    .then(() => console.timeEnd(`    SUCCESS:  ${label}`))
    .then(() => _output);
};
