import Vue from "vue";
import Router from "vue-router";
import CustomDemoPostList from "./views/post-list/post-list";
import SideHelperWelcome from "./views/side-welcome";

import CustomDemoPost from "./views/post/post";
import SideHelperPostById from "./views/post/side-post";

import ResetPassword from "./views/reset-password/reset-password";
import SideResetPassword from "./views/reset-password/side-reset-password";

import Login from "./views/login/login";
import SideLogin from "./views/login/side-login";

Vue.use(Router);

export default new Router({
  mode: "history",
  routes: [
    {
      path: "/",
      name: "customDemo",
      components: { default: CustomDemoPostList, side: SideHelperWelcome }
    },
    {
      path: "/login",
      name: "login",
      components: { default: Login, side: SideLogin }
    },
    {
      path: "/post/:postId",
      components: { default: CustomDemoPost, side: SideHelperPostById }
    },
    {
      path: "/reset-password/",
      name: "reset-password",
      components: { default: ResetPassword, side: SideResetPassword }
    }
  ]
});
