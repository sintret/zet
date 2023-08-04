const moment = require('moment');
const path = require('path');
const randomstring = require("randomstring");
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const sha256 = require('js-sha256');

const Util = {}

Util.tab = '\t';
Util.tabs = (n) => {
    let ret = '';
    for (var i = 0; i < n; i++) {
        ret += Util.tab;
    }
    return ret;
};

Util.NEW_LINE = '\n';
Util.newLine = '\r\n';
Util.newLines = (n) => {
    let ret = '';
    for (var i = 0; i < n; i++) {
        ret += Util.newLine;
    }
    return ret;
};

//sha256
Util.hash = (string) => {
    return sha256(string);
};

Util.hashCompare = (myPlaintextPassword, hash) => {
    return Util.hash(myPlaintextPassword) == hash;
};

Util.excelSequence = function () {
    let abjads = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    let arr = abjads;
    let char = 0;
    let num = 26;
    for (let x = 2; x < 15; x++) {
        let idx = 0;
        for (let i = 1; i <= 26; i++) {
            arr[num] = abjads[char] + abjads[idx];
            idx++;
            num++;
        }
        char++;
    }

    return arr;
};

Util.now = function () {
    return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
};

Util.nowShort = function () {
    return moment(new Date()).format("YYYY-MM-DD");
};

Util.ago = (data) => {
    return moment(data).fromNow();
};
/*
 moment get one month ago from current
 var monthago = moment().subtract(1, 'months').format('YYYY-MM-DD');

 */

Util.dateSql = function (date, format) {
    format = format || "YYYY-MM-DD";
    if (date && date != "0000-00-00")
        return moment(date).format(format);
    else
        return '';
};

Util.dateFormat = function (date, format) {
    format = format || "YYYY-MM-DD";
    if (date && date != "0000-00-00")
        return moment(date).format(format);
    else
        return '';
};

Util.timePublic = function (date) {
    if (date)
        return moment(date).format("DD MMM YYYY");
    else
        return '';
};

Util.timeSql = function (date, format) {
    if (date && date != "0000-00-00 00:00:00"){
        format = format || "YYYY-MM-DD HH:mm:ss";
        return moment(date).format(format);
    }
    else
        return '';
};

Util.getDate = function (date) {
    date = date + "" || "";
    if (date != "") {
        let explode = date.split("-");
        return {
            year: parseInt(explode[0]),
            month: parseInt(explode[1]),
            date: parseInt(explode[2]),
        }
    } else {
        return {
            year: 0,
            month: 0,
            date: 0
        }
    }
};

Util.dateIsBetween = (compare, start, end) => {
    if (compare == "" || compare == "0000-00-00") {
        return false;
    }
    compare = moment(compare).format("YYYY-MM-DD");
    start = moment(start).format("YYYY-MM-DD");
    end = moment(end).format("YYYY-MM-DD");
    let today = moment(compare);
    let startDate = moment(start);
    let endDate = moment(end);

    if (compare == start) {
        return true;
    } else if (compare == end) {
        return true;
    } else {
        return today.isBetween(startDate, endDate);
    }
};

Util.getMonth = function (date) {
    if (date.length > 5) {
        let n = new Date(date)
        let m = n.getMonth();
        return parseInt(m) + 1;
    }
    return 0;
};

Util.getYear = function (date) {
    date = Util.dateSql(date) || "";
    return date.slice(0, 4);
};

//first is smaller than second
Util.calculateDay = function (from, to, holidayInWeek = 0) {
    holidayInWeek = parseInt(holidayInWeek) || 0;
    let count = 0;
    if (holidayInWeek == 1) {
        let days = Util.enumerateDaysBetweenDates(moment(from).format("YYYY-MM-DD"), moment(to).format("YYYY-MM-DD"));
        let countdays = days.filter((item) => parseInt(moment(item).format("d")) != 0);
        count = countdays.length;
    } else if (holidayInWeek == 2) {
        let days = Util.enumerateDaysBetweenDates(moment(from).format("YYYY-MM-DD"), moment(to).format("YYYY-MM-DD"));
        let countdays = days.filter((item) => parseInt(moment(item).format("d")) != 0 && parseInt(moment(item).format("d")) != 6);
        count = countdays.length;
    } else {
        let a = moment(from);
        let b = moment(to);
        count = b.diff(a, 'days') + 1;
    }

    return count;
};

var getDaysBetweenDates = function (startDate, endDate) {
    let now = startDate.clone(), dates = [];
    while (now.isSameOrBefore(endDate)) {
        dates.push(now.format('MM/DD/YYYY'));
        now.add(1, 'days');
    }
    return dates;
};

//itterate days in array
Util.enumerateDaysBetweenDates = function (startDate, endDate) {
    let now = moment(startDate).clone(), dates = [];
    while (now.isSameOrBefore(endDate)) {
        dates.push(now.format('MM/DD/YYYY'));
        now.add(1, 'days');
    }
    return dates;
};

Util.tableArray = function (arr) {
    let r = [];
    let tables = arr[0];
    for (let i = 0; i < tables.length; i++) {
        for (let obj in tables[i]) {
            r.push(tables[i][obj]);
        }
    }
    return r;
};

/*
 table array in sql to arr table name
 only for generator
 */
Util.tableArrayToObj = (arr) => {
    return arr.map(m => Object.values(m)[0]);
};

Util.escapeRegExp = function (str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

Util.validateEmail = function (email) {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};

/*
 Replace All like str_replace in PHP
 example : Util.replaceAll("abd","a","")
 */

Util.replaceAll = function (str, find, replace) {
    let t = ''
    if (Array.isArray(find)) {
        t = str;
        for (let i = 0; i < find.length; i++) {
            if (str.indexOf(find[i]) > -1) {
                t = str.replace(new RegExp(Util.escapeRegExp(find[i]), 'g'), replace);
                //console.log(t)
            }
        }
    } else {
        if(typeof str == "string") {
            t = str.replace(new RegExp(Util.escapeRegExp(find), 'g'), replace);
        }
    }
    return t;
};

Util.phoneFixed = function (str) {
    let ret = ''
    str = Util.replaceAll(str, ' ', '')
    let phone = str.trim()
    phone = Util.replaceAll(phone, '-', '')
    let first = phone.charAt(0)
    if (first == '') {
        ret = '';
    } else if (first == '+') {
        ret = phone;
    } else if (first == '0') {
        ret = '+62' + phone.replace('0', '');
    } else {
        ret = '+' + phone
    }

    return ret;
};

Util.jsonSuccess = function (message) {
    message = message || LANGUAGE.data_saved;
    let json = {type: 'success', status: 1, title: LANGUAGE.success, message: message}

    return json;
};

Util.flashError = function (message, errors) {
    errors = errors || [];
    message = message || LANGUAGE.data_not_found;
    let json = {type: 'error', status: 0, title: 'Error', message: message, errors: errors}

    return json;
};

Util.jsonError = function (path, message) {
    let json = {}
    json.errorLog = 1;
    json.type = 'error';
    json.status = 0;
    json.title = path + ' Error!';
    json.message = message;
    json.errors = [{path: path, message: message}]

    return json;
};

Util.arrayToObject = (array, keyField, isInteger = false) => {
    let obj = {}
    if(array.length) {
        array.forEach(function (item) {
            var name = item[keyField] == null ? 'xxxxxx' : item[keyField] == 'null' ? 'xxxxxx' : isInteger ? item[keyField] : item[keyField] + "";
            obj[name]=item
        });
    }
    return obj;
};

//chase id:1,name:'test' t0 {1:'test'}
Util.modulesSwitch = (arr) => {
    let stores = [];
    stores.push({id: '', name: ''});
    arr.forEach((ar, index) => {
        stores.push({id: index, name: ar})
    });
    return stores;
};


Util.buildArrayObjectPrefix = function (arr) {
    return Util.modulesSwitch(arr);
};

Util.arrayWithObject = (array, key, field) => {
    if(array.length) {
        return  array.reduce((obj, item) => {
            obj[item[key]] = item[field];
            return obj;
        }, {});
    }
};

/*
 for movedupload file using single file
 */
Util.moveFile = function (buffer, filename) {
    return new Promise(function (resolve, reject) {
        buffer.mv(filename, function (err) {
            if (err) {
                reject(err)
            } else {
                resolve(filename)
            }
        });
    });
};

Util.generateUnique = function (length, charset) {
    let random = Util.generate(length, charset);
    let uid = (new Date().valueOf()).toString(36)

    return uid + random;
};

Util.generate = function (length, charset) {
    length = length || 50;
    //alphanumeric - [0-9 a-z A-Z] alphabetic - [a-z A-Z] numeric - [0-9]  hex - [0-9 a-f] custom - any given characters
    charset = charset || "alphanumeric";
    return randomstring.generate({
        length: length,
        charset: charset
    });
};


Util.uuid = () => {
    return uuidv4();
};
/*
 generate random string 8
 */
Util.random = function (length) {
    length = length || 5;
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};

Util.whitelist = function () {
    return ['www', 'app', 'my', 'sintret', 'https', 'https'];
};

Util.convertDate = function (d) {
    d = d.trim()
    let myarr = d.split(" ");
    return myarr[2] + '-' + Util.monthConvert(myarr[1]) + '-' + myarr[0];
};

// get string start from to
Util.cut = function (text, start, end) {
    return text.substr(start, end)
};

Util.getFormattedDate = function (date) {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
    let day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
    let time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return year + '-' + month + '-' + day + ' ' + time;
};

Util.uniqueId = function () {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};

Util.typePaperSize = [
    {title: "F4", description: "FOLIO", width: 215, height: 330},
    {title: "LEGAL", description: "LEGAL", width: 216, height: 356},
    {title: "LETTER", description: "LETTER", width: 216, height: 279},
    {title: "A3", description: "A3", width: 297, height: 420},
    {title: "A4", description: "A4", width: 210, height: 297},
    {title: "A5", description: "A5", width: 148, height: 210},
    {title: "A6", description: "A6", width: 105, height: 148},
    {title: "A7", description: "A7", width: 74, height: 105},
    {title: "A8", description: "A8", width: 52, height: 74},
    {title: "A9", description: "A9", width: 37, height: 52},
    {title: "CUSTOM", description: "CUSTOM", width: 105, height: 148},
]

Util.typeFont = [
    'Verdana, Geneva, sans-serif',
    '"Times New Roman", Times, serif',
    'Georgia, serif',
    '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    'Arial, Helvetica, sans-serif',
    '"Arial Black", Gadget, sans-serif',
    '"Comic Sans MS", cursive, sans-serif',
    'Impact, Charcoal, sans-serif',
    '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
    'Tahoma, Geneva, sans-serif',
    '"Trebuchet MS", Helvetica, sans-serif',
    '"Courier New", Courier, monospace',
    '"Lucida Console", Monaco, monospace'
]

Util.objectToGridFormat = function (obj, isInteger) {
    isInteger = isInteger || false;
    let arr = []
    arr.push({id: '', name: ''});
    for (let keys in obj) {
        if (isInteger) {
            arr.push({id: parseInt(keys), name: obj[keys]})
        } else {
            arr.push({id: keys, name: obj[keys]})
        }
    }
    return arr;
}

Util.random = function (length) {
    length = length || 5;
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

Util.typePrint = {
    register: '{"paper_size":"F4","paper_size_width":"215","paper_size_height":"330","padding_top":"8","padding_right":"8","padding_bottom":"8","padding_left":"8","border":"1","font":"0","font_size":"10","header":"SURAT PERINTAH KERJA","header_font":"0","header_font_size":"26"}',
    estimation: '{"paper_size":"F4","paper_size_width":"215","paper_size_height":"330","padding_top":"8","padding_right":"8","padding_bottom":"8","padding_left":"8","border":"1","font":"0","font_size":"12","header":"ESTIMASI BIAYA PERBAIKAN","header_font":"0","header_font_size":"18"}',
    invoice: '{"paper_size":"A5","paper_size_width":"148","paper_size_height":"210","padding_top":"8","padding_right":"8","padding_bottom":"8","padding_left":"8","border":"1","font":"0","font_size":"12","header":"INVOICE","header_font":"0","header_font_size":"18"}',
    currency: '{"symbol":"Rp","name":"Rupiah","thousand":"."}'
};

Util.isJson = function (text) {
    if(text) {
        if (/^[\],:{}\s]*$/.test(text.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
            //the json is ok
            return true;
        } else {
            return false;
            //the json is not ok
        }
    }
    return false;
};

Util.isEmptyObject = function (obj) {
    for(let prop in obj) {
        if(Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false;
        }
    }

    return JSON.stringify(obj) === JSON.stringify({});
};

Util.serializeTable = function (table) {
    return '`' + table + '`';
};

Util.getKey = function (obj, field) {
    let t = '';
    for (let item in obj) {
        if (obj[item] == field) {
            return item;
        }
    }
    return t;
};

/**
 * Camelize a string, cutting the string by multiple separators like
 * hyphens, underscores and spaces.
 *
 * @param {text} string Text to camelize
 * @return string Camelized text
 *
 * // someDatabaseFieldName
 console.log(camelize("some_database_field_name"));

 // someLabelThatNeedsToBeCamelized
 console.log(camelize("Some label that needs to be camelized"));

 // someJavascriptProperty
 console.log(camelize("some-javascript-property"));

 // someMixedStringWithSpacesUnderscoresAndHyphens
 console.log(camelize("some-mixed_string with spaces_underscores-and-hyphens"));
 */
Util.camelize = function (text) {
    return text.replace(/^([A-Z])|[\s-_]+(\w)/g, function (match, p1, p2, offset) {
        if (p2) return p2.toUpperCase();
        return p1.toLowerCase();
    });
}

/**
 * Decamelizes a string with/without a custom separator (underscore by default).
 *
 * @param str String in camelcase
 * @param separator Separator for the new decamelized string.
 *
 * // some database field name (separate with an empty space)
 console.log(decamelize("someDatabaseFieldName", " "));

 // some-label-that-needs-to-be-camelized (separate with an hyphen)
 console.log(decamelize("someLabelThatNeedsToBeCamelized", "-"));

 // some_javascript_property (separate with underscore)
 console.log(decamelize("someJavascriptPraroperty", "_"));
 */
Util.decamelize = function (str, separator) {
    separator = typeof separator === 'undefined' ? '_' : separator;
    return str
        .replace(/([a-z\d])([A-Z])/g, '$1' + separator + '$2')
        .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + separator + '$2')
        .replace("_", separator)
        .toLowerCase();
}

/*
 change : Order Step
 to : order_tep
 */

Util.toName = function (str, separator) {
    if (str && str.length) {
        separator = separator || "_";
        str = str.trim();
        //add if first character is number with string character
        if(Util.isInteger(str.charAt(0))) {
            str = "a"+str;
        }
        let string = str.replace(/\s+/g, separator).toLowerCase();
        string = string.replace("/","");
        string = string.replace("/\/","");
        string = string.replace("__","_");
        return string.replace(/[^A-Za-z0-9/_]/g, "")
    }
}

/*
 change : orderStep
 to : Order Step
 */
Util.fieldToName = function (str) {
    let title = Util.capitalizeFirstLetter(Util.decamelize(str));
    title = Util.replaceAll(title, "_", " ");
    title = Util.replaceAll(title, " id", "");
    title = Util.capitalizeAfterSpace(title);

    const lastWords = Util.lastWord(title);
    if (title.length > 4 && lastWords == "Id") {
        title = title.replace("Id", "");
    }

    return title;
};

Util.capitalizeWord = (string) => {
    return string.split(" ").map(m => m[0].toUpperCase() + m.substr(1)).join(" ");
};

Util.capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

Util.asyncWrap = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    }
};

Util.capitalizeAfterSpace = function (str) {
    str = Util.replaceAll(str, "_", " ");
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
};

Util.capitalizeAfterSpaceTitle = function (str) {
    str = Util.replaceAll(str, " ", "_");
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
};

Util.lastWord = function (words) {
    let n = words.split(" ");
    return n[n.length - 1];
};

Util.arrayUnShift = function (arr) {
    let obj = {}
    obj[arr[0]] = '';
    obj[arr[1]] = '';
    return obj;
};

Util.in_array = function (needle, haystack) {
    haystack = haystack || [];
    if (haystack.length && needle) {
        return haystack.includes(needle);
    } else {
        return false;
    }
};

Util.gridSearch = function (visibles, relations, name, value) {
    let index = 0;
    let elm = "input";
    for (let i = 0; i < visibles.length; i++) {
        if (name == visibles[i]) {
            index = i;
        }
    }
    if (!Util.isEmptyObject(relations)) {
        let arr = Object.keys(relations)
        for (let i = 0; i < arr.length; i++) {
            if (name == arr[i]) {
                elm = "select";
            }
        }
    }
    return 'searchValue.eq(' + index + ').find("' + elm + '").val("' + value + '");';
};

Util.toNumber = function (num) {
    num = num+"";
    return parseFloat(Util.replaceAll(num,".",""));
};

Util.formatNumber = function (num, thousandSeparator='.') {
    num = num || "";
    let sep = "$1" + thousandSeparator;
    let numString = num.toString();
    if (numString.indexOf(".") > -1) {
        let explode = numString.split(".");
        return explode[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, sep) + "," + explode[1];
    } else {
        return numString.replace(/(\d)(?=(\d{3})+(?!\d))/g, sep);
    }
};

Util.dumpError = function (err) {
    if (typeof err === 'object') {
        if (err.message) {
            console.log('\nMessage: ' + err.message)
        }
        if (err.stack) {
            console.log('\nStacktrace:')
            console.log('====================')
            console.log(err.stack);
        }
    } else {
        console.log(err);
    }
};

Util.fileAttribute = function (filename) {
    filename = filename.toLowerCase() || "";
    let ext = filename.split('.').pop();
    let obj = {};
    obj.ext = ext;
    if (Util.in_array(ext, Util.fileImage)) {
        obj.type = 'image';
    } else {
        obj.type = 'file';
    }
    return obj;
};

Util.fileImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'gif', 'png','svg'];

Util.fileExtension = (filename) => {
    filename = filename.toLowerCase() || "";
    let obj = {}
    let ext = filename.split('.').pop();
    obj.ext=ext;
    if (Util.in_array(ext, Util.fileImage)) {
        obj.type = 'image';
    } else {
        obj.type = 'file';
    }
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
    obj.file = file;
    return obj;
};

Util.fileView = function (dir, file, attributes={}) {
    let filename = dir + file;
    let html = '';
    let width = attributes.hasOwnProperty('width') ? attributes.width : '300';
    let withIcon = attributes.hasOwnProperty('withIcon') ? true : false;
    let obj = Util.fileExtension(filename);
    let className = attributes.hasOwnProperty('class') ? ` class="${attributes.class}" ` : '';
    //console.log(JSON.stringify(obj))
    if(filename.includes('https')) {
        html = `<img src="${file}" ${className}  class="img-responsive">`
    } else {
        if (obj.type == 'image') {
            html = `<img src="${filename}" ${className} width="${width}px">`
        } else {
            if (file) {
                if(withIcon) {
                    html = `<img class="mb-3 boxy-small" src="/img/${obj.file}" height="45px" width="45px"><a class="text-success" target="_blank" href="${filename}"> ${file.substring(13)}</a>`;
                } else {
                    html = `<a class="text-success" target="_blank" href="${filename}"> ${file.substring(13)}</a>`;
                }
            }
        }
    }


    return html;
};
/// end files


Util.arrayDelete = function (arr, value) {
    return arr.filter((item)=> item != value);
};

Util.arrayDeletes = function (arr, array) {
    return arr.filter((item)=> !Util.in_array(item,array));
};

Util.arrayToList = function (arr, array, delimiter, isCount) {
    delimiter = delimiter || "<br>"
    isCount = isCount || 1;
    let html = '';
    if (arr) {
        for (var i = 0; i < arr.length; i++) {
            html += isCount == 1 ? (i + 1) + ". " + array[arr[i]] + delimiter : " " + array[arr[i]] + delimiter;
        }
        html = html.slice(0, (delimiter.length * -1))
    }

    return html;
};

Util.menuAccess = function (menu, params) {
    const roles = require('./role')
    const routes = roles.routes;
    if (Util.in_array(menu, routes)) {
        if (Util.in_array(menu, params))
            return true;
        else return false;

    } else {
        return true;
    }
};

Util.dropdownHelper = function (data, field, model) {
    let fieldsx = field + '[]';
    let name = field + "[]";
    let myvalue = typeof data[fieldsx] == undefined ? " " : typeof data[fieldsx] == "string" ? '["' + data[fieldsx] + '"]' : JSON.stringify(data[name])
    if (myvalue) {
        let unique = myvalue.indexOf("[") > -1 ? myvalue : !myvalue ? "" : '[' + myvalue + ']';
        unique = JSON.parse(unique);
        data[field] = JSON.stringify(unique.filter(Util.arrayUnique));
        delete data[name]
    }
    if (model.fields[field].required) {
        if (!data[field]) {
            return false;
        }
    }
    return data;
};

Util.dropdownAdd = function (data, field, model, datas) {
    let name = field + "[]";
    let myvalue = typeof datas == undefined ? " " : typeof datas == "string" ? '["' + datas + '"]' : JSON.stringify(datas)
    if (myvalue) {
        let unique = myvalue.indexOf("[") > -1 ? myvalue : !myvalue ? "" : '[' + myvalue + ']';
        unique = JSON.parse(unique);
        myvalue = JSON.stringify(unique.filter(Util.arrayUnique));
        delete data[name]

        data[field] = myvalue;
    }
    if (model.fields[field].required) {
        if (!myvalue) {
            return false;
        }
    }
    return data;
};
//array unique
// array.filter(Util.arrayUnique);
Util.arrayUnique = (value, index, self) => {
    return self.indexOf(value) == index;
};

Util.virtualHelper = function (obj) {
    if (Util.isEmptyObject(obj)) return;
    if (obj == undefined) return;

    var str = '';
    for (var key in obj) {
        str += ", `" + obj[key] + "` AS " + key;
    }

    return str;
};


Util.nots = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'created_at', 'updated_at', 'created_by', 'updated_by', 'modified_by', 'companyId', 'company_id'];

Util.requiredFields = function (obj) {
    var nots = Util.nots;
    var arr = [];
    for (var key in obj) {
        if (!Util.in_array(key, nots)) {
            if (obj[key].required == true) {
                arr.push(key)
            }
        }
    }
    return arr;
};

Util.extractDetails = function (obj) {
    let arr = [];
    for (let key in obj) {
        if (obj[key].length > 0) {
            for (var i = 0; i < obj[key].length; i++) {
                arr.push(obj[key][i])
            }
        }
    }
    return arr;
};

Util.arrayToConcat = function (arr) {
    let str = 'CONCAT(';
    for (let i = 0; i < arr.length; i++) {
        str += arr[i] + ',"  -  ",'
    }
    str = str.slice(0, -9);
    str += ")"

    return str;
};

//sequence all fields based on drag drop generator
Util.arraySequence = function (arr, left, right) {
    left = left || [];
    right = right || [];
    let obj = Util.arrayToObject(arr, "Field");
    let temp = [], stores = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].Field == "id") {
            stores.push(arr[i].Field)
            temp.push(arr[i])
        }
    }
    if (Array.isArray(left)) {
        for (let i = 0; i < left.length; i++) {
            if (i % 2 == 0) {
                temp.push(obj[left[i]])
                stores.push(left[i])
            }
        }
    }
    if (Array.isArray(right)) {
        for (let i = 0; i < right.length; i++) {
            if (i % 2 == 0) {
                temp.push(obj[right[i]])
                stores.push(right[i])
            }
        }
    }
    if (Array.isArray(left)) {
        for (let i = 0; i < left.length; i++) {
            if (i % 2 == 1) {
                temp.push(obj[left[i]])
                stores.push(left[i])
            }
        }
    }
    if (Array.isArray(right)) {
        for (let i = 0; i < right.length; i++) {
            if (i % 2 == 1) {
                temp.push(obj[right[i]])
                stores.push(right[i])
            }
        }
    }

    for (let i = 0; i < arr.length; i++) {
        const field = arr[i].Field;
        if (!Util.in_array(field, stores)) {
            temp.push(arr[i])
        }
    }

    return temp;
};

Util.isInteger = (value) => {
    return !isNaN(value) && (function (x) {
        return (x | 0) === x;
    })(parseFloat(value))
};

Util.isNumeric = function (value) {
    return /^-?\d+$/.test(value);
};

Util.tags = function (tags) {
    let html = '';
    tags = tags || "";
    if (tags.indexOf(",") > -1) {
        let explode = tags.split(",");
        for (var i = 0; i < explode.length; i++) {
            html += `<a href="#" rel="tag">${explode[i]}</a>`
        }
    } else {
        html += `<a href="#" rel="tag">${tags}</a>`;
    }

    return html;
};

/*
 get extension of filename
 */

Util.getExtensionFile = (str) => {
    str = str || "";
    let extension = str.split('.').pop();
    extension = extension.toLowerCase();
    let ret = extension;
    if (extension == "jpg") {
        ret = "jpeg";
    }
    return ret;
};

Util.badgeError = (msg) => {
    return `<span class="badge badge-danger">${msg}</span>`;
};

Util.badgeSuccess = (msg) => {
    return `<span class="badge badge-success">${msg}</span>`;
};

Util.alertError = function (msg) {
    return `<div class="alert alert-danger" role="alert">${msg}</div>`;
};

Util.alertSuccess = function (msg) {
    return `<div class="alert alert-success" role="alert">${msg}</div>`;
};

Util.alertInfo = function (msg) {
    return `<div class="alert alert-info" role="alert">${msg}</div>`;
};

Util.regexPassword = (lengthMin, lengthMax) => {
    //minimum length
    lengthMin = lengthMin || 6;
    lengthMax = lengthMax || 20;

    return new RegExp('^[a-zA-Z0-9_-]{' + lengthMin + ',' + lengthMax + '}$', "i");
};

//huruf dan angka saja
Util.regexCode = (lengthMin, lengthMax) => {
    lengthMin = lengthMin || 2;
    lengthMax = lengthMax || 10;

    return new RegExp('^[A-Z0-9]{' + lengthMin + ',' + lengthMax + '}$', "i");
};

Util.imageProfile = function (image) {
    return image ? image.indexOf("http") > -1 ? image : "/uploads/user/" + image : "/img/user.png";
};

/*
Files
 */
Util.readFile = function (filename) {
    try {
        if(Util.fileExist(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return data;
        }
    } catch (err) {
        console.error(err)
    }
    return ""

};
//check directory if not exist create or not return true/false
Util.dirExist = (dir, create = false) =>{
    try {
        if(create) {
            fs.ensureDir(dir, err => {
                console.log(err); // => null
            });
        }
        // check if directory exists
        if (fs.existsSync(dir)) {
            return true;
        }
    } catch (e) {
        console.log(e);
    }
    return false;
};

Util.fileExist = (filename) => {
    if (fs.existsSync(filename)) {
        return true;
    }
    return false;
};

Util.getAllFiles = (dir) => {
    let files = [];
    try {
        if(Util.dirExist(dir, true)) {
            files =  fs.readdirSync(dir);
        }
    } catch (e) {
        console.log('error',e.toString());
        return [];
    }
    return files;
};

Util.writeFile = (filename, content) => {
    try {
        let dir = require('path').dirname(filename);
        Util.dirExist(dir,true);
        fs.writeFileSync(filename, content);
        return true
    } catch (e) {
        console.log(e)
        return false
    }
};

Util.deleteAllFiles = (dir) => {
    try {
        fs.emptyDirSync(dir);
        return true
    } catch (e) {
        console.log(e)
        return false
    }
};

Util.findFilesName = (arr,filename) => {
    console.log(filename)
    arr = arr || [];
    return arr.filter((item) => item.includes(filename));
};

Util.getFiles = function (dir, token = "") {
    let arr = fs.readdirSync(dir);
    let folders = "";
    let files = "";
    arr.forEach(function (item) {
        if (item.indexOf(".") > -1) {
            var explode = dir.split("public/");
            var path = explode[1];
            var url = "/" + path + "/" + item;
            var extension = item.split('.').pop();
            files += ` <div class="folder data-file ui-draggable ui-draggable-handle ui-selectee" data-toggle="tooltip"  data-type="file" data-url="${url}" data-extension="${extension}"  data-name="${item}"   filename="${item}" data-original-title="${item}">
                            <img src="/assets/images/formats/file.png" class="img-responsive ui-selectee">
                            <p class="text-ellipsis ui-selectee">${item}</p>
                        </div>`;
        } else {
            console.log(dir);
            let explode = dir.split(token);
            console.log(token)
            let path = explode[1] || "";

            console.log(path)
            let state = "";
            if (path == "") {
                state = "/" + item;
            } else {
                state = path.replace(item, "") + "/" + item;
            }
            folders += `<div class="folder data-folder ui-draggable ui-draggable-handle ui-droppable ui-selectee" data-toggle="tooltip"  data-type="folder"  data-state="${state}" data-name="${item}"  data-original-title="${item}">
                <img src="/assets/images/folder.png" class="img-responsive ui-selectee">
                <p class="text-ellipsis ui-selectee">${item}</p>
                </div>`;
        }
    });

    return folders + files;
};

Util.ejsOpen = "<%- ";
Util.ejsStart = "<% ";
Util.ejsClose = " %>";
Util.ejsFunction = (yourCode, isStatement = false) => {
    const open = isStatement ? Util.ejsStart : Util.ejsOpen;
    return open + yourCode + Util.ejsClose;
};

Util.attributeOptions = (obj, defaultObj = {}) => {
    let html = '';
    let arr = Object.keys(defaultObj) || [];
    for (const key in obj) {
        let value = obj[key];
        if(defaultObj.hasOwnProperty(key)) {
            value = defaultObj[key] + obj[key];
            Util.arrayDelete(arr,key);
        }
        html += ` ${key}="${value}" `;
    }
    if(arr.length){
        arr.map(item => html += ` ${item}="${defaultObj[item]}" `)
    }
    return html;
};

Util.userAvatar = (img) => {
    return img ? img.includes("http") ? img : `/uploads/user/${img}` : `/img/user.png`;
};

/*
 MYSQL HELPER
 */

Util.selectMysql = (fields,relations={}) => {
    let obj = {}
    let arr = [];
    let virtuals = {};
    let virtualArray = [];
    if(relations.hasOwnProperty("zvirtuals")){
        virtuals = relations.zvirtuals;
        delete relations.zvirtuals;
        virtualArray = Object.keys(virtuals);
        virtualArray.forEach(function (item) {
            fields = Util.arrayDelete(fields,item);
        });
    }
    let selects = [];
    fields =  fields || [];
    fields.forEach(function (item) {
        if(item != "actionColumn") {
            if (item == "no") {
                selects.push("id");
            } else {
                selects.push(item);
            }
        }
    })
    //make sure id
    selects.push("id")
    let select =`"${selects.join('","')}"`;
    if(virtualArray.length) {
        for(let key in virtuals) {
            select += `, ${virtuals[key]} `;
        }
    }
    return select;
};

/*
Sorting array object with key name
 */
Util.sortArray = (arr,key) => {
    function compare( a, b ) {
        if ( a[key] < b[key] ){
            return -1;
        }
        if ( a[key] > b[key] ){
            return 1;
        }
        return 0;
    }
    return arr.sort(compare);
};

module.exports = Util;
