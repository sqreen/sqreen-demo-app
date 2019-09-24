<template>
    <div>
        <button @click="launchRequest">Scan</button>
        <button v-if="!stopScan" @click="stopScan = true">Stop Scan</button>
        <h5>Scanned paths - {{completionPercentage}}/100 %</h5>
        <p>Successfully scanned paths  ({{errors.length + success.length}}) - ({{success.length}})</p>
        <div class="routes-container">
            <div class="green" v-for="route in success" :key="route">{{route}}</div>
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
import scanRoutes from "../data/scan-routes-2";
export default {
  name: "network-scanner",
  props: { url: String, until: Number },
  data() {
    return {
      success: [],
      errors: [],
      stopScan: false
    };
  },
  computed: {
    completionPercentage() {
      return parseInt(
        ((this.success.length + this.errors.length) / scanRoutes.length) * 100
      );
    }
  },
  methods: {
    launchRequest: async function() {
      for (const route of scanRoutes) {
        if (this.stopScan) {
          break;
        }
        try {
          await axios({
            baseURL: process.env.VUE_APP_API_URL,
            url: route
          });
          this.success.unshift(route);
        } catch (e) {
          this.errors.unshift(route);
        }
      }
    }
  }
};
</script>
