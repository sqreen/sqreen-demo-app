/**
* Created by vouill on 8/21/18.
*/

<template>
    <div class="v-container content">
        <slot/>
    </div>
</template>

<style scoped>
.v-container {
  padding: 20px;
}
</style>

<script>
export default {
  name: "side-panel-container",
  props: {},
  components: {},
  data() {
    return {};
  }
};
</script>
