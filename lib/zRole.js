const Util = require('./Util');
const fs = require("fs");
const myCache = require("./cache");

const a = {};

/*
 Please add your routes here
 */

const routes = fs.readdirSync("./routes/").reduce((result, item) => [...result, item.replace(".js","")],[]);
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
            if(a.isAccess(res.locals.roleId,"zrole","index")) {
                req.session.sessionFlash = Util.flashError(LANGUAGE.no_access);
                res.redirect(`${process.env.APP_AFTER_LOGIN}?setup=role`)
            } else {
                res.redirect(`${process.env.app.APP_AFTER_LOGIN}`)
            }

        }
    }
};


module.exports = a;
