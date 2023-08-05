const express = require('express');
const router = express.Router();
// setup route middlewares
const csrf = require('csurf');
const bodyParser = require('body-parser');
const path = require('path');
const parseForm = bodyParser.urlencoded({extended: true});
const csrfProtection = csrf({cookie: true});
const pm2 = require('pm2');
const env = process.env.NODE_ENV || 'development';
const ejs = require('ejs');
const Util = require('./Util');
const access = require('./access');
const connection = require('./connection');
const zCache = require('./zCache');
const zRole = require('./zRole');
const moduleLib = require('./moduleLib');

router.get('/', csrfProtection, async function (req, res, next) {
  let dirname = path.resolve(__dirname);
  let id = req.query.id;
  if (id == undefined) {
    id = 1;
  }
  const model = await connection.results({
    table : "zrole",
    where : {
      id : id
    }
  });
  const json = model[0].params ;
  const routes = zRole.routes;
  const results = await connection.results({table:"zrole"});
  const myLevel = zRole.myLevel(req, res, 'zrole');
  //inject to end body
  let datas = {
    model: model,
    table: "zrole",
    id: id,
    actions: zRole.actions,
    routes: routes,
    levels:myLevel,
    json: json,
    results: results,
    csrfToken: req.csrfToken()
  }
  const bodyHTML = ejs.render(Util.readFile(path.join(dirname,'views/zrole/index.ejs')),datas);
  const endBody = ejs.render(Util.readFile(path.join(dirname,'views/zrole/indexjs.ejs')), datas);
  datas.bodyHTML = bodyHTML;
  moduleLib.addModule(req,res,endBody);
  res.render("layouts/"+layout, datas);
});

router.post('/update/:id',async function (req, res, next) {
  const data = {};
  const name = req.body.name;
  const params = req.body.params;
  const newKey = {};
  Object.keys(params).map( (key) => {
    const arr = [];
    for (const k in params[key]) {
      arr.push(k);
    }
    newKey[key] = arr;
  });

  const json = {};
  json.params = JSON.stringify(newKey);
  try {
    await connection.update({
      table : "zrole",
      data : {
        params : json.params
      },
      where : {
        id : req.params.id
      }
    });
    data.status = 1;
    data.data = 1;
    await zCache.ROLES();

    if(env == "production") {
      pm2.connect(function (err) {
        if (err) {
          //console.log(err.toString());
        }
        pm2.restart(process.env.PM2_NAME, (err, proc) => {
          //io.to(room).emit("message","Restart done")
        });
      });
    }
    res.json(data);
  } catch (error) {
    data.status = 0;
    data.data = error;
    res.json(data);
  }
});

router.post('/rename/:id', async (req,res) => {
  let json = Util.jsonSuccess();
  try {
    const id = req.params.id;
    const rename = req.body.rename;
    await connection.update({
      table : "zrole",
      where : {
        id : id
      },
      data : {name : rename}
    })
  } catch (e) {
    json = Util.flashError(e.toString())
  }
  res.json(json);
});

router.post('/create', async (req,res) => {
  let json = Util.jsonSuccess();
  try {
    const name = req.body.name;
    await connection.insert({
      table : "zrole",
      data : {
        name : name
      }
    });
    await zCache.ROLES();
  } catch (e) {
    json = Util.flashError(e.toString())
  }
  res.json(json);
});

router.delete('/delete/:id', async (req,res) => {
  let json = Util.jsonSuccess();
  let id = parseInt(req.params.id);
  if(id > 3){
    try {
      const name = req.body.name;
      await connection.delete({
        table : "zrole",
        where : {
          id : id
        }
      });
      await zCache.ROLES();
    } catch (e) {
      json = Util.flashError(e.toString())
    }
  } else {
    json = Util.flashError('Delete error, not allowed');
  }
  res.json(json);
});

module.exports = router;
