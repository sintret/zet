/**
 * For dynamic router
 */
const axios = require('axios');
const fs = require('fs-extra');
const nodemailer = require('nodemailer');
const qs = require('qs');
const moment = require('moment');
const pm2 = require('pm2');
const { minify } = require('html-minifier-terser');
const connection = require('./connection');
const Util = require('./Util');
const myCache = require('./cache');

const zpage = {};

zpage.build = async (req, res) => {
    let layouts = await connection.results({
        table : "zlayout"
    });
    let layoutObj = Util.arrayToObject(layouts,"id");
    let results = await connection.results({
        table: "zpage",
        where: {
            active: 1
        }
    });
    let server_code = zpage.coreCode();
    results.forEach(function (result) {
        server_code += zpage.createRoute(result, res.locals.token, layoutObj);
        server_code += Util.newLine;
    });
    server_code += `module.exports = router;`;

    fs.writeFileSync(dirRoot + "/routes/zindex.js", server_code, 'utf-8');
    if (process.env.NODE_ENV === "production") {
        setTimeout(function () {
            pm2.connect(function (err) {
                if (err) {
                    console.log(err.toString());
                }
                pm2.restart(process.env.PM2_NAME, (err, proc) => {
                    //io.to(room).emit("message","Restart done")
                });
            });
        }, 3000)
    }
};

zpage.coreCode = () => {
    return `const router = require('express').Router();
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true});
const fs = require('fs-extra');
const qs = require('qs');
const axios = require('axios');
const {zRoute, zRole, connection, Util, io, zCache, myCache, debug, moduleLib, zFunction, zFn, Mail } = require('zet-lib');

`;
};

zpage.createRoute = (obj, token, layoutObj) => {
    const MYMODELS = myCache.get('MYMODELS');
    const MYMODEL = MYMODELS.zpage;
    let DIR = dirRoot + "/views/zindex";
    let METHOD = MYMODEL.widgets.method.fields;
    let layout = "new-blank.ejs";
    if (obj.layouts == 2) {
        layout = "one.ejs"
    } else if (obj.layouts == 3) {
        layout = "two.ejs";
    } else if(obj.layouts == 4) {
        layout = layoutObj[obj.layout_id].name+".ejs" || "blank.ejs";
    }

    let renderDataforGet = "";
    let routerforGet = "";
    if (obj.method == 1) {
        renderDataforGet = `renderData.csrfToken = req.csrfToken();`;
        routerforGet = "csrfProtection, "
    }
    let commonData = {
        company_id: obj.company_id,
        updated_by: obj.updated_by,
        created_by: obj.created_by
    };
    let ioto = `io.to("${token}").emit("error", e.toString())`;

    let render = "";
    let renderData = "";
    if (obj.head) {
        fs.writeFileSync(`${DIR}/page${obj.id}-head.ejs`, obj.head, 'utf-8');
        renderData += `renderData.renderHead = "zindex/page${obj.id}-head.ejs"; `
    } else {
        fs.unlink(`${DIR}/page${obj.id}-head.ejs`, function (err) {
            if (err) return console.log(err);
            console.log('file deleted successfully');
        });
    }

    let isrenderPage = false;
    if (obj.client_code) {
        fs.writeFileSync(`${DIR}/page${obj.id}.ejs`, obj.client_code, 'utf-8');
        renderData += `renderData.renderBody = "zindex/page${obj.id}.ejs"; `
        isrenderPage = true;
    } else {
        fs.unlink(`${DIR}/page${obj.id}.ejs`, function (err) {
            if (err) return console.log(err);
            console.log('file deleted successfully');
        });
    }
    //optional
    if(!isrenderPage && obj.method == 1) {
        fs.writeFileSync(`${DIR}/page${obj.id}.ejs`, obj.client_code, 'utf-8');
        renderData += `renderData.renderBody = "zindex/page${obj.id}.ejs"; `
    }
    //end optional
    if (obj.scripts) {
        fs.writeFileSync(`${DIR}/page${obj.id}-script.ejs`, obj.scripts, 'utf-8');
        renderData += `renderData.renderEnd = "zindex/page${obj.id}-script.ejs"; `
    } else {
        fs.unlink(`${DIR}/page${obj.id}-script.ejs`, function (err) {
            if (err) return console.log(err);
            console.log('file deleted successfully');
        });
    }
    if (renderData) {
        render += `${Util.tab}res.render("layouts/${layout}", renderData);`;
    }
    let scripts = `router.${METHOD[obj.method]}('${obj.page}', ${routerforGet} async(req,res) => {
    try {
    let renderData = {};
    let commonData = ${JSON.stringify(commonData)};
    commonData.updated_at = Util.now();
    commonData.created_at = Util.now();
    ${renderDataforGet}
    let layout = "${layout}";
    ${obj.server_code}
    ${renderData}
    ${render}
    } catch (e) {
        console.log(e);
        ${ioto}
        res.json(e.toString()); 
    }
}); ${Util.newLine}
`;

    return scripts;
};


zpage.buildLayout = async (obj) => {
    let name = Util.toName(obj.name);
    if (obj.active) {
        let html = await minify(obj.code,{
            removeComments:true,
            minifyJS:true,
            minifyCSS:true,
            collapseWhitespace: true
        });
        fs.writeFileSync(dirRoot + "/views/layouts/" + name + ".ejs", html, 'utf-8');
        if (process.env.NODE_ENV  === "production") {
            setTimeout(function () {
                pm2.connect(function (err) {
                    if (err) {
                        console.log(err.toString());
                    }
                    pm2.restart(process.env.PM2_NAME, (err, proc) => {
                        //io.to(room).emit("message","Restart done")
                    });
                });
            }, 3000)
        }
    }
};

zpage.layoutDelete = async (obj) => {
    let name = Util.toName(obj.name);
    let path = dirRoot + "/views/layouts/customs/" + name + ".ejs"
    fs.unlink(path, function (err) {
        if (err) return console.log(err);
        console.log('file deleted successfully');
    });
};

module.exports = zpage;
