"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const Sidebar_1 = require("./components/Sidebar");
const Chat_1 = require("./pages/Chat");
const NewsList_1 = require("./pages/NewsList");
const NewsEdit_1 = require("./pages/NewsEdit");
const Login_1 = require("./pages/Login");
const Register_1 = require("./pages/Register");
const Settings_1 = require("./pages/Settings");
const Config_1 = require("./pages/Config");
const auth_1 = require("./lib/auth");
function App() {
    const [authenticated, setAuthenticated] = (0, react_1.useState)(() => (0, auth_1.isAuthenticated)());
    (0, react_1.useEffect)(() => {
        return (0, auth_1.subscribeToAuthChange)(() => {
            setAuthenticated((0, auth_1.isAuthenticated)());
        });
    }, []);
    if (!authenticated) {
        return ((0, jsx_runtime_1.jsx)(react_router_dom_1.BrowserRouter, { children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Routes, { children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/login", element: (0, jsx_runtime_1.jsx)(Login_1.Login, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/register", element: (0, jsx_runtime_1.jsx)(Register_1.Register, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "*", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/login", replace: true }) })] }) }));
    }
    return ((0, jsx_runtime_1.jsx)(react_router_dom_1.BrowserRouter, { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex h-screen bg-gray-50", children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, {}), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 flex flex-col overflow-hidden", children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Routes, { children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/chat", replace: true }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/chat", element: (0, jsx_runtime_1.jsx)(Chat_1.Chat, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/news", element: (0, jsx_runtime_1.jsx)(NewsList_1.NewsList, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/news/edit/:id?", element: (0, jsx_runtime_1.jsx)(NewsEdit_1.NewsEdit, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/settings", element: (0, jsx_runtime_1.jsx)(Settings_1.Settings, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/config", element: (0, jsx_runtime_1.jsx)(Config_1.Config, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/login", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/chat", replace: true }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/register", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/chat", replace: true }) })] }) })] }) }));
}
exports.default = App;
