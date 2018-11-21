/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <custom-demo-nav/>
        <main-container>
            <hoc :keyPath="['post', $route.params.postId]">
                <template slot="success"><connected-post/></template>
            </hoc>
        </main-container>
    </div>
</template>

<script>
import { vuexApiCallMixin, hoc } from "vuex-api";
import ConnectedPost from "../../components/connectedPost/index";
import MainContainer from "../../ui/main-container";
import CustomDemoNav from "../custom-demo-nav";
export default {
  name: "CustomDemoPost",
  components: { CustomDemoNav, MainContainer, ConnectedPost, hoc },
  mixins: [vuexApiCallMixin],
  created: function() {
    console.log(process.env);
    this.vuexApiCall({
      baseURL: process.env.VUE_APP_API_URL,
      url: `/api/posts/${decodeURIComponent(this.$route.params.postId)}`,
      keyPath: ["post", this.$route.params.postId]
    });
  }
};
</script>
