/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <dual-view-container>
            <router-view></router-view>
        </dual-view-container>
    </div>
</template>

<script>
import { vuexApiCallMixin } from "vuex-api";
import DualViewContainer from "../ui/dual-view-container";
import AppStatus from "./AppStatus";
export default {
  name: "CustomDemo",
  components: { AppStatus, DualViewContainer },
  mixins: [vuexApiCallMixin],
  created: function() {
    this.vuexApiCall({
      baseURL: process.env.VUE_APP_API_URL,
      url: "/api/posts",
      keyPath: "posts"
    });
  }
};
</script>
