import Vue from "vue";
import Vuex from "vuex";
import vuexApi from "vuex-api";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  getters: {
    authenticatedEmail: state =>
      state.vuexApi.me &&
      state.vuexApi.me.resp &&
      state.vuexApi.me.resp.data.EMAIL
  },
  modules: {
    vuexApi
  }
});
