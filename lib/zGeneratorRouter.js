const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true});
const fs = require('fs-extra');
const axios = require('axios');
const pm2 = require('pm2');
const uglifyJS = require("uglify-js");
const {minify} = require('html-minifier-terser');
const zRoute = require('./zRoute');
const connection = require('./connection');
const Util = require('./Util');
const moduleLib = require('./moduleLib');
const myCache = require('./cache');
const ejs = require('ejs');

const nots = ['index','uploads','js','css','log','generator','zmenu','zgenerator','zfields','zrole','zfunction','zgrid','zgrid_default', 'zuser','zreport','zpage','zlayout','zerror','zuser_company','zconfig'];
//const nots = [];
const generatorUrl = 'https://appmaker.monster';
//const generatorUrl = 'http://localhost:3000';

router.get('/', csrfProtection, async (req, res) => {
  let table = req.query.table || "", route = "", jsonData = {}, zForms = {}, relations = {},
    approvalDatas = {is_approval: false};
  let datas = await axios.post(`${generatorUrl}/api/generator/index`, {
    results: await zfields(),
    fields: await connection.query(connection.showFullFields(table)),
    table: table
  });
  const MYMODELS = myCache.get('MYMODELS');
  zForms.obj = {};
  jsonData = datas.data;
  let sorting = "";
  if (table) {
    let contentScript = `var ZFIELDS = ${JSON.stringify(jsonData.rows, null, 2)};`
    moduleLib.addScript(req, res, contentScript);
    moduleLib.editor(req, res);
    let MYMODEL_APPROVERS = MYMODELS['zapprovals'];
    let zfieldData = await connection.result({
      table: "zfields",
      where: {
        table: table
      }
    });
    sorting = JSON.stringify(zfieldData.sorting);
    approvalDatas = MYMODEL_APPROVERS.datas;
    if (zfieldData) {
      let approvalJSON = zfieldData.approval_json || {};
      approvalDatas.is_approval = zfieldData.is_approval || false;
      approvalDatas.title = approvalJSON.title || "";
      approvalDatas.type = approvalJSON.type || 1;
      approvalDatas.approvers = approvalJSON.approvers ? approvalJSON.approvers : [];
      approvalDatas.knowings = approvalJSON.knowings || [];
      approvalDatas.template = approvalJSON.content || "";
      zForms = await zRoute.formsFieldSync(req, res, MYMODEL_APPROVERS, approvalDatas);
    }
  }

  const jsonDatas = jsonData.datas;
  const lock = nots.includes(table) ? 1 : 0;
  const jsonDatasJson = jsonDatas.hasOwnProperty('json') && jsonDatas.json ? jsonDatas.json : {};
  const checkDummy = Object.prototype.hasOwnProperty.call(jsonDatasJson, 'dummy') && jsonDatasJson.dummy ? 'checked' : '';
  const renderData = {
    datas: jsonDatas,
    table: table,
    rows: jsonData.rows,
    checkDummy: checkDummy,
    csrfToken: req.csrfToken(),
    route: jsonData.route,
    selects: jsonData.selects,
    zForms: zForms,
    relations: relations,
    approvalDatas: approvalDatas,
    sorting: sorting,
    lock: lock,
    routeName:res.locals.routeName,
    //endHTML : Util.readFile(`./views/generatorjs.ejs`)
    //renderBody: "zgenerator/index.ejs",
    renderEnd: "zgenerator/indexjs.ejs"
  };
  let dataRender = zRoute.renderHTML(renderData);
  dataRender.bodyHTML = ejs.render(body, dataRender);
  res.render('layouts/generator',dataRender);
});

router.post('/fields', async (req, res) => {
  try {
    let body = req.body;
    let table = body.table || "";
    let result = {}, fields = {}, rowsFields = [];
    if (table) {
      result = await connection.result({table: 'zfields', where: {table: table}});
      fields = await connection.query(connection.showFullFields(table));
      rowsFields = await connection.query(connection.describeTable(table))
    }
    let objData = {
      result: result,
      fields: fields,
      rowsFields: rowsFields,
      table: table
    };
    let datas = await axios.post(`${generatorUrl}/api/generator/modal`, objData);
    res.json(datas.data)
  } catch (e) {
    console.log(e);
    res.json(e.toString())
  }
});

/*
Create new Module/Table
 */
router.post("/", csrfProtection, async (req, res) => {
  try {
    let results = await axios.post(`${generatorUrl}/api/generator/create`, req.body);
    let datas = results.data;
    if (datas.status == 0) {
      res.json(datas)
    } else {
      if (nots.includes(datas.post.table)) {
        return res.json(Util.flashError("Table is locked"));
      }
      await connection.insert({
        table: "zfields",
        data: datas.post
      });
      await connection.query(datas.sql);
      res.json(datas);
    }
  } catch (err) {
    res.json(Util.flashError(err.toString()));
  }
});

router.post("/reset", async (req, res) => {
  try {
    let json = Util.jsonSuccess("Reset Success");
    let table = req.body.table;
    if (nots.includes(table)) {
      return res.json(Util.flashError("Table is locked"));
    }
    if (table) {
      let results = await axios.post(`${generatorUrl}/api/generator/reset`, req.body);
      let datas = results.data;
      await connection.update({
        table: "zfields",
        data: datas,
        where: {
          table: table
        }
      });
    } else {
      json = Util.flashError("error");
    }
    res.json(json)
  } catch (e) {
    console.log(e.toString())
    json = Util.flashError("error");
    res.json(json)
  }
});

router.post('/tabs', async (req, res) => {
  let json = {status: 0, title: 'error', url: ''}
  let body = req.body;
  let table = body.table || "";
  let title = body.title || "";
  let tabs = body.tabs || [];
  if (table == "") {
    json.title = "table is empty";
    return res.send(json)
  }
  if (title == "") {
    json.title = "title is empty";
    return res.send(json)
  }
  if (nots.includes(table)) {
    return res.json(Util.flashError("Table is locked"));
  }
  let post = {};
  post.table = table;
  post.tabs = JSON.stringify(tabs);
  post.name = title;
  if (body.hasOwnProperty('json')) {
    post.json = JSON.stringify(body.json);
  } else {
    post.json = JSON.stringify({dummy: 0});
  }
  let results = await connection.results({
    table: "zfields",
    where: {
      table: table
    }
  });
  if (results.length == 0) {
    await connection.insert({table: "zfields", data: post})
  } else {
    await connection.update({table: "zfields", where: {id: results[0].id}, data: post});
  }
  json.status = 1;
  json.url = '/generator?table=' + table;
  res.send(json)
});


//after drag and drop then save
// and generate
router.post("/save_and_generate", csrfProtection, async (req, res) => {
  try {
    if (nots.includes(req.body.table)) {
      return res.json(Util.flashError("Table is locked"));
    }
    const json = await generate(req, res);
    res.json(json);
  } catch (e) {
    console.log(e);
    res.status(400).json({message: e.toString()})
  }
});

const generate = async (req, res) => {
  const body = req.body;
  const table = body.table;
  const MYMODELS = myCache.get('MYMODELS');
  let MYMODEL = {};
  let chains = [];
  let datas;
  let results;
  let dummy = false;

  //save data into table zfields
  //console.log(JSON.stringify(body.others))
  const others = body.others;
  //return;
  await saveToZFields(body);

  let exist = await connection.query(connection.describeTable(table));
  if (exist.length) {
    body.rows = await connection.results({table: "zfields", where: {table: table}});
    body.checks = await connection.query(`SELECT 'public.${table}'::regclass`);
  } else {
    let sql = ` 
            CREATE TABLE ${table} (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT NOT NULL,
            updated_by BIGINT DEFAULT NULL,
            created_by BIGINT DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_${table}_company_id FOREIGN KEY (company_id) REFERENCES zcompany (id)
        );`;
    await connection.query(sql);
    body.checks = await connection.query(`SELECT 'public.${table}'::regclass`);
    body.rows = await connection.results({table: "zfields", where: {table: table}});
  }
  body.others = others;
  results = await axios.post(`${generatorUrl}/api/generator/properties`, body);
  datas = results.data;
  if (datas.create_table.hasOwnProperty("sql")) {
    await connection.query(datas.create_table.sql);
    return generate(body);
  }

  let result = await connection.update({
    table: 'zfields',
    data: datas.updateFields.post,
    where: {
      id: datas.updateFields.id
    }
  });
  let resultJSON = Object.prototype.hasOwnProperty.call(result,'json') ? result.json : {};
  if(resultJSON && Object.prototype.hasOwnProperty.call(resultJSON,'dummy')){
    dummy = resultJSON.dummy == 1 ? true : false;
  }
  let properties = result.properties;
  //update if any chains
  for (let key in properties) {
    //override
    properties[key].values.required = properties[key].values.required ? true : false;
    properties[key].values.unique = properties[key].values.unique ? true : false;
    var isChain = properties[key].values.isChain ? true : false;
    properties[key].values.isChain = isChain;
    if (isChain) {
      chains.push(key)
    }
  }
  if (chains.length && chains.length < 2) {
    return Util.flashError("Chains min 2 fields number...");
  }
  if (chains.length) {
    let prop = chainings(table, chains);
    for (const key in prop) {
      if (prop[key].hasOwnProperty("chains")) {
        chains = Object.keys(prop[key].chains);
        if (chains.length) {
          properties[key].values.chains = prop[key].chains;
        }
      }
    }
  }
  //update properties
  result = await connection.update({
    table: "zfields",
    data: {
      properties: JSON.stringify(properties)
    },
    where: {
      table: table
    }
  });
  //end chains

  //generate file models routes views
  body.columns = await connection.query(connection.describeTable(table));
  body.constraintList = await connection.query(connection.constraintList(table));
  body.result = result;
  results = await axios.post(`${generatorUrl}/api/generator/generate`, body);
  datas = results.data;
  let files = datas.files;
  for (let key in files) {
    let filesKey = files[key];
    if (key == "model") {
      if (filesKey.hasOwnProperty("sql")) {
        const sql = filesKey.sql || [];
        for (let i = 0; i < sql.length; i++) {
          console.log(i + "sql : " + sql[i])
          await connection.query(sql[i]);
        }
      }
      if (filesKey.hasOwnProperty("alter")) {
        const alter = filesKey.alter || [];
        for (let i = 0; i < alter.length; i++) {
          console.log(alter[i])
          await connection.query(alter[i]);
        }
      }
      if (filesKey.hasOwnProperty("index")) {
        const index = filesKey.index || [];
        for (let i = 0; i < index.length; i++) {
          console.log(index[i])
          await connection.query(index[i]);
        }
      }
      if (filesKey.hasOwnProperty("fk")) {
        let fk = filesKey.fk || [];
        for (let i = 0; i < fk.length; i++) {
          console.log(fk[i])
          await connection.query(fk[i]);
        }
      }
      if (filesKey.hasOwnProperty("defaultValue")) {
        const defaultValue = filesKey.defaultValue || [];
        for (let i = 0; i < defaultValue.length; i++) {
          console.log(defaultValue[i])
          await connection.query(defaultValue[i]);
        }
      }
      //console.log(JSON.stringify(filesKey.modelObj))
      //check if has chains here
      MYMODEL = filesKey.modelObj;

      //delete/clean zgrid after changes
      await connection.delete({
        table: "zgrid",
        where: {
          route_name: table
        }
      });
      await connection.delete({
        table: 'zgrid_default',
        where: {
          table: table
        }
      });
      //insert into zgrid default
      let datagrid = {
        company_id: 1,
        updated_by: 1,
        created_by: 1,
        created_at: Util.now(),
        updated_at: Util.now()
      };
      datagrid.table = table;
      datagrid.visibles = JSON.stringify(MYMODEL.grids.visibles);
      datagrid.invisibles = JSON.stringify(MYMODEL.grids.invisibles);
      datagrid.fields = JSON.stringify([...MYMODEL.grids.visibles, ...MYMODEL.grids.invisibles]);
      await connection.insert({
        table: 'zgrid_default',
        data: datagrid
      });

      fs.writeFileSync(`${dirRoot}/models/${filesKey.filename}`, filesKey.content);
      console.log(`The file model of ${filesKey.filename} is saved!`);

      let widgets = MYMODEL.widgets;
      let objChains = {}
      let chainsTable = [];
      let isChain = false;
      for (let key in widgets) {
        let hasChains = widgets[key].hasOwnProperty("isChain") ? widgets[key].isChain : false;
        if (hasChains) {
          isChain = true;
          if (widgets[key].hasOwnProperty("table")) {
            chainsTable.push(widget_table);
            var widget_table = widgets[key].table;
            objChains[widget_table] = {
              key: key,
              changes: []
            }
          }
        }
      }

      if (isChain) {
        for (let key in objChains) {
          const model_table = MYMODELS[key];// require(`./../models/${key}`);
          for (let q in model_table.widgets) {
            if (model_table.widgets[q].hasOwnProperty("table")) {
              if (Util.in_array(model_table.widgets[q].table, chainsTable)) {
                const objChanges = {
                  target: objChains[key].key,
                  table: key,
                  column: q,
                  name: widgets[objChains[key].key].fields[1]
                };
                objChains[model_table.widgets[q].table].changes.push(objChanges);
              }
            }
          }
        }
        //console.log(JSON.stringify(objChains))
        //update model
        for (let key in objChains) {
          const keykey = objChains[key].key;
          widgets[keykey].chains = objChains[key].changes
        }
        MYMODEL.widgets = widgets;
        let newModel = `module.exports = ${Util.newLine}${Util.tab}{${Util.newLine}`;
        //newModel += JSON.stringify(MYMODEL, null, 2)
        newModel += zRoute.buildFileModel(MYMODEL);
        newModel += `${Util.tab}};`;

        fs.writeFileSync(`${dirRoot}/models/${filesKey.filename}`, newModel);
      }
      //check model if it has select relation in concat
      await scanning(MYMODEL);
    }
    //generate views
    let DIR_VIEW = `${dirRoot}/views/${table}`;
    if (key == "views") {
      if (!fs.existsSync(DIR_VIEW)) {
        fs.mkdirSync(DIR_VIEW);
      }
      let compilesJS = ['createjs.ejs', 'updatejs.ejs', 'importjs.ejs'];
      if(!dummy) {
        for (const q in filesKey) {
          console.log(q);
          if (Util.in_array(q, compilesJS)) {
            fs.writeFileSync(`${DIR_VIEW}/${q}`, filesKey[q]);
          } else {
            fs.writeFileSync(`${DIR_VIEW}/${q}`, await minify(filesKey[q],
              {
                minifyJS: true,
                minifyCSS: true,
                collapseWhitespace: true
              }
            ));
          }
          console.log(`The files views of ${q} is saved!`);
        }
      }
    }
    if(!dummy) {
      if (key == "route") {
        fs.writeFileSync(`${dirRoot}/routes/${filesKey.filename}`, filesKey.content);
        console.log(`The files route of ${filesKey.filename} is saved!`);
      }
    }
  }

  //make a directory
  if(!dummy) {
    let path_script = `${dirRoot}/public/runtime/script/${table}`;
    Util.dirExist(path_script, true);
    let path_head = `${dirRoot}/public/runtime/head/${table}`;
    Util.dirExist(path_head, true);
    let path_end = `${dirRoot}/public/runtime/end/${table}`;
    Util.dirExist(path_end, true);
    //we need to generate javascript code into runtime
    let relations = await zRoute.relations(req, res, MYMODEL.table);
    //add script
    let jsObj = zRoute.generateJS(req, res, MYMODEL, relations);
    //minify script
    let script = uglifyJS.minify(jsObj.script);
    if (script.error) {
      console.log(jsObj.script);
      throw script.error;
    }
    let time = new Date().getTime();
    Util.deleteAllFiles(path_script);
    Util.deleteAllFiles(path_head);
    Util.deleteAllFiles(path_end);
    Util.writeFile(`${path_script}/${time}.js`, script.code);
    Util.writeFile(`${path_head}/head.txt`, jsObj.head);
    Util.writeFile(`${path_end}/end.txt`, jsObj.end);
  }

  //restart pm2 module in production
  if (process.env.NODE_ENV == "production") {
    pm2.connect(function (err) {
      if (err) {
        console.log(err.toString());
      }
      pm2.restart(process.env.PM2_NAME, (err, proc) => {
        //io.to(room).emit("message","Restart done")
      });
    });
  }

  return Util.jsonSuccess("Success");
};

router.post('/savetabs', async (req, res) => {
  let body = req.body;
  let table = body.table;
  let details = body.details;
  let left = [], right = [], tabLeft = {}, tabRight = {};
  let json = {status: 0, title: 'error', message: 'error', url: ''};
  let obj = {}
  obj.notabs = []
  let labels = {};
  let hasTab = false;
  if (nots.includes(table)) {
    return res.json(Util.flashError("Table is locked"));
  }

  let rows = await connection.results({table: "zfields", where: {table: table}});
  if (rows.length > 0) {
    let tabsValue = rows[0].tabs + "";
    if (tabsValue.length > 5) {
      hasTab = true;
      let tabs = rows[0].tabs;
      for (let i = 0; i < tabs.length; i++) {
        obj['arr' + i] = [];
        tabLeft['arr' + i] = [];
        tabRight['arr' + i] = [];
      }
    }
  }

  for (let i = 0; i < details.length; i++) {
    let name = details[i].name;
    let value = details[i].value;
    if (name.indexOf("___") > -1) {
      let explode = name.split("___");
      obj[explode[1]].push(explode[0])
      labels[explode[0]] = value;
    } else {
      if (name == 'LEFT') {
        if (value.indexOf("___") > -1) {
          var explode = value.split("___");
          tabLeft[explode[1]].push(explode[0])
        } else {
          left.push(value);
        }
      } else if (name == 'RIGHT') {
        if (value.indexOf("___") > -1) {
          let explode = value.split("___");
          tabRight[explode[1]].push(explode[0])
        } else {
          right.push(value);
        }
      } else {
        obj['notabs'].push(name);
        labels[name] = value;
      }
    }
  }
  let post = {}
  post.labels = JSON.stringify(labels);
  post.details = JSON.stringify(obj);
  post.left = hasTab ? JSON.stringify(tabLeft) : JSON.stringify(left);
  post.right = hasTab ? JSON.stringify(tabRight) : JSON.stringify(right);
  //console.log(post.left)
  //console.log(JSON.stringify(post))
  try {
    if (rows.length > 0) {
      await connection.update({table: "zfields", data: post, where: {id: rows[0].id}})
    } else {
      post.table = table;
      await connection.insert({table: "zfields", data: post})
    }
    json = {status: 1, title: 'Success', message: 'Success', url: ''}
  } catch (error) {
    json = Util.flashError(error.sqlMessage);
  }

  res.send(json)
});

const columnLR = (items, dataName) => {
  return `<div class="col-md-6"><ol class="mydragable divboxlittle" data-name="${dataName}">${items}</ol></div>`;
};

const columnOne = (items) => {
  return `<div class="row sortable"><i class="fa fa-arrows icon-float"></i><div class="col-md-12"><ol class="mydragable divboxlittle" data-name="ONE_COLUMN">${items}</ol></div></div>`;
};

const reformatProperties = async (position, item, table, arr) => {
  const newData = JSON.stringify(Util.arrayDelete(arr, item));
  const data = {
    [position]: newData
  };
  await connection.update({
    table: "zfields",
    data: data,
    where: {
      table: table
    }
  })
};

router.delete("/delete-table", csrfProtection, async (req, res) => {
  let table = req.body.table;
  let json = Util.jsonSuccess("Successfully delete module");
  if (Util.in_array(table, nots)) {
    return res.json(Util.flashError("Can not be deleted!"))
  }
  if (nots.includes(table)) {
    return res.json(Util.flashError("Table is locked"));
  }
  try {
    await connection.delete({
      table: "zfields",
      where: {
        table: table
      }
    });
    //await connection.query("DELETE FROM zfields WHERE `table` = ?", [table]);
    await connection.query(`DROP table "${table}";`);
    //delete file
    let modelFile = dirRoot + "/models/" + table + ".js";
    fs.stat(modelFile, function (err, stats) {
      console.log(stats);//here we got all information of file in stats variable
      if (err) {
        return console.error(err);
      } else {
        fs.unlink(modelFile, function (err) {
          if (err) return console.log(err);
          console.log('file deleted successfully');
        });
      }
    });

    let routesFile = dirRoot + "/routes/" + table + ".js";
    fs.stat(routesFile, function (err, stats) {
      console.log(stats);//here we got all information of file in stats variable
      if (err) {
        return console.error(err);
      } else {
        fs.unlink(routesFile, function (err) {
          if (err) return console.log(err);
          console.log('file deleted successfully');
        });
      }
    });

    let runtimeFile = dirRoot + "/runtime/scripts/" + table + ".js";
    fs.stat(runtimeFile, function (err, stats) {
      if (err) {
        return console.error(err);
      } else {
        fs.unlink(runtimeFile, function (err) {
          if (err) return console.log(err);
          console.log('file deleted successfully');
        });
      }

    });
    await connection.delete({
      table: "zgrid",
      where: {route_name: table}
    });
    if (table) {
      const viewsFile = dirRoot + "/views/" + table;
      fs.stat(viewsFile, function (err, stats) {
        if (err) {
          return console.error(err);
        } else {
          fs.rmdirSync(viewsFile, {recursive: true});
        }
      });
    }
    await connection.delete({
      table: "zgrid_default",
      where: {table: table}
    });
  } catch (e) {
    json = Util.flashError(e.toString(), "")
  }

  res.json(json)
});

router.post("/add_field", csrfProtection, async (req, res) => {
  try {
    const body = req.body;
    //console.log(JSON.stringify(body.others))
    const table = body.table;
    if (nots.includes(table)) {
      return res.json(Util.flashError("Table is locked"));
    }
    body.zFields = await connection.results({table: "zfields", where: {table: table}});
    const results = await axios.post(`${generatorUrl}/api/generator/create_field`, body);
    const datas = results.data;
    if (datas.status == 1) {
      await connection.update({table: 'zfields', where: {table: table}, data: datas.post})
    }
    res.json(datas)
  } catch (e) {
    res.json(Util.flashError(e.toString()));
  }
});

router.post('/add_container', async (req, res) => {
  let others = req.body.others;
  let table = req.body.table;
  //console.log(JSON.stringify(req.body))
  try {
    if (others && table) {
      await connection.update({
        table: 'zfields',
        data: {
          others: others
        },
        where: {
          table: table
        }
      })
    }
  } catch (e) {
    return res.json(Util.flashError(e.toString()))
  }

  res.json(Util.jsonSuccess("Success"));
});


router.post("/setting_field", csrfProtection, async (req, res) => {
  if (nots.includes(req.body.table)) {
    return res.json(Util.flashError("Table is locked"));
  }
  const body = req.body;
  const table = body.table;
  const html = "";
  body.result = await connection.result({table: "zfields", where: {table: table}});
  const results = await axios.post(`${generatorUrl}/api/generator/modal_settings`, body);
  const datas = results.data;
  res.json(datas.html)
});


router.post("/save_setting", async (req, res) => {
  const html = "", table = req.query.table || "";
  let json = Util.jsonSuccess("Success to update");
  try {
    if (nots.includes(req.body.table)) {
      return res.json(Util.flashError("Table is locked"));
    }
    const post = req.body;
    let data = await connection.result({
      table: "zfields",
      where: {table: table}
    })
    let properties = data.properties ? data.properties : {};
    let propertyKey = "";
    for (var key in post) {
      propertyKey = key;
    }

    properties[propertyKey].values = post[propertyKey];
    let insert = {
      properties: JSON.stringify(properties)
    };
    await connection.update({
      table: "zfields",
      data: insert,
      where: {table: table}
    });

  } catch (e) {
    json = Util.flashError(e.toString())
  }

  res.json(json);
});


router.delete("/delete_field", csrfProtection, async (req, res) => {
  let json = Util.jsonSuccess("Success to update");
  try {
    if (nots.includes(req.body.table)) {
      return res.json(Util.flashError("Table is locked"));
    }
    const table = req.body.table, name = req.body.name;
    let data = await connection.result({
      table: "zfields",
      where: {table: table}
    });
    let properties = data.properties ? data.properties : {};
    delete properties[name];
    let labels = data.labels ? data.labels : {};
    delete labels[name];

    let left = data.left ? data.left : [];
    left = Util.arrayDelete(left, name);
    let right = data.right ? data.right : [];
    right = Util.arrayDelete(right, name);
    let oneColumn = data.one_column ? data.one_column : [];
    oneColumn = Util.arrayDelete(oneColumn, name);
    let details = data.details ? data.details : {};
    let detailsTemp = {}
    for (var keys in details) {
      detailsTemp[keys] = Util.arrayDelete(details[keys], name);
    }
    let newProperty = {};
    newProperty.properties = JSON.stringify(properties);
    newProperty.labels = JSON.stringify(labels);
    newProperty.left = JSON.stringify(left);
    newProperty.right = JSON.stringify(right);
    newProperty.one_column = JSON.stringify(oneColumn);
    newProperty.details = JSON.stringify(detailsTemp);
    newProperty.sorting = JSON.stringify(data.sorting);
    await connection.update({
      table: "zfields",
      data: newProperty,
      where: {table: table}
    });
    //DROP COULUMN
    //ALTER TABLE table_name  DROP COLUMN IF EXISTS column_name;
    await connection.query(`ALTER TABLE "${table}"  DROP COLUMN IF EXISTS  "${name}";`)
  } catch (err) {
    json = Util.flashError(err.toString())
    console.log(err);
    console.log("ada error di update zfields");
  }
  res.json(json);
});


router.post("/tab_rename", csrfProtection, async (req, res) => {
  const html = "", table = req.body.table || "", name = req.body.name || "", id = req.body.id || 0;
  let json = Util.jsonSuccess("Success to rename");
  try {
    if (table == "") {
      return res.json(Util.flashError("table empty"))
    }
    if (name == "") {
      return res.json(Util.flashError("name empty"));
    }
    let data = await connection.result({
      table: "zfields",
      where: {table: table}
    });
    const tabs = data.tabs || [];
    let arr = []
    tabs.forEach(function (item, index) {
      if (index == id) {
        arr.push(name);
      } else {
        arr.push(item);
      }
    });
    let post = {
      tabs: JSON.stringify(arr)
    }
    await connection.update({
      table: "zfields",
      data: post,
      where: {
        table: table
      }
    });
  } catch (e) {
    json = Util.flashError(e.toString())
  }
  res.json(json);
});

const zfields = async () => {
  return await connection.results({
    select: `id, "table", "name", "route",tabs,labels, details, "left","right",one_column, sorting, properties,hardcode_grid,others,json`,
    table: "zfields",
    orderBy: ['table', 'asc']
  });
};

router.post('/load-form', async (req, res) => {
  const table = req.body.table;
  let json = Util.flashError("error");
  const result = await connection.result({
    table: "zfields",
    where: {
      table: table
    }
  });
  if (result.id) {
    json = Util.jsonSuccess("success");
    json.data = result;
  }
  res.json(json)
});

var saveToZFields = async (body) => {
  const table = body.table;
  let is_approval = body.is_approval;
  if (typeof body.is_approval == "string") {
    if (body.is_approval == "false") {
      is_approval = 0;
    } else if (body.is_approval == "true") {
      is_approval = 1;
    }
  }

  const zapprovals = {};
  zapprovals.title = body.approval_title;
  zapprovals.type = body.type;
  zapprovals.approvers = body.approvers;
  zapprovals.knowings = body.knowings;
  zapprovals.content = body.template;
  var data = {
    index_ejs: body.index_ejs,
    indexcss_ejs: body.indexcss_ejs,
    indexjs_ejs: body.indexjs_ejs,
    form_ejs: body.form_ejs,
    create_ejs: body.create_ejs,
    createjs_ejs: body.createjs_ejs,
    update_ejs: body.update_ejs,
    updatejs_ejs: body.updatejs_ejs,
    import_ejs: body.import_ejs,
    importjs_ejs: body.importjs_ejs,
    view_ejs: body.view_ejs,
    is_approval: is_approval || 0,
    approval_json: JSON.stringify(zapprovals),
    others: body.others
  }

  await connection.update({
    table: "zfields",
    data: data,
    where: {
      table: table
    }
  })
};


//drop down chains effect
const chainings = async (table, arr) => {
  const results = await connection.query(connection.showFields(table));
  const obj = {};
  const tableObj = {};
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (Util.in_array(result.COLUMN_NAME, arr)) {
      obj[result.COLUMN_NAME] = {
        table: result.REFERENCED_TABLE_NAME
      }
      tableObj[result.REFERENCED_TABLE_NAME] = result.COLUMN_NAME;
    }
  }

  for (const key in obj) {
    const rows = await connection.query(connection.showFields(obj[key].table));
    rows.forEach(function (row) {
      for (var q in obj) {
        if (row.REFERENCED_TABLE_NAME == obj[q].table) {
          if (!obj[q].chains) {
            obj[q].chains = {};
          }
          obj[q].chains[key] = {
            column: row.COLUMN_NAME,
            table: row.TABLE_NAME
          }
        }
      }
    });
  }
  return obj;
};

router.post('/sorting', async (req, res) => {
  let sorting = req.body.sorting;
  let table = req.body.table;
  await connection.update({
    table: "zfields",
    data: {
      sorting: sorting
    },
    where: {table: table}
  });
  res.send("OK")
});

router.post("/export", async (req, res) => {
  const table = req.body.table;
  let json = Util.jsonSuccess("file Complete");
  if (table) {
    const result = await connection.result({
      table: "zfields",
      where: {
        table: table
      }
    });
    const dir = `${dirRoot}/public/uploads/zgenerator`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    const text = JSON.stringify(result);
    fs.writeFileSync(`${dir}/${table}.json`, text);
  } else {
    json = Util.flashError("no table selected")
  }
  res.json(json)
})

router.post("/import", async (req, res) => {
  let json = Util.flashError("Error File")
  let table = "";
  try {
    let isEmptyFiles = Util.isEmptyObject(req.files);
    if (!isEmptyFiles) {
      const file = req.files["import-file"];
      const name = file.name;
      const mime = file.mimetype;
      if (mime == "application/json") {
        const string = file.data.toString('utf8');
        const jsonFile = JSON.parse(string);
        table = jsonFile.table;
        delete jsonFile.id;
        const data = {}
        for (const key in jsonFile) {
          let value = jsonFile[key];
          if (typeof value == "object") {
            value = JSON.stringify(value)
          }
          data[key] = value;
        }
        if (!data.tabs) {
          data.tabs = "[]";
        }
        data.company_id = 1;
        data.created_by = res.locals.userId || 1;
        data.updated_by = res.locals.userId || 1;
        const results = await connection.results({
          table: "zfields",
          where: {
            table: table
          }
        })
        if (results.length) {
          await connection.update({
            table: "zfields",
            data: data,
            where: {
              table: table
            }
          })
        } else {
          await connection.insert({
            table: "zfields",
            data: data,
          })
        }
        json = Util.jsonSuccess("Success to add module, please generate tax to make a file")
      }
    }
  } catch (e) {
    console.log(e)
    json.message = e.toString();
  }
  json.table = table;
  res.json(json)
});

/*
Scanning relation id to name
 */
const scanning = async (MYMODEL) => {
  //let MYMODEL = require(`${dirRoot}/models/${table}`);
  //console.log(JSON.stringify(MYMODEL))
  let table = MYMODEL.table;
  const widgets = MYMODEL.widgets;
  const not_scanning = ['created_by', 'updated_by'];
  const concat_bracket = /(?<=\().+?(?=\))/g;
  let changeWidgets = {}
  let changes = [];
  for (let key in widgets) {
    if (widgets[key].name == "relation" || widgets[key].name == "dropdown_multi" || widgets[key].name == "typeahead") {
      if (!Util.in_array(key, not_scanning)) {
        let fields = widgets[key].fields;
        //let concat = fields[1].indexOf('CONCAT(') > -1 ? fields[1].substring()
        let arr = fields[1].match(concat_bracket) || [];
        if (arr.length) {
          let str = Util.replaceAll(arr[0], '"', '');
          let mysplits = str.indexOf(',') > -1 ? str.split(',') : [str];
          let MYMODEL_TABLE = require(`${dirRoot}/models/${widgets[key].table}`);
          let widgetsRelations = MYMODEL_TABLE.widgets;
          let relationsKeys = [];
          let relationsKeysObject = {}
          for (let k in widgetsRelations) {
            if (widgetsRelations[k].name == 'relation') {
              if (!Util.in_array(k, not_scanning)) {
                relationsKeys.push(k);
                relationsKeysObject[k] = `(SELECT ${widgetsRelations[k].fields[1]} FROM ${widgetsRelations[k].table} where id = `
              }
            }
          }
          let myarr = [];
          mysplits.forEach(function (item) {
            if (Util.in_array(item, relationsKeys)) {
              changes.push(key)
              myarr.push(relationsKeysObject[item] + ` ${item} )`)
            } else {
              myarr.push(item)
            }
          });
          let myjoin = `CONCAT(${myarr.join(',')})`;
          widgets[key].fields = ['id', myjoin];
        }
      }
    }
  }

  if (changes.length) {
    //rewrite model
    MYMODEL.widgets = widgets;
    let newModel = `module.exports = {  ${Util.newLine}`;
    newModel += zRoute.buildFileModel(MYMODEL);
    newModel += `${Util.newLine}`;
    newModel += `}`;
    fs.writeFileSync(`${dirRoot}/models/${MYMODEL.table}.js`, newModel);
  }

  //return MYMODEL;
};

//generate all css/js assets
router.post('/generate-assets', async (req, res) => {
  let notifObj = Util.jsonSuccess("Success, generate all assets");
  try {
    let MYMODELS = zRoute.MYMODELS();
    delete MYMODELS.zrole;
    for (let key in MYMODELS) {
      let MYMODEL = MYMODELS[key];
      let table = MYMODEL.table;
      let path_script = `${dirRoot}/public/runtime/script/${table}`;
      Util.dirExist(path_script, true);
      let path_head = `${dirRoot}/public/runtime/head/${table}`;
      Util.dirExist(path_head, true);
      let path_end = `${dirRoot}/public/runtime/end/${table}`;
      Util.dirExist(path_end, true);
      //we need to generate javascript code into runtime
      let relations = await zRoute.relations(req, res, MYMODEL.table);
      //add script
      let jsObj = zRoute.generateJS(req, res, MYMODEL, relations);
      let time = new Date().getTime();
      Util.deleteAllFiles(path_head);
      Util.deleteAllFiles(path_end);
      Util.deleteAllFiles(path_script);

      //minify script
      let script = uglifyJS.minify(jsObj.script);
      if (script.error) throw script.error;
      Util.writeFile(`${path_script}/${time}.js`, script.code);
      Util.writeFile(`${path_head}/head.txt`, jsObj.head);
      Util.writeFile(`${path_end}/end.txt`, jsObj.end);
    }
  } catch (e) {
    notifObj = Util.flashError(e.toString());
  }
  res.json(notifObj);
});


router.post('/minify', async (req, res) => {
  let notifyObj = Util.jsonSuccess("Success to cached");
  try {
    notifyObj = await viewsMini();
  } catch (e) {
    console.log(e);
    notifyObj = Util.flashError(e.toString())
  }
  res.json(notifyObj);
});

const viewsMini = async () => {
  let notifyObj = Util.jsonSuccess("Success");
  const viewDir = `${dirRoot}/views`;
  const layoutsDir = `${dirRoot}/views/layouts`;
  let item;
  try {
    let views = Util.getAllFiles(viewDir);
    let options = {
      minifyJS: true,
      minifyCSS: true,
      collapseWhitespace: true
    };
    const notViewDir = ['zgenerator', 'layouts', 'index', 'zindex'];
    for (const dir of views) {
      console.log('dir :', dir);
      if (!Util.in_array(dir, notViewDir)) {
        let files = Util.getAllFiles(`${viewDir}/${dir}`);
        //console.log(files);
        for (item of files) {
          if (item.includes('.ejs')) {
            let filename = `${viewDir}/${dir}/${item}`;
            let content = Util.readFile(filename);
            let contentChange = await minify(content, options);
            fs.writeFileSync(filename, contentChange);
          }
        }
      }
    }

    let layouts = Util.getAllFiles(layoutsDir);
    for (item of layouts) {
      if (item.includes('.ejs')) {
        let filename = `${layoutsDir}//${item}`;
        let content = Util.readFile(filename);
        let contentChange = await minify(content, options);
        fs.writeFileSync(filename, contentChange);
      }
    }
  } catch (e) {
    notifyObj = Util.flashError(`error in item : ${item} , error str :${e.toString()}`);
  }
  return notifyObj;
};

const body = `<section class="mt-4">
    <!--Grid row-->
    <div class="row">
        <!--Grid column-->
        <div class="col-md-12 mb-2">
            <!--Generator-->
            <div class="card mb-3 wow fadeIn">
                <div class="card-header bg-success text-white font-weight-bold">Generator</div>
                <div class="card-body">
                    <!-- Default form reply -->
                    <form id="formgenerator" method="post" action="/crud">
                        <div class="form-group">
                            <label for="table">Module Name</label>
                            <select name="table" id="table" class="form-control">
                                <option value="">Please Select</option>
                                <% for(var key in rows) {
                                    var row = rows[key];
                                    var selected = row.table == table ? " selected " : "";
                                if(row.table != 'zrole') {
                                %>
                                <option value="<%= row.table %>" <%= selected %> ><%= row.table %></option>
                                <% }} %>
                            </select>
                        </div>

                        <% if(table) {%>
                        <div class="form-group">
                            <label for="route">Title</label>
                            <input type="text" class="form-control" id="title" name="title" value="<%- datas.name%>" />
                        </div>
                        <div class="form-group">
                            <label for="route">Route</label>
                            <input type="text" class="form-control" readonly id="route" name="route" value="<%- route%>" />
                        </div>

                            <!-- Default checkbox -->
                        <div class="form-group">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="1" <%- checkDummy %> name="json[dummy]" id="dummy" />
                                <label class="form-check-label" for="flexCheckDefault">As Dummy</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="route">Tabs</label>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" id="tabname" placeholder="Enter tab name" aria-label="Enter tab name" aria-describedby="button-addon2">
                                <div class="input-group-append">
                                    <button class="btn btn-md btn-secondary m-0 px-3" type="button" id="add"><i class="fa fa-plus"></i></button>
                                </div>
                            </div>
                        </div>
                        <div id="tabs"></div>
                        <%} %>

                        <%if(lock==0) {%>
                        <div class="text-center mt-4">
                            <% if(table) {%>
                            <button class="btn btn-danger text-white" id="delete_module"  type="button"><i class="fa fa-trash"></i> Delete Module</button>
                            <%}%>
                            <button class="btn btn-success text-white"  data-toggle="modal" data-target="#add_table" type="button"><i class="fa fa-plus"></i> Add Module</button>
                            <% if(table) {%>
                                    <button class="btn btn-info" id="savetab" type="button"><i class="fa fa-paper-plane"></i> Save</button>
                                    <a class="btn btn-warning " href="/<%- table%>" target="__blank" type="button"><i class="fa fa-plane"></i> Go To <%- table%></a>
                            <%}%>
                        </div>
                        <%} else {%>
                            <button class="btn btn-danger text-white"   type="button"><i class="fa fa-warning"></i> This table has been locked!!!</button>

                        <%} %>
                    </form>
                    <!-- Default form reply -->
                </div>
            </div>
            <!--Generator-->
            <div class="card mb-3 wow fadeIn" id="divfields" style="display: none">
                <div class="card-header secondary-color-dark text-white font-weight-bold">Fields</div>
                <div class="card-body">

                    <!-- Default form reply -->
                    <form id="formfields" method="post" action="/generator/fields">
                        <div id="divtablist" class="row"></div>
                        <div id="contentfields"></div>


                        <% if(lock == 0) {%>
                        <div class="text-center mt-4">
                            <button class="btn btn-danger btn-reset text-white mr-2"  type="button"><i class="fas fa-drum"></i> Reset </button>
                            <button class="btn btn-primary dropdown-toggle  mr-2" type="button" data-toggle="dropdown"
                                    aria-haspopup="true" aria-expanded="false"><i class="fas fa-columns"></i> Layout <%- sorting%></button>
                            <div class="dropdown-menu">
                                <a class="dropdown-item layout21" href="#">2 : 1</a>
                                <a class="dropdown-item layout12" href="#">1 : 2</a>
                            </div>
                            <!-- Basic dropdown -->
<!--
                            <button class="btn m-0 px-3 btn-test" type="button"><i class="fa fa-plus"></i> Test</button>
-->
                            <button class="btn m-0 px-3 waves-effect waves-light mr-2" data-toggle="modal" data-target="#modal_container"  type="button"><i class="fa fa-plus"></i> Add Container</button>
                            <button class="btn btn-success  px-3  text-white mr-2" data-toggle="modal" data-target="#modal_add_field"  type="button"><i class="fa fa-plus"></i> Add Field</button>
                            <button class="btn secondary-color-dark  px-3  text-white mr-2" id="save" type="button"><i class="fa fa-paper-plane"></i> Save & Generate</button>
                        </div>
                        <%}%>
                    </form>
                    <!-- Default form reply -->
                </div>
            </div>
            <!--/Generator-->




            <!-- Card -->
            <div class="card mb-4 wow fadeIn card-script" style="display: none">
                <div class="card-header font-weight-bold">
                    <span> Files Content</span>
                </div>
                <div class="card-body">
                    <h5 class="card-title">Files Generator  <span class="badge badge-danger"><small>Using EJS template engine, Let it blank</small></span></h5>

                    <hr>

                    <ul class="nav nav-tabs" id="tabfiles" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active"  data-toggle="tab" href="#tabrouter" role="tab" aria-controls="router"
                               aria-selected="true">Router</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link "  data-toggle="tab" href="#tabindex" role="tab" aria-controls="index"
                               aria-selected="true">Index</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link"  data-toggle="tab" href="#tabform" role="tab" aria-controls="form"
                               aria-selected="false">Form</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link"  data-toggle="tab" href="#tabview" role="tab" aria-controls="view"
                               aria-selected="false">View</a>
                        </li>
                    </ul>
                    <div class="tab-content" id="mytabfiles">
                        <div class="tab-pane fade show active" id="tabrouter" role="tabpanel" aria-labelledby="tab-router">
                            <br>
                            <div class="row">
                                <div class="col-md-9">
                                    <div class="form-group ">
                                        <label for="javascript">Router</label>
                                        <div class="ide_editor" id="router"><%- datas.router%></div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div class="tab-pane fade" id="tabindex" role="tabpanel" aria-labelledby="index-tab">
                            <br>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="index.ejs">index.ejs</label>
                                        <div class="ide_editor" id="index_ejs"></div>
                                    </div>
                                </div>

                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="indexcss_ejs">indexcss.ejs</label>
                                        <div class="ide_editor_200" id="indexcss_ejs"><%- datas.indexcss_ejs%></div>
                                    </div>
                                    <div class="form-group ">
                                        <label for="indexjs_ejs">indexjs.ejs</label>
                                        <div class="ide_editor_200" id="indexjs_ejs"></div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div class="tab-pane fade" id="tabform" role="tabpanel" aria-labelledby="form-tab">
                            <br>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="form.ejs">_form.ejs</label>
                                        <div class="ide_editor" id="form_ejs"></div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="create_ejs">create.ejs</label>
                                        <div class="ide_editor_200" id="create_ejs"></div>
                                    </div>
                                    <div class="form-group ">
                                        <label for="createjs_ejs">createjs.ejs</label>
                                        <div class="ide_editor_200" id="createjs_ejs"></div>
                                    </div>
                                </div>
                            </div>


                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="update_ejs">update.ejs</label>
                                        <div class="ide_editor_200" id="update_ejs"></div>
                                    </div>
                                    <div class="form-group ">
                                        <label for="updatejs_ejs">updatejs.ejs</label>
                                        <div class="ide_editor_200" id="updatejs_ejs"></div>
                                    </div>
                                </div>

                                <div class="col-md-6">
                                    <div class="form-group ">
                                        <label for="import_ejs">import.ejs</label>
                                        <div class="ide_editor_200" id="import_ejs"></div>
                                    </div>
                                    <div class="form-group ">
                                        <label for="importjs_ejs">importjs.ejs</label>
                                        <div class="ide_editor_200" id="importjs_ejs"></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div class="tab-pane fade" id="tabview" role="tabpanel" aria-labelledby="view-tab">
                            <br>
                            <div class="row">
                                <div class="col-md-9">
                                    <div class="form-group ">
                                        <label for="view_ejs">view.ejs</label>
                                        <div class="ide_editor" id="view_ejs"></div>
                                    </div>
                                </div>
                                <div class="col-md-6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!--Card-->
            <div class="card mb-4 wow fadeIn card-script" style="display: none">
                <div class="card-header font-weight-bold">
                    <span>Additional Settings</span>
                </div>

                <div class="card-body">
                    <h5 class="card-title">Hard Code</h5>
                    <hr>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <div class="form-group">
                                    <label for="javascript">Grid / List <span class="badge badge-danger">Please do not remove this</span></label>
                                    <div class="ide_editor_200" id="hardcode_grid"><%= datas.hardcode_grid || ""%></div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <% if(zForms.obj.hasOwnProperty("is_approval")) {%>
                            <label for="approval">Approval Systems</label>
                            <!-- Default checked -->
                            <%- zForms.build["is_approval"] %>
                            <div class="divzapprovals" <%- approvalDatas.is_approval ? '' : 'style="display: none"' %> >
                                <%- zForms.build["template"] %>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group divTitle mb-3">
                                            <label>Title</label>
                                            <input type="text" class="form-control" id="approval_title" name="approval_title" value="<%- approvalDatas.title %>">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <%- zForms.build["type"] %>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-12">
                                        <%- zForms.build["approvers"] %>
                                        <%- zForms.build["knowings"] %>
                                    </div>
                                </div>
                            </div>
                                <%}%>
                        </div>
                    </div>
                </div>
            </div>
            <!--/.Card-->

        </div>

    </div>
    <!--Grid row-->
</section>
<!--Section: Post-->




<!-- Modal -->
<div class="modal fade" id="add_table" tabindex="-1" aria-labelledby="add_table" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Add Table</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form id="modal-form" method="post" action="/generator">
                    <div class="form-group">
                        <label for="table">Module Name</label>
                        <input type="text" class="form-control" id="modal-table" name="table"/>
                    </div>

                    <div class="form-group">
                        <label for="route">Route</label>
                        <input type="text" class="form-control" id="modal-route" name="route"/>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="modal-save" class="btn btn-primary"><i class="fa fa-paper-plane"></i> Save</button>
            </div>
        </div>
    </div>
</div>


<div class="modal fade" id="modal_add_field" tabindex="-1" aria-labelledby="add_table" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" >Add Field</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">

                <form id="modal-form" method="post" action="/<%- routeName%>">
                    <div class="form-group">
                        <label for="table">Name</label>
                        <div class="input-group">
                            <div class="input-group-prepend">
                                <select id="modal_position" class="form-control">
                                    <option value="LEFT">Left</option>
                                    <option value="RIGHT">Right</option>
                                    <option value="ONE_COLUMN">One Column</option>
                                </select>
                            </div>
                            <input type="text" class="form-control" id="modal_name" placeholder="Field Name" name="name"/>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="route">Type</label>
                        <select class="form-control" id="modal_type">
                            <% for(var key in selects){%>
                                <option value="<%- key%>"><%- selects[key]%></option>
                            <%}%>
                        </select>
                    </div>

                    <div class="row divrelation" style="display:none">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="route">Module Name</label>
                                <select class="form-control" id="relationtable"></select>
                            </div>
                        </div>

                        <div class="col-md-6 divrelationfield">
                            <div class="form-group ">
                                <label for="route">Label</label>
                                <select class="form-control" id="relationfield"></select>
                            </div>
                        </div>

                        <div class="col-md-12 divconcat">
                            <div class="form-group ">
                                <label for="route">Concat</label>
                                <input type="text" class="form-control" id="relationconcat" placeholder='CONCAT(fullname, " (email) : ", email)' >
                            </div>
                        </div>

                    </div>
                </form>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="modal-add" class="btn btn-primary"><i class="fa fa-plus"></i> Add</button>
            </div>
        </div>
    </div>
</div>


<div class="modal fade" id="modal_setting" tabindex="-1" aria-labelledby="modal_setting" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal_setting_label">Setting</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form id="modal-setting-form" method="post" action="/<%- routeName%>/save_setting">
                    <div id="body_content"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger text-white" id="delete_field"  type="button"><i class="fa fa-trash"></i> Delete</button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="modal-setting-save" class="btn btn-primary"><i class="fa fa-paper-plane"></i> Save</button>
            </div>
        </div>
    </div>
</div>



<div class="modal fade" id="modal_tab" tabindex="-1" aria-labelledby="modal_setting" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modal_setting_label">Tab</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form>
                    <input type="text" id="edittab" class="form-control">
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="modal-tab-save" class="btn btn-primary"><i class="fa fa-paper-plane"></i> Save</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="modal-file" tabindex="-1" aria-labelledby="add_table" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Import zfield File</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form id="modal-form-file" method="post" action="/zgenerator/import">
                    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
                    <div class="form-group">
                        <label for="table">File</label>
                        <input type="file" class="form-control" id="import-file" name="import-file" required/>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="submit" id="submit-import" class="btn btn-primary"><i class="fa fa-paper-plane"></i> Submit</button>
            </div>
        </div>
    </div>
</div>


<div class="modal fade" id="modal_container" tabindex="-1" aria-labelledby="add_container" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Add Container</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form >
                    <div class="form-group">
                        <label for="route">Column</label>
                        <select class="form-control form-select" id="column-count">
                            <option value="1">1</option>
                            <option value="2" selected>2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="6">6</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-modal-container-close" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="modal-container-save" class="btn btn-primary"><i class="fa fa-plus-circle"></i> Add</button>
            </div>
        </div>
    </div>
</div>


<!-- Modal insert data into container --->
<div class="modal fade" id="modal_container_into" tabindex="-1" aria-labelledby="modal_container_into" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Move <span class="badge badge-danger">fields </span>  into container</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fa fa-times"></i> </button>
            </div>
            <div class="modal-body">
                <form >
                    <div class="form-group">
                        <label for="route">Into Container</label>
                        <select class="form-control form-select" id="container-select">
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btncontainer-close" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                <button type="button" id="moveintocontainer" class="btn btn-primary"><i class="fa fa-plus-circle"></i> Move</button>
            </div>
        </div>
    </div>
</div>
`;

module.exports = router;
