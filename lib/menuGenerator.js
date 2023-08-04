/**
 * Created by ANDHIE on 2/28/2021.
 */
const myCache = require("./cache");
const zRole = require("./zRole");
const connection = require("./connection");
const fs = require("fs-extra");
const config = require('dotenv').config();
const dirRoot = process.env.dirRoot;
const pm2 = require('pm2');
const menuGenerator = {};

menuGenerator.addItem = (obj) => {
    let newObj = {};
    for (const key in obj) {
        if (key != "children") {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};

menuGenerator.children = (res, arr) => {
    let myArr = [];
    let nArr = arr.reduce((result, item) => [...result, item.href],[]);
    let isAccess =  zRole.menuAccess(res, nArr);
    if (isAccess) {
        //stupid way
        arr.map((item) => {
            let obj = {};
            if(zRole.isAccess(res.locals.roleId,item.href,"index")) {
                obj = menuGenerator.addItem(item);
                if (item.hasOwnProperty("children") && item.children.length) {
                    let child = [];
                    child.push(menuGenerator.children(res, item.children));
                    if (child[0]) {
                        obj.children = child[0];
                    }
                }
                myArr.push(obj)
            }
        });
    }
    return myArr;
};

menuGenerator.menu = (req, res) => {
    let jsonArray = [];
    if (!res.locals.isLogin) return jsonArray;
    let companyId = res.locals.companyId;
    let userId = res.locals.userId;
    let jsonMenu = myCache.get("MENU");
    let arr = [];
    if (jsonMenu && jsonMenu.hasOwnProperty(companyId)) {
        arr = jsonMenu[companyId] || [];
    } else {
        arr = menuGenerator.arr; //set to default menu
    }
    arr.map((me) => {
        if (zRole.menuAccess(res, me.href)) {
            let obj = menuGenerator.addItem(me);
            if (me.hasOwnProperty("children")) {
                obj.children = menuGenerator.children(res, me.children);
                if(obj.children.length) {
                    jsonArray.push(obj);
                }
            } else {
                jsonArray.push(obj);
            }
        }
    });

    return jsonArray;
};

menuGenerator.systems = (req,res) => {
    let arr = [];
    let menus = myCache.get("MENU_SYSTEMS");
    let children = [];
    menus["users"].forEach(function (item) {
        if (zRole.menuAccess(res, item.href)) {
            children.push(item);
        }
    });
    if(children.length == 0) {
        delete menus.users;
    } else {
        let userManagament = {
            text: "Users",
            icon: "tabler-users-plus",
            children: children
        };
        arr.push(userManagament);
    }
    children = [];
    menus["systems"].forEach(function (item) {
        if (zRole.menuAccess(res, item.href)) {
            children.push(item);
        }
    });
    if(children.length == 0) {
        delete menus.systems;
    } else {
        let settings = {
            text: "Systems",
            icon: "tabler-settings-check",
            children: children
        };
        arr.push(settings);
    }
    return arr;
};

menuGenerator.menuPlus = (req, res) => {
    let arr = menuGenerator.menu(req, res);
    return  [...arr, ...menuGenerator.systems(req, res)];
};

menuGenerator.html = (req, res) => {
    let html = "";
    let arr = menuGenerator.menu(req, res);
    let span = "";
    let dropdown = "";
    let test = "";
    arr.map((me) => {
        let href = me.href == "" ? "#" : "/" + me.href;
        if (me.hasOwnProperty("children") && me.children.length) {
            dropdown = `class="dropdown"`;
            span = `<span class="caret"></span>`;
            test = `class="test"`;
        } else {
            dropdown = "", span = "", test = "";
        }
        html += `<li ${dropdown}>`;
        html += `<a href="${href}" title="${me.title}" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i class="${me.icon} fa-fw"></i> ${me.text}${span}</a>`;

        if (me.hasOwnProperty("children") && me.children.length) {
            html += `<ul class="dropdown-menu">`;
            let children = me.children;

            //1 child
            children.map((item) => {
                if (item.hasOwnProperty("children")) {
                    dropdown = `class="dropdown-submenu"`;
                    span = `<span class="caret"></span>`;
                    test = `class="test"`;
                } else {
                    dropdown = "", span = "", test = "";
                }

                href = item.href == "" ? "#" : "/" + item.href;
                html += `<li ${dropdown}><a ${test} title="${item.title}" tabindex="-1" href="${href}"><i class="${item.icon} fa-fw"></i> ${item.text}${span}</a>`;

                //2 child
                if (item.hasOwnProperty("children") && me.children.length) {
                    html += `<ul class="dropdown-menu">`;
                    item.children.map((child) => {
                        if (child.hasOwnProperty("children")) {
                            dropdown = `class="dropdown-submenu"`;
                            span = `<span class="caret"></span>`;
                            test = `class="test"`;
                        } else {
                            dropdown = "", span = "", test = "";
                        }

                        href = child.href == "" ? "#" : "/" + child.href;
                        html += `<li ${dropdown}><a title="${child.title}" ${test} tabindex="-1" href="${href}"><i class="${child.icon} fa-fw"></i>  ${child.text}${span}</a>`;


                        if (child.hasOwnProperty("children") && me.children.length) {
                            html += `<ul class="dropdown-menu">`;
                            child.children.map((child2) => {
                                href = child2.href == "" ? "#" : "/" + child2.href;

                                html += `<li><a title="${child2.title}" tabindex="-1" href="${href}"><i class="${child2.icon} fa-fw"></i>  ${child2.text}</a>`;
                            });

                            //end 3 child
                            html += '</ul>';
                        }
                    });
                    //end 2 child
                    html += '</ul>';
                }
            });
            //end 1 child
            html += `</ul>`;
        }
        html += `<li>`
    });
    return html;
};


/*
Do not remove for menu
 */
menuGenerator.generateCollections = async() => {
    let scripts = `
module.exports = (req,res,next) => {

`;
    let results = await connection.results({
        table : "zmenu_collections",
        where : {
            active : 1
        }
    });
    let arrFn = [];
    if(results.length) {
        for(let i = 0;i<results.length;i++) {
            scripts += `function menu${i}() {
               ${results[i].code}
            }
            menu${i}();
            `;
        }
    }
    scripts += ` next();
}`;
    fs.writeFileSync(`${dirRoot}/components/zMenuCollections.js`, scripts, 'utf-8');
    if (process.env.environment == "production") {
        setTimeout(function () {
            pm2.connect(function (err) {
                if (err) {
                    console.log(err.toString());
                }
                pm2.restart(process.env.app.pm2, (err, proc) => {
                    //io.to(room).emit("message","Restart done")
                });
            });
        }, 3000)
    }
};

module.exports = menuGenerator;
