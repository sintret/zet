const Util = require('./Util');
const fs = require("fs");
const myCache = require("./cache");
const zRoute = require('./zRoute');

const a = {};

/*
 Please add your routes here
 */

const routes = zRoute.ROUTES();
const cacheRoutes = myCache.get("ROUTES");
const cacheRoles = myCache.get("ROLES") || {};

if(cacheRoutes && cacheRoutes.length) {
    a.routes = process.env.NODE_ENV == "production" ? Util.arrayDeletes(cacheRoutes,["auth","test"]) : Util.arrayDeletes(cacheRoutes,["generator","auth","test"]);
} else {
    a.routes = process.env.NODE_ENV  == "production" ? Util.arrayDeletes(routes,["auth","test"]) : Util.arrayDeletes(routes,["generator","auth","test"]);
}

/*
 Default actions
 you can additional here
 */
a.actions = ['index', 'create', 'update', 'delete', 'view', 'import', 'export','approval'];

/*
 all in table roles
 */

a.params =  function (roleId) {
    let cacheRoles = myCache.get("ROLES");
    if(cacheRoles && cacheRoles.hasOwnProperty(roleId)) {
        return roleId ? cacheRoles[roleId].params : {};
    }
    return {}
};

a.rules = function (roleId) {
    return a.params(roleId);
};

a.list =  (roleId, route) => {
    let params =  a.params(roleId);
    return a.levels(route, params)
};

a.levels = (route, params) => {
    let obj = {};
    if (a.routes.indexOf(route) > -1) {
        for (let i = 0; i < a.actions.length; i++) {
            if (params.hasOwnProperty(route)) {
                if (params[route].indexOf(a.actions[i]) > -1) {
                    obj[a.actions[i]] = true;
                } else {
                    obj[a.actions[i]] = false;
                }
            } else {
                obj[a.actions[i]] = false;
            }
        }
    } else {
        for (let i = 0; i < a.actions.length; i++) {
            obj[a.actions[i]] = true;
        }
    }
    return obj;
};

a.myLevel = (req, res, table) => {
    const levels = a.levels(table, a.routes.includes(table) ?  a.rules(res.locals.roleId) : {});
    return levels;
}

a.menuAccess = (res, menu) => {
    if(Array.isArray(menu)) {
        let isTrue = false;
        for(let i = 0; i < menu.length; i++) {
            let r = a.menuAccess(res,menu[i]);
            if(r == true){
                return true;
            }
        }
    } else {
        if(Util.in_array(menu, a.routes)){
            let params = a.params(res.locals.roleId);
            let arr = Object.keys(params) || [];
            if(Util.in_array(menu, arr)){
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }
    return false;
};

a.isAccess = (roleId, route, action) => {
    let params = a.params(roleId);
    if(a.routes.includes(route)) {
        if(!params[route]){
            return false;
        }
        if(a.actions.includes(action)){
            if(params[route].includes(action)){
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
        return false;
    }
    return true;
};

//get access page after login
a.access = (req, res, next) => {
    if (req.session.user === null || typeof req.session.user === 'undefined') {
        req.session.sessionFlash = Util.flashError(LANGUAGE.login_first);
        res.redirect(`${process.env.APP_AFTER_LOGOUT}`);
    } else {
        const isAccess = a.isAccess(res.locals.roleId, req.route, req.action);
        if (isAccess) {
            next();
        } else {
            if(a.isAccess(res.locals.roleId,'zrole','index')) {
                req.session.sessionFlash = Util.flashError(LANGUAGE.no_access);
                res.redirect(`${process.env.APP_AFTER_LOGIN}?setup=role`)
            } else {
                res.redirect(`${process.env.APP_AFTER_LOGIN}`)
            }
        }
    }
};

a.menu = (req, res) => {
    let jsonArray = [];
    if (!res.locals.isLogin) return jsonArray;
    let companyId = res.locals.companyId;
    let userId = res.locals.userId;
    let jsonMenu = myCache.get("MENU");
    let arr = [];
    if (jsonMenu && jsonMenu.hasOwnProperty(companyId)) {
        arr = jsonMenu[companyId] || [];
    }
    arr.map((me) => {
        if (a.menuAccess(res, me.href)) {
            let obj = a.addItemMenu(me);
            if (me.hasOwnProperty("children")) {
                obj.children = a.childrenMenu(res, me.children);
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

a.menuSystems = (req,res) => {
    let arr = [];
    let menus = myCache.get("MENU_SYSTEMS");
    let children = [];
    menus["users"].forEach(function (item) {
        if (a.menuAccess(res, item.href)) {
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
        if (a.menuAccess(res, item.href)) {
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

a.menus = (req, res) => {
    let arr = a.menu(req, res);
    return  [...arr, ...a.menuSystems(req, res)];
};

a.addItemMenu = (obj) => {
    let newObj = {};
    for (const key in obj) {
        if (key != "children") {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};

a.childrenMenu = (res, arr) => {
    let myArr = [];
    let nArr = arr.reduce((result, item) => [...result, item.href],[]);
    let isAccess =  a.menuAccess(res, nArr);
    if (isAccess) {
        //stupid way
        arr.map((item) => {
            let obj = {};
            if(a.isAccess(res.locals.roleId,item.href,"index")) {
                obj = a.addItemMenu(item);
                if (item.hasOwnProperty("children") && item.children.length) {
                    let child = [];
                    child.push(a.childrenMenu(res, item.children));
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

module.exports = a;
