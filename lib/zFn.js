const moment = require('moment');
const zRoute = require('./zRoute');
const io = require("./io");
const qs = require('qs');
const axios = require('axios');
const myCache = require("./cache");
const connection = require('./connection');
const Util = require("./Util");
const moduleLib = require('./moduleLib');
const zCache = require('./zCache');

const running =  (scripts, params, obj={}) => {
    const MYMODELS = zRoute.MYMODELS();
    let stringParams = "";
    const defaultCall = {
        Util: Util,
        connection: connection,
        io: io,
        qs: qs,
        moment:moment,
        axios:axios,
        myCache:myCache,
        zCache:zCache,
        params:params,
        MYMODELS:MYMODELS,
        moduleLib:moduleLib
    };

    const CALL = Object.assign(defaultCall,obj);

    stringParams = "";
    for (const keys in CALL) {
        stringParams += `var ${keys} = this.${keys};`
    }

    const AsyncFunction = Object.getPrototypeOf(async function () {
    }).constructor;

    try {
        return AsyncFunction(`
        try {
            ${stringParams};
            ${scripts};
        } catch(error) {
           console.log('error in zfn', error.toString());
           return {
                error:true,
                status : 0,
                message:error.toString()
           };
        }
    `).call(CALL);
    } catch (e) {
        throw new Error(e);
        return;
    }
};

module.exports = running;
