const zFn = require('./zFn');
const myCache = require("./cache");

module.exports = (...args) => {
    let title = "", params = [];
    for (let i = 0; i < args.length; i++) {
        if(i == 0) {
            title = args[i];
        } else {
            params.push(args[i])
        }
    }
    let results = myCache.get('ZFUNCTIONS');
    let result = results[title];
    if(result.id) {
        return  zFn(result.code, params);
    } else {
        return;
    }
};
