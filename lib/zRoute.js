/**
 * For default route controller
 * service for routes
 */
const excelToJson = require('convert-excel-to-json');
const qs = require('qs');
//for generate PDF
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const uglifyJS = require("uglify-js");
const Excel = require('exceljs');
const fs = require('fs-extra');
const Util = require('./Util');
const connection = require('./connection');
const gridTable = 'zgrid';
const io = require('./io');
const myCache = require('./cache');
const moment = require('moment');
const debug = require("./debug");
const moduleLib = require("./moduleLib");
const cForm = require("./Form");

const zRoute = {};

zRoute.tableHasNoCompanyId = ['zcompany', 'zrole', 'zgrid'];

//get all models
zRoute.MYMODELS = () => {
  let obj = {};
  const dir = `${dirRoot}/models`;
  let models = Util.getAllFiles(dir);
  for (const item of models) {
    let name = item.replace('.js', '');
    obj[name] = require(`${dir}/${name}`)
  }
  return obj;
};

//get all routes
zRoute.ROUTES = () => {
  let arr = [];
  const dir = `${dirRoot}/routes`;
  let routes = Util.getAllFiles(dir);
  let nots = ['index','zindex','auth'];
  for (const item of routes) {
    let name = item.replace('.js', '');
    if(!nots.includes(name)){
      arr.push(name)
    }
  }
  return arr;
};

//translate render and optimize so javascript can direct inject
zRoute.renderHTML = (datas)=> {
  let renderBody=renderEnd=bodyHTML=endHTML='';
  if(datas.hasOwnProperty('renderBody')) {
    renderBody = datas.renderBody.replaceAll('/','_').replaceAll('.','_');
    if(myCache.has(renderBody)){
      bodyHTML = myCache.get(renderBody);
    } else {
      bodyHTML = Util.readFile(`${dirRoot}/views/${datas.renderBody}`);
      myCache.set(renderBody, bodyHTML);
    }
    delete datas.renderBody;
  }
  if(datas.hasOwnProperty('renderEnd')) {
    renderEnd = datas.renderEnd.replaceAll('/','_').replaceAll('.','_');
    if(myCache.has(renderEnd)){
      endHTML = myCache.get(renderEnd);
    } else {
      endHTML = Util.readFile(`${dirRoot}/views/${datas.renderEnd}`);
      myCache.set(renderEnd, endHTML);
    }
    delete datas.renderEnd;
  }

  datas.bodyHTML =  ejs.render(bodyHTML,datas);
  datas.endHTML =  ejs.render(endHTML,datas);
  return datas;
}
/*
Auto updated_at,created_at,company_id,created_by,updated_by
 */
zRoute.commons = (req, res, type = "create") => {
  let data = {
    company_id: res.locals.companyId,
    created_at: Util.now(),
    updated_at: Util.now(),
    created_by: res.locals.userId,
    updated_by: res.locals.userId
  };
  if (type != "create") {
    delete data.created_at;
    delete data.created_by;
    return data;
  } else {
    return data;
  }
};

/*
post data handling
 */
zRoute.postData = (obj) => {
  return qs.parse(obj);
};

zRoute.post = (req, res, MYMODEL, routeName, body) => {
  const MYMODELS = myCache.get('MYMODELS');
  routeName = routeName || MYMODEL.routeName;
  body = body || req.body;
  let post = qs.parse(body);
  let isEmptyFiles = Util.isEmptyObject(req.files);
  let time = new Date().getTime();
  let path_tmp = dirRoot + "/public/uploads/" + routeName + "/";
  let hasFile = false;
  let files;
  let checkboxes = [];
  let multies = [];
  fs.ensureDir(path_tmp, err => {
    //console.log('ensureDir',err); // => null
  });
  if (!isEmptyFiles) {
    files = qs.parse(req.files);
    let fileRoute = files[routeName];
    for (let key in fileRoute) {
      let filename = time + fileRoute[key].name;
      if (Array.isArray(fileRoute[key])) {
        hasFile = true;
        //add folder again
        fs.ensureDir(path_tmp + key, err => {
          //console.log('ensureDir',err); // => null
        });
      } else {
        fileRoute[key].mv(path_tmp + filename, function (err) {
          if (err) {
            //console.log('fileempty move',err); // => null
            return res.status(500).send(err);
          }
        });
        post[routeName][key] = filename;
      }
    }
  }
  let widgets = MYMODEL.widgets;
  let tags = [];
  let val;
  for (let key in post[routeName]) {
    let widgetName = widgets[key].name;
    val = post[routeName][key];
    switch (widgetName) {
      case "dropdown_checkbox" :
        let checkboxArr = [];
        for (let k in post[routeName][key]) {
          if (post[routeName][key][k] == 1) {
            checkboxArr.push(k)
          }
        }
        post[routeName][key] = JSON.stringify(checkboxArr);
        break;

      case "tags" :
        tags.push(key);
        let value = post[routeName][key] || "";
        let dataValue;
        if (value) {
          if (typeof value == "object") {
            dataValue = value;
            dataValue = JSON.stringify(dataValue);
          } else {
            if (value.substring(0, 1) == "{") {
              dataValue = `[${value.substring(1, (value.length - 1))}]`;
            } else if (value.substring(0, 1) == "[") {
              dataValue = value;
            } else {
              var arr = [];
              arr.push(value);
              dataValue = JSON.stringify(arr);
            }
          }
        }
        post[routeName][key] = dataValue;
        break;

      case "dropdown_multi" :
        post[routeName][key] = JSON.stringify(post[routeName][key]);
        break;

      case "lexical" :
        post[routeName][key] = JSON.stringify(post[routeName][key]);
        //console.log(post[routeName][key]);
        break;

      case "table" :
        const MODEL_TABLE = MYMODELS[widgets[key].table];
        const postTableData = post[routeName][key];
        const widgetTables = MODEL_TABLE.widgets;
        const dataTable = []
        const nots = Util.nots;
        const reqfiles = req.files;
        if (postTableData.length) {
          for (let i = 0; i < postTableData.length; i++) {
            let item = postTableData[i];
            for (const k in widgetTables) {
              if (!Util.in_array(k, nots)) {
                if (widgetTables[k].name == "number") {
                  item[k] = Util.toNumber(item[k]);
                }
                if (widgetTables[k].name == "file" || widgetTables[k].name == "image") {
                  var fileImageName = `${MYMODEL.table}[${key}][${i}][${k}]`;
                  if (reqfiles && Object.hasOwn(reqfiles, fileImageName)) {
                    var kname = Util.generateUnique(5) + "_" + req.files[fileImageName].name;
                    item[k] = kname;
                    req.files[fileImageName].mv(path_tmp + key + "/" + kname, function (err) {
                      if (err) {
                        return res.status(500).send(err);
                      }
                    });
                  }
                }
              }
            }
          }
        }
        post[routeName][key] = JSON.stringify(postTableData);
        break;

      case "multi_line_editor" :
        post[routeName][key] = JSON.stringify(post[routeName][key]);
        break;

      case "relation" :
        post[routeName][key] = val ? val : null;
        break;

      case "typeahead" :
        post[routeName][key] = val ? val : null;
        break;

      case "datepicker" :
        post[routeName][key] = val ? val : null;
        break;

      case "datetime" :
        val = post[routeName][key];
        post[routeName][key] = val ? val : null;
        break;

      case "integer" :
        if (typeof val == "string") {
          const onlyNumbers = val.replace(/\D/g, '');
          val = parseInt(onlyNumbers);
        }
        post[routeName][key] = val ? val : null;
        break;
    }
  }
  //check if widget have a tag default null
  for (let key in widgets) {
    if (widgets[key].name == "tags") {
      if (!tags.includes(key)) {
        post[routeName][key] = null;
      }
    }
    if (widgets[key].name == "table") {
      if (!post[routeName][key]) {
        post[routeName][key] = null;
      }
    }
  }
  return post;
};

zRoute.attributeData = async (res, MYMODEL, obj) => {
  obj = obj || null;
  const userId = res.locals.userId || 0;
  const routeName = MYMODEL.routeName;
  let attributeData, labels, visibles, invisibles, filter;
  attributeData = MYMODEL;
  const zgrid = await connection.results({
    table: 'zgrid',
    where: {user_id: userId, route_name: routeName}
  });
  if (zgrid.length) {
    visibles = zgrid[0].visibles ? zgrid[0].visibles : MYMODEL.grids.visibles;
    invisibles = zgrid[0].invisibles ? zgrid[0].invisibles : MYMODEL.grids.invisibles;
    filter = zgrid[0].filter ? zgrid[0].filter : null;
  } else {
    visibles = MYMODEL.grids.visibles;
    invisibles = MYMODEL.grids.invisibles;
    filter = null;

  }
  attributeData.labels = MYMODEL.labels;

  res.locals.routeName = routeName;
  res.locals.attributeData = attributeData;
  res.locals.visibles = visibles;
  res.locals.invisibles = invisibles;
  res.locals.gridFilter = filter;
  res.locals.visiblesObj = visibles.reduce((result, item) => {
    return {...result, [item]: MYMODEL.labels[item]}
  }, {});
};


/*
 For ajax purpose
 */
zRoute.ajax = async (req, res) => {
  let body = req.body;
  let table = body.table;
  let type = body.type;
  let results;
  const MYMODELS = myCache.get('MYMODELS');
  let obj = {
    table: table
  };
  if (body.where) {
    obj.where = body.where;
  }
  if (body.data) {
    obj.data = body.data;
  }
  if (!table) {
    io.to(res.locals.token).emit("error", "table must be set");
    return false;
  }
  if (!type) {
    io.to(res.locals.token).emit("error", "type must be set, select insert update or delete");
    return false;
  }
  let params = roles[res.locals.roleId].params;
  if (!params.hasOwnProperty(table)) {
    io.to(res.locals.token).emit("error", "You have no access to this page");
  }
  let MYMODEL = MYMODELS[table];
  if (type == "select") {
    if (params[table].includes("index")) {
      results = await connection.results(obj)
    } else {
      io.to(res.locals.token).emit("error", "You have no access to this page");
    }
  } else if (type == "update") {
    if (params[table].includes("update")) {
      results = await connection.update(obj)
    } else {
      io.to(res.locals.token).emit("error", "You have no access to this page");
    }
  } else if (type == "insert") {
    if (params[table].includes("create")) {
      results = await connection.insert(obj);
    } else {
      io.to(res.locals.token).emit("error", "You have no access to this page");
    }
  } else if (type == "delete") {
    if (params[table].includes("delete")) {
      results = await connection.delete(obj)
    } else {
      io.to(res.locals.token).emit("error", "You have no access to this page");
    }
  }
  res.json({
    results: results,
    MYMODEL: MYMODEL
  });
};

zRoute.validator = function (datas, MYMODEL) {
  let obj = MYMODEL.fields;
  let labels = MYMODEL.labels;
  let fields = Util.requiredFields(obj);
  let message = "";
  let status = 1;
  let field = "";
  fields.map((item) => {
    if (datas.hasOwnProperty(item)) {
      if (!datas[item] || datas[item] == "") {
        status = 0;
        field = item;
        message = Util.jsonError(item, labels[item] + " " + LANGUAGE.form_not_empty);
      }
    }
  });
  let widgets = MYMODEL.widgets;
  let numbers = [];
  for (let key in widgets) {
    if (widgets[key].name == "number") {
      numbers.push(key);
    }
  }
  if (numbers.length) {
    for (let key in datas) {
      if (Util.in_array(key, numbers)) {
        datas[key] = Util.replaceAll("" + datas[key], ".", "");
        datas[key] = parseFloat(datas[key]) || 0;
      }
    }
  }
  return {
    status: status,
    message: message,
    field: field
  };
};

zRoute.selectData = (MYMODEL) => {
  let widgets = MYMODEL.widgets;
  let arr = [];
  let data = '*';
  for (let key in widgets) {
    if (widgets[key].name == 'virtual') {
      arr.push(widgets[key].fields);
    }
  }
  if (arr.length) {
    data += ',';
    data += arr.join(',');
  }
  return data;
};

zRoute.relations = async (req, res, table) => {
  try {
    const MYMODELS = myCache.get('MYMODELS');
    const MYMODEL = MYMODELS[table];
    let relations = {}
    relations["zattributes"] = {}
    relations["zvirtuals"] = {}
    let typeahead = {}
    let hasAttributes = false;
    let zattributes = {};
    let company_id = res.locals.companyId;
    //f0r widgets
    for (let key in MYMODEL.widgets) {
      const keyRow = key + "Row";
      const keyFields = key + "Fields";
      const keyObject = key + "Object";
      const widget = MYMODEL.widgets[key];
      const widgetName = MYMODEL.widgets[key].name;
      let emptyArray = Util.arrayUnShift(['id', 'zname']);
      if (widgetName == "dropdown_multi") {
        let obj = {
          select: widget.fields.join(",") + " as zname ",
          table: widget.table,
          where: {company_id: company_id},
          orderBy: ['zname', 'asc']
        };
        if (Util.in_array(widget.table, zRoute.tableHasNoCompanyId)) {
          delete obj.where;
        }
        const cacheKey = `${obj.table}_${widget.table}___${key}_${company_id}`;
        let results = {};
        if (myCache.has(cacheKey)) {
          results = myCache.get(cacheKey);
        } else {
          results = await connection.results(obj);
        }
        relations[key] = [Util.arrayUnShift(['id', 'zname']), ...results];
        relations[keyObject] = Util.arrayWithObject(relations[key], 'id', 'zname');
      } else if (widgetName == "table") {
        let MODEL_TABLE = MYMODELS[widget.table];
        let nots = Util.nots;
        let obj = {}
        let visibles = MODEL_TABLE.grids.visibles;
        let invisibles = MODEL_TABLE.grids.invisibles;
        let properties = {}
        visibles.forEach(function (item) {
          if (!Util.in_array(item, nots)) {
            obj[item] = MODEL_TABLE.labels[item];
            properties[item] = MODEL_TABLE.widgets[item]
          }
        });
        invisibles.forEach(function (item) {
          if (!Util.in_array(item, nots)) {
            obj[item] = MODEL_TABLE.labels[item];
            properties[item] = MODEL_TABLE.widgets[item]
          }
        });
        relations[key] = obj;
        relations[`properties_${key}`] = properties;
        relations[keyRow] = await zRoute.relations(req, res, widget.table);
        relations[key + "Table"] = widget.table;
        relations[key + "TABLE"] = await zRoute.relations(req, res, MODEL_TABLE.table);

      } else if (widgetName == "multi_line_editor") {
        let MODEL_TABLE = MYMODELS[widget.table];
        relations[keyFields] = MYMODEL.widgets[key].fields;
        relations[key] = await zRoute.relations(req, res, widget.table);

      } else if (widgetName == "select") {
        relations[key] = widget.fields;
        relations[key + "Array"] = widget.array;
        relations[keyFields] = widget.fields;
        relations[keyObject] = Util.objectToGridFormat(relations[key], true);

      } else if (widgetName == "radio") {
        relations[key] = widget.fields;
        relations[key + "Array"] = widget.array;
        relations[keyFields] = widget.fields;
        relations[keyObject] = Util.objectToGridFormat(relations[key], true);

      } else if (widgetName == "relation") {
        let select = widget.fields.join(",") + " as zname ";
        let obj = {
          select: select,
          table: widget.table,
          where: {company_id: company_id},
          orderBy : ['zname', 'asc']
        };
        if (Util.in_array(widget.table, zRoute.tableHasNoCompanyId)) {
          delete obj.where;
        }

        if (widget.hasOwnProperty("please_select")) {
          if (widget.please_select != undefined) {
            if (widget.please_select != "") {
              emptyArray = {
                'id': '',
                'zname': widget.please_select
              }
            }
          }
        }
        let cacheKey = `${widget.table}_${MYMODEL.table}___${key}_${company_id}`;
        if(key == 'created_by' || key == 'updated_by') {
          cacheKey = `zuser_${key}_${company_id}`;
        }
        let results;
        if (myCache.has(cacheKey)) {
          results = myCache.get(cacheKey);
        } else {
          results = await connection.results(obj);
        }
        relations[key] = [emptyArray, ...results];
        relations[keyFields] = widget.fields;
        relations[keyObject] = Util.arrayWithObject(relations[key], 'id', 'zname');
        if (widget.isAttributes) {
          zattributes[key] = Util.arrayToObject(results, "id");
          hasAttributes = true;
        }
      } else if (widgetName == "dropdown_chain") {
        const obj = {
          select: widget.fields.join(",") + " as zname ",
          table: widget.table,
          where: {company_id: company_id},
          orderBy: ['id', 'asc']
        };
        if (Util.in_array(widget.table, zRoute.tableHasNoCompanyId)) {
          delete obj.where;
        }
        const cacheKey = `${widget.table}_${MYMODEL.table}___${key}_${company_id}`;
        let results;
        if (myCache.has(cacheKey)) {
          results = myCache.get(cacheKey);
        } else {
          results = await connection.results(obj);
        }
        relations[key] = [Util.arrayUnShift(['id', 'zname']), ...results];
        relations[keyFields] = widget.fields;
        relations[keyObject] = Util.arrayWithObject(relations[key], 'id', 'zname');
      } else if (widgetName == "typeahead") {
        let select = widget.fields.join(",") + " as zname ";
        let obj = {
          select: select,
          table: widget.table,
          where: {company_id: company_id},
          orderBy: ['zname', 'asc']
        };
        if (Util.in_array(widget.table, zRoute.tableHasNoCompanyId)) {
          delete obj.where;
        }
        const cacheKey = `${widget.table}_${MYMODEL.table}___${key}_${company_id}`;
        let results;
        if (myCache.has(cacheKey)) {
          results = myCache.get(cacheKey);
        } else {
          results = await connection.results(obj);
        }
        relations[key] = [Util.arrayUnShift(['id', 'zname']), ...results];
        relations[keyObject] = Util.arrayWithObject(relations[key], 'id', 'zname');
        relations[keyFields] = widget.fields;

      } else if (widgetName == "switch") {
        relations[key] = Util.modulesSwitch(widget.fields);
        relations[keyFields] = widget.fields;

      } else if (widgetName == "virtual") {
        relations["zvirtuals"][key] = widget.fields;
      }
    }

    let selectZvirtuals = "";
    for (let key in relations["zvirtuals"]) {
      selectZvirtuals += `${relations['zvirtuals'][key]} , `
    }
    if (selectZvirtuals) {
      relations.selectZvirtuals = selectZvirtuals;
    }

    return relations;
  } catch (err) {
    debug(req, res, err);
  }
};

/*
 Function to create filter elements on  data table grid
 */

zRoute.dataTableFilterSync = async (req, res, MYMODEL, filter) => {
  const relations = await zRoute.relations(req, res, MYMODEL.table);
  const dataTable = zRoute.dataTableFilter(MYMODEL, relations, filter);
  return dataTable;
};

zRoute.dataTableFilter = (MYMODEL, relations, filter) => {
  filter = filter || {}
  let filterColumns = filter.hasOwnProperty("columns") ? filter.columns : [];
  let filterObject = {}
  let filterKey = '';
  let isFilter = false;
  filterColumns.forEach(function (item) {
    var value = item.search.value
    if (value) {
      filterKey += ` $("#data_table_${filter.fields[item.data]}").change(); `
      filterObject[filter.fields[item.data]] = Util.replaceAll(value, "%", "");
      isFilter = true;
    }
  });
  if (isFilter) {
    filterKey += ` $("select[name='dataTable_length']").val(${filter.length}); $("select[name='dataTable_length']").change(); `
  }
  let fields = MYMODEL.fields;
  let widgets = MYMODEL.widgets;
  let types = {}
  let dataTable = {};
  let options;
  for (let key in fields) {
    let html = '';
    const value = filterObject.hasOwnProperty(key) ? filterObject[key] : "";
    if (key == "id") {
      types[key] = 'input';
      dataTable[key] = `<input type="number" placeholder="${fields[key].title}" value="${value}" id="data_table_${key}" >`;
    } else {
      if (widgets.hasOwnProperty(key)) {
        const widgetName = widgets[key].name;
        switch (widgetName) {
          case "switch" :
            options = relations[key].reduce((result, item) => {
              var selected = value === item.id ? " selected " : "";
              return result + `<option value="${item.id}" ${selected}>${item.name}</option>`
            }, "");
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select" >${options}</select>`;
            types[key] = 'select';
            break;

          case "color" :
            dataTable[key] = `<input type="color"  class="form-control form-control-color" value="${value}" id="data_table_${key}" >`;
            types[key] = 'input';
            break;

          case "relation" :
            options = relations[key].reduce((result, item) => {
              var selected = value === item.id ? " selected " : "";
              return result + `<option value="${item.id}" ${selected}>${item.zname}</option>`
            }, "");
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select " >${options}</select>`;
            types[key] = 'select';
            break;

          case "dropdown_multi" :
            options = relations[key].reduce((result, item) => {
              var selected = value == item.id ? " selected " : "";
              return result + `<option value="${item.id}" ${selected} >${item.zname}</option>`
            }, "");
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select " >${options}</select>`;
            types[key] = 'select';
            break;

          case "dropdown_chain" :
            options = relations[key].reduce((result, item) => {
              var selected = value == item.id ? " selected " : "";
              return result + `<option value="${item.id}" ${selected}>${item.zname}</option>`
            }, "");
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select " >${options}</select>`;
            types[key] = 'select';
            break;

          case "select" :
            let please_select = widgets[key].please_select;
            options = `<option value=""> </option>`;
            if (please_select != undefined) {
              if (please_select != "") {
                options = `<option value="">${please_select}</option>`;
              }
            }
            for (var k in relations[key]) {
              const selected = value === k ? " selected " : "";
              options += `<option value="${k}" ${selected}>${relations[key][k]}</option>`;
            }
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select " >${options}</select>`;
            types[key] = 'select';
            break;

          case "radio" :
            options = `<option value=""> </option>`;
            var items = relations[key + "Array"] || [];
            if (items) {
              items.forEach(function (item) {
                let selected = item.value == value ? ' selected ' : '';
                options += `<option value="${item.value}" ${selected}>${item.label}</option>`;
              });
            } else {
              for (var k in relations[key]) {
                let selected = value === k ? " selected " : "";
                options += `<option value="${k}" ${selected}>${relations[key][k]}</option>`;
              }
            }
            dataTable[key] = `<select id="data_table_${key}" class="form-control form-select " >${options}</select>`;
            types[key] = 'select';
            break;

          case "typeahead" :
            options = relations[key].reduce((result, item) => {
              var selected = value === item.id ? " selected " : "";
              return result + `<option value="${item.id}" ${selected}>${item.zname}</option>`
            }, "");
            dataTable[key] = `<select id="data_table_${key}"  class="form-control form-select "  >${options}</select>`;
            types[key] = 'select';
            break;

          case "number" :
            dataTable[key] = `<input type="text"  class="form-control " value="${value}" id="data_table_${key}" >`;
            types[key] = 'input';
            break;

          case "integer" :
            dataTable[key] = `<input type="number"  class="form-control " value="${value}" id="data_table_${key}" >`;
            types[key] = 'input';
            break;

          /*case "json" :
              dataTable[key] = `<input type="number"  class="form-control form-control-sm" value="${value}" id="data_table_${key}" >`;
              types[key] = 'input';
              break;*/

          case "virtual" :
            dataTable[key] = ``;
            break;

          default :
            dataTable[key] = `<input type="text" class="form-control "  value="${value}" id="data_table_${key}" >`;
            types[key] = 'input';
            break;
        }
      } else {
        dataTable[key] = ``;
      }
    }
  }

  dataTable.MYMODEL = MYMODEL;
  dataTable.RELATIONS = relations;
  dataTable.TYPES = types;
  dataTable.FILTER = filter;
  dataTable.FILTEROBJECT = filterObject;
  dataTable.FILTERKEY = filterKey;
  return dataTable;
};

zRoute.dataTableData = (key, value, MYMODEL, relations) => {
  relations = relations || {}
  var keyFields = key + "Fields";
  var keyObject = key + "Object";
  let myvalue = value;
  var widgetName = MYMODEL.widgets[key] ? MYMODEL.widgets[key].name : "";
  if (widgetName) {
    switch (widgetName) {
      case "switch" :
        myvalue = relations[keyFields][value] || "";
        break;

      case "color" :
        myvalue = `<input type="color" value="${value}">`;
        break;

      case "relation" :
        myvalue = relations[keyObject][value] || "";
        break;

      case "dropdown_multi" :
        let arr = value ? value : [];
        if (arr.length) {
          let myarr = [];
          arr.forEach(function (item) {
            myarr.push(relations[keyObject][item]);
          });
          myvalue = myarr.length ? myarr.join(", ") : "";
        }
        break;

      case "dropdown_chain" :
        myvalue = relations[key][value] || "";
        break;

      case "select" :
        myvalue = relations[keyFields][value] || "";
        break;

      case "radio" :
        myvalue = relations[keyFields][value] || "";
        break;

      case "typeahead" :
        myvalue = relations[keyObject][value] || "";
        break;

      case "datetime" :
        myvalue = Util.timeSql(value);
        break;

      case "datepicker" :
        myvalue = Util.dateFormat(value, MYMODEL.widgets[key].format);
        break;

      case "number" :
        myvalue = Util.formatNumber(value);
        break;

      case "integer" :
        myvalue = parseInt(value);
        break;

      case "image" :
        myvalue = Util.fileView("/uploads/" + MYMODEL.routeName + "/", value);
        break;

      case "file" :
        myvalue = Util.fileView("/uploads/" + MYMODEL.routeName + "/", value);
        break;

      case "password" :
        myvalue = "xxxxxx";
        break;

      case "json" :
        myvalue = value ? JSON.stringify(value).replaceAll('","', '", "') : '';
        break;

      default :
        value = value || "";
        myvalue = value.length > 50 ? value.substring(0, 50) : value;
    }
  }
  return myvalue;
};

zRoute.users = async (req) => {
  if (!Object.prototype.hasOwnProperty.call(req.session, "user")) {
    return [];
  } else {
    return await connection.query('SELECT  zuser.id, zuser.fullname as zname FROM zuser LEFT JOIN zuser ON (zuser.id = zuser_company.user_id) WHERE zuser_company.company_id = ?', [req.session.user.company_id]);
  }
};

zRoute.usersObj = {id: '', fullname: ''};
zRoute.usersArr = ['id', 'fullname'];
zRoute.usersDropdown = async (req) => {
  return [zRoute.usersObj, ...await zRoute.users(req)];
};

zRoute.getUsers = async () => {
  return Util.arrayToObject(await connection.results({table: "zuser"}), "id");
};

zRoute.changePassword = async (req, res) => {
  let userId = req.session.user.id;
  let query = req.body;
  let passwordNow = query.passwordNow.trim();
  let password = query.password.trim();
  let passwordRepeat = query.passwordRepeat.trim();
  let password_pattern = Util.regexPassword(6, 20)
  if (!password.match(password_pattern)) {
    return res.json(Util.jsonError('password', LANGUAGE.password_combine))
  }
  if (password != passwordRepeat) {
    return res.json(Util.jsonError('password', LANGUAGE.password_equal))
  }
  let user = await connection.results({
    table: "zuser",
    where: {
      id: userId,
      password: Util.hash(passwordNow)
    }
  });
  if (user.length == 0) {
    return res.json(Util.jsonError('passwordNow', LANGUAGE.password_wrong))
  }
  let data = {
    password: Util.hash(password)
  };
  await connection.update({
    table: "zuser",
    where: {
      id: userId
    },
    data: data
  });
  res.json(Util.jsonSuccess(LANGUAGE.change_password_success))
};

zRoute.resetPassword = async (req, res) => {
  let query = req.body;
  let password = query.password;
  let password_repeat = query.password_repeat.trim();
  let password_pattern = Util.regexPassword(6, 20)
  let forgot_password = req.params.forgot_password || "";
  let json = Util.jsonError('password', LANGUAGE.link_expired);
  if (forgot_password == "")
    return res.json(Util.jsonError('password', LANGUAGE.link_expired))
  if (!password.match(password_pattern))
    return res.json(Util.jsonError('password', LANGUAGE.password_combine))
  if (password != password_repeat)
    return res.json(Util.jsonError('password', LANGUAGE.password_equal))

  const results = await connection.results({
    table: "zuser",
    where: {
      forgot_password: forgot_password
    }
  });
  if (results.length > 0) {
    await connection.update({
      table: "zuser",
      data: {
        password: Util.hash(password),
        forgot_password: ""
      },
      where: {
        id: results[0].id
      }
    });
    req.session.sessionFlash = Util.jsonSuccess(LANGUAGE.change_password_success);
    json = Util.jsonSuccess(LANGUAGE.success)
  } else {
    json = Util.jsonError('password', LANGUAGE.link_expired)
  }
  res.json(json);
};

zRoute.loginAuth = async (username, fields) => {
  let results = await connection.results({table: "zuser", where: {username: username}});
  if (results.length) {
    await connection.update({table: "zuser", data: fields, where: {id: results[0].id}});
    //back to query to completed
    results = await connection.results({table: "zuser", where: {id: results[0].id}})
  }
  return results;
};

zRoute.loginNormal = async (username, password) => {
  let result = await connection.result({
    table: "zuser",
    where: {username: username}
  });
  if (!result) {
    return [];
  } else {
    const match = Util.hashCompare(password, result.password);
    if (match) {
      return [result];
    }
  }
  return [];
};

zRoute.loginAjax = async (username, password, req, res, isSocialLogin, url = "") => {
  let redirect = '';
  let data = {
    status: 0,
    url: redirect
  };
  try {
    isSocialLogin = isSocialLogin || false;
    const rows = isSocialLogin ? await zRoute.loginAuth(username, password) : await zRoute.loginNormal(username, password);
    if (rows.length > 0) {
      if (rows[0].active == 1) {
        await zRoute.handleSession(req, rows[0]);
        redirect = url == "" ? `${process.env.APP_AFTER_LOGIN}` : url;
        data = {
          status: 1,
          url: redirect
        }
      } else {
        data = {
          status: 2,
          url: redirect
        }
      }
    }
  } catch (err) {
    debug(req, res, err);
    res.json("Error : " + err.toString());
  }
  return data;
};

zRoute.login = async (username, password, req, res, isSocialLogin, url = "") => {
  isSocialLogin = isSocialLogin || false;
  let data = await zRoute.loginAjax(username, password, req, res, isSocialLogin, url);
  let redirect = data.url;
  if (data.status == 1) {
    res.redirect(redirect);
  } else {
    req.session.sessionFlashc = 1;
    res.locals.sessionFlash = 1;
    res.redirect(url == "" ? process.env.APP_AFTER_LOGIN : "/" + url);
  }
};

zRoute.logout = async (req, res) => {
  req.session.destroy(function (err) {
    if (err) console.log('/logout err', err);
    res.redirect(process.env.APP_AFTER_LOGOUT);
  });
};

zRoute.handleSession = async (req, user) => {
  const company = await connection.result({
    table: "zcompany",
    where: {
      id: user.company_id
    }
  });
  const userCompany = await connection.results({
    table: "zuser_company",
    joins: [
      "LEFT JOIN zcompany ON (zcompany.id = zuser_company.company_id)"
    ],
    where: {
      "zuser_company.user_id": user.id
    }
  });

  if (!userCompany.length) {
    req.session.user = {}
  } else {
    const userCompanyObject = Util.arrayToObject(userCompany, "company_id");
    const role = await connection.result({
      table: "zrole",
      where: {
        id: userCompanyObject[user.company_id].role_id
      }
    });
    user.roleName = role.name;
    let roleKeys = role.params ? role.params : {};
    user.roleKeys = Object.keys(roleKeys);
    user.company = company;
    user.companies = userCompany;
    req.session.user = user;
  }
};

zRoute.excelQuery = async (req, res, MYMODEL) => {
  //check directory for import not export
  const dir = `${dirRoot}/public/excel/tmp`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  //end
  let reqQuery = req.query;
  let zSearch = reqQuery.zsearch == 1 ? true : false;
  let zall = reqQuery.all == 1 ? true : false;
  let zstandart = reqQuery.zstandart == 1 ? true : false;
  await zRoute.attributeData(res, MYMODEL);
  const results = await connection.results({
    table: "zgrid",
    where: {
      route_name: MYMODEL.routeName,
      user_id: res.locals.userId
    }
  });
  let rows = [];
  let fields = [];
  let body = {};
  let select = "";
  let arr = [];
  let allfields = Object.keys(MYMODEL.widgets);
  if (results.length) {
    let result = results[0];
    body = result.filter;
    fields = body.fields.filter(item => item != "no" && item != "actionColumn");
    select = Util.selectMysql(fields);
    if (zall) {
      let difference = allfields.filter(x => !fields.includes(x));
      arr = [...fields, ...difference];
      select =`"${arr.join('","')}"`;
    }
    let whereArray = [];
    let columns = body.columns;
    columns.forEach(function (item) {
      if (item.search.value) {
        whereArray.push({
          field: body.fields[item.data],
          option: MYMODEL.options[body.fields[item.data]],
          value: item.search.value,
          operator: "AND"
        });
      }
    });
    const orderColumn = body.fields[body.order[0].column] == "actionColumn" ? "id" : body.fields[body.order[0].column] == "no" ? "id" : body.fields[body.order[0].column] == "actionColum" ? "id" : body.fields[body.order[0].column];
    if (zstandart) {
      select = "*";
    }
    const obj = {
      select: select,
      table: MYMODEL.table,
      whereArray: whereArray,
      /* limit: body.length,
       offset : body.start,*/
      orderBy: [orderColumn, body.order[0].dir]
    };
    if (!zall) {
      obj.limit = body.length;
      obj.offset = body.start;
    }
    rows = await connection.results(obj);
  } else {
    rows = await connection.results({
      select: Util.selectMysql(fields),
      table: MYMODEL.table,
      limit: reqQuery.pageSize,
      offset: parseInt(reqQuery.pageSize) - 1,
      orderBy: ["id", "desc"]
    });
  }
  if (zall) {
    fields = arr;
  }

  const ztype = reqQuery.ztype == 1 ? true : false;
  if (ztype) {
    await zRoute.pdf(req, res, MYMODEL, fields, rows);
  } else {
    await zRoute.excel(req, res, MYMODEL, fields, rows);
  }
};

// for excels
zRoute.excel = async (req, res, MYMODEL, fields, rows, callback, fileName) => {
  //if any other custom value then callback needed
  callback = callback || function () {};
  const workbook = new Excel.Workbook();
  let worksheet = workbook.addWorksheet(res.locals.routeName, {pageSetup: {paperSize: 9, orientation: 'landscape'}})
  worksheet.properties.defaultColWidth = 13;
  const params = req.query;
  const isRaws = params.zraws == 1 ? true : false;
  const sequence = Util.excelSequence();
  const labels = MYMODEL.labels;
  let start = 4, num = 1, routeName = res.locals.routeName;
  // properties
  const yellow = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {argb: 'FFFFFF00'},
    bgColor: {argb: 'FF0000FF'}
  };
  const blue = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {argb: '96C8FB'},
    bgColor: {argb: '96C8FB'}
  };
  const center = {vertical: 'middle', horizontal: 'center', wrapText: true};
  const bold = {bold: true};
  //end properties
  for (let i = 0; i < fields.length; i++) {
    worksheet.getCell(sequence[i] + '1').value = labels[fields[i]];
    worksheet.getCell(sequence[i] + '1').fill = blue;
    worksheet.getCell(sequence[i] + '1').font = bold;
    worksheet.getCell(sequence[i] + '1').alignment = center;
  }
  for (let i = 0; i < fields.length; i++) {
    worksheet.getCell(sequence[i] + '2').value = fields[i];
    worksheet.getCell(sequence[i] + '2').fill = yellow;
    worksheet.getCell(sequence[i] + '2').alignment = center;
  }
  worksheet.mergeCells('A3:' + sequence[(fields.length - 1)] + '3');
  worksheet.getCell('A3').value = 'DATA';
  worksheet.getCell('A3').font = bold;
  worksheet.getCell('A3').alignment = center;

  //check relations
  let isRelations = false;
  let relations = [], tableObj = {}, obj = {}, dropdowns = [], passwords = [];
  let usersObj = await zRoute.getUsers();
  if (Object.prototype.hasOwnProperty.call(MYMODEL, "widgets")) {
    for (let key in MYMODEL.widgets) {
      let widget = MYMODEL.widgets[key];
      if (widget.name == "password") {
        passwords.push(key)
      } else if (widget.name == "select") {
        tableObj[key] = widget.fields;
      } else if (widget.name == "switch") {
        tableObj[key] = widget.fields;
      } else if (widget.name == "relation") {
        var rowsarr = await connection.results({
          table: widget.table,
          select: widget.fields[0] + "," + widget.fields[1] + " as zname "
        });
        //save to object
        relations[key] = Util.arrayToObject(rowsarr, "id")
      }
    }
  }

  const widgets = MYMODEL.widgets;
  rows.forEach(function (result) {
    fields.forEach((field, i) => {
      let t;
      if (field == 'company_id') {
        t = !callback(result, field) ? result.company_id : callback(result, field);
      } else if (field == 'created_at' || field == 'created_at') {
        t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
      } else if (field == 'updated_at' || field == 'updated_at') {
        t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
      } else if (Util.in_array(field, ['created_by','updated_by'])) {
        if (isRaws) {
          t = !callback(result, field) ? result[field] : callback(result, field);
        } else {
          t = !callback(result, field) ? usersObj[result[field]].fullname : callback(result, field);
        }
      } else {
        // callback will call if you have
        if (Util.in_array(field, relations)) {
          if (isRaws) {
            t = !callback(result, field) ? result[field] : callback(result, field);
          } else {
            const objectData = tableObj[field] || {};
            if (!callback(result, field)) {
              if (result[field] && Object.hasOwn(objectData[result[field]], "zname")) {
                t = objectData[result[field]]["zname"];
              } else {
                t = result[field];
              }
            } else {
              t = callback(result, field);
            }
          }
        } else if (Util.in_array(field, dropdowns)) {
          t = !callback(result, field) ? MYMODEL.dropdowns[field].fields[result[field]] : callback(result, field);
        } else if (Util.in_array(field, passwords)) {
          t = 'xxxxxx';
        } else if ( widgets.hasOwnProperty(field) && widgets[field].name == "select") {
          if (isRaws) {
            t = !callback(result, field) ? result[field] : callback(result, field);
          } else {
            t = !callback(result, field) ? Object.hasOwn(tableObj[field], result[field]) ? tableObj[field][result[field]] : result[field] : callback(result, field);
          }
        } else if (widgets.hasOwnProperty(field) && widgets[field].name == "datetime") {
          if (isRaws) {
            t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
          } else {
            t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
          }
        } else if (widgets.hasOwnProperty(field) && widgets[field].name == "datepicker") {
          if (isRaws) {
            t = !callback(result, field) ? Util.dateFormat(result[field]) : callback(result, field);
          } else {
            t = !callback(result, field) ? Util.dateFormat(result[field]) : callback(result, field);
          }
        } else if (widgets.hasOwnProperty(field) && widgets[field].name == "switch") {
          if (isRaws) {
            t = !callback(result, field) ? result[field] : callback(result, field);
          } else {
            t = !callback(result, field) ? tableObj[field][result[field]] || "" : callback(result, field);
          }
        } else if (widgets.hasOwnProperty(field) && widgets[field].name == "relation") {
          if (isRaws) {
            t = !callback(result, field) ? result[field] : callback(result, field);
          } else {
            if (relations[field][result[field]]) {
              t = !callback(result, field) ? relations[field][result[field]].zname || "" : callback(result, field);
            }
          }
        } else {
          t = !callback(result, field) ? result[field] : callback(result, field);
        }
      }
      worksheet.getCell(sequence[i] + start).value = t;
    });
    start++;
    num++
  });

  fileName = fileName || routeName + '_' + new Date().getTime() + '.xlsx'
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
  await workbook.xlsx.write(res);
  res.end();
};

//for pdf
zRoute.pdf = async (req, res, MYMODEL, fields, rows, callback) => {
  io.to(res.locals.token).emit("message", "Please wait, compiling..")
  callback = callback || function () {};
  let labels = MYMODEL.labels;
  let html = ``
  html += `<h2>${MYMODEL.title}</h2>`;
  html += `<br>`;
  html += `<div class="container">`
  html += `<table class="table">`;
  html += `<thead><tr>`
  for (var i = 0; i < fields.length; i++) {
    html += `<td>${labels[fields[i]]}</td>`
  }
  html += `</tr></thead>`;
  //check relations
  let isRelations = false;
  let relations = [], tableObj = {}, obj = {}, dropdowns = [], passwords = [];
  let usersObj = await zRoute.getUsers();
  if (Object.prototype.hasOwnProperty.call(MYMODEL, "widgets")) {
    for (let key in MYMODEL.widgets) {
      let widget = MYMODEL.widgets[key];
      if (widget.name == "password") {
        passwords.push(key)
      } else if (widget.name == "select") {
        tableObj[key] = widget.fields;
      } else if (widget.name == "switch") {
        tableObj[key] = widget.fields;
      } else if (widget.name == "relation") {
        const rowsarr = await connection.results({
          table: widget.table,
          select: widget.fields[0] + "," + widget.fields[1] + " as zname "
        })
        //save to object
        relations[key] = Util.arrayToObject(rowsarr, "id")
      }
    }
  }
  html += `<tbody>`;
  rows.forEach(function (result) {
    html += `<tr>`
    fields.forEach((field, i) => {
      var t;
      if (field == 'company_id') {
        t = !callback(result, field) ? result.company_id : callback(result, field);
      } else if (field == 'created_at' || field == 'created_at') {
        t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
      } else if (field == 'updated_at' || field == 'updated_at') {
        t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
      } else if (Util.in_array(field, ['created_by','updated_by'])) {
        t = !callback(result, field) ? usersObj[result[field]] : callback(result, field);
      } else {
        // callback will call if you have
        if (Util.in_array(field, relations)) {
          const objectData = tableObj[field] || {};
          if (!callback(result, field)) {
            if (result[field] && Object.hasOwn(objectData[result[field]], "zname")) {
              t = objectData[result[field]]["zname"];
            } else {
              t = result[field];
            }
          } else {
            t = callback(result, field);
          }

        } else if (Util.in_array(field, dropdowns)) {
          t = !callback(result, field) ? MYMODEL.dropdowns[field].fields[result[field]] : callback(result, field);
        } else if (Util.in_array(field, passwords)) {
          t = 'xxxxxx';
        } else if (MYMODEL.widgets[field].name == "select") {
          t = !callback(result, field) ? Object.hasOwn(tableObj[field], result[field]) ? tableObj[field][result[field]] : result[field] : callback(result, field);
        } else if (MYMODEL.widgets[field].name == "datetime") {
          t = !callback(result, field) ? Util.timeSql(result[field]) : callback(result, field);
        } else if (MYMODEL.widgets[field].name == "datepicker") {
          t = !callback(result, field) ? Util.dateFormat(result[field]) : callback(result, field);
        } else if (MYMODEL.widgets[field].name == "switch") {
          t = !callback(result, field) ? tableObj[field][result[field]] || "" : callback(result, field);
        } else if (MYMODEL.widgets[field].name == "relation") {
          if (relations[field][result[field]]) {
            t = !callback(result, field) ? relations[field][result[field]].zname || "" : callback(result, field);
          }
        } else {
          t = !callback(result, field) ? result[field] || "" : callback(result, field);
        }
      }
      //worksheet.getCell(sequence[i] + start).value = t;
      html += `<td>${t}</td>`
    });
    html += `</tr>`
  });

  html += `</tbody></table></div>`;
  let time = Util.timeSql();
  time = Util.replaceAll(time, " ", "_");
  let file = {content: html};
  let count = fields.length;
  let options = {}
  if (count > 8) {
    options = {
      landscape: true
    }
  } else if (count > 10) {
    options = {
      format: 'A3',
      //landscape:true
    }
  } else if (count > 12) {
    options = {
      format: 'A3',
      landscape: true
    }
  } else if (count > 14) {
    options = {
      format: 'A2',
      //landscape:true
    }
  } else if (count > 16) {
    options = {
      format: 'A0',
      landscape: true
    }
  }
  const pdf = await zRoute.generatePDF(file, 'pdf_blank', options);
  res.download(pdf, MYMODEL.table + time + ".pdf");
};

/*
let options = { format: 'A4' };
// Example of options with args //
// let options = { format: 'A4', args: ['--no-sandbox', '--disable-setuid-sandbox'] };

let file = { content: "<h1>Welcome to html-pdf-node</h1>" };
// or //
let file = { url: "https://example.com" };
let layout = "pdf_blank";
var pdf = await zRoute.generatePDF(file, layout,options)
 */
zRoute.generatePDF = async (file, layout = "pdf_bootstrap", options = {}) => {
  // we are using headless mode
  let args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ];
  let env = process.env.NODE_ENV;
  let puppeterOptions = {
    args: args
  };
  if (env === "production") {
    puppeterOptions.executablePath = '/usr/bin/google-chrome-stable';
  }
  puppeterOptions.defaultViewport = {width: 1920, height: 1080};
  const browser = await puppeteer.launch(puppeterOptions);
  const page = await browser.newPage();
  let mylayout = `${dirRoot}/views/layouts/${layout}.ejs`
  if (file.content) {
    const html = await ejs.renderFile(mylayout, {data: file.content}, {async: true});
    await page.setContent(html, {
      waitUntil: 'load', timeout: 60000, // wait for page to load completely
    });
  } else {
    await page.goto(file.url, {
      waitUntil: 'load', timeout: 60000 // wait for page to load completely
    });
  }
  let fileName = new Date().getTime() + ".pdf";
  const filePath = `${dirRoot}/public/_pdf/${fileName}`;
  const myoptions = {
    path: filePath,
    format: 'A4',
  };
  for (let key in options) {
    myoptions[key] = options[key];
  }
  await page.pdf(myoptions);
  await browser.close();
  return filePath;
};


/*
 Grids Data Table
 save grid
 */
zRoute.dataTableSave = async (routeName, userId, body) => {
  const results = await connection.results({
    table: "zgrid",
    where: {
      user_id: userId,
      route_name: routeName
    }
  });
  if (results.length) {
    await connection.update({
      table: "zgrid",
      data: {
        visibles: JSON.stringify(body.fields),
        filter: JSON.stringify(body)
      },
      where: {
        user_id: userId,
        route_name: routeName
      }
    })
  } else {
    await connection.insert({
      table: "zgrid",
      data: {
        route_name: routeName,
        user_id: userId,
        visibles: JSON.stringify(body.fields),
        filter: JSON.stringify(body)
      },
      where: {
        user_id: userId,
        route_name: routeName
      }
    })
  }
  return "ok";
};

/*
dynamic list Data Table
 */
zRoute.listDataTable = async (req, res, objData = {}) => {
  const body = req.body;
  const MYMODEL = objData.MYMODEL || {};
  const fields = Object.prototype.hasOwnProperty.call(objData,'fields') ? objData.fields : req.body.fields;
  const relations = await zRoute.relations(req, res, MYMODEL.table);
  const select = Object.prototype.hasOwnProperty.call(objData,'select') ? objData.select : Util.selectMysql(fields, relations);
  const columns = Object.prototype.hasOwnProperty.call(objData,'columns') ? objData.columns : body.columns;
  let whereArray = [];
  if(objData.hasOwnProperty('whereArray')) {
    if(typeof objData.whereArray === 'object') {
      whereArray = objData.whereArray
    } else if (typeof objData.whereArray) {
      whereArray = objData.whereArray(req,res);
    }
  } else {
    whereArray.push({
      field: "company_id",
      option: "=",
      value: res.locals.companyId,
      operator: "AND"
    });
    columns.forEach(function (item) {
      if (item.search.value) {
        whereArray.push({
          field: fields[item.data],
          option: MYMODEL.options[fields[item.data]],
          value: item.search.value,
          operator: "AND"
        })
      }
    });
  }
  const orderColumn = fields[body.order[0].column] == "actionColumn" ? "id" : fields[body.order[0].column] == "no" ? "id" : fields[body.order[0].column] == "actionColum" ? "id" : fields[body.order[0].column];
  const rows = await connection.results({
    select: select,
    table: MYMODEL.table,
    whereArray: whereArray,
    limit: body.length,
    offset: body.start,
    orderBy: [orderColumn, body.order[0].dir]
  });
  const count = await connection.result({
    select: "count(id) as count",
    table: MYMODEL.table,
    whereArray: whereArray
  });
  let datas = [];
  const zRole = objData.zRole || {};
  const levels = objData.hasOwnProperty('levels') ? objData.levels : zRole.myLevel(req, res, MYMODEL.table);
  rows.forEach(function (row, index) {
    let arr = [];
    fields.forEach(function (item) {
      if (item == "no") {
        arr.push((index + 1 + parseInt(body.start)));
      } else if (item == "actionColumn") {
        let buttons = objData.hasOwnProperty('actionButtons') ? objData.actionButtons(levels, row, MYMODEL.table) : zRoute.actionButtons(levels, row, MYMODEL.table);
        arr.push(buttons);
      } else {
        arr.push(zRoute.dataTableData(item, row[item], MYMODEL, relations));
      }
    });
    datas.push(arr)
  });
  const data = {
    draw: body.draw,
    recordsTotal: count.count || 0,
    recordsFiltered: count.count || 0,
    data: datas
  };
  //save grid filter async
  zRoute.dataTableSave(MYMODEL.routeName, res.locals.userId, body);
  res.json(data);
}


zRoute.listData = async (req, res, MYMODEL, zRole, actionButtonsFn) => {
  actionButtonsFn = actionButtonsFn || function () {};
  const relations = await zRoute.relations(req, res, MYMODEL.table);
  const body = req.body;
  const fields = body.fields;
  const select = Util.selectMysql(fields, relations);
  let whereArray = [];
  const columns = body.columns;
  whereArray.push({
    field: "company_id",
    option: "=",
    value: res.locals.companyId,
    operator: "AND"
  });
  columns.forEach(function (item) {
    if (item.search.value) {
      whereArray.push({
        field: fields[item.data],
        option: MYMODEL.options[fields[item.data]],
        value: item.search.value,
        operator: "AND"
      })
    }
  });
  const orderColumn = fields[body.order[0].column] == "actionColumn" ? "id" : fields[body.order[0].column] == "no" ? "id" : fields[body.order[0].column] == "actionColum" ? "id" : fields[body.order[0].column];
  const rows = await connection.results({
    select: select,
    table: MYMODEL.table,
    whereArray: whereArray,
    limit: body.length,
    offset: body.start,
    orderBy: [orderColumn, body.order[0].dir]
  });
  const count = await connection.result({
    select: "count(id) as count",
    table: MYMODEL.table,
    whereArray: whereArray
  });
  let datas = [];
  const levels = zRole.myLevel(req, res, MYMODEL.table);
  rows.forEach(function (row, index) {
    let arr = [];
    fields.forEach(function (item) {
      if (item == "no") {
        arr.push((index + 1 + parseInt(body.start)));
      } else if (item == "actionColumn") {
        let buttons = !actionButtonsFn(levels, row, MYMODEL.table) ? zRoute.actionButtons(levels, row, MYMODEL.table) : actionButtonsFn(levels, row, MYMODEL.table);
        arr.push(buttons);
      } else {
        arr.push(zRoute.dataTableData(item, row[item], MYMODEL, relations));
      }
    });
    datas.push(arr)
  });
  const data = {
    draw: body.draw,
    recordsTotal: count.count || 0,
    recordsFiltered: count.count || 0,
    data: datas
  };
  //save grid filter async
  zRoute.dataTableSave(MYMODEL.routeName, res.locals.userId, body);
  res.json(data);
};

zRoute.actionButtons = (levels, row, table, callback = null) => {
  let arr = [];
  let obj = {}
  if (levels.delete) {
    let icon_delete = `<span class="icon-small icons-danger" title="${LANGUAGE.delete}" ><img data-id="${row.id}" class="icons-bg-white griddelete icon-image" src="/assets/icons/trash-filled.svg"></span>`;
    arr.push(icon_delete);
    obj['delete'] = icon_delete;
  }
  if (levels.update) {
    let icon_update = `<span class="icon-small icons-primary" title="${LANGUAGE.update}" ><img data-id="${row.id}" class="icons-bg-white gridupdate icon-image" src="/assets/icons/edit.svg"></span>`;
    arr.push(icon_update);
    obj['update'] = icon_update;
  }
  if (levels.view) {
    let icon_view = `<span class="icon-small icons-light" title="${LANGUAGE.view}" ><img data-id="${row.id}" class="icons-bg-black gridview icon-image" src="/assets/icons/eye.svg"></span>`;
    arr.push(icon_view);
    obj['view'] = icon_view;
  }
  if (levels.approval) {
    let icon_approval = `<span class="icon-small icons-warning" title="${LANGUAGE.approval}" ><img data-id="${row.id}" class="icons-bg-white gridapproval icon-image" src="/assets/icons/rubber-stamp.svg"></span>`;
    arr.push(icon_approval);
    obj['approval'] = icon_approval;
  }
  let view = '<div class="no-wrap">';
  view += arr.join("&nbsp;");
  view += `</div>`;
  if (callback) {
    callback({
      arr: arr,
      view: view,
      levels: levels,
      row: row,
      table: table,
      obj: obj
    });
  }

  return view;
};

zRoute.dataTableViewLevel = (levels, row, table) => {
  return zRoute.actionButtons(levels, row, table);
};

zRoute.postGridReload = async (req, res) => {
  let routeName = res.locals.routeName;
  let userId = res.locals.userId;
  let json = Util.jsonSuccess("Successfully to reset grid filter ");
  await connection.delete({
    table: gridTable,
    where: {user_id: userId, route_name: routeName}
  });
  //await zRoute.attributeData(res, )
  res.json(json)
};

zRoute.postGrid = async (req, res) => {
  try {
    let query = req.body;
    //console.log(query);
    let visible = query.serialize_left;
    let invisible = query.serialize_right;
    let post = {
      user_id: res.locals.userId,
      route_name: res.locals.routeName,
      visibles: visible,
      invisibles: invisible,
      company_id: 1,
      updated_at: Util.now()
    };
    let results = await connection.results({
      table: gridTable,
      where: {user_id: res.locals.userId, route_name: res.locals.routeName}
    });
    if (results.length == 0) {
      await connection.insert({table: gridTable, data: post});
    } else {
      await connection.update({table: gridTable, data: post, where: {id: results[0].id}})
    }
    res.json(Util.jsonSuccess(LANGUAGE['grid_saved']))
  } catch (err) {
    debug(req, res, err);
    res.json(err)
  }
};

zRoute.chains = async (req, res) => {
  try {
    let body = req.body;
    let id = body.id;
    let currentValue = body.currentValue;
    let target = body.target;
    let column = body.column;
    let table = body.table;
    let name = body.name;
    let data = {}
    let obj = body.obj;
    if (id) {
      const results = await connection.results({
        select: ` id, ${name} as zname `,
        table: table,
        where: {
          [column]: id,
          company_id: res.locals.companyId
        },
        orderBy: ["zname", "asc"]
      });
      data[target] = `<option value="">Please Select</option>`;
      if (results.length) {
        results.forEach(function (result) {
          var selected = result.id == currentValue ? " selected " : "";
          data[target] += `<option value="${result.id}" ${selected} >${result.zname}</option>`;
        });
      }
    }
    res.json(data);
  } catch (e) {
    res.json(Util.flashError(e.toString()));
  }
};

zRoute.getAttributes = async (req, res) => {
  let id = req.body.id;
  let table = req.body.table;
  let result = {}
  if(id && table) {
    result = await connection.result({
      table : table,
      where : {
        id:id
      }
    })
  }
  res.json(result);
};

zRoute.formUser = (relations = {}, data = {}) => {
  let obj = {}
  let isUser = false;
  if (data.hasOwnProperty('created_by')) {
    isUser = true;
    if (relations.hasOwnProperty('created_byObject')) {
      obj.created_by = relations.created_byObject[data['created_by']];
      obj.updated_by = relations.updated_byObject[data['updated_by']];
      obj.created_at = Util.timeSql(data['created_at']);
      obj.updated_at = Util.timeSql(data['updated_at']);
    }
  }
  obj.isUser = isUser;
  return obj;
};

zRoute.formField = (req, res, MYMODEL, relations, data = {}) => {
  let forms = zRoute.forms(req, res, MYMODEL, relations, data);
  let obj = forms.obj;
  for (let key in obj) {
    forms.build[key] = cForm.build(obj[key]);
  }
  forms.users = zRoute.formUser(relations, data);
  return forms;
};

zRoute.formsFieldSync = async (req, res, MYMODEL, data = {}) => {
  const relations = await zRoute.relations(req, res, MYMODEL.table);
  let forms = zRoute.forms(req, res, MYMODEL, relations, data);
  let obj = forms.obj;
  for (let key in obj) {
    forms.build[key] = cForm.build(obj[key]);
  }
  zRoute.moduleLib(req, res, MYMODEL, relations, forms);
  return forms;
};

zRoute.formFieldSync = async (req, res, MYMODEL, relations, data = {}) => {
  let forms = zRoute.forms(req, res, MYMODEL, relations, data);
  let obj = forms.obj;
  for (let key in obj) {
    forms.build[key] = cForm.build(obj[key]);
  }
  zRoute.moduleLib(req, res, MYMODEL, relations, forms);
  return forms;
};

zRoute.forms = (req, res, MYMODEL, relations, data = {}) => {
  relations = relations || {};
  let fields = MYMODEL.fields;
  let dropdowns = MYMODEL.dropdowns || {};
  let modules = MYMODEL.modules || {};
  let relationsModel = MYMODEL.relations || {};
  let widgets = MYMODEL.widgets || {};
  let additionalScripts = {};
  let forms = {};
  let tabIndex = 0;
  forms.label = {};
  forms.field = {};
  forms.obj = {};
  forms.build = {}
  forms.fn = {};
  forms.group = {};
  forms.scriptGroup = "";
  let script = '';
  for (let key in fields) {
    // for label
    //forms.label[key] = cForm.label(key, fields[key].title, fields[key].required);
    //for object property
    let obj = {
      type: "text",
      id: key,
      routeName: MYMODEL.routeName,
      name: MYMODEL.table + "[" + fields[key].name + "]",
      title: fields[key].title || "",
      required: fields[key].required,
      placeholder: fields[key].placeholder || "",
      value: data[key] == undefined ? "" : data[key],
      frameworkcss: res.locals.frameworkcss,
      form_css: res.locals.form_css,
      float: fields[key].float || false,
      inline: fields[key].inline || false,
      attributes: widgets[key],
      tabIndex: tabIndex,
      labelOptions: "",
      class: 'form-control '
    };

    //check if widgets
    if (widgets.hasOwnProperty(key)) {
      tabIndex++;
      let widgetName = widgets[key].name;
      let keyFields = key + "Fields";
      if (widgets[key].hasOwnProperty("information")) {
        obj.information = widgets[key].information;
      }
      obj.readonly = widgets[key].readonly || false;
      obj.class = 'form-control ';
      switch (widgetName) {
        case "text" :
          if (widgets[key].hidden) {
            obj.type = "hidden";
          } else {
            obj.type = "input";
          }
          break;
        case "tags" :
          obj.type = "tags";
          break;
        case "checkbox" :
          obj.type = "checkbox";
          break;
        case "range" :
          obj.type = "range";
          break;
        case "color" :
          obj.type = "color";
          break;
        case "textarea" :
          if (widgets[key].hidden) {
            obj.style = "display:none";
          }
          obj.type = "textarea";
          break;
        case "image" :
          obj.type = "image";
          obj.width = widgets[key].width || '300';
          break;
        case "file" :
          obj.type = "file";
          break;
        case "email" :
          obj.type = "email";
          break;
        case "lexical" :
          obj.type = "lexical";
          if (obj.value) {
            script += `document.addEventListener("DOMContentLoaded", () => {
                        setTimeout(function () {
                            window.importFile(window.LexicalEditor,${JSON.stringify(obj.value)});
                        }, 1000);
                        });`;
          }
          break;
        case "select" :
          obj.type = "select";
          obj.data = relations[key];
          obj.array = relations[key + "Array"];
          obj.please_select = widgets[key].please_select;
          break;
        case "radio" :
          obj.type = "radio";
          obj.data = relations[key]
          obj.array = relations[key + "Array"];
          break;
        case "switch" :
          obj.type = "switch";
          obj.class = "form-control switch";
          break;
        case "dropdown_checkbox" :
          obj.type = "dropdown_checkbox";
          obj.data = widgets[key].fields || [];
          break;
        case "relation" :
          obj.type = "select";
          var htmlOptions = ` <a href="/${widgets[key].table}" target="_blank">  > </a>`;
          forms.label[key] = cForm.label(key, fields[key].title, fields[key].required, htmlOptions);
          obj.data = relations[key];
          obj.please_select = widgets[key].please_select;
          break;
        case "typeahead" :
          obj.type = "typeahead";
          forms.label[key] = cForm.label(key, fields[key].title, fields[key].required);
          obj.data = relations[key];
          obj.typeaheadvalue = !data[key] ? "" : relations[key + "Object"][data[key]];
          break;
        case "dropdown_chain" :
          obj.type = "select";
          var htmlOptions = ` <a href="/${widgets[key].table}" target="_blank">  > </a>`;
          forms.label[key] = cForm.label(key, fields[key].title, fields[key].required, htmlOptions);
          obj.data = relations[key + "Row"];
          break;
        case "dropdown_multi" :
          obj.type = "multi";
          obj.data = relations[key] || [];
          obj.multi = relations[key + "Object"];
          break;
        case "number" :
          obj.type = "number";
          obj.class = "form-control number";
          break;
        case "integer" :
          obj.type = "number";
          obj.class = "form-control number";
          break;
        case "email" :
          obj.type = "input";
          break;
        case "password" :
          obj.type = "password";
          break;
        case "datepicker" :
          obj.type = "datepicker";
          obj.class = "form-control datepicker";
          obj.value = obj.value == "0000-00-00" ? "" : Util.dateSql(obj.value);
          break;
        case "datetime" :
          obj.type = "datetimepicker";
          obj.class = "form-control datetimepicker";
          obj.value = obj.value == "0000-00-00 00:00:00" ? "" : Util.timeSql(obj.value);
          break;
        case "clockpicker" :
          obj.type = "input";
          obj.class = "form-control clockpicker";
          break;
        case "editor" :
          obj.type = "textarea";
          obj.class = "form-control editor";
          break;
        case "tinymce" :
          obj.type = "textarea";
          obj.class = "form-control tinymce";
          break;
        case "ide_editor" :
          forms.label[key] = cForm.label(key, fields[key].title, fields[key].required, ` <span class="badge bg-primary float-end boxy-small">${widgets[key].language}</span>`);
          obj.labelOptions = ` <span class="badge bg-primary float-end boxy-small">${widgets[key].language}</span>`;
          obj.type = "ide_editor";
          obj.class = "form-control ide_editor";
          var myobjvalue = obj.value;
          if (myobjvalue.includes("`")) {
            myobjvalue = Util.replaceAll(obj.value, "`", "\\`");
          }
          if (myobjvalue.includes("</script>")) {
            myobjvalue = Util.replaceAll(myobjvalue, "</script>", "<//script>");
          }
          if (myobjvalue.includes("${")) {
            myobjvalue = Util.replaceAll(myobjvalue, "${", "$___{");
          }
          script += ` var ide_editor_${key} = \`${myobjvalue}\`;`;
          break;
        case "table" :
          obj.type = "table";
          obj.data = relations[key];
          obj.properties = relations[`properties_${key}`];
          break;
        case "multi_line_editor" :
          obj.type = "multi_line_editor";
          obj.data = relations[key];
          obj.description = widgets[key].description;
          obj.fields = relations[key + "Fields"];
          break;
        case "json" :
          obj.type = "json";
          obj.data = relations[key];
          break;
        case "virtual" :
          obj.type = "virtual";
          break;

        default :
          obj.type = "text";
          break;
      }
    } else {
      obj.type = "text";
    }
    forms.obj[key] = obj;
    //forms.build[key] = cForm.build(obj[key]);
  }
  forms.users = zRoute.formUser(relations, data);
  if(script) {
    res.locals.relationsVariable = `<script>${script}</script>`;
  }
  return forms;
};

zRoute.viewFormPlainText = (req, res, MYMODEL, relations, data = {}) => {
  return zRoute.viewForm(req, res, MYMODEL, relations, data);
};

zRoute.viewFormsSync = async (req, res, MYMODEL, data = {}) => {
  const MYMODELS = myCache.get('MYMODELS');
  const relations = await zRoute.relations(req, res, MYMODEL.table);
  let forms = zRoute.viewForm(req, res, MYMODEL, relations, data);
  //zRoute.moduleLib(req, res, MYMODEL, relations, forms);
  let tables = [];
  for (let key in forms.obj) {
    if(forms.obj[key].type == 'table') {
      let obj = forms.obj[key];
      let MODEL = MYMODELS[MYMODEL.widgets[obj.id].table];
      const relationsTable = await zRoute.relations(req,res,MODEL.table);
      let tableForms = zRoute.viewForm(req,res,MODEL,relationsTable, obj.value || []);
      let properties = obj.properties;
      let tableProperties = {};
      for(let k in properties) {
        tableProperties[k] = tableForms.obj[k];
      }
      let html = ``;
      html += `<div class="card boxy"><div class="card-header"><h5 class="card-title">${obj.title}</h5></div><div class="card-body"><div class="table-responsive">
                        <table class="table table-hover table-sm">
                            <thead>
                                <tr>`;
      for(let k in obj.data) {
        html += `<th>${obj.data[k]}</th>`;
      }
      html += `</tr></thead><tbody>`;
      let val = obj.value || [];
      if(val.length) {
        val.forEach(function (item) {
          let myforms = zRoute.viewForm(req,res,MODEL,relationsTable,item)
          html += `<tr>`;
          for(let k in obj.data) {
            html += `<td>${cForm.field(myforms.obj[k])}</td>`;
          }
          html += `</tr>`;
        });
      }
      html  += `</tbody></table></div></div></div>`;
      forms.obj[key].html = html;
      forms.obj[key].type = "data_table";
    }
    forms.build[key] = cForm.build(forms.obj[key]);
  }
  return forms;
};

zRoute.viewFormSync = (req, res, MYMODEL, relations, data = {}) => {
  let forms = zRoute.viewForm(req, res, MYMODEL, relations, data);
  zRoute.moduleLib(req, res, MYMODEL, relations, forms);
  for (let key in forms.obj) {
    forms.build[key] = cForm.build(forms.obj[key]);
  }
  return forms;
};

zRoute.viewForm = (req, res, MYMODEL, relations, data = {}) => {
  let forms = zRoute.forms(req, res, MYMODEL, relations, data);
  const widgets = MYMODEL.widgets;
  let obj = forms.obj;
  let prepend = '';
  let value = '';
  for (let key in obj) {
    if (widgets.hasOwnProperty(key)) {
      let className = 'form-control-plaintext ';
      if (widgets[key].float) {
        className += ` boxy-small`;
      } else {
        className += ` purple-border`;
      }
      obj[key].class = className;
      obj[key].readonly = true;
      obj[key].placeholder = " ";
      obj[key].view_only = true;
      //obj[key].disabled = true;
      let widgetName = widgets[key].name;
      switch (widgetName) {
        case "password" :
          obj[key].value = "xxxxxx";
          break;
        case "image" :
          obj[key].type = "plaintext";
          let width = widgets[key].width || '300';
          obj[key].value = "<br><br>" + Util.fileView(`/uploads/${MYMODEL.routeName}/`, data[key], {
            width: width,
            class: 'boxy'
          });
          break;
        case "file" :
          obj[key].type = "plaintext";
          obj[key].value = "<br><br>" + Util.fileView(`/uploads/${MYMODEL.routeName}/`, data[key], {withIcon: true});
          break;
        case "switch" :
          obj[key].type = "plaintext";
          if (widgets[key].inline) {
            prepend = `<br>`
          }
          if (widgets[key].float) {
            prepend = `<br>`
          }
          value = data[key] ? widgets[key].fields[data[key]] : widgets[key].fields[0];
          obj[key].value = `${prepend}<div class="purple-border">${value}</div>`;
          break;
        case "relation" :
          obj[key].type = "text";
          obj[key].value = relations[key + "Object"][data[key]] || "";
          break;
        case "select" :
          obj[key].type = "text";
          obj[key].value = widgets[key].fields[[data[key]]] || "";
          break;
        case "radio" :
          obj[key].type = "text";
          obj[key].value = widgets[key].fields[[data[key]]] || "";
          break;
        case "datepicker" :
          obj[key].type = "text";
          obj[key].value = Util.dateSql(data[key], widgets[key].format) || "";
          break;
        case "editor" :
          obj[key].type = "textarea";
          obj[key].value = data[key] || "";
          break;
        case "range" :
          obj[key].type = "text";
          obj[key].value = data[key] || "";
          break;
        case "typeahead" :
          obj[key].type = "text";
          obj[key].value = relations[key + "Object"][data[key]] || "";
          break;
      }
    }
    //forms.build[key] = cForm.build(obj[key]);
  }
  forms.users = zRoute.formUser(relations, data);
  return forms;
};

zRoute.usersCommon = (res) => {
  return {
    company_id: res.locals.companyId || 1,
    updated_by: res.locals.userId || 1,
    created_by: res.locals.userId || 1,
    created_at: Util.now(),
    updated_at: Util.now()
  }
};

zRoute.viewTable = async (req, res, MYMODEL, results, isPreview, hasKeys = "") => {
  isPreview = isPreview || false;
  let data = {};
  let widgets = MYMODEL.widgets;
  let widgetsArray = Object.keys(widgets);
  let routeName = MYMODEL.routeName;
  let hasIdeEditor = false;
  let hasLexical = false;
  let editors = [];
  let lexicals = {};
  let row = {};
  const MYMODELS = myCache.get('MYMODELS');
  for (let key in results) {
    if (Util.in_array(key, widgetsArray)) {
      let widgetName = widgets[key].name;
      let html = '';
      let arr = [];
      switch (widgetName) {
        case "datepicker" :
          data[key] = Util.dateSql(results[key], widgets[key].format || "");
          break;
        case "color" :
          data[key] = `<input type="color" value="${results[key]}">`;
          break;
        case "number" :
          data[key] = Util.formatNumber(results[key]);
          break;
        case "image" :
          if (hasKeys) {
            data[key] = Util.fileView("/uploads/" + hasKeys + "/", results[key]);
          } else {
            data[key] = Util.fileView("/uploads/" + routeName + "/", results[key]);
          }
          break;
        case "file" :
          if (hasKeys) {
            data[key] = Util.fileView("/uploads/" + hasKeys + "/", results[key]);
          } else {
            data[key] = Util.fileView("/uploads/" + routeName + "/", results[key]);
          }
          break;
        case "password" :
          data[key] = "xxxxxxxx";
          break;
        case "datetime" :
          data[key] = Util.timeSql(results[key], widgets[key].format || "");
          break;
        case "switch" :
          data[key] = widgets[key].fields[results[key]] || "";
          break;
        case "select" :
          data[key] = widgets[key].fields[results[key]] || "";
          break;
        case "radio" :
          data[key] = widgets[key].fields[results[key]] || "";
          break;
        case "relation" :
          if (results[key]) {
            row = await connection.result({
              table: widgets[key].table,
              select: widgets[key].fields[1] + " as zname",
              where: {id: results[key]}
            }) || {};
          }
          data[key] = !row.zname ? "" : row.zname;
          break;
        case "typeahead" :
          if (results[key]) {
            row = await connection.result({
              table: widgets[key].table,
              select: widgets[key].fields[1] + " as zname",
              where: {id: results[key]}
            }) || {};
          }
          data[key] = !row.zname ? "" : row.zname;
          break;
        case "dropdown_multi" :
          rows = await connection.results({
            select: widgets[key].fields.join(",") + "as zname",
            table: widgets[key].table
          });
          let valArr = Util.arrayToList(results[key], Util.arrayWithObject(rows, "id", "zname"))
          data[key] = typeof valArr == "object" ? valArr.join("<br>") : valArr;
          break;
        case "dropdown_chain" :
          if (results[key]) {
            row = await connection.result({
              table: widgets[key].table,
              select: widgets[key].fields[1] + " as zname",
              where: {id: results[key]}
            }) || {};
          }
          data[key] = !row.zname ? "" : row.zname;
          break;

        case "dropdown_checkbox" :
          arr = widgets[key].fields || [];
          let val = results[key] || [];
          arr.map(item => {
            var checked = val.includes(item) ? 'checked="checked"' : "";
            html += `<div class="checkbox">
							<label class="">
								<input type="checkbox" ${checked}  >
								${item}
							</label>
						</div>`;
          })
          data[key] = html;
          break;

        case "ide_editor" :
          hasIdeEditor = true;
          editors.push(key);
          const editorValue = !results ? "" : Util.replaceAll(results[key], "</script>", `<//script>`);
          //data[key] = editorValue;
          moduleLib.addScript(req, res, "var ide_editor_" + key + " = `" + editorValue + "` ");
          break;
        case "lexical" :
          hasLexical = true;
          break;
        case "json" :
          data[key] = results[key] ? JSON.stringify(results[key], undefined, 2) : "";
          break;
        case "table" :
          let tableClass = isPreview ? "" : "table-striped table-hover";
          html = `<table class="table ${tableClass}">`;
          html += `<tr>`;
          let MODEL_TABLE = MYMODELS[MYMODEL.widgets[key].table];
          var nots = Util.nots;
          var visibles = MODEL_TABLE.grids.visibles || [];
          var invisibles = MODEL_TABLE.grids.invisibles || [];
          var obj = {}
          visibles.forEach(function (item) {
            if (!Util.in_array(item, nots)) {
              obj[item] = MODEL_TABLE.labels[item];
              html += `<th>${MODEL_TABLE.labels[item]}</th>`;
            }
          });
          invisibles.forEach(function (item) {
            if (!Util.in_array(item, nots)) {
              obj[item] = MODEL_TABLE.labels[item];
              html += `<th>${MODEL_TABLE.labels[item]}</th>`;
            }
          });
          html += `</tr>`;
          arr = results[key] || [];
          for (let i = 0; i < arr.length; i++) {
            var item = arr[i];
            var data_table = await zRoute.viewTable(req, res, MODEL_TABLE, item, false, `${MYMODEL.table}/${key}`);
            html += `<tr>`;
            for (var k in obj) {
              html += `<td>${data_table[k]}</td>`;
            }
            html += `</tr>`;
          }
          html += `</table>`;
          data[key] = html;
          break;

        default :
          data[key] = results[key];
      }
    } else {
      data[key] = results[key];
    }
  }
  if (hasIdeEditor) {
    var contentScript = '';
    editors.forEach(function (item) {
      contentScript += `var editor_${item} = ace.edit("editor_${item}");
            editor_${item}.getSession().setMode("ace/mode/${widgets[item].language}");
            editor_${item}.setValue(ace_value(ide_editor_${item}));
            $("#editor_${item}").css({height:${widgets[item].height ? widgets[item].height : 400}});
            `;
    });
    moduleLib.ideCDN(req, res);
    moduleLib.addScript(req, res, contentScript)
  }

  if (hasLexical) {
    /*        var scriptForm = '';
            moduleLib.lexical(req,res);
            for(var key in lexicals) {
                scriptForm += `document.addEventListener("DOMContentLoaded", () => {
                    window.buildLexicalEditor("lexical${key}");
                });
                setTimeout(function () {
                    window.importFile(window.LexicalEditor,${JSON.stringify(lexicals[key])});
                    $(".toolbar").hide();
                    $(".${key} .ContentEditable__root").focus();
                    $(".action-button .lock").click();
                    $(".actions").hide();
                    $("#text${key}").html(window.LexicalGetContent);
                }, 1000);
                `
            };
            moduleLib.addScript(req,res,scriptForm);*/
  }
  return data;
};


//generate all scripts in one line
zRoute.moduleLib = (req, res, MYMODEL, relations, zForms = "", data = {}) => {
  //check a file in directory
  //make a directory
  let table = MYMODEL.table;
  let path_script = `${dirRoot}/public/runtime/script/${table}`;
  Util.dirExist(path_script,true);
  let path_head = `${dirRoot}/public/runtime/head/${table}`;
  Util.dirExist(path_head,true);
  let path_end = `${dirRoot}/public/runtime/end/${table}`;
  Util.dirExist(path_end,true);
  let files = Util.getAllFiles(path_script);
  let head = res.locals.moduleHead;
  let end = res.locals.moduleEnd;
  if(files.length) {
    let head_files = Util.getAllFiles(path_head);
    let end_files = Util.getAllFiles(path_end);
    if(head_files.length) {
      head += Util.readFile(`${path_head}/head.txt`);
    }
    if(end_files.length) {
      end += Util.readFile(`${path_end}/end.txt`);
    }
    end += `<script src="/runtime/script/${table}/${files[0]}"></script>`;
  } else {
    let jsObj = zRoute.generateJS(req, res, MYMODEL, relations);
    let time = new Date().getTime();
    Util.deleteAllFiles(path_head);
    Util.deleteAllFiles(path_end);
    //minify js
    Util.writeFile(`${path_script}/${time}.js`, uglifyJS.minify(jsObj.script));
    Util.writeFile(`${path_head}/head.txt`, jsObj.head);
    Util.writeFile(`${path_end}/end.txt`, jsObj.end);
    end += `<script src="/runtime/script/${table}/${time}/.js"></script>`;
    if(jsObj.head) {
      head +=jsObj.head;
    }
    if(jsObj.end) {
      end += jsObj.end;
    }
  }

  if(head) {
    res.locals.moduleHead = head;
  }
  if(end) {
    res.locals.moduleEnd = end;
  }
};

/*
Generate javascript code into runtime folder
 */
zRoute.generateJS = (req, res, MYMODEL, relations, zForms = "", data = {}) => {
  //add additional script
  let lib_css = '';
  let scriptForm = '';
  let lib_js = '';
  let headObj = {};
  let endObj = {};
  if (zForms) {
    //moduleLib.addScript(req, res, zForms.scriptGroup);
    //scriptForm += zForms.scriptGroup;
  }
  let obj = {};
  const MYMODELS = myCache.get('MYMODELS');
  let widgets = MYMODEL.widgets,
    widgetsArray = Object.keys(widgets) || [];
  let hasDatePicker = false;
  let hasNumber = false;
  let hasClockPicker = false;
  let hasEditor = false;
  let hasDateTimePicker = false;
  let hasTable = false;
  let chainsObj = {}
  let chainsArr = [];
  let hasChain = false;
  let hasIde = false;
  let hasTinymce = false;
  let defaultScript = "";
  let hasTags = false;
  let hasLexical = false;
  let lexicals = [];
  let hasAttributes = [];
  for (let key in widgets) {
    if (widgets[key].name == "datepicker") {
      hasDatePicker = true;
    } else if (widgets[key].name == "number") {
      hasNumber = true;
    } else if (widgets[key].name == "clockpicker") {
      hasClockPicker = true;
    } else if (widgets[key].name == "editor") {
      hasEditor = true;
    } else if (widgets[key].name == "ide_editor") {
      hasIde = true;
    } else if (widgets[key].name == "switch") {
      let switchObj = moduleLib.switch(req, res, `#${key}`, widgets[key].fields);
      scriptForm += switchObj.script;
      headObj.switch = switchObj.head;
      endObj.switch = switchObj.end;
    } else if (widgets[key].name == "typeahead") {
      let typeaheadObj = moduleLib.typeahead(req, res, `#${key}Typeahead`, relations[key]);
      scriptForm += typeaheadObj.script;
      headObj.typeahead = typeaheadObj.head;
      endObj.typeahead = typeaheadObj.end;
    } else if (widgets[key].name == "datetime") {
      hasDateTimePicker = true;
    } else if (widgets[key].name == "table") {
      hasTable = true;
    } else if (widgets[key].name == "tags") {
      hasTags = true;
    } else if (widgets[key].name == "lexical") {
      hasLexical = true;
      lexicals.push(key);
    } else if (widgets[key].name == "tinymce") {
      hasTinymce = true;
    }
    // has chains
    if (widgets[key].name == "relation") {
      if (widgets[key].isChain) {
        if (widgets[key].chains.length) {
          chainsObj[key] = widgets[key].chains;
          hasChain = true;
        }
      }
      //relation_all_attributes
      if (widgets[key].isAttributes) {
        hasAttributes.push(key);
      }
    }
  }
  if (hasDatePicker) {
    let datePickerObj = moduleLib.datepicker(req, res);
    scriptForm += datePickerObj.script;
    headObj.datepicker = datePickerObj.head;
    endObj.datepicker = datePickerObj.end;
  }
  if (hasNumber) {
    let numberObj = moduleLib.number(req, res);
    scriptForm += numberObj.script;
    headObj.number = numberObj.head;
    endObj.number = numberObj.end;
  }
  if (hasClockPicker) {
    let clockpickerObj =  moduleLib.clockpicker(req, res);
    scriptForm += clockpickerObj.script;
    headObj.clockpicker = clockpickerObj.head;
    endObj.clockpicker = clockpickerObj.end;
  }
  if (hasEditor) {
    let editorObj =  moduleLib.editor(req, res);
    scriptForm += editorObj.script;
    headObj.editor = editorObj.head;
    endObj.editor = editorObj.end;
  }
  if (hasDateTimePicker) {
    let datetimepickerObj =  moduleLib.datetimepicker(req, res);
    scriptForm += datetimepickerObj.script;
    headObj.datetimepicker = datetimepickerObj.head;
    endObj.datetimepicker = datetimepickerObj.end;
  }
  /*if (hasTable) {
      scriptForm += moduleLib.script(req, res, MYMODEL.table);
  }*/
  if (hasIde) {
    let ideCDNObj =  moduleLib.ideCDN(req, res);
    //scriptForm += ideCDNObj.script;
    //headObj.ideCDN = ideCDNObj.head;
    endObj.ideCDN = ideCDNObj.end;
  }
  if (hasTags) {
    let tagsObj =  moduleLib.tags(req, res);
    scriptForm += tagsObj.script;
    headObj.tags = tagsObj.head;
    endObj.tags = tagsObj.end;
  }

  if (hasTinymce) {
    let tinymceObj =  moduleLib.tinymce(req, res);
    scriptForm += tinymceObj.script;
    headObj.tinymce = tinymceObj.head;
    endObj.tinymce = tinymceObj.end;
  }

  if (hasLexical) {
    moduleLib.lexical(req, res);
    lexicals.forEach(function (lexical) {
      scriptForm += `document.addEventListener("DOMContentLoaded", () => {
                window.buildLexicalEditor("${lexical}");
            });`
    });
  }

  if (hasChain) {
    for (let key in chainsObj) {
      if (chainsObj[key].length > 0) {
        scriptForm += `$("body").on("change", "#${key}", function () {`;
        chainsObj[key].forEach(function (objItem) {
          scriptForm += `chains("${key}","${objItem.table}","${objItem.target}","${objItem.column}","${objItem.name}", $("#${objItem.target}").val());`;
        });
        scriptForm += `});${Util.newLine}`;
        chainsObj[key].forEach(function (objItem) {
          scriptForm += ` if($("#${objItem.target}").val()){`
          scriptForm += `chains("${key}","${objItem.table}","${objItem.target}","${objItem.column}","${objItem.name}", $("#${objItem.target}").val());`;
          scriptForm += `}${Util.newLine}`
        })
      }
    }
  }

  defaultScript = `${Util.newLine} $(function () {
        $(".isfile").each(function (index, value) {
            let filename = $(this).attr("data-filename") || "";
            let id = $(this).attr("data-id");
            let table  = $(this).attr("data-table") || " ";
            let width = $(this).attr("data-width") || "300";
            if (filename.length > 3) {
                if(filename.includes('https:')) {
                    $("#file"+id).attr("src",filename);
                } else {
                    let ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
                    if (ext == "gif" || ext == "png" || ext == "jpeg" || ext == "jpg" || ext == "bmp" || ext == "webp" || ext == "jiff" || ext ==  "svg") {
                        $("#file"+id).attr("src","/uploads/"+table+"/"+filename).attr("width",width+"px");
                    } else {
                        let file = 'file.png';
                        if(ext == "docx" || ext == "doc") {
                            file = 'word.png'
                        } else if(ext == 'xls' || ext == 'xlsx') {
                            file = 'excel.png'
                        } else if(ext == 'pdf') {
                            file = 'pdf.png'
                        } else if(ext == 'ppt' || ext == 'pptx'){
                            file = 'ppt.png';
                        } else if(ext == 'txt') {
                            file = 'txt.png';
                        } else if(ext == 'zip') {
                            file = 'zip.jpg';
                        } else if(ext == 'rar') {
                            file = 'rar.jpg';
                        } else if(ext == 'rar') {
                            file = 'file.png';
                        }
                        $("#file"+id).attr("src","/img/"+file).attr("height","45px").attr("width","45px").addClass("boxy-small");
                    }
                    $("#file"+id).on("click", function () {
                        location.href = "/uploads/"+table+"/"+filename;
                    });
                }
           }
            if($(this).data("required") == true) {
                var imageElement = "#file"+id;
                if(!$(imageElement).attr("src")) {
                    $("#"+id).attr("required",true);
                }
            }
        });
    });`;

  for (let keys in widgets) {
    let widgetName = widgets[keys].name;
    switch (widgetName) {
      case "multi_line_editor" :
        scriptForm += `$(".text-toggle").on("click", function(){
                let editorId = $(this).data("id");
                $("#"+editorId).attr("type","text");
                $("#a_"+editorId).hide();
                $("#"+editorId).show();
                });
                
                $(".editor-value").on("change",function(index,item){
                    if($(this).attr("type") == "text") {
                        if($(this).val()) {
                            var editorId = $(this).data("id");
                            $("#a_"+editorId).html($(this).val()).show();
                            $(this).attr("type","hidden");
                        }
                    }
                });`;
        break;

      case "dropdown_multi" :
        scriptForm += ` $("#dropdownadd${keys}").on("click", function () {
        var val = $("#${keys}").val();
        if(val == ""){
            alert("Please select data");
            return false;
        }
        var count = $(".span${keys}").length;
        var data = "<span class='span${keys}' > "+(count+1)+". <input type='hidden' name='${MYMODEL.table}[${keys}][]' value='"+val+"' /> " + $("#${keys} option:selected").text()+"   <i class='fa fa-trash pointer text-danger pull-right' onclick='$(this).closest(\`span\`).remove();'  title='Delete'></i><br></span>";
        $("#dropdownbox${keys}").append(data);
        $("#${keys}").val("");
    });${Util.newLine}`;
        break;

      case "table" :
        let MODEL_TABLE = MYMODELS[MYMODEL.widgets[keys].table];
        //let MODEL_TABLE_RELATIONS = await zRoute.relations(req, res, MODEL_TABLE.table);
        //relations[key + "TABLE"]
        let MODEL_TABLE_RELATIONS = relations[keys + "TABLE"];
        let zForm = zRoute.formField(req, res, MODEL_TABLE, MODEL_TABLE_RELATIONS);
        zRoute.moduleLib(req, res, MODEL_TABLE, MODEL_TABLE_RELATIONS, zForms);
        let trash = `trash_${keys}_${MYMODEL.widgets[keys].table}`;
        let trtd = '';
        for (let key in relations[keys]) {
          obj = zForm.obj[key] || {}
          let name = MYMODEL.table + "[" + keys + "][${increment}][" + key + "]";
          obj.name = name;
          //obj.class = MYMODEL.table + "_" + keys + "_" + key;
          obj.class = `${MYMODEL.table}_${keys}_${key} form-control`;
          obj.id = key;
          obj.options = {
            "data-name": key,
            "data-id": obj.class
          };
          trtd += `<td  class="td_${key}_${MYMODEL.widgets[keys].table}">${cForm.field(obj)}</td>`;
        }

        trtd += `<td style="vertical-align:top"><span class="fas fa-trash-alt ${trash}" ></span></td></tr>`;
        let subname = MYMODEL.table + "_" + keys;
        scriptForm += `$("table").on("click", ".${trash}", function () {$(this).closest('tr').remove();});`;
        scriptForm += Util.newLine;
        scriptForm += 'var append' + keys + ' = function (increment) {return `<tr data-id="${increment}"  data-name="' + MYMODEL.table + '[' + keys + ']">';
        scriptForm += trtd;
        scriptForm += "`}";
        scriptForm += Util.newLine;
        scriptForm += `var append${keys}Max = $('tbody#body-${keys}>tr').length;${Util.newLine}`;
        scriptForm += `function ${keys}Handler(){ 
 var index = $("#body-${keys}>tr").length || 0; 
$("#body-${keys}>tr").each(function (index, tr) {
            let dataname = $(tr).data("name") || "";
            $(tr).attr("data-id", index);
            if(dataname != "") {
              var inputs = $(tr).find("input");
                inputs.each(function (i,input) {
                    if($(input).data("name")){
                       $(input).removeAttr("name");
                       $(input).attr("name",dataname+"["+index+"]["+$(input).data("name")+"]");
                    }
                    if($(input).attr("type") == "file") {
                        
                    }
                });

            var selects = $(tr).find("select");
            selects.each(function (i,input) {
                if($(input).data("name")){
                    $(input).removeAttr("name");
                    $(input).attr("name",dataname+"["+index+"]["+$(input).data("name")+"]");
                }
            });

            var textareas = $(tr).find("textarea");
            textareas.each(function (i,input) {
                if($(input).data("name")){
                    $(input).removeAttr("name");
                    $(input).attr("name",dataname+"["+index+"]["+$(input).data("name")+"]");
                }
            });
            }
          
        }); ${Util.newLine}};${Util.newLine}`;

        scriptForm += ` $(function () {
        $('#add${keys}').on('click',function(){
            $('#body-${keys}').append(append${keys}(append${keys}Max));
            append${keys}Max++;
            ${keys}Handler();
        });
    var ${keys} = $("#body-${keys}").data("value") ? $("#body-${keys}").data("value") : [];
    ${keys}.forEach(function (myobj, index) {
            $("#body-${keys}").append(append${keys}(index));
            ${keys}Handler();
            for(var key in myobj){
                if($(".${subname}_" + key).eq(index).attr("type") == "checkbox" && myobj[key] == 1){
                    $(".${subname}_" + key).eq(index).prop("checked", true);
                     $(".${subname}_" + key).eq(index).val(myobj[key] ? myobj[key] : '');
                } else if($(".${subname}_" + key).eq(index).attr("type") == "file"){
                    var myimg = myobj[key] ? myobj[key] : '';
                    var pathName = "/uploads/${MYMODEL.table}/${keys}/";
                    if(myimg) {
                        var filename = filenamex = pathName+myimg;
                        if (!myimg.match(/\\.(jpg|jpeg|png|gif|svg|jiff)$/i)) {
                            filename = "/img/file.png";
                        }
                        $(".${subname}_" + key).eq(index).closest("TD").find("img").attr("src",filename).addClass("boxy");
                        $(".${subname}_" + key).eq(index).closest("TD").append('<a href="'+filenamex+'" target="_blank" style="font-size: 12px">'+myimg+'</a>');
                    }
                } else {
                    $(".${subname}_" + key).eq(index).val(myobj[key] ? myobj[key] : '');
                }
                
            }
        append${keys}Max = index + 1;
    });
});${Util.newLine}`;
        break;

      case "ide_editor" :
        //var additionalScripts = `if (!!session.$worker) {session.$worker.send("setOptions", [{"esversion": 9,"esnext": false,}]);}`;
        let script_annotaions = '';
        let script_enabled = '';
        let script_looping = '';
        if (widgets[keys].language == "javascript") {
          script_annotaions = `editor_${keys}.session.setOption("useWorker", true);`;
          script_enabled = `editor_${keys}.session.setOption("useWorker", true);`;
          script_looping = `
                    var errors = editor_${keys}.getSession().getAnnotations().filter(a=>a.type==='error');
                    arr = [];
                    errors.forEach(function(erItem) {
                        if(erItem.text == 'Missing ";" before statement') {
                        } else {
                            arr.push(erItem);
                        }
                    });
                    editor_${keys}.getSession().setAnnotations(arr);
                    editor_${keys}.session.setOption("useWorker", true);
                    `;
        }
        scriptForm += `var editor_${keys} = ace.edit("editor_${keys}");
    editor_${keys}.getSession().setMode("ace/mode/${widgets[keys].language}");
    editor_${keys}.setValue(ace_value(ide_editor_${keys}));
    $("#${keys}").text(ace_value(ide_editor_${keys}));
    $("#editor_${keys}").css({height:${widgets[keys].height ? widgets[keys].height : 400}});
    ${script_annotaions}
    editor_${keys}.on("change",function(e,session){
        $("#${keys}").text(editor_${keys}.getValue());
    });
    `;

        break;
    }
  }

  if(hasAttributes) {
    hasAttributes.forEach(function (item) {
      let tableItem = MYMODEL.widgets[item].table;
      scriptForm += `
            function getAttribute_${item}(cb){
                ajaxPost('/${MYMODEL.table}/get_attributes',{id:$('#${item}').val(),table:'${tableItem}'},function(dt){cb(dt);});
            };
            `;
    });
  }
  scriptForm += defaultScript;

  let head = '';
  let end = '';
  for(let key in headObj) {
    if(headObj[key]){
      head += headObj[key];
    }
  }
  for(let key in endObj) {
    if(endObj[key]) {
      end += endObj[key];
    }
  }

  return {
    script : scriptForm,
    head : head,
    end : end
  }
};

/*
 MySQL CRUD with context
 */
zRoute.insertSQL = async (req, res, table, data) => {
  const MYMODELS = myCache.get('MYMODELS');
  let MYMODEL = MYMODELS[table];
  let fields = MYMODEL.keys;
  if (fields.includes("company_id")) data.company_id = res.locals.companyId || 1;
  if (fields.includes("updated_at")) data.updated_at = Util.now();
  if (fields.includes("created_at")) data.created_at = Util.now();
  if (fields.includes("updated_by")) data.updated_by = res.locals.userId || 1;
  if (fields.includes("created_by")) data.created_by = res.locals.userId || 1;
  const result = await connection.insert({table: table, data: data});
  zRoute.modelsCacheRenew(table, res.locals.companyId);
  return result;
};

zRoute.updateSQL = async (req, res, table, data, whereData) => {
  const MYMODELS = myCache.get('MYMODELS');
  let MYMODEL = MYMODELS[table];
  let fields = MYMODEL.keys;
  if (fields.includes('updated_at')) {
    data.updated_at = Util.now();
  }
  if (fields.includes('updated_by')) {
    data.updated_by = res.locals.userId;
  }
  //check if has table and image/file
  let hasImages = false;
  let tables = [];
  let tableFields = {}
  for (let key in MYMODEL.widgets) {
    if (MYMODEL.widgets[key].name == "table") {
      tableFields[key] = [];
      const MYMODEL_TABLE = MYMODELS[MYMODEL.widgets[key].table];
      for (let q in MYMODEL_TABLE.widgets) {
        if (MYMODEL_TABLE.widgets[q].name == "file" || MYMODEL_TABLE.widgets[q].name == "image") {
          hasImages = true;
          tables.push(key);
          tableFields[key].push(q);
        }
      }
    }
  }
  if (hasImages) {
    let result = await connection.result({
      table: MYMODEL.table,
      where: whereData
    });
    tables.forEach((item) => {
      let dataTables = data[item] ? JSON.parse(data[item]) : [];
      let temp = [];
      if (dataTables.length) {
        dataTables.forEach((obj, index) => {
          tableFields[item].forEach((key) => {
            if (!obj[key]) {
              let resultItem = result[item];
              if(resultItem && Object.prototype.hasOwnProperty.call(resultItem,index)) {
                let resultItemIndex = resultItem[index];
                if(resultItemIndex && Object.prototype.hasOwnProperty.call(resultItemIndex,key)) {
                  obj[key] = !result[item][index] ? "" : result[item][index][key];
                }
              }
            }
          });
          temp.push(obj);
        });
        data[item] = JSON.stringify(temp);
      }
    });
  }
  delete data.created_at;
  delete data.created_by;
  const result = await connection.update({table: table, where: whereData, data: data});
  zRoute.modelsCacheRenew(table, res.locals.companyId);
  return result;
};

zRoute.deleteSQL = async (table, id, company_id) => {
  try {
    const where = {
      id: id,
      company_id: company_id
    };
    const results = await connection.results({
      table: table,
      where: where
    });
    if (results.length) {
      await connection.delete({table: table, where: where});
      zRoute.modelsCacheRenew(table, company_id);
    } else {
      throw Error('Data not found');
    }
    return results[0];
  } catch (e) {
    throw  Error(e.toString());
  }
};

//for import
zRoute.import = async (req, res, MYMODEL) => {
  const userId = res.locals.userId;
  const room = res.locals.token;
  let progress = 0;
  let datas = [];
  let headers = [];
  let dataObj = {};
  let fields = Object.keys(MYMODEL.fields);
  dataObj.type = MYMODEL.routeName;
  let jsonObj = {
    progress: progress,
    headers: headers,
    datas: datas
  };
  let json = Util.jsonSuccess(LANGUAGE['import_success']);
  try {
    if (Object.keys(req.files).length == 0) {
      return res.json(Util.flashError(LANGUAGE['import_no_file']));
    }
  } catch (err) {
    return res.json(Util.flashError(err.toString()));
  }
  const filename = `${dirRoot}/public/excel/tmp/${Util.generateUnique()}.xlsx`;
  let excelFile = req.files.excel, labels = MYMODEL.labels, keys = {};
  if(!excelFile) {
    return res.json(Util.flashError(LANGUAGE['import_no_file']));
  }
  await Util.moveFile(excelFile, filename);
  io.to(room).emit('message', LANGUAGE['import_process']);
  const toJson = excelToJson({source: fs.readFileSync(filename)});
  let result;
  for (let prop in toJson) {
    let i = 0;
    if (i == 0) result = toJson[prop];
    i++;
  }
  if (!result.length) {
    let message = "No Data Found!!. Please uploading an excel file into 1 sheet only. Can not Multiple sheets";
    io.to(room).emit('message', message);
    res.json(Util.flashError(message));
    return;
  }
  //convert to table header
  let hd = '<tr>';
  for (let prop in result[1]) {
    let i = 0;
    keys[prop] = result[1][prop];
    hd += `<th>${result[0][prop]}</th>`;
    headers.push({i: i, prop: prop, value: result[0][prop]});
    i++;
  }
  hd += `<th>${LANGUAGE['noted']}</th>`;
  hd += `</tr>`;
  //convert to table header
  io.to(room).emit('import', hd);
  let isInsert = true;
  hd += `<tr>`
  for (let i = 3; i < result.length; i++) {
    const data = {}
    hd += `${(i - 2)}`
    for (var prop in keys) {
      let value = result[i][prop];
      if (value) {
        data[keys[prop]] = value;
      }
      hd += `<td>${value}</td>`
      if (keys[prop] == "id")
        isInsert = false;
    }
    try {
      if (isInsert) {
        if (Util.in_array("company_id", fields)) data.company_id = res.locals.companyId;
        if (Util.in_array("created_at", fields)) data.created_at = Util.now();
        if (Util.in_array("created_by", fields)) data.created_by = res.locals.userId;
        if (Util.in_array("updated_at", fields)) data.updated_at = Util.now();
        if (Util.in_array("updated_by", fields)) data.updated_by = res.locals.userId;
        await connection.insert({table: MYMODEL.table, data: data});
      } else {
        if (Util.in_array("updated_at", fields)) data.updated_at = Util.now();
        if (Util.in_array("updated_by", fields)) data.updated_by = res.locals.userId;
        var update = await connection.update({
          table: MYMODEL.table,
          data: data,
          where: {
            id: data.id
          }
        })
      }
      hd += `<td class='text text-success'>${LANGUAGE['success']}</td>`
    } catch (err) {
      hd += `<td class='text text-danger'>${err.toString()}</td>`
    }
    hd += '</tr>';
    io.to(room).emit('import', hd);
  }
  hd += '';
  io.to(room).emit('import', hd);
  fs.removeSync(filename);
  if (myCache.has(MYMODEL.table)) {
    zRoute.modelsCacheRenew(req,res,MYMODEL);
  }
  res.json(json);
};

zRoute.buildFileModel = (json, index = 0) => {
  //let text = `module.exports = { ${Util.newLine}`;
  let text = '';
  let separator = index == 0 ? "" : Util.tabs(index);
  for (let key in json) {
    text += `${separator}${Util.tabs(2)} ${key} : `;
    let type = typeof json[key];
    if (type == "string") {
      let title = Util.replaceAll(json[key], '"', "'");
      text += `"${title}",${Util.newLine}`;
    } else if (Array.isArray(json[key])) {
      let textArray = '';
      let isStringArray = false;
      if (json[key].length == 0) {
        text += `[], ${Util.newLine}`;
      } else {
        json[key].map((item) => {
          if (typeof item == "string") {
            isStringArray = true;
            textArray += `${Util.tabs(3)} ${separator}"${Util.replaceAll(item, '"', "'")}",${Util.newLine}`;
          }
        });
        if (isStringArray) {
          text += `[${Util.newLine}${textArray.slice(0, -3)}${Util.newLine}${separator}${Util.tabs(2)} ], ${Util.newLine}`;
        } else {
          text += `${JSON.stringify(json[key])}, ${Util.newLine}`
        }
      }

    } else if (type == "boolean") {
      text += json[key] ? "true" : "false";
      text += "," + Util.newLine;
    } else if (type == "object") {
      text += `{${Util.newLine}`;
      let textObjext = zRoute.buildFileModel(json[key], (index + 1));
      text += textObjext.slice(0, -3);
      text += `${Util.newLine}${separator}${Util.tabs(2)} }, ${Util.newLine}`
    } else {
      text += `"", ${Util.newLine}`
    }
  }
  //text += '}';
  return text;
};

zRoute.approversFooter = async (results, noActivity) => {
  noActivity = noActivity || false;
  const MYMODELS = myCache.get('MYMODELS');
  let MYMODEL = MYMODELS.zapprovals_details;
  let users = Util.arrayToObject(await connection.results({table: "zuser"}), "id");
  let html = '';
  let id = 0;
  let knowings = [], approvals = [];
  results.forEach(function (result) {
    if (result.type == 2) {
      let html = "";
      html += `<span class="status-approver">${MYMODEL.widgets.status.fields[result.status]}</span>`;
      html += `<p > <span style="text-decoration: underline;">${users[result.user_id].fullname}</span><span class="small-time"> ${users[result.user_id].position}</span></p>`;
      knowings.push(html);
    }
    if (result.type == 1) {
      let html = "";
      let sign = users[result.user_id].verify_signed && result.status == 3 ? `<img src="${process.env.APP_URL}/uploads/zuser/${users[result.user_id].verify_signed}" width="200">` : MYMODEL.widgets.status.fields[result.status];
      //var sign = "";
      html += `<span class="status-approver">${sign}</span>`;
      html += `<p class="footer-title"> <span style="text-decoration: underline;">${users[result.user_id].fullname}</span><span class="small-time"> ${users[result.user_id].position} <br>  ${Util.dateFormat(result.updated_at, "DD MMM YYYY HH:mm")}</span></p>
`;
      approvals.push(html);
    }
  })

  let divColumn = (num) => {
    if (!num)
      return "";

    if (num > 4) {
      num = num % 4;
    }

    var div = "";
    if (num == 1) {
      div = "col-12 text-center";
    } else if (num == 2) {
      div = "col-6 text-center";
    } else if (num == 3) {
      div = "col-4 text-center";
    } else {
      div = "col-3 text-center";
    }
    return div;
  }

  html += `<div class="row"><div class="col-12 text-center "><h5 class="knowing">Menyetujui</h5></div></div>`;
  html += `<div class="row d-flex justify-content-start align-items-end">`;
  let divClass = divColumn(approvals.length);
  approvals.forEach(function (item) {
    html += `<div class="${divClass}">`
    html += item;
    html += `</div>`;
  });
  html += `</div>`;

  const knowingDiv = divColumn(knowings.length)
  if (knowings.length) {
    html += `<div class="row align-items-end"><div class="col-12 text-center mt-5"><h5 class="knowing">Mengetahui</h5></div></div>`;
    html += `<div class="row">`;
    knowings.forEach(function (item) {
      html += `<div class="${knowingDiv}">`
      html += item;
      html += `</div>`;
    })
    html += `</div>`;
  }
  return html;
};


/*
cache models in so it's no need call database repeatly
 */

zRoute.modelsCache = async() => {
  let models = zRoute.MYMODELS() || {};
  delete models.zrole;
  delete models.zuser_company;
  let obj = {};
  let companies;
  let mustCaches = ['relation', 'typeahead', 'multi_line_editor', 'dropdown_multi'];
  let nots = ['created_by','updated_by'];
  for (let keys in models) {
    let widgets = models[keys].widgets;
    for (let key in widgets) {
      if (Util.in_array(widgets[key].name, mustCaches)) {
        let widget = widgets[key];
        let table = widget.table;
        if (widget.fields[1] != undefined) {
          if (!obj[table]) {
            obj[table] = {}
          }
          if(!Util.in_array(key,nots)){
            obj[table][`${keys}___${key}`] = `${widgets[key].fields[1]} as ${key}`;
          }
        }
      }
    }
  }
  companies = await connection.results({
    table : 'zcompany'
  });
  obj.zuser = {};
  obj.zuser = {
    created_by : 'fullname as created_by',
    updated_by : 'fullname as updated_by'
  };

  try {
    for(let keys in obj) {
      let checks = await connection.query(`SELECT EXISTS ( SELECT 1 FROM pg_tables WHERE tablename = '${keys}') AS oke;`);
      if(checks[0].oke) {
        if (!Util.in_array(keys, zRoute.tableHasNoCompanyId)) {
          let selects = ``;
          for(let key in obj[keys]) {
            selects += `${obj[keys][key]},`;
          }
          selects += `id, company_id`;
          for(const company of companies) {
            const results = await connection.results({
              table: keys,
              select: selects,
              where : {
                company_id : company.id
              }
            });
            for (let key in obj[keys]) {
              const splits = key.split("___") || [];
              let item = splits.length  > 1 ? splits[1] : key;
              let arr = [];
              for (const result of results) {
                arr.push({id: result.id, zname: result[item]});
              }
              const myarray = Util.sortArray(arr, 'zname');
              myCache.set(`${keys}_${key}_${company.id}`, myarray);
            }
          }
        }
      }
    }
  } catch (e) {
    //debug(req,res,e.toString());
    console.log('modelsCache :',e.toString())
  }

  return obj;
};

zRoute.modelsCacheRenew =  (table, companyId) => {
  if(myCache.has('MODELS_RELATIONS')) {
    let MODELS = myCache.get('MODELS_RELATIONS');
    let arr = Object.keys(MODELS) || [];
    let obj = MODELS[table] || {};
    if(Util.in_array(table,arr)) {
      let selects = '';
      for (let key in obj) {
        selects += `${obj[key]},`
      }
      selects += `id`;
      connection.results({
        select : selects,
        table : table,
        where : {
          company_id : companyId
        }
      }).then(function (results) {
        for (let key in obj) {
          const splits = key.split("___") || [];
          let item = splits.length  > 1 ? splits[1] : key;
          let arr = [];
          for (const result of results) {
            arr.push({id: result.id, zname: result[item]});
          }
          const myarray = Util.sortArray(arr, 'zname');
          myCache.set(`${table}_${key}_${companyId}`, myarray);
        }
      });
    }
  }
};

zRoute.makeFunctionsSystem = () => {
  let obj = myCache.get("ZFUNCTIONS");
  let content = ``;
  for(let key in obj) {
    if(obj[key].systems == 1) {
      content += obj[key].code;
      content += Util.newLine;
    }
  }
  let templateSystem = `const { connection, Util, io, zCache, myCache, zDebug, zDataTable, moduleLib, zFunction, zFn, zMail, zRoute, zRole} = require('zet-lib');
module.exports = (req, res, next) => {`;
  let fileSystem = `${dirRoot}/components/zFunctionsSystem.js`;
  templateSystem += content;
  templateSystem += `  next();
};
`;

  Util.writeFile(fileSystem, templateSystem);
  if(process.env.NODE_ENV === 'production') {
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

module.exports = zRoute;
