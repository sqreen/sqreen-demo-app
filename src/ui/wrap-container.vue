/**
* Created by vouill on 8/22/18.
*/

<template>
  <div class="wrap-container">
    <slot/>
  </div>
</template>

<style scoped lang="scss">
.wrap-container {
  padding: 25px 0 20px;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
</style>

<script>
export default {
  name: "wrap-container",
  props: {},
  components: {},
  data() {
    return {};
  }
};
</script>
