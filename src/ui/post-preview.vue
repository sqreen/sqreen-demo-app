/**
* Created by vouill on 8/22/18.
*/

<template>
    <div class="post-preview">
        <slot/>
    </div>
</template>

<style scoped>
.post-preview {
  height: 250px;
  width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<script>
export default {
  name: "post-preview",
  props: {},
  components: {},
  data() {
    return {};
  }
};
</script>
