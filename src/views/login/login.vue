/**
* Created by vouill on 8/20/18.
*/

<template>
  <div>
    <custom-demo-nav/>
    <main-container class="v-container">
      <h2>Login</h2>
      <article v-if="loginFailed" class="message is-danger">
        <div class="message-body">Login failed.</div>
      </article>
      <form @submit.prevent="login" class="form">
        <label>
          Email
          <input v-model="email" type="email" placeholder="Email" value="">
        </label>
        <label>
          Password
          <input v-model="password" type="password" placeholder="Password" value="">
        </label>
        <button class="button">login</button>
        <span class="pwd">Forgot your password?</span>
      </form>
    </main-container>
  </div>
</template>

<style lang="scss" scoped>
.message {
  max-width: 500px;
  margin: 0 auto 20px;
}

.v-container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
}

h2 {
  font-size: 34px;
  font-weight: 500;
  letter-spacing: -0.45px;
  text-align: center;
  color: #333;
  display: block;
  margin: 40px auto 70px;
}

.form {
  background-color: #f7f7f7;
  padding: 50px 74px;
  max-width: 500px;
  margin: 0 auto;

  label {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 15px;
    display: block;

    input {
      border: solid 1px #d3d3d3;
      background-color: white;
      display: block;
      padding: 10px;
      margin-top: 10px;
      width: 100%;
      font-size: 16px;
      font-weight: 400;
    }
  }

  .button {
    height: 53px;
    border-radius: 3px;
    background-color: #ff5a6e;
    display: inline-block;
    line-height: 53px;
    padding: 0 40px;
    color: #fff;
    text-transform: uppercase;
    font-weight: 900;
    font-size: 18px;
    border: none;
    width: 100%;
    margin-top: 20px;
  }

  .pwd {
    font-size: 16px;
    font-weight: 500;
    font-style: normal;
    font-stretch: normal;
    line-height: normal;
    letter-spacing: normal;
    color: #787878;
    display: block;
    margin-top: 10px;
  }
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
      email: "foo@bar.baz",
      password: "19841984",
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
