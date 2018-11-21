/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <custom-demo-nav/>
        <main-container>
            <div class="v-container">
                <form @submit.prevent="login">
                    <div class="field">
                        <label class="label">Email</label>
                        <div class="control has-icons-left has-icons-right">
                            <input class="input" v-model="email" type="email" placeholder="Email" value="">
                            <span class="icon is-small is-left">
                              <i class="fas fa-envelope"></i>
                            </span>
                        </div>
                    </div>
                    <div class="field">
                        <label class="label">Password</label>
                        <div class="control has-icons-left has-icons-right">
                            <input class="input" v-model="password" type="password" placeholder="Password" value="">
                            <span class="icon is-small is-left">
                              <i class="fas fa-key"></i>
                            </span>
                        </div>
                    </div>
                    <button class="button">login</button>
                <article v-if="loginFailed" class="message is-danger">
                    <div class="message-body">
                        Login failed.
                    </div>
                </article>
                </form>
            </div>
        </main-container>
    </div>
</template>

<style scoped>
.v-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 400px;
}
</style>

<script>
import { hoc, vuexApiCallMixin } from "vuex-api";
import ConnectedPost from "../../components/connectedPost/index";
import MainContainer from "../../ui/main-container";
import CustomDemoNav from "../custom-demo-nav";
export default {
  name: "ResetPassword",
  mixins: [vuexApiCallMixin],
  components: { CustomDemoNav, MainContainer, ConnectedPost, hoc },
  data() {
    return {
      email: "admin@admin.com",
      password: "admin",
      loginFailed: false
    };
  },
  methods: {
    login() {
      console.log(process.env.NODE_ENV);
      this.loginFailed = false;
      this.vuexApiCall({
        baseURL: process.env.VUE_APP_API_URL,
        method: "POST",
        url: "/api/login",
        keyPath: ["login"],
        data: { email: this.email, password: this.password }
      })
        .catch(e => (this.loginFailed = true))
        .then(resp => {
          this.vuexApiCall({
            baseURL: "http://localhost:8000",
            method: "GET",
            url: "/api/user/me",
            keyPath: ["me"],
            headers: { Authorization: `Bearer ${resp.data.token}` }
          });
        })
        .then(() => this.$router.replace("/"));
    }
  }
};
</script>
