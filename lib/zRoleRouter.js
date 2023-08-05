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
  const bodyHTML = ejs.render(body,datas);
  const endBody = ejs.render(js, datas);
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


const body = `<div class="">
    <div class="page-header"><h1>Roles</h1></div>
    <div class="card panel panel-info boxy">
        <div class="panel-heading">
            <div class="float-end">
                <div class="summary">
                    <% if(levels.delete) {%>
                      <span
                              class="icon-small icons-danger" title="Delete role" onclick="deleterole()"><img class="icons-bg-white icon-image"
                                                                                                              src="/assets/icons/trash.svg"></span>
                    <%}%>
                        <% if(levels.update) {%>
                    <span class="icon-small icons-primary" data-bs-toggle="modal"
                                           data-bs-target="#renameModal" title="rename"><img
                                class="icons-bg-white icon-image" src="/assets/icons/edit.svg"></span>
                        <%}%>
                        <% if(levels.create) {%>
                        <span
                            class="icon-small icons-success" title="Add a new role" data-bs-toggle="modal"
                            data-bs-target="#addModal"><img class="icons-bg-white icon-image"
                                                            src="/assets/icons/plus.svg"></span>
                        <%}%>


                </div>
            </div>
            <h3 class="panel-title"><i class="fa fa-cog"></i> Settings</h3>
            <div class="clearfix"></div>
        </div>
        <div class="kv-panel-before">
            <div class="row">
                <form id="role-form" class="form-horizontal kv-form-horizontal" method="post"><input type="hidden"
                                                                                                     name="_csrf"
                                                                                                     value="<%- csrfToken %>">
                    <div class="form-group field-role-role_name"><label class="control-label col-md-2"
                                                                        for="role-role_name">Role Name</label>
                        <div class="col-md-10"><select id="roleName" class="form-control form-select mb-3" name="name">
                                <% for(var i = 0;i < results.length;i++){ %>
                                    <option value="<%- results[i].id %>"
                                    <% if(id == results[i].id){ %> selected=""
                                            <% } %>
                                    ><%- results[i].name %></option>
                                <% } %>
                            </select></div>
                    </div>
                    <table class="table table-responsive">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <% for(var i = 0;i < actions.length;i++) { %>
                                <th><%= actions[i] %> <input onclick='checkthis("<%= actions[i] %>")' type="checkbox"
                                                             id="all<%= actions[i] %>"></th>
                            <% } %>
                        </tr>
                        </thead>
                        <tbody>
                        <% for(var i = 0;i < routes.length;i++) { %>
                            <tr>
                                <td>
                                    <% var ename = routes[i] %>
                                    <%= ename %></td>
                                <% for(var x = 0;x < actions.length;x++) { %>
                                    <td><input name="params[<%= ename %>][<%= actions[x] %>]" class="<%= actions[x] %>"
                                        <% if(json && json.hasOwnProperty(ename) && json[ename].indexOf(actions[x]) >= 0) { %> <%= 'checked="checked"' %>
                                                <% } %>
                                               title="Role for <%= routes[i] %> <%= actions[x] %>" type="checkbox"></td>
                                <% } %>
                            </tr>
                        <% } %>
                        </tbody>
                    </table>
                    <div class="row">
                        <div class="col-md-10 col-md-offset-1">
                            <% if(levels.update) {%>
                            <button type="submit" class="btn btn-primary">Update</button>
                            <%}%>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div><!-- Modal -->
<div class="modal fade" id="renameModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="exampleModalLabel">Rename title</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body"><input type="text" class="form-control" id="rename" name="rename"
                                           value="<%- model[0].name %>"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary btn-update">Save changes</button>
            </div>
        </div>
    </div>
</div><!-- Modal -->
<div class="modal fade" id="addModal" tabindex="-1" aria-labelledby="addModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title" id="exampleModalLabel">Add a New Role</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-group mb-3"><label for="ruas_sk">Role Name</label> <input type="text"
                                                                                           class="form-control"
                                                                                           id="role_name"
                                                                                           name="role_name"
                                                                                           placeholder="Role Name">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary btn-add">Save changes</button>
            </div>
        </div>
    </div>
</div>


`;
const js = `<script>
    function checkthis(elm) {
        var cElem = $("#all" + elm);
        if (cElem.is(":checked")) {
            $("input." + elm).prop("checked", true);
        } else {
            $("input." + elm).prop("checked", false);
        }
    }
    $("#roleName").on('change', function () {
        location.href = "/zrole?id=" + $(this).val();
    });
    var form = document.getElementById("role-form");
    form.onsubmit = function (ev) {
        ev.preventDefault();
        var url = '/zrole/update/<%= id%>';
        ajaxPost(url, $(this).serialize(), function (data) {
            if (data.status == 1) {
                toastr.success('Success', 'Updated Role');
            } else {
                toastr.error('Error!',data.data);
            }
        });
    }
    $(".btn-update").on("click", function () {
        ajaxPost('/zrole/rename/<%= id%>',{
            rename : $("#rename").val()
        }, function (data) {
            toastrForm(data);
            setTimeout(function () {
                location.href= '';
            },2000);
        })
    })

    $(".btn-add").on("click", function () {
        ajaxPost('/zrole/create/',{
            name : $("#role_name").val()
        }, function (data) {
            toastrForm(data);
            setTimeout(function () {
                location.href= '';
            },2000);
        })
    })
    function deleterole() {
        if(window.confirm('delete role selected ? ')) {
            let id = "<%= id%>";
            ajaxDelete('/zrole/delete/<%= id%>',{id:id}, function (data) {
                toastrForm(data);
                setTimeout(function () {
                    location.href= '/zrole';
                },2000);
            })
        }
    }
</script>
`;

module.exports = router;
