/**
 * For debug code
 */
const io = require("./io");
const connection = require("./connection");

module.exports = (req, res, err) => {
        let post = {
            table: res.locals.routeName || "",
            company_id: res.locals.companyId,
            route: res.locals.routeName || "",
            description : err.toString(),
            created_by : res.locals.userId
        };
        connection.insert({
            table : "zerror",
            data : post
        });
        setTimeout(function () {
            io.to(res.locals.token).emit("error", err.toString());
        },1000);
};
