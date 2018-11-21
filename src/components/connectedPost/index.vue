/**
* Created by vouill on 8/20/18.
*/

<template>
    <div>
        <post v-for="data in vuexApiData" :noTitleLink="true" :post="data" />
    </div>
</template>

<script>
import Post from "../post/index";
export default {
  name: "ConnectedPost",
  props: { vuexApiData: Object },
  components: { Post }
};
</script>
