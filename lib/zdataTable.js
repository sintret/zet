/**
 * Created by sintret dev on 1/6/2022.
 */
const Util = require("./Util");

class dataTable {
    constructor(visibles) {
        this.visibles = visibles; //array object
        this.setColumns = "";
        this.setTable = "";
        this.MYMODEL = null;
        this.searchColumns = {};
        this.relations;
        this.routeName;
        this.types = {};
        this.levels = {};
    }

    // for filter html
    set filterMODEL(obj) {
        this.MYMODEL = obj.MYMODEL;
        this.relations = obj.relations;
        this.routeName = this.MYMODEL.routeName;
        this.types = obj.TYPES;
        delete obj.MYMODEL;
        delete obj.relations;
        delete obj.TYPES;
        this.searchColumns = obj;
    }

    get columns() {
        if (this.setColumns)
            return this.setColumns;
        let html = '';
        for (var key in this.visibles) {
            html += `<th id="data_${key}">${this.visibles[key]}</th>`;
        }
        return html;
    }

    /*
     Create table html header
     */
    get table() {
        if (this.setTable)
            return this.setTable;
        return `<table id="dataTable" class="display table table-hover table-responsive" style="width:100%">
            <thead>${this.columns}</thead>
        </table>`;
    }

    get buttons() {
        let html = `<div class="dataTables_wrapper dt-bootstrap5 no-footer "><div class="dt-buttons btn-group flex-wrap">`;
        if (this.levels.create) {
            html += `<button title="${LANGUAGE.create_info}" class="btn create gridadd boxy-small dimens2x" tabindex="0" aria-controls="DataTables_Table_0" type="button"><span><i class="fas fa-plus"></i><span>${LANGUAGE.create}</span></span></button>`
        }
        if (this.levels.import) {
            html += `<button title="${LANGUAGE.import_info}" class="btn buttons-copy buttons-html5 copy gridimport boxy-small dimens2x" tabindex="0" aria-controls="DataTables_Table_0" type="button"><span><i class="fas fa-exchange-alt"></i> <span>${LANGUAGE.import}</span></span></button>`;
        }
        html += `<button title="${LANGUAGE.setting_info}" class="btn buttons-excel buttons-html5 setting gridsettings boxy-small dimens2x" tabindex="0" aria-controls="DataTables_Table_0" type="button" data-bs-toggle="modal" data-bs-target="#grid-modal"><span><i class="fas fa-cog"></i> <span>${LANGUAGE.settings}</span></span></button>`;
        html += `<button class="btn refresh gridreload boxy-small dimens2x" title="${LANGUAGE.grid_refresh}" tabindex="0" aria-controls="DataTables_Table_0" type="button"><span><i class="fas fa-sync"></i><span></span></span></button>`;
        if (this.levels.export) {
            html += `<div class="btn-group" role="group">
                            <button id="dropdownExport" type="button" class="btn dropdown-toggle boxy-small dimens2x" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <i class="fas fa-cloud-download-alt"></i> ${LANGUAGE.download}
                            </button>
                            <div class="dropdown-menu dimens3x" aria-labelledby="dropdownExport">`;
            html += `<a class="dropdown-header">Excel</a>`;
            html += `<a class="dropdown-item export-search-prety" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel</a>`;
            html += `<a class="dropdown-item export-search-raw" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel (${LANGUAGE.import}) </a>`;
            html += `<a class="dropdown-item export-all-prety" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel (${LANGUAGE.all}) </a>`;
            html += `<hr>`;
            html += `<a class="dropdown-header">PDF</a>`;
            html += `<a class="dropdown-item export-pdf" href="#"><i class="text-success fa fa-file-excel-o"></i>PDF </a>`;
            html += `<a class="dropdown-item export-all-pdf" href="#"><i class="text-success fa fa-file-excel-o"></i>PDF (${LANGUAGE.all}) </a>`;
            html += `</div>`;
        }
        html += `</div></div>`;

        return html;
    }

    get buttons2() {
        let html = `<div class="dataTables_wrapper dt-bootstrap5 no-footer "><div class="dt-buttons btn-group flex-wrap">`;
        if (this.levels.create) {
            html += `<button title="${LANGUAGE.create_info}" class="btn create gridadd image-button boxy-small dimens2x" tabindex="0" aria-controls="DataTables_Table_0" type="button"><img src="/assets/icons/plus.svg" class="icons-bg-black"> ${LANGUAGE.create}</button>`
        }
        if (this.levels.import) {
            html += `<button title="${LANGUAGE.import_info}" class="btn buttons-copy buttons-html5 copy gridimport boxy-small dimens2x image-button" tabindex="0" aria-controls="DataTables_Table_0" type="button"><img src="/assets/icons/database-import.svg" class="icons-bg-black"> ${LANGUAGE.import}</span></span></button>`;
        }
        html += `<button title="${LANGUAGE.settings}" class="btn buttons-excel buttons-html5 setting gridsettings boxy-small dimens2x image-button" tabindex="0" aria-controls="DataTables_Table_0" type="button" data-bs-toggle="modal" data-bs-target="#grid-modal"><img src="/assets/icons/settings.svg" class="icons-bg-black"> ${LANGUAGE.settings}</button>`;
        html += `<button class="btn refresh gridreload boxy-small dimens2x image-button" title="${LANGUAGE.grid_refresh}" tabindex="0" aria-controls="DataTables_Table_0" type="button"><img src="/assets/icons/refresh.svg" class="icons-bg-black"></button>`;
        if (this.levels.export) {
            html += `<div class="btn-group" role="group">
                            <button id="dropdownExport" type="button" class="btn dropdown-toggle boxy-small dimens2x image-button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <img src="/assets/icons/download.svg" class="icons-bg-black"> ${LANGUAGE.download}
                            </button>
                            <div class="dropdown-menu dimens3x" aria-labelledby="dropdownExport">`;
            html += `<a class="dropdown-header">Excel</a>`;
            html += `<a class="dropdown-item export-search-prety" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel</a>`;
            html += `<a class="dropdown-item export-search-raw" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel (${LANGUAGE.import}) </a>`;
            html += `<a class="dropdown-item export-all-prety" href="#"><i class="text-success fa fa-file-excel-o"></i>Excel (${LANGUAGE.all}) </a>`;
            html += `<hr>`;
            html += `<a class="dropdown-header">PDF</a>`;
            html += `<a class="dropdown-item export-pdf" href="#"><i class="text-success fa fa-file-excel-o"></i>PDF </a>`;
            html += `<a class="dropdown-item export-all-pdf" href="#"><i class="text-success fa fa-file-excel-o"></i>PDF (${LANGUAGE.all}) </a>`;
            html += `</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    get scripts() {
        let script = '<script type="text/javascript" src="https://cdn.datatables.net/v/bs5/dt-1.11.3/date-1.1.1/fc-4.0.1/fh-3.2.1/r-2.2.9/rg-1.1.4/sc-2.0.5/sl-1.3.4/datatables.min.js"></script>';
        script += `<script>${Util.newLine}`;
        script += `var dataTableFilters = ${JSON.stringify(this.searchColumns)};${Util.newLine}`;
        script += `var dataTableFields = ${JSON.stringify(Object.keys(this.visibles,null,2))};${Util.newLine}`;
        script += `var dataTableTypes = ${JSON.stringify(this.types,null,2)};${Util.newLine}`;
        script += `var dataTableRoute = "${this.routeName}";${Util.newLine}`;
        script += `</script>${Util.newLine}`;
        script += `<script type="text/javascript" src="/js/datatableaddon.min.js"></script>${Util.newLine}`;

        if (this.searchColumns.FILTERKEY) {
            script += `<script>$(function () {  setTimeout(function () {  ${this.searchColumns.FILTERKEY} },500) });</script>${Util.newLine}`;
        }
        return script;
    }
}

module.exports = dataTable;
