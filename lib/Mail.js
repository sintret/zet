const nodemailer = require('nodemailer');
const ejs = require('ejs');
const Util = require('./Util');
const debug = require("./debug");
const io = require("./io");
const moment = require("moment")
const config = require('dotenv').config();
const dirRoot = process.env.dirRoot;

const MAIL = {};
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let mailOptions = {
    from : 'sintret@gmail.com',
    to : 'sintret@gmail.com',
    subject : 'haii subject',
    text : 'hi text',
    html : '<p>hi text</p>'
};

MAIL.gmailTransporter = (user, pass) => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });
};

MAIL.send = function (options, transporter = null) {
    let option = Object.assign(mailOptions, options);
    // send mail with defined transport object
    option.user = option.user || 'aptiwise@gmail.com';
    option.pass = option.pass || 'bjyoflszgblenlep';
    transporter = transporter || MAIL.gmailTransporter(option.user,option.pass);
    transporter.sendMail(options, function (error, info) {
        if (error) {
            return console.log(error);
        }
        return `Message sent: ${info.response}`;
    });
};


MAIL.forgotPassword = (datas,options) => {
    ejs.renderFile(`${dirRoot}/views/layouts/email/forgot_password.ejs`, {data:datas,Util:Util }, function (err, data) {
        let option = Object.assign(mailOptions, options);
        option.html = data;
        if (err) {
            console.log(err);
        } else {
            MAIL.send(option)
        }
    });
};

MAIL.register = (datas, options) => {
    ejs.renderFile(`${dirRoot}/views/layouts/email/register.ejs`, {data:datas,Util:Util }, function (err, data) {
        let option = Object.assign(mailOptions, options);
        option.html = data;
        if (err) {
            console.log(err);
        } else {
            MAIL.send(option)
        }
    });
};

module.exports = MAIL;
