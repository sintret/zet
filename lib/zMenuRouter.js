const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true});
const fs = require('fs-extra');
//const {Util, connection, zRole, zCache } = require('zet-lib');
const Util = require('./Util');
const connection = require('./connection');
const zRole = require('./zRole');
const zCache = require('./zCache');
const moduleLib = require('./moduleLib');
const config = require('dotenv').config();
const ejs = require('ejs');

/*
icons list for tabler and set to /public/js
 */
const iconList = () => {
  const dir = `${dirRoot}/public/assets/icons`;
  const icons = fs.readdirSync(dir);
  return icons;
};

router.get('/', async function (req, res, next) {
  const levels = zRole.myLevel(req, res, 'zmenu');
  if(Object.prototype.hasOwnProperty.call(levels,'index')) {
    if(!levels.index) {
      return res.redirect(process.env.APP_AFTER_LOGIN);
    }
  }
  let name = "Standart";
  let arr = [{"text":"Home","href":"zdashboard","icon":"fas fa-home","target":"_self","title":""}];
  let hasAccessMenu = false;
  let companyId = res.locals.companyId;
  let id = req.query.id;
  let findArr = [];
  let idChanges;
  let rows= await connection.results({
    table: "zmenu",
    where : {
      company_id : companyId
    }
  });
  if (rows.length > 0) {
    hasAccessMenu = true;
    //check id changes
    let rowsChanges = rows.filter((item) => item.active == 1);
    idChanges = rowsChanges[0].id;
    if (id) {
      await connection.update({
        table : "zmenu",
        data: {
          active:0
        },
        where : {
          company_id: companyId
        }
      });
      await connection.update({
        table : "zmenu",
        data : {
          active : 1,
        },
        where : {
          id: id
        }
      });
    } else {
      id =1;
      let selected = rows.filter(item=>item.active == 1)[0] || {}
      id = selected.id;
      name = selected.name;
    }
  }
  findArr = await connection.results({
    table:"zmenu",
    where: {
      id:id
    }
  });
  arr = findArr[0].json;
  let refresh = 0;
  if (id != idChanges) {
    refresh = 1;
  }
  zCache.MENU();
  if(!levels.update) {
    hasAccessMenu = false;
  }

  let datas = {
    hasAccessMenu: hasAccessMenu,
    rows: rows,
    name: name,
    arr: arr,
    id: id,
    refresh: refresh,
    menuApp: "Menu Generator",
  }
  const bodyHTML = ejs.render(body,datas);
  const endBody = ejs.render(js, datas);
  const headBody = ejs.render(css);
  datas.bodyHTML = bodyHTML;
  moduleLib.addModule(req,res,headBody,true);
  moduleLib.addModule(req,res,endBody);
  res.render("zgenerator/layout", datas );
});

router.post('/', csrfProtection, async(req,res) => {
  const levels = zRole.myLevel(req, res, 'zmenu');
  if(Object.prototype.hasOwnProperty.call(levels,'create')) {
    if(!levels.create) {
      return Util.flashError('Not allowed')
    }
  }
  let body = req.body;
  let companyId = res.locals.companyId;
  let id = body.name;
  let json = body.json || [];
  if (!id){
    return res.json(Util.jsonError("name", "name can not be blank!"))
  }

  let data = {
    company_id: companyId,
    json: json,
    updated_by: res.locals.userId
  };
  let cb = Util.jsonSuccess("Success.. Please relogin to see the changes!");
  try {
    let rows = await connection.results({
      table : "zmenu",
      where : {
        company_id : companyId,
        id: id
      }
    });
    if (rows.length > 0) {
      await connection.update({
        table : "zmenu",
        data:data,
        where : {
          id:rows[0].id
        }
      })
    }
  } catch (e) {
    cb = Util.flashError(JSON.stringify(e))
  }
  zCache.MENU();

  res.json(cb)
});

router.post('/edit', async(req,res) => {
  const levels = zRole.myLevel(req, res, 'zmenu');
  if(Object.prototype.hasOwnProperty.call(levels,'update')) {
    if(!levels.update) {
      return res.json(Util.flashError('Not allowed'));
    }
  }
  let name = req.body.name || "";
  let id = req.body.id;
  if(name.length < 3) {
    return res.json(Util.flashError("name is empty or is not completed"));
  }
  let json = Util.jsonSuccess(LANGUAGE.success);
  await connection.update({
    table : "zmenu",
    data : {
      name : req.body.name,
      updated_at : Util.now(),
      updated_by : res.locals.userId
    },
    where : {
      id : req.body.id
    }
  });

  res.json(json);
});


router.post('/add', async(req,res) => {
  const levels = zRole.myLevel(req, res, 'zmenu');
  if(Object.prototype.hasOwnProperty.call(levels,'create')) {
    if(!levels.create) {
      return res.json(Util.flashError('Not allowed'));
    }
  }
  let name = req.body.name || "";
  if(name.length < 3) {
    return res.json(Util.flashError("name is empty or is not completed"));
  }
  let json = Util.jsonSuccess(LANGUAGE.success);
  await connection.insert({
    table : "zmenu",
    data : {
      name : req.body.name,
      updated_at : Util.now(),
      created_at : Util.now(),
      updated_by : res.locals.userId,
      created_by : res.locals.userId,
      company_id : res.locals.companyId
    },
  });

  res.json(json);
});

router.delete('/delete',async (req,res) => {
  const levels = zRole.myLevel(req, res, 'zmenu');
  if(Object.prototype.hasOwnProperty.call(levels,'delete')) {
    if(!levels.delete) {
      return Util.flashError('Not allowed');
    }
  }
  let id = req.body.id;
  await connection.delete({
    table :"zmenu",
    where : {
      id : id,
      company_id : res.locals.companyId
    }
  });
  let json = Util.jsonSuccess(LANGUAGE.success);
  res.json(json);
});

const body = `<section class="mt-4">
    <div class="row">
        <div class="col-md-5 mb-2">
            <div class="card  mb-3 wow fadeIn">
                <div class="card-header bg-success text-white">Edit item</div>
                <div class="card-body">
                    <form id="frmEdit">
                        <div class="form-group">
                            <div class="input-group mb-3">
                                <input type="text" class="form-control item-menu form-control-lg" name="text" id="text" placeholder="Text">
                                <div class="input-group-append">
                                    <button class="btn btn-md btn-outline-default m-0 px-3 py-2 z-depth-0 waves-effect" id="myEditor_icon" type="button" id="button-addon2">Button</button>
                                </div>
                                <input type="hidden" name="icon" class="item-menu">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="href">URL</label>
                            <input type="text" class="form-control item-menu" id="href" name="href" placeholder="URL">
                        </div>
                        <div class="form-group">
                            <label for="target">Target</label>
                            <select name="target" id="target" class="form-control item-menu">
                                <option value="_self">Self</option>
                                <option value="_blank">Blank</option>
                                <option value="_top">Top</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="title">Tooltip</label>
                            <input type="text" name="title" class="form-control item-menu" id="title" placeholder="Tooltip">
                        </div>
                    </form>
                </div>
                <div class="card-footer">
                    <button type="button" id="btnUpdate" class="btn btn-sm btn-primary" disabled><i class="fas fa-sync-alt"></i> Update</button>
                    <button type="button" id="btnAdd" class="btn btn-sm btn-success"><i class="fas fa-plus"></i> Add</button>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <p class="note note-light">
                        <strong>Note:</strong> Using link below  to find all  <strong>icon</strong> available options and
                        advanced customization.<br>
                        See <a target="_blank" href="https://tabler-icons.io/" class="text-reset"><strong>https://tabler-icons.io/</strong></a>
                    </p>
                </div>
            </div>


            <div class="row">
                <div class="col-md-12">
                    <div class="card mb-3 wow fadeIn">
                        <div class="card-header"><h2>Menu List</h2></div>
                        <div class="card-body">
                            <table class="table">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Choice</th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                <% for(var i = 0;i < rows.length; i++) { %>
                                    <tr>
                                        <td><%- i + 1 %></td>
                                        <td><a href="/zmenu?id=<%- rows[i].id %>&name=<%- rows[i].name %>"
                                               class="btn btn-sm <%- id == rows[i].id ? "btn-success" : "btn-default" %>">Choice</a>
                                        </td>
                                        <td>
                                            <%- rows[i].id %>
                                        </td>
                                        <td>
                                            <a href="/zmenu?id=<%- rows[i].id %>&name=<%- rows[i].name %>"><%- rows[i].name %></a>
                                        </td>
                                        <td>
                                            <div class="btn-group float-right">

                                                <a data-name="<%- rows[i].name %>"  data-id="<%- rows[i].id %>" class="btn btn-primary btn-sm edit-menu " data-toggle="modal" data-target="#editModal" href="#">Edit</a>

                                                <% if (rows[i].id != id) { %>
                                                    <a data-id="<%- rows[i].id %>" class="btn btn-danger btn-sm delete-menu" href="#"><i class="fas fa-trash-alt"></i></a>
                                                <% } %>
                                            </div>
                                        </td>
                                    </tr>
                                <% } %>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div class="col-md-7 mb-2">
            <div class="card mb-3 wow fadeIn">
                <div class="card-header secondary-color-dark text-white font-weight-bold">Menu</div>

                <div class="card-body">
                    <div class="input-group">
                        <select class="form-control form-select"  name="name" id="name">
                            <% for(var i = 0;i < rows.length; i++) {
                                let selected = rows[i].id == id ? ' selected ' : '';
                            %>
                            <option value="<%- rows[i].id %>" <%- selected %>><%- rows[i].name %></option>
                            <%} %>

                        </select>
                        <div class="input-group-btn">
                            <button id="btnOut" type="button" class="btn btn-sm btn-success"><i class="glyphicon glyphicon-ok"></i> Save </button>

                            <button id="btn-add" type="button" class="btn btn-sm btn-info " data-toggle="modal" data-target="#addModal"><i class="fas fa-plus-circle"></i> Add </button>

                        </div>
                    </div>
                </div>
                <div class="card-body" id="cont">
                    <ul id="myEditor" class="sortableLists list-group"></ul>
                </div>

                <div class="card-footer">

                </div>
            </div>

            <div class="row" style="display: none">
                <label for="out">Output:</label>
                <textarea id="out" class="form-control" cols="50" rows="10"></textarea>
            </div>

        </div>
    </div>
</section>

<!-- Modal Add -->
<div class="modal fade" id="addModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
     aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Add menu</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form>
                    <input type="text" class="form-control" id="add-name" value="">
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary save-add">Save changes</button>
            </div>
        </div>
    </div>
</div>



<!-- Modal Edit -->
<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
     aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Edit menu name</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form>
                    <input type="text" class="form-control" id="edit-name" value="">
                    <input type="hidden" id="edit-id" value="">
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary save-edit">Save changes</button>
            </div>
        </div>
    </div>
</div>

`;

const css = `<link rel="stylesheet" href="/css/bootstrap-iconpicker.min.css"/>
<link rel="stylesheet" href="/css/tabler.css"/>
<style type="text/css">
    #myEditor_icon i {
        margin-right: 5px;
    }
    .iconpickerxx i {
        filter: invert(100%) sepia(100%) saturate(2%) hue-rotate(94deg) brightness(102%) contrast(100%)!important;
    }
    .iconpicker i {
        filter:none!important;
    }
    li.list-group-item > div > i {
        filter: none !important;
        position:relative;
        top : 6px;
    }
    .btn i {
        padding: 0!important;
        margin: 0!important;
    }
</style>
`;

const js = `<script src="/js/icons.js" ></script>
<script src="/js/jquery-menu-editor-svg.js" ></script>
<script>
    $(function () {
        var iconPickerOptions = {searchText: 'Home...', labelHeader: '{0} of {1} Pages'};
        //sortable list options
        var sortableListOptions = {
            placeholderCss: {'background-color': 'cyan'}
        };
        var editor = new MenuEditor('myEditor', {listOptions: sortableListOptions, iconPicker: iconPickerOptions, labelEdit: 'Edit'});
        editor.setForm($('#frmEdit'));
        editor.setUpdateButton($('#btnUpdate'));
        <%if(hasAccessMenu) {%>
        editor.setData(<%- JSON.stringify(arr)%>);
        <%}  %>

        $('#btnOut').on('click', function () {
            var str = editor.getString();
            $("#out").text(str);
        });

        $("#btnUpdate").click(function(){
            editor.update();
            $("#out").text(editor.getString());
        });

        $('#btnAdd').click(function(){
            editor.add();
            $("#out").text(editor.getString());
        });

        var str = editor.getString();
        $("#out").text(str);

        $("#btnOut").on("click", function () {
            ajaxPost("/zmenu",{
                name : $("#name").val(),
                json:$("#out").val()
            },function (data) {
                if(data.status == 0){
                    toastr.error(data.message)
                } else {
                    toastr.success(data.message, data.title);
                    setTimeout(function () {
                        location.href = "";
                    }, 1000)
                }
            });
        });

        $("#name").on("change",function () {
            let myval = $(this).val();
            location.href = '/zmenu?id='+myval;
        })
    });

    <% if(refresh == 1) {%>
    setTimeout(function () {
        location.href = "";
    }, 1000);
    <%}%>

    $(".delete-menu").on("click", function (ev) {
        ev.preventDefault();
        let id = $(this).data("id");
        if(window.confirm("Sure to delete")) {
            ajaxDelete('/zmenu/delete',{
                id:id
            }, function (data) {
                toastrForm(data);
                if (data.status == 1) {
                    location.href = ''
                }
            })
        }
    })
    $(".edit-menu").on("click", function () {
        $("#edit-id").val($(this).data("id"));
        $("#edit-name").val($(this).data("name"));
    })
    $(".save-edit").on("click", function () {
        $("#edit-id").val();
        $("#edit-name").val();
        ajaxPost('/zmenu/edit',{
            id:$("#edit-id").val(),
            name: $("#edit-name").val()
        }, function (data) {
            toastrForm(data);
            if (data.status == 1) {
                location.href = ''
            }
        })
    })
    $(".save-add").on("click", function () {
        ajaxPost('/zmenu/add',{
            name: $("#add-name").val()
        }, function (data) {
            toastrForm(data);
            if (data.status == 1) {
                location.href = ''
            }
        })
    })
</script>

`;


module.exports = router;
