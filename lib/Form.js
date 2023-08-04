/**
 * Universal class Form UI HTML
 * Created by sintret dev on 8/23/2021.
 */

const Util = require("./Util");

const Form = {};
const addProperties = (obj, defaultObj = {}) => {
    let html = '';
    for (var key in obj) {
        var value = defaultObj.hasOwnProperty(key) ? defaultObj[key] + obj[key] : obj[key];
        html += ` ${key}="${obj[key]}" `;
    }
    return html;
};

Form.options = {
    button: {
        id: "form-submit",
        type: "button",
        class: "btn btn-success boxy",
        label: `<img src="/assets/icons/send.svg" class="icons-bg-white" > Submit`
    },
    field: {}
};


Form.label = (field, label, required, htmlOptions = "") => {
    required = required || false;
    const mark = required ? "*" : "";
    return `<label for="${field}">${label} ${mark} ${htmlOptions}</label>`;
};

Form.textarea = (obj) => {
    obj.type = "textarea";
    return Form.field(obj);
};

Form.input = (obj) => {
    obj.type = "input";
    return Form.field(obj);
};

Form.addProperty = (property, options = []) => {
    ///We expect options to be a non-empty Array
    if (!options.length) return;
    var optionsString = options.join(" ");
    return ` ${property}="${optionsString}" `;
};

Form.field = (obj) => {
    //options and default options
    let options = obj.options || {};
    let htmlOptions = '';
    for (let key in options) {
        let val = options[key];
        val = Util.replaceAll(val, '"', "");
        if (obj.hasOwnProperty(key)) {
            obj[key] = options[key];
        } else {
            htmlOptions += ` ${key}=${val} `;
        }
    }
    let type = obj.type || "text",
        id = Form.addProperty("id", [obj.id]),
        name = obj.name ? ` name="${obj.name}" ` : "",
        title = obj.title || "",
        prepend = obj.prepend || "",
        append = obj.append || "",
        placeholder = Form.addProperty("placeholder", [obj.placeholder]),
        tabindex = Form.addProperty("tabindex", [obj.tabindex]),
        value = obj.value == undefined ? "" : obj.value,
        classview = obj.class ? ` class="${obj.class}" ` : ` class=" " `,
        disabled = obj.disabled ? ` disabled="disabled" ` : '',
        data = obj.data,
        required = obj.required == true ? ` required ` : '',
        table = !obj.table ? "" : obj.table,
        frameworkcss = !obj.frameworkcss ? "bootstrap5" : obj.frameworkcss,
        form_css = !obj.form_css ? "bootstrap" : obj.form_css,
        attributes = !obj.attributes ? {} : obj.attributes,
        style = !obj.style ? "" : ` style=${obj.style} `,
        information = !obj.information ? "" : `<div id="information-${obj.id}" class="form-text">${Util.replaceAll(obj.information.substring(1, (obj.information.length - 1)), "\r\n", "<br>")}</div>`
    ;
    //replaceAll("\r\n","<br>")
    let attributeDate = "";
    if (obj.hasOwnProperty.attributeData) {
        for (let key in obj.attributeData) {
            attributeDate += ` data-${key}="${obj.attributeData[key]}" `;
        }
    }
    let hasInputGroup = false;
    let inputGroupLeft="",inputGroupRight="",inputGroupDivLeft="";
    if(attributes.hasOwnProperty("hasInputGroup") && attributes.hasInputGroup) {
        hasInputGroup = true;
        prepend = `<div class="input-group mb-3">`
        append = `</div>`
        if(attributes.hasOwnProperty("inputGroupLeft") && attributes.inputGroupLeft) {
            inputGroupLeft = `<span class="input-group-text">${attributes.inputGroupLeft}</span>`
        }
        if(attributes.hasOwnProperty("inputGroupRight") && attributes.inputGroupRight) {
            inputGroupRight = `<span class="input-group-text">${attributes.inputGroupRight}</span>`
        }
    }
    let displayForm = '';
    let readonly = obj.readonly  ? `readonly` : ``;
    let boxyclass = '', checked = '',selects = '';
    switch (type) {
        case "text" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" ${disabled} ${readonly} autofocus="" ${tabindex}  type="${type}" ${classview}  ${id} ${name} ${placeholder}  ${style}    ${required} value="${value}" data-t="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "checkbox" :
            checked = value == 1 ? "checked" : "";
            displayForm = `${prepend}<input autocomplete="off" autofocus=""  ${tabindex} ${disabled} ${readonly}  ${style}  type="checkbox" class="form-check-input ${obj.class}"  ${id} ${name}  ${checked}  ${htmlOptions}>${information}${append}`;
            break;

        case "tags" :
            classview = ` class="form-control tags ${obj.class ? obj.class : ''} " `;
            let datahtml = "";
            if (value) {
                let dataValue = [];
                if(typeof value == "string") {
                    dataValue= JSON.parse(value) || [];
                } else {
                    dataValue = value || [];
                }
                dataValue.forEach(function (item) {
                    datahtml += `<option value="${item}" selected="selected">${item}</option>`
                });
            }
            displayForm = `${prepend}<select ${classview} ${id} ${name} ${placeholder}  multiple data-allow-new="true">${datahtml}</select>${information}${append}`;
            break;

        case "range" :
            let min = !obj.min ? 0 : obj.min;
            let max = !obj.max ? 100 : obj.max;
            displayForm = `${prepend}${inputGroupLeft}<input onmouseover="titlerange(this)" onchange="titlerange(this)" autocomplete="off" autofocus=""  ${tabindex}  type="${type}" class="form-range" step="1"  ${id} ${name} ${placeholder}  ${style}    ${required} value="${value}" data-t="${value}" min="${min}" max="${max}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "hidden" :
            displayForm = `${prepend}<input autocomplete="off" autofocus=""  ${tabindex}  type="${type}"  ${style}  ${classview}  ${id} ${name} ${placeholder}   ${required} value="${value}" data-t="${value}"  ${htmlOptions}>${append}`;
            break;

        case "textarea" :
            displayForm = `${prepend}${inputGroupLeft}<textarea ${tabindex} ${disabled} ${classview} ${id} ${name} ${placeholder}  ${readonly}   ${style}  ${htmlOptions}  rows="4">${value}</textarea>${inputGroupRight}${information}${append}`;
            break;

        case "image" :
            boxyclass = value ? "boxy" : "";
            let stringvalue = value ? value.substring(13) : '';
            let trashicon = stringvalue ? `<img class="tabler-icons icons-filter-danger" src="/assets/icons/trash-filled.svg" onclick="removeimage(this)">` : '';
            displayForm = `${prepend}<input ${tabindex} type="file" accept="image/*" onchange="loadFile(this,'${obj.id}' )" data-width="${obj.width}" class="form-control ${obj.class || ''}" ${id} ${name} ${placeholder}  value="${value}" ${htmlOptions}>
					<div  id="body${obj.id}" class="isfile"  data-id="${obj.id}" data-table="${obj.routeName}" data-width="${obj.width}"  data-name="${obj.title}" data-filename="${value}" data-required="${obj.required}"> <img class="mb-3" id="file${obj.id}" /><br><a class="text-success" target="_blank" href="/uploads/${obj.routeName}/${value}"> ${stringvalue}</a>  ${trashicon}</div>${append}`;
            break;

        case "file" :
            boxyclass = value ? "boxy" : "";
            let stringvaluefile = value ? value.substring(13) : '';
            let trashiconfile = stringvaluefile ? `<img class="tabler-icons icons-filter-danger" src="/assets/icons/trash-filled.svg" onclick="removeimage(this)">` : '';
            displayForm = `${prepend}<input ${tabindex} type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/msword, application/vnd.ms-excel, application/vnd.ms-powerpoint,text/plain, application/pdf,.css,.js,.jpg,.png,.gif" onchange="loadFile(this,'${obj.id}' )"  class="form-control ${obj.class || ''}"  ${id} ${name} ${placeholder} value="${value}" ${htmlOptions}>
					<div  id="body${obj.id}" class="isfile"  data-id="${obj.id}" data-name="${obj.title}" data-table="${obj.routeName}"  data-filename="${value}" data-required="${obj.required}"> <img class="mb-3" id="file${obj.id}" /><a class="text-success" target="_blank" href="/uploads/${obj.routeName}/${value}"> ${stringvaluefile}</a>${trashiconfile}</div>${information}${append}`;
            break;

        case "email" :
            displayForm = `${prepend}<input autocomplete="off" autofocus=""  ${readonly} ${disabled}  ${tabindex}  ${style}  type="email" ${classview}  ${id} ${name} ${placeholder}   ${required} value="${value}"  ${htmlOptions}>${information}${append}`;
            break;

        case "number" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" autofocus="" ${disabled}  ${readonly}   ${tabindex}  ${style}  type="text" class="form-control number ${obj.class}" ${id} ${name} ${placeholder}   ${required} value="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "integer" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" autofocus="" ${disabled}  ${readonly}   ${tabindex}  ${style}  type="text" class="form-control  ${obj.class}" ${id} ${name} ${placeholder}   ${required} value="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "datepicker" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" autofocus="" ${disabled}  ${readonly}   ${tabindex}  ${style}  type="text"  class="form-control datepicker ${obj.class}"  ${id} ${name} ${placeholder}   ${required} value="${value}" data-t="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "datetimepicker" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" autofocus="" ${disabled}  ${readonly}   ${tabindex}  type="text"  ${style}  class="form-control datetimepicker ${obj.class}"  ${id} ${name} ${placeholder}   ${required} value="${value}" data-t="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;

        case "password" :
            displayForm = `${prepend}${inputGroupLeft}<input autocomplete="off" autofocus="" ${disabled}  ${readonly}  ${tabindex}  ${style}  type="password" ${classview}  ${id} ${name} ${placeholder}   ${required} value="${value}"  ${htmlOptions}><span toggle="#password" class="bx bi-eye field-icon toggle-password"></span>${inputGroupRight}${information}${append}`;
            break;

        case "switch" :
            checked = value == 1 ? " checked " : "";
            displayForm = `${prepend}<p><input  ${tabindex}  type="checkbox" ${classview}  ${readonly}   ${style}   ${id} ${name} ${checked} ></p>${information}${append}`;
            break;

        case "lexical" :
            displayForm = `${prepend}<div ${id}>${information}${append}`;
            break;

        case "checkbox" :
            checked = value == 1 ? " checked " : "";
            displayForm = `${prepend}<input  ${tabindex}  type="${type}" ${classview}   ${readonly}   ${style}  ${id} ${name} ${checked} >${information}${append}`;
            break;

        case "dropdown_checkbox" :
            let checkboxes = "";
            let val = [];
            if (typeof value == "object") {
                val = value;
            } else if (typeof value == "string") {
                if (value) {
                    val = JSON.parse(value);
                }
            }
            data.forEach(function (item) {
                const checked = Util.in_array(item, val) ? " checked " : "";
                checkboxes += `<div class="checkbox">
							<label class="">
								<input type="checkbox" name="${obj.name}[${item}]" ${checked} value="${item}">
								${item}
							</label>
						</div>`;
            });
            displayForm = `${prepend}<div class="form-check">${checkboxes}</div>${information}${append}`;
            break;

        case "select" :
            if(obj.hasOwnProperty("array")) {
                var items = obj.array || [];
                var please_select = obj.please_select;
                if(please_select != undefined) {
                    if(please_select != "") {
                        selects += `<option value="">${please_select}</option>`;
                    }
                }
                if(items.length) {
                    items.forEach(function (item) {
                        const selected = item.value == value ? ' selected ' : '';
                        selects += `<option value="${item.value}" ${selected}>${item.label}</option>`;
                    });
                } else {
                    if (Array.isArray(data)) {
                        data.map((item) => {
                            var selected = item.id == value ? ' selected ' : '';
                            selects += `<option value="${item.id}" ${selected}>${item.zname}</option>`;
                        });
                    } else {
                        for (var keys in data) {
                            var selected = keys == value ? ' selected ' : '';
                            selects += `<option value="${keys}" ${selected}>${data[keys]}</option>`;
                        }
                    }
                }
            } else {
                if (Array.isArray(data)) {
                    data.map((item) => {
                        const selected = item.id == value ? ' selected ' : '';
                        selects += `<option value="${item.id}" ${selected}>${item.zname}</option>`;
                    });
                } else {
                    for (let keys in data) {
                        let selected = keys == value ? ' selected ' : '';
                        selects += `<option value="${keys}" ${selected}>${data[keys]}</option>`;
                    }
                }
            }
            if (form_css == "material_design") {
                classview = Form.addProperty("class", ["selectpicker", obj.class]);
            }
            displayForm = `${prepend}<select ${tabindex}  ${style} ${disabled}  ${readonly}  class="form-control form-select ${obj.class}"  ${id} ${name} ${placeholder} ${required} ${htmlOptions} >${selects}</select>${information}${append}`;
            break;

        case "radio" :
            let radios = '';
            let arr = obj.array || [];
            arr.map((item, index) => {
                //var selected = item.value == value ? ' selected ' : '';
                const checked = item.value == value ? ' checked ' : '';
                radios += `<div class="form-check">
                        <input class="form-check-input" type="radio" name="${obj.name}" value="${item.value}" id="${obj.id}${index}" ${checked}>
                          <label class="form-check-label" for="${obj.id}${index}">
                            ${item.label}
                          </label>
                    </div>`;
            });
            displayForm = `${prepend} ${radios} ${information}${append}`;
            break;

        case "select_user" :
            selects = '';
            data.map((item) => {
                const selected = item.value == value ? ' selected ' : '';
                selects += `<option value="${item.id}" ${selected}>${item.fullname}</option>`;
            });

            if (form_css == "material_design") {
                classview = Form.addProperty("class", ["selectpicker", obj.class]);
            }
            displayForm = `${prepend}<select ${tabindex} class="form-control form-select  ${obj.class}"  ${id} ${name} ${placeholder} ${required} ${htmlOptions} >${selects}</select>${information}${append}`;
            break;

        case "chain" :
            selects = '';
            // for array item.value and item.text
            // proptery is value and text
            data.map((item) => {
                var selected = item.id == value ? ' selected ' : '';
                selects += `<option value="${item.id}" ${selected}>${item.zname}</option>`;
            });
            if (form_css == "material_design") {
                classview = Form.addProperty("class", ["selectpicker", obj.class]);
            }
            displayForm = `${prepend}<select ${tabindex} class="form-control form-select  ${obj.class}"  ${id} ${name} ${placeholder} ${required} ${htmlOptions} >${selects}</select>${information}${append}`;
            break;

        case "multi" :
            selects = "";
            if (data) {
                data.map((item) => {
                    var selected = value == item.id ? " selected " : "";
                    selects += `<option value="${item.id}"  ${selected} >${item.zname}</option>`;
                });
            }

            var spanmulti = '';
            if (value) {
                let arr = [];
                arr = typeof value == "string" ? JSON.parse(value) : value;
                if (Array.isArray(arr)) {
                    arr.forEach(function (item, index) {
                        spanmulti += `<span class='span${obj.id}'>${index + 1}. <input type='hidden' name='${obj.name}[]' value='${item}' />${obj.multi[item]}<i class='fa fa-trash pointer text-danger pull-right' onclick='$(this).closest("span").remove();'  title='${LANGUAGE['delete']}'></i><br></span>`;
                    });
                }
            }
            if (form_css == "material_design") {
                classview = Form.addProperty("class", ["selectpicker", obj.class]);
            }

            let g = `<div class="input-group ">
            <span class="input-group-text" id="dropdownadd${id}" class="dropdownadd" data-id="${id}" style="cursor: pointer" title="Add Data">+</span>
            </div>
            <div id="dropdownbox${id}" class="boxy">
            <span class="span${id}">
            </span>
            </div>`
            return `<div class="input-group">
					<select ${tabindex} class="form-control"  ${id}  ${placeholder} ${required} ${htmlOptions} >${selects}</select>
					<span id="dropdownadd${obj.id}" class="input-group-text dropdownadd" data-id="${obj.id}" style="cursor: pointer;" title=" ${LANGUAGE["form_add_data"]} ">+</span>
				</div>
				<div id="dropdownbox${obj.id}" class="boxy mb-3">${spanmulti}</div>`;
            break;

        case "typeahead" :
            let typeahead_value = Util.replaceAll(obj.typeaheadvalue,'"',`'`)
            displayForm = `${prepend}<div class="input-group">
                <input  ${tabindex}  type="text" class="form-control"  id="${obj.id}Typeahead"  autocomplete="off" data-provide="typeahead" id="${obj.id}Typeahead"   placeholder="Please type a word"  value="${typeahead_value}" >
				<input type="hidden" ${id} ${name} ${placeholder} ${classview} ${required}  value="${value}">
					<span id="${obj.id}Clear" class="input-group-addon input-group-text dropdownadd" title="Clear"  style="cursor: pointer;" title=" Add Data "><img src="/assets/icons/ban.svg" class="icons-bg-black" ></span>
				</div>${information}${append}`;
            break;

        case "table" :
            let html = '';
            /*console.log(`table : ${obj.data}`)
            console.log(JSON.stringify(obj.data))
            console.log(JSON.stringify(obj.properties));*/
            for (let key in obj.data) {
                if (obj.properties[key].hidden) {
                    html += `<th></th>`;
                } else {
                    html += `<th>${obj.data[key]}</th>`;
                }
            }
            let btnAdd = '';
            if (!obj.isAddButton && !obj.viewOnly) {
                btnAdd = `<th><button type="button" class="btn" title="Add" id="add${obj.id}"><img src="/assets/icons/plus.svg" class="icons-bg-black" ></button></th>`;
            }
            obj.btnAdd = btnAdd;
            obj.html = html;
            obj.title = title;
            obj.table = table;
            obj.value = value;
            let datavalue = "";
            if (obj.value) {
                datavalue = JSON.stringify(obj.value);
                datavalue = Util.replaceAll(datavalue, "'", "`");
            }
            obj.prepend = prepend;
            obj.body = `<div class="table-responsive">
                        <table id="table${obj.id}" class="table table-hover table-sm">
                            <thead>
                                <tr>
                                    ${html}
                                    ${obj.btnAdd}
                                </tr>
                            </thead>
                            <tbody id="body-${obj.id}"  data-value='${datavalue}'>${obj.table}</tbody>
                        </table></div>`;
            displayForm = Form.card(frameworkcss, obj);
            break;

        case "multi_line_editor" :
            value = obj.value ? obj.value : {};
            let description = obj.description || "";
            for (var key in obj.fields) {
                let val = !value[key] ? obj.fields[key] : value[key];
                description = Util.replaceAll(description, `[[[${key}]]]`, `<span  class="text-danger text-toggle"  id="a_${key}" data-id="${key}" style="text-decoration: underline; cursor: pointer">${val}</span> <input type="hidden"  name="${obj.name}[${key}]" class="editor-value" id="${key}" data-id="${key}" value="${val}" >`);
            }
            displayForm = `${prepend}<div class="boxy">${description}</div>${information}${append}`;
            break;

        case "ide_editor" :
            displayForm = `<div class="ide_editor" id="editor_${obj.id}"></div>`
            displayForm += `<textarea hidden  ${classview} ${id} ${name} ${placeholder}   ${readonly}   ${style}  ${htmlOptions}  rows="4"></textarea>${information}${append}`;
            break;

        case "json" :
            displayForm += `<textarea   ${classview} ${id} ${name} ${placeholder}  ${readonly}   ${style}  ${htmlOptions}  rows="4">${JSON.stringify(obj.value)}</textarea>${information}${append}`;
            break;

        case "virtual" :
            displayForm = `${prepend}<input autocomplete="off" autofocus=""  ${tabindex}  ${style}  type="text" ${classview} readonly ${id}  ${placeholder}   ${required} value="${value}"  ${htmlOptions}>${information}${append}`;
            break;

        //additionals for form view in view
        case "plaintext" :
            displayForm = `<span class="">${obj.value || ""}</span>`;
            break;

        case "div" :
            displayForm = `<div id="${obj.id}" class="${obj.class}">${obj.value}</div>`
            break;

        case "data_table" :
            displayForm = obj.html;
            break;

        default :
            displayForm = `${prepend}${inputGroupLeft}<input ${disabled} autocomplete="nope" autofocus=""  ${readonly}  ${tabindex}  type="${type}" ${classview}  ${id} ${name} ${placeholder}   ${required} value="${value}" data-t="${value}"  ${htmlOptions}>${inputGroupRight}${information}${append}`;
            break;
    }

    return displayForm;
};

Form.group = (name, label, field) => {
    return `<div class="form-group div${name} mb-3">${label}${field}</div>`;
};

Form.button = (optionsExtends = {}) => {
    let options = Form.options.button;
    let htmlOptions = "";
    for (let key in optionsExtends) {
        let val = optionsExtends[key];
        val = Util.replaceAll(val, '"', "");
        if (options.hasOwnProperty(key)) {
            options[key] = optionsExtends[key]
        } else {
            htmlOptions += ` ${key}=${val} `;
        }
    }
    return `<button id="${options.id}" type="${options.type}" class="${options.class}" ${htmlOptions}>${options.label}</button>`;
};

Form.buttonGroup = (buttons = []) => {
    let html = `<div class="btn-group" role="group" aria-label="...">`;
    html += buttons.join(" ");
    html += `</div>`;
    return html;
};

Form.submit = (optionsExtends = {}) => {
    let options = {
        id: "form-submit",
        type: "submit",
        class: "btn btn btn-success boxy image-button ",
        label: `<img src="/assets/icons/send.svg" class="icons-bg-white" > <span>${LANGUAGE['submit']}</span>`
    };
    let settings = {...options, ...optionsExtends}
    return Form.button(settings);
};

Form.pullRight = (frameworkcss) => {
    if (frameworkcss == "bootstrap3") {
        return "pull-right";
    } else if (frameworkcss == "bootstrap4") {
        return "float-right";
    } else {
        return "float-end"
    }
};

Form.breadcrumb = (type, arr) => {
    let html = `<nav style="--bs-breadcrumb-divider: url(&#34;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z' fill='currentColor'/%3E%3C/svg%3E&#34;);" aria-label="breadcrumb"><ol class="breadcrumb float-end">`;
    arr.map((item) => {
        if (item.active == true) {
            html += `<li class="breadcrumb-item active" aria-current="page">${item.text}</li>`;
        } else {
            html += `<li class="breadcrumb-item"><a href="${item.href}">${item.text}</a></li>`;
        }
    });
    html += `</ol></nav>`;
    return html;
};

Form.grid = (type, obj) => {
    return gridBootstrap5(obj);
};

/*
 tab property
 label,active,content,headerOptions
 */
Form.tab = (type, obj) => {
    return tabBootstrap5(obj);
};

Form.card = (type, obj) => {
    return card45(obj);
};

//card 4 & 5 bootstrap
const card45 = (obj) => {
    let html = obj.prepend;
    let objHeader = obj.headerOptions || {}
    let headerOptions = obj.headerOptions ? addProperties(obj.headerOptions, {class: "card"}) : addProperties({class: "card"});
    let img = obj.img ? `<img ${addProperties(obj.img)} >` : "";
    let title = `<div class="card-header"><h5 class="card-title">${obj.title}</h5></div>`;
    let footer = obj.footer = obj.footer ? `<div class="card-footer">${obj.footer}</div>` : ``;
    let append = !obj.append ? "" : obj.append;
    html += `<div ${headerOptions}>
  ${img}
      ${title}
  <div class="card-body">
    ${obj.body}
  </div>
  ${footer}
</div>`;

    html += append;
    return html;
};

const cardBootstrap5 = (obj) => {
    return `${obj.prepend}<div class="card div${obj.id}">
               <div class="card-content">
                <div class="card-body">
                    <div class="card-title">${obj.title}</div>
                    <div class="table-responsive">
                        <table id="table${obj.id}" class="table">
                            <thead>
                                <tr>
                                    ${obj.html}
                                    ${obj.btnAdd}
                                </tr>
                            </thead>
                            <tbody id="body-${obj.id}"  data-value='${obj.value}'>${obj.table}</tbody>
                        </table>
                    </div>
                 </div>
                </div>
            </div>`;
}

const gridBootstrap5 = (obj) => {
    let levels = obj.levels;
    let routeName = obj.routeName;
    let advanceSearch = !obj.advanceSearch ? "" : obj.advanceSearch;
    let createBtn = "", exportBtn = "", importBtn = "", superBtn = '', exportBtnGroup = "", selectPagesize = "";
    if (levels.create) {
        createBtn = `<button type="button" id="create_btn"  class="btn btn-success btn-xs"><i class="fa fa-plus white-icon"></i></button>`;
    }
    if (levels.export) {
        exportBtn = `<button type="button" id="backupExcel" class="btn btn-info btn-xs" title="${obj.LANGUAGE['download_excel']}"><i class="fas fa-file-excel"></i></button>`;

        exportBtnGroup = `<div class="btn-group" role="group">
                        <button id="dropdownExport" type="button" class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            ${obj.LANGUAGE['grid_export_data']}
                        </button>
                        <div class="dropdown-menu" aria-labelledby="dropdownExport">
                            <a class="dropdown-item export-xls" href="#"><i class="text-success fa fa-file-excel-o"></i> Excel </a>
                            <a class="dropdown-item export-pdf" href="#"><i  class="text-danger fa fa-file-pdf-o"></i> PDF </a>
                        </div>
                    </div>`;
    }
    if (levels.import) {
        importBtn = `<button type="button" id="importExcel" class="btn btn-warning btn-xs"  title="<%- LANGUAGE['data_import'] %>"><i class="fas fa-file-import"></i></button>`;
    }
    selectPagesize = `<div class="dropdown-menu" aria-labelledby="dropdownPagination">`;
    let pageSize = obj.gridFilters.pageSize || 20;

    for (var i = 0; i < obj.paginationApp.length; i++) {
        var actived = pageSize == obj.paginationApp[i] ? " active " : "";
        selectPagesize += `<a data-value="${obj.paginationApp[i]}" class="dropdown-item pageSizeGrid ${actived}" id="pagination${obj.paginationApp[i]}" href="#"  >${obj.paginationApp[i]}</a>`;
    }
    selectPagesize += `</div>`;

    let toolbarDefault = `<div class="float">
<div class="btn-group float-end" role="group" aria-label="Button group with nested dropdown">
                    ${createBtn}
                    ${exportBtn}
                    ${importBtn}
                    <button type="button" class="btn btn-secondary btn-xs" title="${LANGUAGE['grid_personalize_labeling']}" data-bs-toggle="modal" data-bs-target="#grid-labels" ><i class="fa fa-font"></i></button>
                    <button type="button" class="btn btn-info btn-xs" title="${LANGUAGE['grid_personalize_setting']}" data-bs-toggle="modal" data-bs-target="#grid-modal"><i class="fa fa-cog"></i></button>
                    <button type="button" id="reloadgrid" class="btn btn-default btn-xs" title="${LANGUAGE['grid_refresh']}"><i class="fas fa-redo"></i></button>
                    <div class="btn-group" role="group">
                        <button id="dropdownPagination" type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Pagination ${pageSize}
                        </button>
                        ${selectPagesize}
                    </div>
                    
                    <div class="btn-group" role="group">
                        <button id="dropdownExport" type="button" class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            ${obj.LANGUAGE['grid_export_data']}
                        </button>
                        <div class="dropdown-menu" aria-labelledby="dropdownExport">
                            <a class="dropdown-item export-xls" href="#"><i class="text-success fa fa-file-excel-o"></i> Excel </a>
                            <a class="dropdown-item export-pdf" href="#"><i  class="text-danger fa fa-file-pdf-o"></i> PDF </a>
                        </div>
                    </div>

                </div></div>`;
    let toolbar = obj.toolbar ? obj.toolbar : toolbarDefault;
    let html = '';
    html += `<div class="card">
        <div class="card-body">
            <div class="float-end">
                <div class="summary"></div>
            </div>
            <div class="card-title"><i class="fa fa-book"></i> ${obj.header}</div>
            <div class="row">
               ${toolbar}
                           <div style="padding-top: 7px;"><a href="#" class="open_advancesearch"> Advance Search</a></div>
            ${advanceSearch}
            </div>
            
            <input type="hidden" id="pageSize" value="${pageSize}">
            <div class="table-responsive pt-3 row">
                    <div id="jsGrid" class="table-responsive"></div>
            </div>
        </div>
    </div>`;
    return html;
};


const tabBootstrap5 = (arr = []) => {
    let html = "";
    html += `<ul class="nav nav-tabs" id="myTab" role="tablist">${Util.newLine}`;
    arr.forEach(function (item, index) {
        var active = "", selected = "false";
        if (item.active) {
            active = "active";
            selected = "true";
        }
        html += `${Util.tab}
                <li class="nav-item" role="presentation" >
                <button class="nav-link ${active}" id="tab${index}" data-bs-toggle="tab" data-bs-target="#arr${index}" type="button" role="tab" aria-controls="arrtab${index}" aria-selected="true">${item.label}</button>
                </li>${Util.newLine}`;
    });
    html += `</ul>`;
    return {
        html: html,
        class: "tab-pane fade",
        active: "show active"
    };
};

Form.build = (obj) => {
    let html = '';
    let required = !obj.required ? "" : `<span class="required-mark">*</span>`;
    let relation = "";
    //form float
    let float = false;
    let inline = false;
    let attributes = Object.prototype.hasOwnProperty.call(obj,"attributes") ? obj.attributes : {};
    let view_only = Object.prototype.hasOwnProperty.call(obj,'view_only') ? obj.view_only : false;
    if(!view_only) {
        if (attributes && Object.prototype.hasOwnProperty.call(attributes, "name")) {
            if(obj.attributes.name == "relation") {
                relation =  `<a target="_blank" href="/${obj.attributes.table}"> > </a>`
            }
        }
    }

    if (attributes && Object.prototype.hasOwnProperty.call(attributes, "float")) {
        float = obj.attributes.float || false;
    }
    if (attributes && Object.prototype.hasOwnProperty.call(attributes, "inline")) {
        inline = obj.attributes.inline || false;
    }

    if(float) {
        //obj.class = "nice-float"
        if(obj.type == "checkbox") {
            html += `<div class="form-switch mx-auto  div${obj.id} mb-3">${Form.field(obj)}<label class="form-check-label" for="">${obj.id} ${required}</label></div>`;
        } else {
            html += `<div class="form-floating mx-auto mb-3 mt-3 div${obj.id} mb-3">${Form.field(obj)}<label for="${obj.id}">${obj.title} ${required}  ${relation}</label></div>`;
        }
    } else {
        if(inline) {
            if(obj.type == "checkbox") {
                html += ` <div class="mb-3 row"><label for="${obj.id}" class="col form-check-label">${obj.title}  ${obj.labelOptions} ${required}  ${relation}</label><div class="col-8">${Form.field(obj)}</div></div>`
            } else {
                html += ` <div class="mb-3 row"><label for="${obj.id}" class="col col-form-label">${obj.title}  ${obj.labelOptions} ${required}  ${relation}</label><div class="col-8">${Form.field(obj)}</div></div>`
            }
        } else {
            if(obj.type == "checkbox") {
                html += `<div class="form-check div${obj.id} mb-3">${Form.field(obj)}<label class="form-check-label" for="${obj.id}">${obj.title}  ${obj.labelOptions}  ${required}</label></div>`;
            } else {
                html += `<div class="form-group div${obj.id} mb-3"><label for="${obj.id}">${obj.title}  ${obj.labelOptions} ${required}  ${relation}</label>${Form.field(obj)}</div>`;
            }
        }
    }
    return html;
};

module.exports = Form;
