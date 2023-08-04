module.exports = (req, res, next) => {

    function menu0() {
        function mainMenu(obj) {
            let html = "", span = "", dropdown = "", test = "";
            const parent = (obj, classname = "") => {
                let href = obj.href ? "/" + obj.href : "#";
                let hassub = "", sidebarlink = "", aClass = "", span = obj.text;
                if (obj.hasOwnProperty("children")) {
                    hassub = "has-sub";
                    sidebarlink = "sidebar-link";
                    aClass = `class="${sidebarlink}"`;
                    span = `<span>${obj.text}</span>`;
                }
                let html = '';
                let icon = obj.icon ? obj.icon.replace('tabler-', '') : '';
                let aicon = '';
                if(icon && icon != "empty"){
                    aicon = icon ? `<img src="/assets/icons/${icon}.svg" class="tabler-icons icons-black-color" >` : `<i class="${obj.icon}"></i>`;
                }
                html += `<li class="${classname}">
                    <a href="${href}" ${aClass} >
                    ${aicon}
                    ${span}
                    </a>`;
                if (hassub != "") {
                    html += child(obj.children);
                }
                html += `</li>`;

                return html;
            };

            const child = (arr) => {
                let html = '<div class="submenu"><ul>';
                arr.map((item) => {
                    html += parent(item, "submenu-item");
                });
                html += `</ul></div>`;
                return html;
            };
            let arr = obj.items;
            html += `<ul class="main-menu">`;
            arr.map((item) => {
                let classname = "";
                if (item.hasOwnProperty("children")) {
                    classname = "has-submenu ";
                } else {
                    classname = "";
                }
                html += parent(item, classname);
            });
            html += `</ul>`;
            return html;
        }

        const html = mainMenu({items: res.locals.MENU_ALL, options: {class: "sidebar-nav"}});
        res.locals.menu_vertical = html;
    }
    menu0();
    next();
};
