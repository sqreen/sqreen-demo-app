/**
* Created by vouill on 8/20/18.
*/

<template>
    <wrap-container>
            <post v-for="(data, i) in vuexApiData" :key="i" :post="data"/>
    </wrap-container>
</template>

<script>
import MainContainer from "../../ui/main-container";
import Post from "../post/index";
import WrapContainer from "../../ui/wrap-container";
export default {
  name: "PostList",
  props: { vuexApiData: Array },
  components: { WrapContainer, Post, MainContainer },
  data() {
    return {};
  }
};
</script>
