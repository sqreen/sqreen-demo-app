<template>
    <div>
        <button @click="launchRequest">Crawl</button>
        <p>Successfully crawled article: {{success}}</p>
        <p>Errors: {{error}}</p>
    </div>
</template>
<script>
import axios from "axios";
export default {
  name: "network-request-performer",
  props: { url: String, until: Number },
  data() {
    return {
      id: 0,
      success: 0,
      error: 0,
      intervalId: ""
    };
  },
  methods: {
    stopCrawl() {
      clearInterval(this.intervalId);
    },
    launchRequest() {
      this.id = 0;
      this.success = 0;
      this.error = 0;
      this.intervalId = setInterval(() => {
        axios({
          baseURL: process.env.VUE_APP_API_URL,
          url: `api/${this.url.replace(":id", this.id)}`
        })
          .then(() => {
            this.success = this.success + 1;
          })
          .catch(() => {
            this.error = this.error + 1;
          });
        this.id = this.id + 1;
      }, 1000);
    }
  }
};
</script>
