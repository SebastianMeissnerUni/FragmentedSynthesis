import { createRouter, createWebHistory } from "vue-router";

import LoginPage from "../views/LoginPage.vue";
import LoginSuccessPage from "../views/LoginSuccessPage.vue";
import MainPage from "../views/MainPage.vue";
import Profile from "../views/Profile.vue";

const routes = [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginPage },
    { path: "/login-success", name: "login-success", component: LoginSuccessPage },
    { path: "/main", name: "main", component: MainPage },
    { path: "/profile", name: "profile", component: Profile }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
