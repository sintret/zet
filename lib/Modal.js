const Util = require("./Util");
const Modal = {};

Modal.grid = (frameworkcss = "bootstrap5",obj, LANGUAGE={}) => {
    let attributeData = obj.attributeData, visibles = obj.visibles || [], invisibles = obj.invisibles || [], visiblesHtml = '', invisiblesHtml = '', labelsHtml = '';
    visibles.map((item) => {
        visiblesHtml += `<li data-name="${item}" draggable="true" class="image-li" role="option" aria-grabbed="false"><img src="/assets/icons/eye.svg" class="icons-bg-black">  ${attributeData.labels[item]}</li>`;
    });
    invisibles.map((item) => {
        invisiblesHtml += `<li data-name="${item}" draggable="true" class="image-li" role="option" aria-grabbed="false"><img src="/assets/icons/eye-off.svg" class="icons-bg-black">  ${attributeData.labels[item]}</li>`;
    });
    let no = 1;
    for(let key in attributeData.labels) {
        labelsHtml += `<tr><td>${no}</td><td>${key}</td><td>${attributeData.labels[key]}</td><td><input maxlength="25" type="text" class="form-control" required name="${obj.routeName}[${key}]" value="${attributeData.labels[key]}"></td></tr>`;
        no++;
    }
    const modalFields = Modal.build({
        id: "grid-modal",
        size : "modal-xl",
        header: `<h5 id="dynagrid-1-grid-modal-label" class="modal-title">
                    <i class="fa fa-cog"></i> ${LANGUAGE.grid_settings || "Settings Grid"}
                </h5>`,
        body : `<div class="container">
                    <form id="form-grid" class="form-vertical kv-form-bs4" action="/${obj.routeName}/grid" method="post">
                        <input type="hidden" name="_csrf" value="">
                        <div class="dynagrid-column-label">
                            ${LANGUAGE.grid_configure  || "Configure Order and Display of Grid Columns"}
                        </div>
                        <div class="row">
                            <div class="col-sm-5">
                                <ul id="gridleft" class="sortable-visible sortable list kv-connected cursor-move gridsortable" aria-dropeffect="move">
                                    <li data-name="" class="alert alert-info dynagrid-sortable-header disabled">
                                        ${LANGUAGE.grid_visible  || "Visible Columns"}
                                    </li>
                                    ${visiblesHtml}
                                </ul>
                            </div>
                            <div class="col-sm-2 text-center">
                                <div class="dynagrid-sortable-separator"><i class="fas fa-arrows-alt-h"></i></div>
                            </div>
                            <div class="col-sm-5">
                                <ul id="gridright"
                                    class="sortable-hidden sortable list kv-connected cursor-move gridsortable" aria-dropeffect="move">
                                    <li data-name="" class="alert alert-info dynagrid-sortable-header disabled">${LANGUAGE.grid_invisible  || "Hidden / Fixed Columns"}
                                    </li>
                                   ${invisiblesHtml}
                                </ul>
                            </div>
                        </div>
                        <input type="hidden" id="serialize_left" name="serialize_left" value=''/>
                        <input type="hidden" id="serialize_right" name="serialize_right" value=''/>
                    </form>
                </div> <!-- .dynagrid-config-form -->`,
        footer : `<button type="reset" class="btn btn-default refresh gridreload image-button" title="Abort any changes and reset settings">
                    <img src="/assets/icons/refresh.svg" class="icons-bg-black"> ${LANGUAGE.reset  || "Reset"}
                </button>
                <button type="button" class="btn btn-primary grid-submit boxy image-button" title="Save grid settings">
                    <img src="/assets/icons/send.svg" class="icons-bg-white"> ${LANGUAGE.apply  || "Apply"}
                </button>`
    });
    try {
        return modalFields;
    } catch (err) {
        console.log(err);
    }
};

Modal.build = (obj) => {
    let html = '<!-- Modal -->';
    try {
        const size = obj.size ? `${obj.size}` : "";
        const id = obj.id ?  `id="${obj.id}"` : "";
        const headerOptions =  Util.attributeOptions(obj.headerOptions || {},{class:"modal-header"});
        const header = obj.header ? `<div  ${headerOptions} >${obj.header}<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>`:"";
        const body = obj.body ? obj.body : "";
        const bodyOptions =  Util.attributeOptions(obj.bodyOptions || {},{class:"modal-body"});
        const footerOptions =  Util.attributeOptions(obj.footerOptions || {},{class:"modal-footer"});
        const footer = obj.footer ? `<div ${footerOptions} >${obj.footer}</div>` : "";
        html += `${Util.newLine}<div class="modal fade " ${id}  role="dialog" tabindex="-1">
              <div class="modal-dialog ${size}">
                <div class="modal-content">
                  ${header}
                  <div ${bodyOptions}>${body}</div>
                  ${footer}
                </div>
              </div>
            </div>`;

    } catch (error) {
        console.log(error)
    }
    return html;
};

module.exports = Modal;
