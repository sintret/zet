const myCache = require("./cache");
const connection = require('./connection');
const Util = require('./Util');
const path = require('path');
const fs = require('fs-extra');
const directory = "./";
const zRoute = require('./zRoute');

const zCache = {};

//constants
zCache.KEYS = {
    ROUTES: "ROUTES",
    TABLES: "TABLES",
    MYMODELS: "MYMODELS",
    ROLES: "ROLES",
    CONFIG: "CONFIG",
    MENU: "MENU",
    MENU_SYSTEMS: "MENU_SYSTEMS",
    ZFUNCTIONS:"ZFUNCTIONS",
    VERSIONS:"VERSIONS",
    MODELS_RELATIONS:"MODELS_RELATIONS"
};

zCache.STATICS = zCache.KEYS;
zCache.myCache = myCache;

zCache.get = (name) => {
    if (!myCache.has(name)) {
        zCache[name]();
    } else {
        return myCache.get(name);
    }
};

zCache.set = (X, Y) => {
    myCache.set(X, Y);
};

zCache.cache = async(req, res, next) => {
    await cache();
    next();
};

const cache = async()=> {
    zCache.VERSIONS();
    let i = 0;
    if (myCache.has("ROLES")) {
        //console.log("cache ROLES has exist " + i)
        i = i + 1;
    } else {
        //console.log("cache ROLES not exist " + i)
        await zCache.ROLES();
    }
    if (myCache.has("ROUTES")) {
        i = i + 1;
    } else {
        await zCache.ROUTES();
    }
    if (myCache.has("TABLES")) {
        i = i + 1;
    } else {
        //console.log("cache TABLES not exist " + i)
        await zCache.TABLES();
    }
    if (myCache.has("CONFIG")) {
        i = i + 1;
    } else {
        //console.log("cache CONFIG not exist " + i)
        await zCache.CONFIG();
    }
    if (myCache.has("MENU")) {
        i = i + 1;
    } else {
        //console.log("cache MENU not exist " + i);
        //zup.menu();
        await zCache.MENU();
    }
    if (myCache.has("MENU_SYSTEMS")) {
        //i = i + 1;
    } else {
        await zCache.MENU_SYSTEMS();
    }
    //console.log(i)
    if (myCache.has("ZFUNCTIONS")) {
        //i = i + 1;
    } else {
        await zCache.ZFUNCTIONS();
    }
    //await zCache.CURRENCIES();
    //console.log(i)
    if (i < 5) {
        await cache();
    } else {
        return i;
    }
    //cache relations on startup
    await zCache.MODELS_RELATIONS();
};

zCache.renew = async()=> {
    zCache.VERSIONS();
    await zCache.ROLES();
    await zCache.MENU();
    await zCache.CONFIG();
    await zCache.TABLES();
    await zCache.ROUTES();
    await zCache.MENU_SYSTEMS();
    await zCache.MODELS_RELATIONS();
};

zCache.ROUTES = () => {
    if(myCache.has("ROUTES")) {
        return myCache.get("ROUTES");
    } else {
        const routes = zRoute.ROUTES();
        myCache.set("ROUTES", routes);
        return routes;
    }
};

zCache.TABLES = () => {
    let routes = zCache.get("ROUTES");
    let modelsDirectory = path.join(directory, 'models');
    let tables = [], obj = {};
    routes.forEach((table) => {
        if (fs.existsSync(modelsDirectory + "/" + table + ".js")) {
            tables.push(table);
            let MYMODEL = require("./../models/" + table);
            obj[table] = MYMODEL;
        }
    });
    myCache.set("TABLES", tables);
    myCache.set("MYMODELS", obj);
    //add to version after set
    zCache.updateVersions("TABLES")
    zCache.updateVersions("MYMODELS")

};

zCache.ROLES = async() => {
    let r = 0;
    let results = await connection.results({table: "zrole"});
    let obj = Util.arrayToObject(results, "id");
    await myCache.set("ROLES", obj);
    //add to version after set
    zCache.updateVersions("ROLES");
    r = 1;
    return r;
};

zCache.ZFUNCTIONS = async() => {
    let query = await connection.results({
        table : "zfunction",
        where : {
            active : 1
        }
    })
    if (query.length) {
        let results = await connection.results({table: "zfunction"});
        let obj = Util.arrayToObject(results, "title");
        await myCache.set("ZFUNCTIONS", obj);
        //add to version after set
        zCache.updateVersions("ZFUNCTIONS")
    }
};

zCache.VERSIONS = () => {
    if(myCache.has("VERSIONS")) {
        //console.log("VERSIONS")
        return myCache.get("VERSIONS")
    } else {
        let obj = {}
        for(let key in zCache.KEYS) {
            obj[key] = 0;
        }
        myCache.set("VERSIONS",obj);
        //console.log(JSON.stringify(myCache.get("VERSIONS")))
        return obj;
    }
};

zCache.CONFIG = async() => {
    let results = async() => {
        return await connection.results({
            table: "zconfig"
        });
    };
    let companies = await connection.results({
        table: "zcompany"
    });
    let r = await results();
    let configObj = Util.arrayToObject(r, "company_id");
    for (let i = 0; i < companies.length; i++) {
        let item = companies[i];
        if (!configObj[item.id]) {
            await connection.insert({
                table: "zconfig",
                data: {
                    company_id: item.id,
                    layout: 0,
                    json: JSON.stringify(CONFIG),
                    created_at: Util.now(),
                    updated_at: Util.now()
                }
            });
        }
    }

    myCache.set(zCache.KEYS.CONFIG, Util.arrayToObject(await results(), "company_id"));
    //add to version after set
    zCache.updateVersions(zCache.KEYS.CONFIG)
};

zCache.MYMODELS = () => {
    zCache.TABLES();
}

zCache.MENU = async() => {
    let results = async() => {
        return await connection.results({
            table: "zmenu",
            where: {
                active: 1
            }
        });
    };
    const r = await results();
    const builder = async() => {
        let obj = {}
        let arr = await results();
        arr.map((item)=> {
            obj[item.company_id] = item.json || [];
        });
        myCache.set("MENU", obj);
        //add to version after set
        zCache.updateVersions("MENU")
    };
    if (r.length) {
        await builder();
    }
};

zCache.MENU_SYSTEMS = () => {
    let obj = {};
    obj.users = [{
        text: "Users",
        href: "zuser",
    },
        {
            text: "Company",
            href: "zcompany",
        },
        {
            text: "User Access",
            href: "zuser_company",
        },
        {
            text: "Access Role",
            href: "zrole",
        }];
    obj.systems = [
        {
            text: "Generator",
            href: "zgenerator",
        },
        {
            text: "Menu Generator",
            href: "zmenu",
        },
        {
            text: "Grid Default",
            href: "zgrid_default",
        },
        {
            text: "Routers",
            href: "zpage",
        },
        {
            text: "Functions",
            href: "zfunction",
        },
        {
            text: "Layouts",
            href: "zlayout",
        },
        {
            text: "Custom Report",
            href: "zreport",
        },
        {
            text: "Menu Collections",
            href: "zmenu_collections",
        },
        {
            text: "Log Errors",
            href: "zerror",
        }
    ];
    myCache.set("MENU_SYSTEMS", obj);
};

zCache.updateVersions = (name)=> {
    let obj = myCache.get("VERSIONS") || {}
    if(!obj.ROLES){
        zCache.VERSIONS();
        obj = myCache.get("VERSIONS");
    }
    let value = obj[name] || 0;
    value++;
    obj[name] = value;
    myCache.set("VERSIONS",obj);
};


zCache.MODELS_RELATIONS = async() => {
    if(myCache.has("MODELS_RELATIONS")) {
        return myCache.get("MODELS_RELATIONS")
    } else {
        const obj = await zRoute.modelsCache();
        myCache.set('MODELS_RELATIONS',obj);
        return obj;
    }
};

module.exports = zCache;
