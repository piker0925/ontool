import {createRouter, createWebHistory} from 'vue-router'
import HomePage from '../pages/HomePage.vue'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', component: HomePage},
        {path: '/tools/:moduleId', component: () => import('../pages/ToolPage.vue')},
        {path: '/admin', component: () => import('../pages/AdminPage.vue')},
    ],
})
