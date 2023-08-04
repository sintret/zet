const Util = require('./Util');
const newLine = Util.newLine;

const m = {};

//module for ide code editor
m.ideCDN = function (req,res) {
    let script = '';
    let head = ``;
    let end = ``;
    end += `<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.15.0/ace.js"></script>${Util.newLine}`;

    return {
        head : head,
        end : end,
        script: script
    }
};

m.ide = function (req,res,elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || "#ide_editor";
        end += `<script>   var editor_${elem} = ace.edit("${elem}");
    editor_${elem}.getSession().setMode("ace/mode/ejs");
     </script> ${Util.newLine}`;
    return {
        head : head,
        end : end,
        script: script
    }
};

m.tags = function(req,res,elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".tags";
    end += `<script type="module">import Tags from "https://cdn.jsdelivr.net/gh/lekoala/bootstrap5-tags@master/tags.js";Tags.init("${elem}");</script>`;
    return {
        head : head,
        end : end,
        script: script
    }
};
//module for datepicker
m.datepicker = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".datepicker";
      /*  head += '<link href="/css/bootstrap-datepicker.css" rel="stylesheet">';
        end += '<script src="/js/bootstrap-datepicker.min.js"></script>';*/
    head += '<link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css" rel="stylesheet">';
    end += '<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js"></script>';
    script = `$.fn.datepicker.defaults.format = "yyyy-mm-dd";$.fn.datepicker.defaults.todayHighlight = true;$("body").on("click", "${elem}", function(){$(this).datepicker();$(this).datepicker("show");});`;

    return {
        head : head,
        end : end,
        script: script
    }
};

//module for datepicker
m.datetimepicker = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".datetimepicker";
        head += '<link href="/css/bootstrap-datetimepicker.min.css" rel="stylesheet" />';
        end += '<script type="text/javascript" src="/js/moment-with-locales.min.js" ></script>';
        end += '<script type="text/javascript" src="/js/bootstrap-datetimepicker.min.js" ></script>';
        script += `$(function () { $("${elem}").datetimepicker({format:'YYYY-MM-DD hh:mm:ss'}); });`;
        script += `setTimeout(function () { $("body").click();},1000);`;
        script += `$("body").on("click", function(){$("${elem}").datetimepicker({format:'YYYY-MM-DD hh:mm:ss'});});`;


    return {
        head : head,
        end : end,
        script: script
    }
};


//using ckeditor
m.ckeditor = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".editor";
    end += '<script src="/modules/ckeditor5-build-classic/ckeditor.js"></script>' + newLine;
    end += '<script>';
    end += 'ClassicEditor.create( document.querySelector( "' + elem + '" ) ).catch( error => {console.error( error );} );' + newLine;
    end += '</script>';
    return {
        head : head,
        end : end,
        script: script
    }
};


//using tinymce
m.tinymce = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".tinymce";
    end += '<script src="https://cdn.tiny.cloud/1/b7054u42l8lw67ch5oh9qutnvbyu8exzryg4edy0gg2snhtr/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>' + newLine;
    script += ` tinymce.init({
      selector: '${elem}',
      plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
      toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
    });`;
    return {
        head : head,
        end : end,
        script: script
    }
};

//using froala
m.froala = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".editor";

    head += '<link href="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_editor.pkgd.min.css" rel="stylesheet" type="text/css" />';
    head += '<link href="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_style.min.css" rel="stylesheet" type="text/css" />';
    end += '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/js/froala_editor.pkgd.min.js"></script>';
    script += `$(function() {$("${elem}").froalaEditor({height: 200})});`;

    return {
        head : head,
        end : end,
        script: script
    }
};

m.lexical = function(req,res,elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".editor";
    head += `<link rel="stylesheet" href="/assets/main.143ecbc6.css">`;
    head += `<script type="module" crossorigin src="/assets/main.3be493b7.js"></script>`;

    return {
        head : head,
        end : end,
        script: script
    }
};



//Default editor is froala
m.editor = (req, res, elem = "") => {
    elem = elem || ".editor";
    //Default editor is froala
    //return m.froala(req, res, elem);
    //return m.tinymce(req, res, elem);
    //return m.ckeditor(req, res, elem);
    //return m.lexical(req,res,elem);

    let script = '';
    let head = ``;
    let end = ``;

    head += '<link href="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_editor.pkgd.min.css" rel="stylesheet" type="text/css" />';
    head += '<link href="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/css/froala_style.min.css" rel="stylesheet" type="text/css" />';
    end += '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/froala-editor@2.9.0/js/froala_editor.pkgd.min.js"></script>';
    script += `$(function() {$("${elem}").froalaEditor({height: 200})});`;

    return {
        head : head,
        end : end,
        script: script
    }
};

m.switch = function (req, res, elem, array) {
    elem = elem || ".switch";
    let script = '';
    let head = ``;
    let end = ``;

    head += '<link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-switch/3.3.4/css/bootstrap3/bootstrap-switch.css" rel="stylesheet" type="text/css" />' + newLine;
    end += '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-switch/3.3.4/js/bootstrap-switch.js"></script>' + newLine;

    let labels = '';
    if (Array.isArray(array)) {
        labels = '{offText:"' + array[0] + '", onText:"' + array[1] + '"}';
    }
    script += '$("' + elem + '").bootstrapSwitch(' + labels + ');' + newLine;
    return {
        head : head,
        end:end,
        script:script
    };
};


m.switchOld = function (req, res, elem, array) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".switch";
    head += '<link href="https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/css/bootstrap4-toggle.min.css" rel="stylesheet">' + newLine;
    end += '<script src="https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/js/bootstrap4-toggle.min.js"></script>' + newLine;

    let labels = '';
    if (Array.isArray(array)) {
        labels = '{off:"' + array[0] + '", on:"' + array[1] + '"}';
    }
    script += `$(function(){$('${elem}').bootstrapToggle(${labels});});${Util.newLine}`;

    return {
        head : head,
        end:end,
        script:script
    };
};

m.clockpicker = function (req, res, elem) {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".clockpicker";
    head += '<link href="https://cdn.jsdelivr.net/npm/clockpicker@0.0.7/dist/jquery-clockpicker.min.css" rel="stylesheet" type="text/css" />' + newLine;
    end += '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/clockpicker@0.0.7/dist/bootstrap-clockpicker.min.js"></script>' + newLine;
    script += `$("body").on("click", "${elem}", function(){$(this).clockpicker({donetext: "Done"});});`;
    //end += '$("' + elem + '").clockpicker({donetext: "Done"});' + newLine;
    return {
        head : head,
        end : end,
        script: script
    }
};

m.number = (req, res, elem) => {
    let script = '';
    let head = ``;
    let end = ``;
    elem = elem || ".number";

    end += '<script type="text/javascript" src="/js/jquery-currency.js"></script>';
    script += `$(function () { $(".number").formatCurrencyLive({symbol:"",roundToDecimalPlace :0,digitGroupSymbol :"."}); });`;
    script += `setTimeout(function () { $("body").click();},1000);`;
    script += `$("body").on("click", function(){$(".number").formatCurrencyLive({symbol:"",roundToDecimalPlace :0,digitGroupSymbol :"."});});`;

    return {
        head : head,
        end : end,
        script: script
    }
};

m.typeahead = (req, res, elem, data) => {
    let script = '';
    let head = ``;
    let end = ``;
    data = data || [];
    elem = elem || ".typeahead";
    end += '<script type="text/javascript" src="/modules/typeahead/typeahead.js"></script>' + newLine;

    let elemData = elem.replace(".", "");
    elemData = elemData.replace("#", "");
    let element = elem.replace("Typeahead", "");

    script += 'const ' + elemData + 'Data = ' + JSON.stringify(data.filter(function (value, index, arr) {
            return index > 0;
        })) + ';' + newLine;
    script += `$("body").on("change", "${elem}", function(){
            var current = $("${elem}").typeahead("getActive");
            if(current){
                $("${element}").val(current.id);
                $("${element}").change();
            }
    });${Util.newLine}`;
    script += `$("body").on("click", "${element}Clear", function(){
            $("${elem}").val("");
            $("${element}").val("");
            $("${elem}").change();
    });${Util.newLine}`;
    script += '$("' + elem + '").typeahead({source: ' + elemData + 'Data ,items: 50, displayText: function(item){  return item.zname.toString();}});' + newLine;

    return {
        head : head,
        end : end,
        script: script
    }
};

m.custom = (req, res, script, css, src)=> {
    src = src || "";
    css = css || "";
    let head = res.locals.moduleHead;
    let end = res.locals.moduleEnd;
    if (script) {
        end += '<script>' + newLine;
        end += script + newLine;
        end += '</script>' + newLine;;
    }
    if (css) {
        head += css;
    }
    if (src) {
        end += `<script src="${src}"> ${newLine}`;
    }
    res.locals.moduleHead = head;
    res.locals.moduleEnd = end;
};

m.script = (req, res, table) => {

};


/*
 add scrip code in the body html
 end in the bottom html body (javascript) default
 top in the top html body (css)

 type : script / css
 */
m.addScript = (req, res, contentScript, at = "end", type = "script") => {
    if (contentScript) {
        let generateId = "app_"+ Util.generate(6);
        let tagOpen = type == "script" ? `<script  id="${generateId}">` : '<style type="text/css">';
        let tagClose = type == "script" ? '</script>' : '</style>';
        let content = at == "end" ? res.locals.moduleEnd : res.locals.moduleHead;
        content += tagOpen + newLine;
        content += contentScript + newLine;
        content += tagClose + newLine;

        if(at == "end"){
            res.locals.moduleEnd = content;
        } else res.locals.moduleHead = content;
    }
};

m.addModule = (req,res, content, isModuleHead = false) => {
    let moduleContent = isModuleHead ? res.locals.moduleHead : res.locals.moduleEnd;
    moduleContent += content;
    if(isModuleHead) {
        res.locals.moduleHead = moduleContent;
    } else {
        res.locals.moduleEnd = moduleContent;
    }
};

m.highchart = async(req, res, obj) => {
    obj = obj || {};
    let head = res.locals.moduleHead;
    let end = res.locals.moduleEnd;
    if (end.indexOf("highcharts") < 0) {
        end += '<script src="https://code.highcharts.com/highcharts.js"></script>' + newLine;
    }

    if (!Util.isEmptyObject(obj)) {
        const highcharts = require('./highcharts');
        end += '<script>' + newLine;
        end += await highcharts.build(obj);
        end += '</script>' + newLine;
    }

    res.locals.moduleHead = head;
    res.locals.moduleEnd = end;
}

m.tableForm = (req, res, name, table) => {
    let head = res.locals.moduleHead;
    let end = res.locals.moduleEnd;
    res.locals.moduleHead = head;
    res.locals.moduleEnd = end;
}

m.selectYear = (req, res, elem, val, startYear, endYear) => {
    let dt = new Date();
    endYear = endYear || dt.getFullYear();
    val = val || "";
    var options = "";
    for (var i = endYear; i >= startYear; i--) {
        var selected = i == val ? " selected " : "";
        options += `<option value="${i}" ${selected}>${i}</option>`
    }
    let end = res.locals.moduleEnd;
    end += '<script>' + newLine;
    end += `$("${elem}").html('${options}')`;
    end += '</script>' + newLine;
    res.locals.moduleEnd = end;
}

//https://highlightjs.org/usage/
m.highlight = (req, res, elem) => {
    elem = elem || ".codes";
    let head = res.locals.moduleHead;
    let end = res.locals.moduleEnd;
    if (head.indexOf("highlight") < 0) {
        head += '<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/10.4.1/styles/default.min.css"> ' + newLine;
        end += '<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/10.4.1/highlight.min.js"></script>' + newLine;
    }
    end += '<script>$(function(){ document.querySelectorAll("' + elem + '").forEach((block) => {hljs.highlightBlock(block);}); })</script>' + newLine;
    res.locals.moduleHead = head;
    res.locals.moduleEnd = end;
}

//https://developer.snapappointments.com/bootstrap-select/
m.selectpicker = function (req, res, elem) {
    elem = elem || ".selectpicker";
    let head = res.locals.moduleHead;
    let end = res.locals.moduleEnd;
    if (head.indexOf("bootstrap-select") < 0) {
        head += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">' + newLine;
        end += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>' + newLine;
        end += `<script>$(function () {$('${elem}').selectpicker();});</script>${newLine}`;
    }
    res.locals.moduleHead = head;
    res.locals.moduleEnd = end;
};

module.exports = m;
