/**
* Created by vouill on 11/14/18.
*/

<template>
    <div :class="{red: !hasSqreen, success: hasSqreen}">
        {{hasSqreen  ? 'Sqreen detected' : null }}
    </div>
</template>

<style scoped>
.red {
  background-color: indianred;
}
.success {
  background-color: palegreen;
}
</style>

<script>
import axios from "axios";
export default {
  name: "AppStatus",
  props: {},
  data() {
    return {
      apiState: "",
      hasSqreen: false
    };
  },
  components: {},
  mounted() {
    axios({
      baseURL: process.env.VUE_APP_API_URL,
      url: "/api/ping",
      method: "POST"
    })
      .then(resp => {
        this.hasSqreen = !!resp.headers["x-protected-by"];
        this.apiState = "success";
      })
      .catch(err => {
        console.log(err.response);
        this.apiState = "error";
      });
  }
};
</script>
