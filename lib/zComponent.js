const zFn = require('./zFn');
const connection = require('./connection');

const components = async (...args) => {
    let title = "", params = [];
    for (let i = 0; i < args.length; i++) {
        if(i == 0) {
            title = args[i];
        } else {
            params.push(args[i])
        }
    }
    const result = await connection.result({
        table : "zcomponent",
        where : {
            title : title,
            active : 1
        }
    });
    if(result.id) {
        return await zFn(result.code, params);
    } else {
        return;
    }
};

module.exports = components;
