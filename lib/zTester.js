const connection = require('./connection');
const Util = require("./Util");
const moment = require('moment');
const zRoute = require('./zRoute');
const io = require("./io");
const fs = require("fs");
const qs = require('qs');
const axios = require('axios');
const nodemailer = require('nodemailer')
const myCache = require("./cache");
const moduleLib = require("./moduleLib");
const cForm = require("./Form");
const zFunction = require("./zFunction");
const zCache = require("./zCache");
require('dotenv').config();

const zTester =  {}

zTester.page = async(req,res,scripts) => {
    const MYMODELS = zRoute.MYMODELS();
    let csrf = req.csrfToken();
    let email = req.query.email || "";
    let json = {
        error:false,
        status : 1,
        message:"Success"
    };
    let stringParams = "";
    let CALL = {
        req:req,
        res:res,
        Util: Util,
        connection: connection,
        fs: fs,
        io: io,
        qs: qs,
        moment:moment,
        myCache:myCache,
        moduleLib:moduleLib,
        zRoute:zRoute,
        zCache:zCache,
        zFunction:zFunction,
        MYMODELS:MYMODELS,
        renderData:{},
        emptyFn : function () {}
    };

    var arr = ['res.json','res.send'];
    var newScript = '';
    for(var i = 0; i < arr.length; i++) {
        scripts = Util.replaceAll(scripts,arr[i],'emptyFn');
    }

    scripts += `
    return 1`;
    stringParams = "";
    for (var keys in CALL) {
        stringParams += `var ${keys} = this.${keys};`
    }
    const AsyncFunction = Object.getPrototypeOf(async function () {
    }).constructor;

    return new Promise(async function (resolve, reject) {
        try {
            var t = AsyncFunction(`
                    ${stringParams};
                    ${scripts};
            `).call(CALL);
            let me = await t;
            if(me == 1) {
                resolve({
                    error:false,
                    status : 1,
                    message:"Success"
                })
            } else {
                resolve({
                    error:true,
                    status : 0,
                    message:"Error"
                })
            }
        } catch (e) {
            resolve({
                error:true,
                status : 0,
                message:e.toString()
            })
        }
    })
}

module.exports = zTester;
