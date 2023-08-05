const {Pool} = require('pg');
const config = require('dotenv').config();
const Util = require('./Util');

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
});


const connection = {};

connection.query = async(string, arr) => {
    try {
        /*console.log(string);
        console.log(JSON.stringify(arr))*/
        const result = await pool.query(string, arr);
        return result.rows;
    } catch (e) {
        console.log(string);
        console.log(e)
    }
};

const orderByFn = (obj) => {
    const objOrderby = !obj.orderBy ? [] : obj.orderBy;
    let orderBy = "";
    if(objOrderby.length) {
        orderBy = ` ORDER BY  `;
        for(var i =0; i < objOrderby.length; i++) {
            if(i%2==0) {
                orderBy += ` "${obj.orderBy[i]}" `
            } else {
                orderBy += ` ${obj.orderBy[i]} `;
                if(i == (objOrderby.length -1)) {
                    orderBy += ` `
                } else {
                    orderBy += `, `
                }
            }
        }
    }

    return orderBy;
};

const whereFn = (obj) => {
    const where = obj.where || {};
    //[{field:"your_field",option:"=>",value:"12",operator:"AND",isJSON : false}]
    const whereArray = obj.whereArray || [];
    let increment = 1;
    let arr = [], wherequery = [];
    for (const key in where) {
        wherequery.push(key.indexOf(".") > -1 ? ` ${key} = $${increment} ` : ` "${key}" = $${increment}`);
        arr.push(where[key]);
        increment++;
    }
    wherequery = arr.length ? wherequery.join(" AND ") : "";
    if (whereArray.length) {
        let andOr = wherequery ? " AND " : "";
        whereArray.forEach((item, index) => {
            if (index > 0) andOr = "";
            let operator = !item.operator ? " AND " : item.operator;
            if(index == (whereArray.length - 1))
                operator = "";
            const field = item.field.indexOf(".") > -1 ? item.field : ` "${item.field}" `;
            //is JSON is field is JSON
            //JSON_CONTAINS(color, '"Red"' ,'$')
            if (item.isJSON) {
                wherequery += andOr + ` JSON_CONTAINS(${field}, '"${item.value}"' ,'$')  ${operator}`
            } else {
                wherequery += `${andOr} ${field} ${item.option} $${increment} ${operator}`;
                let itemValue = item.value;
                if(item.option == "="){
                    itemValue = Util.replaceAll(itemValue,"%","");
                }
                arr.push(itemValue);
            }
            increment++;
        });
        //console.log(arr)
    }
    const wheres = arr.length ? `WHERE ${wherequery}` : "";
    return {
        where : wheres,
        arr : arr,
        increment : increment
    };
};

connection.results = async(obj) => {
    const select = obj.select || "*";
    const table = obj.table || "";
    //[{field:"your_field",option:"=>",value:"12",operator:"AND",isJSON : false}]
    const statement = obj.statement || "";
    const limit = obj.limit ? ` LIMIT ${obj.limit} ` : "";
    const offset = obj.hasOwnProperty("offset") ? ` OFFSET ${obj.offset} ` : obj.limit ? "OFFSET 0" : "";
    const orderBy = orderByFn(obj);
    const values = obj.values || [];
    const objJoin = obj.joins || [];
    let join = '';
    if (objJoin.length) {
        join = objJoin.join(" ");
    }
    const whereObj = whereFn(obj);
    const wheres = whereObj.where;
    const arr = whereObj.arr;
    const sql = `SELECT ${select} FROM  "${table}" ${join} ${wheres} ${statement} ${orderBy} ${limit}  ${offset}`;
    /*console.log(sql)
    console.log(arr);*/
    try {
        const result = await pool.query(sql, arr.length ? arr : values.length ? values : null);
        return !result.rows ? [] : result.rows;
    } catch (e) {
        console.log(sql);
        console.log(arr);
        console.log(e.toString());
    }
};

connection.result = async(obj) => {
    const results = await connection.results(obj);
    if(results.length){
        return results[0];
    } else {
        return [];
    }
};

connection.insert = async(obj) => {
    let result;
    const table = obj.table;
    const data = obj.data;
    let increment = 1;
    const datas = [];
    const values = [];
    const arr = [];
    for (const key in data) {
        datas.push(key);
        values.push(`$${increment}`)
        arr.push(data[key]);
        increment++;
    }
    const sql = `INSERT INTO "${table}" ("${datas.join('","')}")  VALUES (${values.join(",")})  RETURNING *`;
    /* console.log("ON INSERT " + sql)
     console.log(arr)
 */

    try {
        const results = await pool.query(sql, arr);
        return results.rows[0];
    } catch (e) {
        console.log(sql);
        console.log(arr);
        console.log(e.toString());
        throw e;
    }
};

connection.update = async(obj) => {
    const table = obj.table;
    const data = obj.data;
    const where = obj.where || {}
    //[{field:"your_field",option:"=>",value:"12",operator:"AND"}]
    let whereArray = obj.whereArray || [];
    const arr = [],  dataArr = [];
    let wherequery = [];
    let increment = 1;
    for (let key in data) {
        dataArr.push(` "${key}" = $${increment}`)
        arr.push(data[key])
        increment++;
    }
    for (var key in where) {
        wherequery.push(` "${key}" =  $${increment}`);
        arr.push(where[key]);
        increment++;
    }
    wherequery = arr.length ? wherequery.join(" AND ") : "";
    if (whereArray.length) {
        let andOr = wherequery ? " AND " : "";
        whereArray.forEach((item, index) => {
            if (index > 0)
                andOr = "";
            const operator = !item.operator ? " AND " : item.operator;
            const field = item.field.indexOf(".") > -1 ? item.field : `"${item.field}"`;
            wherequery += `${andOr} ${field} ${item.option} $${increment} ${operator}`;
            arr.push(item.value);
            increment++;
        });
        wherequery = wherequery.slice(0, -5);
    }
    const wheres = arr.length ? " WHERE " + wherequery : "";
    const sql = `UPDATE "${table}" SET ${dataArr.join(", ")} ${wheres} RETURNING *`;
    /* console.log(sql);
      console.log(arr);*/
    try {
        const result = await pool.query(sql, arr);
        return result.rows[0];
    } catch (e) {
        console.log(sql);
        console.log(arr);
        console.log(e.toString());
        throw e;
    }
};

connection.delete = async(obj) => {
    const table = obj.table;
    const where = obj.where || {}
    let arr = [], wherequery = [];
    let increment = 1;
    for (const key in where) {
        wherequery.push(` "${key}" = $${increment}`);
        arr.push(where[key]);
        increment++;
    }
    wherequery = arr.length ? wherequery.join(" AND ") : "";
    const wheres = arr.length ? " WHERE " + wherequery : "";
    const sql = `DELETE FROM "${table}" ${wheres}`
    /*console.log(sql);
    console.log(arr)*/
    try {
        return await pool.query(sql, arr);
    } catch (e) {
        console.log(sql);
        console.log(arr);
        console.log(e.toString());
        throw e;
    }
}

connection.driver = config.driver;
connection.showTables = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'";
connection.showFullFields = (tableRelations) => {
    return `SELECT 
                 column_name AS "Field",  concat(data_type,'(',character_maximum_length,')') AS "Type" , is_nullable AS "Null"
                FROM
                 information_schema.COLUMNS
                WHERE
                 TABLE_NAME = '${tableRelations}';`
}

connection.describeTable = (table) => {
    return connection.showFullFields(table);
}

connection.showComments = (table) => {
    return ` SELECT c.table_schema,c.table_name,c.column_name as "COLUMN_NAME",pgd.description as "COLUMN_COMMENT"
                FROM pg_catalog.pg_statio_all_tables as st
                  inner join pg_catalog.pg_description pgd on (pgd.objoid=st.relid)
                  inner join information_schema.columns c on (pgd.objsubid=c.ordinal_position
                    and  c.table_schema=st.schemaname and c.table_name=st.relname)
                WHERE c.table_name = '${table}' ORDER BY c.column_name`;
}

connection.showFields = (table) => {
    return `
        SELECT
            tc.table_name AS "TABLE_NAME", 
            kcu.column_name AS "COLUMN_NAME", 
            tc.constraint_name AS "CONSTRAINT_NAME", 
            ccu.table_name AS "REFERENCED_TABLE_NAME",
            ccu.column_name AS "REFERENCED_COLUMN_NAME",
            tc.table_schema
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='${table}';`;
}

//list constraint list
connection.constraintList = (table, schema = "public") => {
    return `
	SELECT con.*
       FROM pg_catalog.pg_constraint con
            INNER JOIN pg_catalog.pg_class rel
                       ON rel.oid = con.conrelid
            INNER JOIN pg_catalog.pg_namespace nsp
                       ON nsp.oid = connamespace
       WHERE nsp.nspname = '${schema}' AND rel.relname = '${table}'; `;

}

var toNumber = function (num) {
    num = num + "";
    var t = replaceAll(num, ".", "");
    if (t) {
        return parseFloat(t);
    } else return 0;
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}


module.exports = connection;
