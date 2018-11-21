/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <custom-demo-nav/>
        <hoc key-path="posts">
            <template slot="success"><post-list/></template>
        </hoc>
    </div>
</template>

<script>
import { hoc } from "vuex-api";
import PostList from "../../components/postList/index";
import CustomDemoNav from "../custom-demo-nav";
export default {
  name: "PostListWrapper",
  props: {},
  components: { CustomDemoNav, PostList, hoc },
  data() {
    return {};
  }
};
</script>
