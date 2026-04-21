import { createRouter, createWebHistory } from "vue-router";
import Profile from "../views/Profile.vue";
import StartupPanelContent from "../Panels/StartupPanelContent.vue";

const routes = [
    { path: "/", name: "home", component: StartupPanelContent },
    { path: "/profile", name: "profile", component: Profile }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
