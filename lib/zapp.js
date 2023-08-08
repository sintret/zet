module.exports = (req,res,next) => {
  res.locals.renderHead = "";
  res.locals.renderBody = "";
  res.locals.renderEnd = "";
  res.locals.headHTML = '';
  res.locals.bodyHTML = '';
  res.locals.endHTML = '';
  res.locals.titleApp = process.env.APP_TITLE;
  res.locals.descriptionApp = process.env.APP_DESCRIPTION;
  res.locals.moduleHead = "";
  res.locals.relationsVariable = "";
  res.locals.moduleEnd = "";
  res.locals.menuApp = "home";
  res.locals.routeName = "index";
  res.locals.userId = -1;
  res.locals.csrfToken = "";
  res.locals.roleId = 0;
  res.locals.token = "guest";
  res.locals.companyId = 0;
  res.locals.userId = 0;
  res.locals.userAvatar = "/img/user.png";
  res.locals.zuser = {
    fullname: 'test'
  };
  res.locals.frameworkcss = "bootstrap5";
  res.locals.startup = 0;
  global.frameworkcss = "bootstrap5";
  global.LANGUAGE = require('./languages/lang_en');
  res.locals.socketUrl = process.env.APP_URL;
  res.locals.zcompanies = [];
  res.locals.isLogin = false;
  res.locals.objectStores = {};
  if (req.session) {
    let reqSession = req.session;
    if (reqSession.hasOwnProperty('user')) {
      const tUser = req.session.user;
      if (tUser && Object.prototype.hasOwnProperty.call(tUser, "id")) {
        res.locals.isLogin = true;
        res.locals.token = tUser.token;
        res.locals.roleId = tUser.role_id;
        res.locals.isLogin = true;
        res.locals.zuser = tUser;
        res.locals.userId = tUser.id;
        res.locals.companyId = tUser.company.id;
        res.locals.userAvatar = tUser.image ? tUser.image.indexOf("http") > -1 ? tUser.image : "/uploads/zuser/" + tUser.image : "/img/user.png";
        res.locals.zcompanies = tUser.companies;
        if(tUser.language){
          let objLanguage = {
            1 : "lang_en",
            2 : "lang_id",
            3 : "lang_jp",
            4 : "lang_fr"
          };
          global.LANGUAGE = require(`./languages/${objLanguage[tUser.language]}`);
        }
        global.layout = "two";
      }
    }
  }
  global.COMPANY_ID = res.locals.companyId;
  global.USER_ID = res.locals.userId;
  res.locals.LANGUAGE = global.LANGUAGE;

  next();
};
